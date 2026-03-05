/**
 * HyperClaw API client - AI agent inference using OpenAI-compatible API
 *
 * Note: OpenAI client integration is not included in this SDK.
 * Use the OpenAI Node.js SDK directly with HyperClaw endpoints.
 */
import type { HTTPClient } from './http.js';
export interface ClawKey {
    key: string;
    planId: string;
    expiresAt: Date;
    tpmLimit: number;
    rpmLimit: number;
    userId: string | null;
}
export interface ClawPlan {
    id: string;
    name: string;
    priceUsd: number;
    tpmLimit: number;
    rpmLimit: number;
}
export interface ClawModel {
    id: string;
    name: string;
    contextLength: number;
    supportsVision: boolean;
    supportsFunctionCalling: boolean;
    supportsToolChoice: boolean;
}
/**
 * HyperClaw API Client
 *
 * For chat completions, use the OpenAI Node.js SDK directly:
 *
 * ```typescript
 * import OpenAI from 'openai';
 *
 * const openai = new OpenAI({
 *   apiKey: client.claw.apiKey,
 *   baseURL: client.claw.baseUrl,
 * });
 *
 * const response = await openai.chat.completions.create({
 *   model: 'kimi-k2.5',
 *   messages: [{ role: 'user', content: 'Hello!' }],
 * });
 * ```
 */
export declare class Claw {
    private http;
    static readonly CLAW_API_BASE = "https://api.hyperclaw.app/v1";
    static readonly DEV_API_BASE = "https://dev-api.hyperclaw.app/v1";
    readonly apiKey: string;
    readonly baseUrl: string;
    constructor(http: HTTPClient, clawApiKey?: string, dev?: boolean);
    private get baseUrlWithoutV1();
    /**
     * Get current API key status and subscription details
     */
    keyStatus(): Promise<ClawKey>;
    /**
     * List available subscription plans
     */
    plans(): Promise<ClawPlan[]>;
    /**
     * List available models
     */
    models(): Promise<ClawModel[]>;
    /**
     * Get discovery service health status
     */
    discoveryHealth(): Promise<{
        hostsTotal: number;
        hostsHealthy: number;
        fallbacksActive: number;
    }>;
    /**
     * Get discovery service configuration (requires API key)
     */
    discoveryConfig(apiKey?: string): Promise<any>;
}
//# sourceMappingURL=claw.d.ts.map