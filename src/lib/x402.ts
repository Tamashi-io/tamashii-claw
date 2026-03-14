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
import { wrapAxiosWithPayment, x402Client } from "@x402/axios";
import { ExactEvmScheme, toClientEvmSigner } from "@x402/evm";

/** x402 payments go through our NestJS backend */
const X402_PROXY_BASE =
  process.env.NEXT_PUBLIC_TAMASHIICLAW_API_URL || "/api";

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
}

let walletState: WalletState | null = null;

function getProvider(): EthereumProvider {
  const win = window as Window & { ethereum?: EthereumProvider };
  if (!win.ethereum) {
    throw new Error("Please install MetaMask or another Ethereum wallet");
  }
  return win.ethereum;
}

/** Ensure the wallet is on Base (chainId 0x2105). Prompts switch/add if not. */
async function ensureBaseNetwork(provider: EthereumProvider): Promise<void> {
  const chainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  if (chainId === "0x2105") return;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x2105" }],
    });
  } catch (err: unknown) {
    const switchError = err as { code?: number };
    if (switchError.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: "0x2105",
            chainName: "Base",
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18,
            },
            rpcUrls: ["https://mainnet.base.org"],
            blockExplorerUrls: ["https://basescan.org"],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function connectWallet(): Promise<WalletState> {
  if (walletState) return walletState;

  const provider = getProvider();

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts?.length) throw new Error("No accounts found");

  await ensureBaseNetwork(provider);

  const client = createWalletClient({
    account: accounts[0] as `0x${string}`,
    chain: base,
    transport: custom(provider),
  });

  walletState = { client, address: accounts[0] };
  return walletState;
}

export function getWalletState(): WalletState | null {
  return walletState;
}

// ---------------------------------------------------------------------------
// x402 payment client
// ---------------------------------------------------------------------------

let paymentApi: AxiosInstance | null = null;

function buildPaymentApi(wallet: WalletClient): AxiosInstance {
  // Create a public client for readContract calls (required by x402 v2)
  const publicClient = createPublicClient({
    chain: base,
    transport: http("https://mainnet.base.org"),
  });

  // Build a ClientEvmSigner using the helper that wires up readContract
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
    publicClient
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
 * Subscribe to a plan via x402 USDC payment on Base.
 *
 * JWT is optional — if provided, subscription links to the user account.
 * Otherwise a standalone API key is returned.
 */
export async function x402Subscribe(
  planId: string,
  token?: string
): Promise<{ ok: boolean; plan_id: string; expires_at: string }> {
  const wallet = await connectWallet();

  // Always verify the wallet is on Base before attempting payment
  await ensureBaseNetwork(getProvider());

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
