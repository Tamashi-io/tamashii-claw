/**
 * Gradio job helpers for GPU workloads running Gradio-based services
 */
import type { HyperCLI } from '../client.js';
import type { Job } from '../jobs.js';
import { BaseJob } from './base.js';
export interface GradioJobOptions {
    image: string;
    gpuType?: string;
    gpuCount?: number;
    runtime?: number;
    lb?: number;
    auth?: boolean;
    [key: string]: any;
}
/**
 * Gradio-specific job with service connection helpers
 */
export declare class GradioJob extends BaseJob {
    static DEFAULT_GPU_TYPE: string;
    static HEALTH_ENDPOINT: string;
    static HEALTH_TIMEOUT: number;
    static GRADIO_PORT: number;
    private _useLb;
    useAuth: boolean;
    private _jobToken;
    constructor(client: HyperCLI, job: Job, useLb?: boolean, useAuth?: boolean);
    get useLb(): boolean;
    set useLb(value: boolean);
    get baseUrl(): string;
    get authHeaders(): Record<string, string>;
    /**
     * Get the job-specific bearer token for Gradio API auth
     */
    jobToken(): Promise<string>;
    /**
     * Create a new Gradio job for a specific Docker image
     */
    static createForService(client: HyperCLI, options: GradioJobOptions): Promise<GradioJob>;
    /**
     * Connect to this Gradio instance using gradio_client
     *
     * Note: Requires `gradio_client` package to be installed separately.
     * This is a placeholder - actual implementation would use gradio_client.
     */
    connect(): Promise<any>;
}
//# sourceMappingURL=gradio.d.ts.map