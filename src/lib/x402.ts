import axios from "axios";
import type { AxiosInstance } from "axios";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type WalletClient,
} from "viem";
import { base, bsc } from "viem/chains";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import { API_BASE } from "./api";

/** Backend API for payment proxying */
const X402_PROXY_BASE =
  process.env.NEXT_PUBLIC_TAMASHIICLAW_API_URL || "/api";

// ---------------------------------------------------------------------------
// Chain configs
// ---------------------------------------------------------------------------

export type NetworkId = "base" | "bnb";

export const NETWORKS: Record<
  NetworkId,
  {
    chain: typeof base | typeof bsc;
    chainIdHex: string;
    name: string;
    rpcUrl: string;
    blockExplorer: string;
    nativeCurrency: { name: string; symbol: string; decimals: number };
    usdcAddress: string;
  }
> = {
  base: {
    chain: base,
    chainIdHex: "0x2105",
    name: "Base",
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
  bnb: {
    chain: bsc,
    chainIdHex: "0x38",
    name: "BNB Chain",
    rpcUrl: "https://bsc-dataseed.binance.org",
    blockExplorer: "https://bscscan.com",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    usdcAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
  },
};

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

interface WalletState {
  client: WalletClient;
  address: string;
  networkId: NetworkId;
}

let walletState: WalletState | null = null;

function getProvider(): EthereumProvider {
  const win = window as Window & { ethereum?: EthereumProvider };
  if (!win.ethereum) {
    throw new Error("Please install MetaMask or another Ethereum wallet");
  }
  return win.ethereum;
}

/** Ensure wallet is on the specified network. Prompts switch/add if not. */
async function ensureNetwork(
  provider: EthereumProvider,
  networkId: NetworkId,
): Promise<void> {
  const net = NETWORKS[networkId];
  const chainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  if (chainId.toLowerCase() === net.chainIdHex.toLowerCase()) return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: net.chainIdHex }],
    });
  } catch (err: unknown) {
    const switchError = err as { code?: number };
    if (switchError.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: net.chainIdHex,
            chainName: net.name,
            nativeCurrency: net.nativeCurrency,
            rpcUrls: [net.rpcUrl],
            blockExplorerUrls: [net.blockExplorer],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(
  networkId: NetworkId = "base",
): Promise<WalletState> {
  // If already connected to the right network, reuse
  if (walletState && walletState.networkId === networkId) return walletState;

  const provider = getProvider();

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts?.length) throw new Error("No accounts found");

  await ensureNetwork(provider, networkId);

  const net = NETWORKS[networkId];
  const client = createWalletClient({
    account: accounts[0] as `0x${string}`,
    chain: net.chain,
    transport: custom(provider),
  });

  walletState = { client, address: accounts[0], networkId };
  return walletState;
}

export function getWalletState(): WalletState | null {
  return walletState;
}

// ---------------------------------------------------------------------------
// x402 payment client (Base only — direct x402)
// ---------------------------------------------------------------------------

let paymentApi: AxiosInstance | null = null;

function buildPaymentApi(wallet: WalletClient): AxiosInstance {
  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  const signer = toClientEvmSigner(
    {
      address: wallet.account!.address,
      signTypedData: (params: {
        domain: Record<string, unknown>;
        types: Record<string, unknown>;
        primaryType: string;
        message: Record<string, unknown>;
      }) =>
        wallet.signTypedData({
          account: wallet.account!,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          domain: params.domain as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          types: params.types as any,
          primaryType: params.primaryType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          message: params.message as any,
        }),
    },
    publicClient,
  );

  const client = new x402Client();
  client.register("eip155:*", new ExactEvmScheme(signer));

  const instance = axios.create({
    baseURL: X402_PROXY_BASE,
    headers: { "Content-Type": "application/json" },
  });

  return wrapAxiosWithPayment(instance, client);
}

/**
 * Subscribe via x402 USDC payment on Base (direct).
 */
export async function x402Subscribe(
  planId: string,
  token?: string,
): Promise<{ ok: boolean; plan_id: string; expires_at: string }> {
  const wallet = await connectWallet("base");

  await ensureNetwork(getProvider(), "base");

  if (!paymentApi) {
    paymentApi = buildPaymentApi(wallet.client);
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await paymentApi.post(`/x402/${planId}`, {}, { headers });
  return res.data;
}

// ---------------------------------------------------------------------------
// Cross-chain swap + subscribe (BNB → Base USDC → operator → x402)
// ---------------------------------------------------------------------------

export interface SwapQuote {
  id: string;
  estimate: {
    toAmount: string;
    toAmountMin: string;
    gasCosts: { amountUSD: string }[];
    feeCosts: { amountUSD: string }[];
  };
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    gasPrice?: string;
    chainId: number;
  };
  action: {
    fromToken: { symbol: string; decimals: number; address: string };
    toToken: { symbol: string; decimals: number; address: string };
    fromAmount: string;
  };
}

export type SwapStep =
  | "idle"
  | "quoting"
  | "approving"
  | "swapping"
  | "bridging"
  | "subscribing"
  | "done"
  | "error";

/** LI.FI uses this address for native tokens (BNB, ETH, etc.) */
const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

export type BnbPayToken = "usdc" | "bnb";

/**
 * Fetch the BNB/USD price to calculate how much BNB is needed.
 */
async function getBnbPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
    );
    if (!res.ok) throw new Error("Price fetch failed");
    const data = await res.json();
    return data.binancecoin.usd;
  } catch {
    console.warn("[swap] Could not fetch BNB price, using fallback $600");
    return 600;
  }
}

/**
 * Get a swap quote from backend (LI.FI proxy).
 * Supports both BNB native and USDC as source token.
 * toAddress is auto-set to operator wallet by backend.
 */
export async function getSwapQuote(
  fromAddress: string,
  amountUsd: number,
  payToken: BnbPayToken = "usdc",
): Promise<SwapQuote> {
  let fromTokenAddress: string;
  let fromAmount: string;

  if (payToken === "bnb") {
    // Native BNB (18 decimals) — calculate from USD price + 5% slippage buffer
    const bnbPrice = await getBnbPriceUsd();
    const bnbNeeded = (amountUsd / bnbPrice) * 1.05;
    const bnbWei = BigInt(Math.ceil(bnbNeeded * 1e18));
    fromTokenAddress = NATIVE_TOKEN_ADDRESS;
    fromAmount = bnbWei.toString();
    console.log(`[swap] BNB price: $${bnbPrice}, sending ~${bnbNeeded.toFixed(6)} BNB`);
  } else {
    // BSC-Peg USDC (18 decimals)
    fromTokenAddress = NETWORKS.bnb.usdcAddress;
    fromAmount = String(BigInt(amountUsd) * BigInt(10 ** 18));
  }

  const res = await fetch(`${API_BASE}/swap/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromChainId: 56,
      toChainId: 8453,
      fromTokenAddress,
      toTokenAddress: NETWORKS.base.usdcAddress,
      fromAmount,
      fromAddress,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Swap quote failed: ${err}`);
  }

  return res.json();
}

/**
 * Poll swap status until DONE or FAILED.
 */
async function pollSwapStatus(
  txHash: string,
  onStatus?: (status: string) => void,
): Promise<void> {
  const maxAttempts = 60; // 10 min at 10s intervals
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 10_000));

    const res = await fetch(`${API_BASE}/swap/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash, fromChainId: 56, toChainId: 8453 }),
    });

    if (!res.ok) continue;

    const data = await res.json();
    const status = data.status || data.result;
    onStatus?.(status);

    if (status === "DONE") return;
    if (status === "FAILED" || status === "NOT_FOUND") {
      throw new Error(`Swap ${status}: ${data.substatusMessage || "unknown"}`);
    }
  }
  throw new Error("Swap timed out after 10 minutes");
}

/**
 * Check ERC-20 allowance and approve if needed.
 */
async function ensureTokenApproval(
  provider: EthereumProvider,
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  requiredAmount: bigint,
  walletClient: WalletClient,
): Promise<void> {
  // ERC-20 allowance(owner, spender) selector: 0xdd62ed3e
  const allowanceData =
    "0xdd62ed3e" +
    ownerAddress.slice(2).padStart(64, "0") +
    spenderAddress.slice(2).padStart(64, "0");

  const result = (await provider.request({
    method: "eth_call",
    params: [{ to: tokenAddress, data: allowanceData }, "latest"],
  })) as string;

  const currentAllowance = BigInt(result || "0");

  if (currentAllowance >= requiredAmount) {
    console.log("[swap] Token already approved, allowance:", currentAllowance.toString());
    return;
  }

  console.log("[swap] Approving token spend...", {
    current: currentAllowance.toString(),
    required: requiredAmount.toString(),
  });

  // approve(spender, type(uint256).max) selector: 0x095ea7b3
  const maxUint256 = "0x" + "f".repeat(64);
  const approveData =
    "0x095ea7b3" +
    spenderAddress.slice(2).padStart(64, "0") +
    maxUint256.slice(2);

  const txHash = await walletClient.sendTransaction({
    account: walletClient.account!,
    to: tokenAddress as `0x${string}`,
    data: approveData as `0x${string}`,
    value: BigInt(0),
    chain: bsc,
  });

  console.log("[swap] Approval tx:", txHash);

  // Wait for confirmation
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(NETWORKS.bnb.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("[swap] Approval confirmed");
}

/**
 * Full BNB swap + subscribe flow:
 * 1. Connect wallet on BNB
 * 2. Get swap quote (USDC BNB → USDC Base, toAddress = operator wallet)
 * 3. Approve USDC for LI.FI contract
 * 4. User signs swap transaction
 * 5. Poll until bridged
 * 6. Backend does server-side x402 subscribe
 */
export async function swapAndSubscribe(
  planId: string,
  amountUsd: number,
  token?: string,
  onStep?: (step: SwapStep, detail?: string) => void,
  payToken: BnbPayToken = "usdc",
): Promise<{ ok: boolean; plan_id: string; expires_at: string }> {
  onStep?.("quoting");

  // 1. Connect on BNB
  const wallet = await connectWallet("bnb");
  const provider = getProvider();
  await ensureNetwork(provider, "bnb");

  // 2. Get swap quote
  const quote = await getSwapQuote(wallet.address, amountUsd, payToken);
  console.log("[swap] Quote received:", {
    fromToken: quote.action.fromToken.symbol,
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    value: quote.transactionRequest.value,
    gasLimit: quote.transactionRequest.gasLimit,
  });

  // 3. Approve token for LI.FI (skip for native BNB — no approval needed)
  if (payToken !== "bnb") {
    onStep?.("approving");
    await ensureTokenApproval(
      provider,
      NETWORKS.bnb.usdcAddress,
      wallet.address,
      quote.transactionRequest.to,
      BigInt(quote.action.fromAmount),
      wallet.client,
    );
  }

  // 4. Sign and send swap transaction
  onStep?.("swapping");
  console.log("[swap] transactionRequest:", JSON.stringify(quote.transactionRequest, null, 2));
  const txParams: Parameters<typeof wallet.client.sendTransaction>[0] = {
    account: wallet.client.account!,
    to: quote.transactionRequest.to as `0x${string}`,
    data: quote.transactionRequest.data as `0x${string}`,
    value: BigInt(quote.transactionRequest.value || "0"),
    chain: bsc,
  };
  // Use gasLimit from LI.FI quote (critical for native BNB swaps where
  // wallet auto-estimation can fail on complex cross-chain calldata)
  if (quote.transactionRequest.gasLimit) {
    txParams.gas = BigInt(quote.transactionRequest.gasLimit);
  }
  if (quote.transactionRequest.gasPrice) {
    txParams.gasPrice = BigInt(quote.transactionRequest.gasPrice);
  }
  const txHash = await wallet.client.sendTransaction(txParams);

  // 4. Poll until bridged
  onStep?.("bridging", txHash);
  await pollSwapStatus(txHash, (status) => {
    onStep?.("bridging", `${status}...`);
  });

  // 5. Backend does server-side x402 subscribe
  onStep?.("subscribing");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/x402/swap-subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify({ planId, txHash, fromChainId: 56 }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Subscription failed: ${err}`);
  }

  onStep?.("done");
  return res.json();
}
