/**
 * HyperAgent API client - AI agent inference using OpenAI-compatible API
 *
 * Note: OpenAI client integration is not included in this SDK.
 * Use the OpenAI Node.js SDK directly with HyperClaw endpoints.
 */
import type { HTTPClient } from './http.js';
export interface HyperAgentPlan {
    id: string;
    name: string;
    priceUsd: number;
    tpmLimit: number;
    rpmLimit: number;
}
export interface HyperAgentCurrentPlan {
    id: string;
    name: string;
    price: number | string;
    aiu?: number;
    agents?: number;
    tpmLimit: number;
    rpmLimit: number;
    expiresAt: Date | null;
    cancelAtPeriodEnd: boolean;
}
export interface HyperAgentModel {
    id: string;
    name: string;
    contextLength: number;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    supportsToolChoice: boolean;
}
/**
 * HyperAgent API Client
 *
 * For chat completions, use the OpenAI Node.js SDK directly:
 *
 * ```typescript
 * import OpenAI from 'openai';
 *
 * const openai = new OpenAI({
 *   apiKey: client.agent.apiKey,
 *   baseURL: client.agent.baseUrl,
 * });
 * ```
 */
export declare class HyperAgent {
    private http;
    static readonly AGENT_API_BASE = "https://api.hypercli.com/v1";
    static readonly DEV_API_BASE = "https://api.dev.hypercli.com/v1";
    readonly apiKey: string;
    readonly baseUrl: string;
    constructor(http: HTTPClient, agentApiKey?: string, dev?: boolean, agentsApiBaseUrl?: string);
    private get baseUrlWithoutV1();
    plans(): Promise<HyperAgentPlan[]>;
    currentPlan(): Promise<HyperAgentCurrentPlan>;
    models(): Promise<HyperAgentModel[]>;
    discoveryHealth(): Promise<{
        hostsTotal: number;
        hostsHealthy: number;
        fallbacksActive: number;
    }>;
    discoveryConfig(apiKey?: string): Promise<any>;
}
//# sourceMappingURL=agent.d.ts.map