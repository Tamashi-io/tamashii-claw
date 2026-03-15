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
import type { Chain } from "viem";
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";
import {
  createConfig as createLiFiConfig,
  getQuote as getLiFiQuote,
  convertQuoteToRoute,
  executeRoute,
  EVM,
  type RouteExtended,
} from "@lifi/sdk";
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
// Cross-chain swap + subscribe via LI.FI SDK
// (BNB Chain → Base USDC → operator wallet → server-side x402)
// ---------------------------------------------------------------------------

export type SwapStep =
  | "idle"
  | "quoting"
  | "approving"
  | "swapping"
  | "bridging"
  | "subscribing"
  | "done"
  | "error";

/** LI.FI uses the zero address for native tokens (BNB, ETH, etc.) */
const NATIVE_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";

export type BnbPayToken = "usdc" | "bnb";

/** Operator wallet on Base that receives swap proceeds */
const OPERATOR_WALLET =
  process.env.NEXT_PUBLIC_X402_WALLET_ADDRESS || "";

/** Viem chains for LI.FI SDK switchChain hook */
const VIEM_CHAINS: Chain[] = [base, bsc];

let lifiConfigured = false;

/**
 * Initialize LI.FI SDK with the user's injected wallet.
 * Must be called after the user connects their wallet.
 */
function ensureLiFiConfig() {
  if (lifiConfigured) return;

  const provider = getProvider();

  createLiFiConfig({
    integrator: "TamashiiClaw",
    providers: [
      EVM({
        getWalletClient: async () => {
          // Return a viem WalletClient using the current injected provider
          const accounts = (await provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          const chainIdHex = (await provider.request({
            method: "eth_chainId",
          })) as string;
          const chainId = parseInt(chainIdHex, 16);
          const chain = VIEM_CHAINS.find((c) => c.id === chainId) || bsc;
          return createWalletClient({
            account: accounts[0] as `0x${string}`,
            chain,
            transport: custom(provider),
          });
        },
        switchChain: async (chainId: number) => {
          const chain = VIEM_CHAINS.find((c) => c.id === chainId);
          if (!chain) throw new Error(`Unsupported chain: ${chainId}`);
          const hexId = `0x${chainId.toString(16)}`;
          try {
            await provider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: hexId }],
            });
          } catch (err: unknown) {
            const switchError = err as { code?: number };
            if (switchError.code === 4902) {
              const net = Object.values(NETWORKS).find(
                (n) => n.chain.id === chainId,
              );
              if (net) {
                await provider.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: hexId,
                      chainName: net.name,
                      nativeCurrency: net.nativeCurrency,
                      rpcUrls: [net.rpcUrl],
                      blockExplorerUrls: [net.blockExplorer],
                    },
                  ],
                });
              }
            } else {
              throw err;
            }
          }
          const accounts = (await provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          return createWalletClient({
            account: accounts[0] as `0x${string}`,
            chain,
            transport: custom(provider),
          });
        },
      }),
    ],
  });

  lifiConfigured = true;
  console.log("[lifi] SDK configured");
}

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
 * Full BNB swap + subscribe flow using LI.FI SDK:
 * 1. Connect wallet on BNB
 * 2. LI.FI SDK: getQuote → convertQuoteToRoute → executeRoute
 *    (handles approvals, gas, chain switching, tx submission, status tracking)
 * 3. Backend does server-side x402 subscribe with the operator wallet
 */
export async function swapAndSubscribe(
  planId: string,
  amountUsd: number,
  token?: string,
  onStep?: (step: SwapStep, detail?: string) => void,
  payToken: BnbPayToken = "usdc",
): Promise<{ ok: boolean; plan_id: string; expires_at: string }> {
  if (!OPERATOR_WALLET) {
    throw new Error("Operator wallet not configured (NEXT_PUBLIC_X402_WALLET_ADDRESS)");
  }

  onStep?.("quoting");

  // 1. Connect wallet on BNB
  const wallet = await connectWallet("bnb");

  // 2. Init LI.FI SDK with user's wallet
  ensureLiFiConfig();

  // 3. Determine source token and amount
  let fromToken: string;
  let fromAmount: string;

  if (payToken === "bnb") {
    const bnbPrice = await getBnbPriceUsd();
    const bnbNeeded = (amountUsd / bnbPrice) * 1.05; // 5% slippage buffer
    const bnbWei = BigInt(Math.ceil(bnbNeeded * 1e18));
    fromToken = NATIVE_TOKEN_ADDRESS;
    fromAmount = bnbWei.toString();
    console.log(`[swap] BNB price: $${bnbPrice}, sending ~${bnbNeeded.toFixed(6)} BNB`);
  } else {
    // BSC-Peg USDC (18 decimals)
    fromToken = NETWORKS.bnb.usdcAddress;
    fromAmount = String(BigInt(amountUsd) * BigInt(10 ** 18));
  }

  // 4. Get quote from LI.FI SDK (sends funds to operator wallet on Base)
  const quote = await getLiFiQuote({
    fromChain: 56,           // BNB Chain
    toChain: 8453,           // Base
    fromToken,
    toToken: NETWORKS.base.usdcAddress,
    fromAmount,
    fromAddress: wallet.address,
    toAddress: OPERATOR_WALLET,
  });

  console.log("[swap] LI.FI quote:", {
    fromToken: quote.action.fromToken.symbol,
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    tool: quote.tool,
  });

  // 5. Convert quote to route and execute via SDK
  //    SDK handles: approvals, gas estimation, tx submission, status polling
  const route = convertQuoteToRoute(quote);
  let txHash = "";

  const executedRoute: RouteExtended = await executeRoute(route, {
    updateRouteHook(updatedRoute) {
      // Map SDK execution progress to our SwapStep for the UI
      for (const step of updatedRoute.steps) {
        if (!step.execution?.process) continue;
        for (const process of step.execution.process) {
          // Capture tx hash
          if (process.txHash && !txHash) {
            txHash = process.txHash;
          }

          switch (process.type) {
            case "TOKEN_ALLOWANCE":
              if (process.status === "PENDING" || process.status === "STARTED") {
                onStep?.("approving");
              }
              break;
            case "SWAP":
            case "CROSS_CHAIN":
              if (process.status === "PENDING" || process.status === "STARTED") {
                onStep?.("swapping");
              }
              if (process.status === "ACTION_REQUIRED") {
                onStep?.("swapping", "Sign transaction in wallet...");
              }
              break;
            case "RECEIVING_CHAIN":
              onStep?.("bridging", txHash || undefined);
              break;
          }
        }
      }
    },
  });

  // Extract tx hash from the executed route if not captured yet
  if (!txHash) {
    for (const step of executedRoute.steps) {
      const proc = step.execution?.process?.find((p) => p.txHash);
      if (proc?.txHash) {
        txHash = proc.txHash;
        break;
      }
    }
  }

  console.log("[swap] Route executed, txHash:", txHash);

  if (!txHash) {
    throw new Error("Swap completed but no transaction hash found");
  }

  // 6. Backend does server-side x402 subscribe
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
