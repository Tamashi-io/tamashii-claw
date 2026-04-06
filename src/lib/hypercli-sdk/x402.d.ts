import type { Job } from './jobs.js';
import type { Render } from './renders.js';
export interface X402Signer {
    address: string;
    signTypedData: (params: {
        domain: Record<string, unknown>;
        types: Record<string, unknown>;
        primaryType: string;
        message: Record<string, unknown>;
    }) => Promise<string>;
}
export interface X402JobLaunch {
    job: Job;
    accessKey: string;
    statusUrl: string;
    logsUrl: string;
    cancelUrl: string;
}
export interface X402FlowCreate {
    render: Render;
    accessKey: string;
    statusUrl: string;
    cancelUrl: string;
}
export interface FlowCatalogItem {
    flowType: string;
    priceUsd: number;
    template?: string | null;
    type: string;
    regions?: Record<string, string> | null;
    interruptible?: boolean | null;
}
export interface X402CreateJobOptions {
    amount: number;
    signer: X402Signer;
    image: string;
    command?: string;
    gpuType?: string;
    gpuCount?: number;
    region?: string;
    constraints?: Record<string, string>;
    interruptible?: boolean;
    env?: Record<string, string>;
    ports?: Record<string, number>;
    auth?: boolean;
    registryAuth?: {
        username: string;
        password: string;
    };
}
export interface X402CreateFlowOptions {
    flowType: string;
    amount: number;
    signer: X402Signer;
    params?: Record<string, any>;
    notifyUrl?: string;
}
export declare class X402Client {
    private readonly apiUrl;
    private readonly timeout;
    constructor(apiUrl?: string, timeout?: number);
    /**
     * Fetch the public flow catalog (available flow types and prices).
     */
    getFlowCatalog(): Promise<FlowCatalogItem[]>;
    /**
     * Get the price for a specific flow type.
     */
    getFlowPrice(flowType: string): Promise<number>;
    /**
     * Launch a GPU job paid via x402 (USDC on Base chain).
     */
    createJob(options: X402CreateJobOptions): Promise<X402JobLaunch>;
    /**
     * Create a flow render paid via x402 (USDC on Base chain).
     */
    createFlow(options: X402CreateFlowOptions): Promise<X402FlowCreate>;
}
//# sourceMappingURL=x402.d.ts.map