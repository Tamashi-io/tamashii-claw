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
  Solana as LiFiSolana,
  type RouteExtended,
} from "@lifi/sdk";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { API_BASE } from "./api";

/** Backend API for payment proxying */
const X402_PROXY_BASE =
  process.env.NEXT_PUBLIC_TAMASHIICLAW_API_URL || "/api";

// ---------------------------------------------------------------------------
// Solana config
// ---------------------------------------------------------------------------

/** Solana chain ID used by LI.FI */
const SOLANA_CHAIN_ID = 1151111081099710;

/** USDC-SPL on Solana */
const SOLANA_USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/** SOL native token address (LI.FI convention) */
const SOLANA_NATIVE = "11111111111111111111111111111111";

/** Base USDC address (destination) */
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/** Base chain ID */
const BASE_CHAIN_ID = 8453;

/** Operator wallet on Base that receives swap proceeds */
const OPERATOR_WALLET =
  process.env.NEXT_PUBLIC_X402_WALLET_ADDRESS || "";

export type SolPayToken = "sol" | "usdc";

// ---------------------------------------------------------------------------
// Solana Wallet
// ---------------------------------------------------------------------------

interface SolanaWalletState {
  adapter: PhantomWalletAdapter;
  address: string;
}

let solWalletState: SolanaWalletState | null = null;

export async function connectSolanaWallet(): Promise<SolanaWalletState> {
  if (solWalletState?.adapter.connected) return solWalletState;

  const adapter = new PhantomWalletAdapter();
  await adapter.connect();

  if (!adapter.publicKey) {
    throw new Error("Failed to connect Solana wallet");
  }

  solWalletState = {
    adapter,
    address: adapter.publicKey.toBase58(),
  };
  return solWalletState;
}

export function getSolanaWalletState(): SolanaWalletState | null {
  return solWalletState;
}

// ---------------------------------------------------------------------------
// EVM wallet (kept for Base — used by x402 direct payment if needed)
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
// LI.FI SDK config
// ---------------------------------------------------------------------------

let lifiConfigured = false;

function ensureLiFiConfig(solanaAdapter: PhantomWalletAdapter) {
  if (lifiConfigured) return;

  const evmProvider = getEvmProvider();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providers: any[] = [
    // Solana provider for source chain
    LiFiSolana({
      getWalletAdapter: async () => solanaAdapter,
    }),
  ];

  // Add EVM provider if available (for Base destination receiving)
  if (evmProvider) {
    providers.push(
      EVM({
        getWalletClient: async () => {
          const accounts = (await evmProvider.request({
            method: "eth_requestAccounts",
          })) as string[];
          return createWalletClient({
            account: accounts[0] as `0x${string}`,
            chain: base,
            transport: custom(evmProvider),
          });
        },
        switchChain: async (chainId: number) => {
          const hexId = `0x${chainId.toString(16)}`;
          await evmProvider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: hexId }],
          });
          const accounts = (await evmProvider.request({
            method: "eth_requestAccounts",
          })) as string[];
          const chain: Chain = base;
          return createWalletClient({
            account: accounts[0] as `0x${string}`,
            chain,
            transport: custom(evmProvider),
          });
        },
      }),
    );
  }

  createLiFiConfig({
    integrator: "comput3claw",
    apiKey: "78f7f602-5c2f-4680-983d-ede8cb278ba1.f4bb8d00-3ac5-46a8-88a0-ff8db370c98a",
    providers,
  });

  lifiConfigured = true;
  console.log("[lifi] SDK configured with Solana + EVM providers");
}

// ---------------------------------------------------------------------------
// Cross-chain swap + subscribe via LI.FI SDK
// (Solana → Base USDC → operator wallet → server-side x402)
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
 * Full Solana swap + subscribe flow using LI.FI SDK:
 * 1. Connect Phantom wallet
 * 2. LI.FI SDK: getQuote → convertQuoteToRoute → executeRoute
 *    (handles approvals, swaps, bridging, tx submission, status tracking)
 * 3. Backend does server-side x402 subscribe with the operator wallet
 *
 * For SOL: uses toAmount so LI.FI calculates exact SOL needed.
 * For USDC-SPL: uses fromAmount (6-decimal USDC on Solana).
 */
export async function swapAndSubscribe(
  planId: string,
  amountUsd: number,
  token?: string,
  onStep?: (step: SwapStep, detail?: string) => void,
  payToken: SolPayToken = "sol",
): Promise<{ ok: boolean; plan_id: string; expires_at: string }> {
  if (!OPERATOR_WALLET) {
    throw new Error("Operator wallet not configured (NEXT_PUBLIC_X402_WALLET_ADDRESS)");
  }

  onStep?.("quoting");

  // 1. Connect Solana wallet
  const wallet = await connectSolanaWallet();

  // 2. Init LI.FI SDK with Solana adapter
  ensureLiFiConfig(wallet.adapter);

  // 3. Get quote from LI.FI SDK
  const fromToken = payToken === "sol" ? SOLANA_NATIVE : SOLANA_USDC;

  // Base USDC has 6 decimals
  const toAmountUsdc = String(amountUsd * 1_000_000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let quoteParams: any;

  if (payToken === "sol") {
    // toAmount mode: "deliver X USDC on Base, calculate SOL needed"
    quoteParams = {
      fromChain: SOLANA_CHAIN_ID,
      toChain: BASE_CHAIN_ID,
      fromToken,
      toToken: BASE_USDC,
      toAmount: toAmountUsdc,
      fromAddress: wallet.address,
      toAddress: OPERATOR_WALLET,
      slippage: 0.03, // 3% slippage
    };
    console.log(`[swap] Requesting toAmount quote: ${amountUsd} USDC on Base, pay with SOL`);
  } else {
    // fromAmount mode: "send X USDC from Solana" (6 decimals on Solana too)
    const fromAmount = String(amountUsd * 1_000_000);
    quoteParams = {
      fromChain: SOLANA_CHAIN_ID,
      toChain: BASE_CHAIN_ID,
      fromToken,
      toToken: BASE_USDC,
      fromAmount,
      fromAddress: wallet.address,
      toAddress: OPERATOR_WALLET,
      slippage: 0.005, // 0.5% slippage for stablecoin
    };
    console.log(`[swap] Requesting fromAmount quote: ${amountUsd} USDC Solana → Base`);
  }

  const quote = await getLiFiQuote(quoteParams);

  console.log("[swap] LI.FI quote:", {
    fromToken: quote.action.fromToken.symbol,
    fromAmount: quote.action.fromAmount,
    toAmount: quote.estimate.toAmount,
    toAmountMin: quote.estimate.toAmountMin,
    tool: quote.tool,
  });

  // 4. Convert quote to route and execute via SDK
  const route = convertQuoteToRoute(quote);
  let txHash = "";

  try {
    const executedRoute: RouteExtended = await executeRoute(route, {
      updateRouteHook(updatedRoute) {
        for (const step of updatedRoute.steps) {
          if (!step.execution?.process) continue;
          for (const process of step.execution.process) {
            if (process.txHash && !txHash) {
              txHash = process.txHash;
            }

            console.log(`[swap] Process: type=${process.type} status=${process.status} txHash=${process.txHash || "\u2014"}`);

            switch (process.type) {
              case "TOKEN_ALLOWANCE":
                if (process.status === "PENDING" || process.status === "STARTED") {
                  onStep?.("approving");
                }
                break;
              case "SWAP":
              case "CROSS_CHAIN":
                if (process.status === "ACTION_REQUIRED") {
                  onStep?.("swapping", "Sign transaction in wallet...");
                } else if (process.status === "PENDING" || process.status === "STARTED") {
                  onStep?.("swapping");
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

    if (!txHash) {
      for (const step of executedRoute.steps) {
        const proc = step.execution?.process?.find((p) => p.txHash);
        if (proc?.txHash) {
          txHash = proc.txHash;
          break;
        }
      }
    }
  } catch (err: unknown) {
    const error = err as { message?: string; code?: string; step?: unknown; process?: unknown };
    console.error("[swap] executeRoute failed:", {
      message: error.message,
      code: error.code,
      txHash,
      raw: err,
    });
    throw new Error(
      `Swap failed: ${error.message || "Unknown error"}${txHash ? ` (tx: ${txHash})` : ""}`,
    );
  }

  console.log("[swap] Route executed, txHash:", txHash);

  if (!txHash) {
    throw new Error("Swap completed but no transaction hash found");
  }

  // 5. Backend does server-side x402 subscribe
  onStep?.("subscribing");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const HYPERCLAW_AMOUNTS: Record<string, number> = {
    "1aiu": 20.40,
    "2aiu": 40,
    "5aiu": 100,
    "10aiu": 200,
  };
  const hcAmount = HYPERCLAW_AMOUNTS[planId] ?? amountUsd;
  const amountUsdc = String(Math.round(hcAmount * 1_000_000));
  console.log("[swap] Calling swap-subscribe endpoint:", { planId, txHash, amountUsdc, hcAmount });

  const res = await fetch(`${API_BASE}/x402/swap-subscribe`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      planId,
      txHash,
      fromChainId: SOLANA_CHAIN_ID,
      amount: amountUsdc,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[swap] swap-subscribe failed:", res.status, err.substring(0, 300));
    throw new Error(`Subscription failed: ${err}`);
  }

  const result = await res.json();
  console.log("[swap] swap-subscribe result:", {
    ok: result.ok,
    plan_id: result.plan_id,
    amount_paid: result.amount_paid,
    duration_days: result.duration_days,
    hasKey: !!result.key,
  });

  onStep?.("done");
  return result;
}
