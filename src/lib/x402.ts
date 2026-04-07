import axios from "axios";
import type { AxiosInstance } from "axios";
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  type WalletClient,
} from "viem";
import { base } from "viem/chains";
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
// Chain & token constants
// ---------------------------------------------------------------------------

/** BSC chain ID */
const BSC_CHAIN_ID = 56;
/** BNB native token on BSC (LI.FI convention) */
const BNB_NATIVE = "0x0000000000000000000000000000000000000000";

/** Base chain ID */
const BASE_CHAIN_ID = 8453;
/** USDC on Base */
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Operator wallet on Base that receives swap proceeds */
const OPERATOR_WALLET =
  process.env.NEXT_PUBLIC_X402_WALLET_ADDRESS || "";

export type CryptoPayToken = "bnb" | "usdc";

// ---------------------------------------------------------------------------
// EVM Wallet
// ---------------------------------------------------------------------------

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  isMetaMask?: boolean;
}

function getEvmProvider(): EthereumProvider | null {
  const win = window as Window & { ethereum?: EthereumProvider };
  return win.ethereum ?? null;
}

interface EvmWalletState {
  address: string;
  provider: EthereumProvider;
}

let evmWalletState: EvmWalletState | null = null;

export async function connectEvmWallet(): Promise<EvmWalletState> {
  if (evmWalletState) return evmWalletState;

  const provider = getEvmProvider();
  if (!provider) throw new Error("No EVM wallet found. Please install MetaMask.");

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts[0]) throw new Error("No accounts returned from wallet.");

  evmWalletState = { address: accounts[0], provider };
  return evmWalletState;
}

export function getEvmWalletState(): EvmWalletState | null {
  return evmWalletState;
}

// ---------------------------------------------------------------------------
// x402 payment client (Base only — for server-side subscribe)
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

// ---------------------------------------------------------------------------
// LI.FI SDK config (EVM only)
// ---------------------------------------------------------------------------

let lifiConfigured = false;

function ensureLiFiConfig(provider: EthereumProvider) {
  if (lifiConfigured) return;

  createLiFiConfig({
    integrator: "tamashiiclaw",
    apiKey: "78f7f602-5c2f-4680-983d-ede8cb278ba1.f4bb8d00-3ac5-46a8-88a0-ff8db370c98a",
    providers: [
      EVM({
        getWalletClient: async () => {
          const accounts = (await provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          return createWalletClient({
            account: accounts[0] as `0x${string}`,
            chain: base,
            transport: custom(provider),
          });
        },
        switchChain: async (chainId: number) => {
          const hexId = `0x${chainId.toString(16)}`;
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hexId }],
          });
          const accounts = (await provider.request({
            method: "eth_requestAccounts",
          })) as string[];
          const chain: Chain = base;
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
  console.log("[lifi] SDK configured with EVM provider");
}

// ---------------------------------------------------------------------------
// Direct ERC-20 transfer on Base (for USDC payments — no bridge needed)
// ---------------------------------------------------------------------------

async function sendUsdcOnBase(
  provider: EthereumProvider,
  fromAddress: string,
  toAddress: string,
  amountUsdc: number, // dollar amount — converted to 6-decimal units internally
): Promise<string> {
  // Switch to Base
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x2105" }], // Base = 8453
  });

  // ABI-encode: transfer(address,uint256)
  // selector: 0xa9059cbb
  const amount = BigInt(Math.round(amountUsdc * 1_000_000));
  const paddedTo = toAddress.replace("0x", "").toLowerCase().padStart(64, "0");
  const paddedAmount = amount.toString(16).padStart(64, "0");
  const data = `0xa9059cbb${paddedTo}${paddedAmount}`;

  const txHash = (await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: fromAddress, to: BASE_USDC, data }],
  })) as string;

  return txHash;
}

// ---------------------------------------------------------------------------
// Cross-chain swap + subscribe via LI.FI SDK
// BNB (BSC) → Base USDC  or  USDC direct transfer on Base
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

/**
 * Full EVM swap + subscribe flow using LI.FI SDK:
 * 1. Connect EVM wallet (MetaMask / any injected)
 * 2. LI.FI SDK: getQuote → convertQuoteToRoute → executeRoute
 * 3. Backend does server-side x402 subscribe with the operator wallet
 *
 * For BNB: BSC → Base USDC cross-chain swap
 * For USDC: Base → Base USDC same-chain transfer
 */
export async function swapAndSubscribe(
  planId: string,
  amountUsd: number,
  token?: string,
  onStep?: (step: SwapStep, detail?: string) => void,
  payToken: CryptoPayToken = "bnb",
): Promise<{ ok: boolean; plan_id: string; expires_at: string }> {
  if (!OPERATOR_WALLET) {
    throw new Error("Operator wallet not configured (NEXT_PUBLIC_X402_WALLET_ADDRESS)");
  }

  // 1. Connect EVM wallet
  const wallet = await connectEvmWallet();

  let txHash = "";
  const fromChainId = payToken === "bnb" ? BSC_CHAIN_ID : BASE_CHAIN_ID;

  if (payToken === "usdc") {
    // Direct ERC-20 USDC transfer on Base — no bridge, no LI.FI
    onStep?.("swapping", "Confirm USDC transfer in wallet...");
    console.log(`[swap] Direct USDC transfer on Base: $${amountUsd}`);
    txHash = await sendUsdcOnBase(wallet.provider, wallet.address, OPERATOR_WALLET, amountUsd);
    console.log("[swap] USDC transfer txHash:", txHash);
  } else {
    // BNB on BSC → Base USDC via LI.FI
    onStep?.("quoting");
    ensureLiFiConfig(wallet.provider);

    const quoteParams = {
      fromChain: BSC_CHAIN_ID,
      toChain: BASE_CHAIN_ID,
      fromToken: BNB_NATIVE,
      toToken: BASE_USDC,
      toAmount: String(Math.round(amountUsd * 1_000_000)),
      fromAddress: wallet.address,
      toAddress: OPERATOR_WALLET,
      slippage: 0.03,
    };
    console.log(`[swap] BNB→Base quote: deliver $${amountUsd} USDC on Base`);

    const quote = await getLiFiQuote(quoteParams);
    console.log("[swap] LI.FI quote:", {
      fromToken: quote.action.fromToken.symbol,
      fromAmount: quote.action.fromAmount,
      toAmount: quote.estimate.toAmount,
      tool: quote.tool,
    });

    const route = convertQuoteToRoute(quote);

    try {
      const executedRoute: RouteExtended = await executeRoute(route, {
        updateRouteHook(updatedRoute) {
          for (const step of updatedRoute.steps) {
            if (!step.execution?.process) continue;
            for (const process of step.execution.process) {
              if (process.txHash && !txHash) txHash = process.txHash;

              console.log(`[swap] type=${process.type} status=${process.status} txHash=${process.txHash || "—"}`);

              switch (process.type) {
                case "TOKEN_ALLOWANCE":
                  if (process.status === "PENDING" || process.status === "STARTED")
                    onStep?.("approving");
                  break;
                case "SWAP":
                case "CROSS_CHAIN":
                  if (process.status === "ACTION_REQUIRED")
                    onStep?.("swapping", "Sign transaction in wallet...");
                  else if (process.status === "PENDING" || process.status === "STARTED")
                    onStep?.("swapping");
                  break;
                case "RECEIVING_CHAIN":
                  onStep?.("bridging", txHash || undefined);
                  break;
              }
            }
          }
        },
      });

      if (!txHash) {
        for (const step of executedRoute.steps) {
          const proc = step.execution?.process?.find((p) => p.txHash);
          if (proc?.txHash) { txHash = proc.txHash; break; }
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      console.error("[swap] executeRoute failed:", { message: error.message, txHash });
      throw new Error(
        `Swap failed: ${error.message || "Unknown error"}${txHash ? ` (tx: ${txHash})` : ""}`,
      );
    }

    if (!txHash) throw new Error("Swap completed but no transaction hash found");
    console.log("[swap] Route executed, txHash:", txHash);
  }

  // Backend subscribe
  onStep?.("subscribing");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const HYPERCLAW_AMOUNTS: Record<string, number> = {
    "1aiu": 20.40,
    "2aiu": 40,
    "5aiu": 100,
    "10aiu": 200,
  };
  const hcAmount = HYPERCLAW_AMOUNTS[planId] ?? amountUsd;
  const amountUsdc = String(Math.round(hcAmount * 1_000_000));

  console.log("[swap] Calling swap-subscribe:", { planId, txHash, amountUsdc, fromChainId });

  const res = await fetch(`${API_BASE}/x402/swap-subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify({ planId, txHash, fromChainId, amount: amountUsdc }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[swap] swap-subscribe failed:", res.status, err.substring(0, 300));
    throw new Error(`Subscription failed: ${err}`);
  }

  const result = await res.json();
  console.log("[swap] swap-subscribe result:", result);

  onStep?.("done");
  return result;
}
