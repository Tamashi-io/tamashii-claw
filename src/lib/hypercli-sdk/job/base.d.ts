/**
 * Base job class for GPU workloads
 */
import type { HyperCLI } from '../client.js';
import type { Job } from '../jobs.js';
export interface BaseJobOptions {
    image?: string;
    gpuType?: string;
    gpuCount?: number;
    runtime?: number;
    [key: string]: any;
}
/**
 * Base class for managed GPU jobs with lifecycle helpers
 */
export declare class BaseJob {
    client: HyperCLI;
    job: Job;
    static DEFAULT_IMAGE: string;
    static DEFAULT_GPU_TYPE: string;
    static HEALTH_ENDPOINT: string;
    static HEALTH_TIMEOUT: number;
    protected _baseUrl: string | null;
    constructor(client: HyperCLI, job: Job);
    get jobId(): string;
    get hostname(): string | null;
    get baseUrl(): string;
    get authHeaders(): Record<string, string>;
    /**
     * Find an existing running job, optionally filtering by image
     */
    static getRunning<T extends typeof BaseJob>(this: T, client: HyperCLI, imageFilter?: string): Promise<InstanceType<T> | null>;
    /**
     * Get a job by ID, hostname, or IP address
     */
    static getByInstance<T extends typeof BaseJob>(this: T, client: HyperCLI, instance: string, state?: string): Promise<InstanceType<T>>;
    /**
     * Create a new job
     */
    static create<T extends typeof BaseJob>(this: T, client: HyperCLI, options?: BaseJobOptions): Promise<InstanceType<T>>;
    /**
     * Get existing running job or create new one
     */
    static getOrCreate<T extends typeof BaseJob>(this: T, client: HyperCLI, options?: BaseJobOptions & {
        reuse?: boolean;
    }): Promise<InstanceType<T>>;
    /**
     * Refresh job state from API
     */
    refresh(): Promise<this>;
    /**
     * Wait for job to reach running state via API polling
     */
    waitForRunning(timeout?: number, pollInterval?: number): Promise<boolean>;
    /**
     * Alias for waitForRunning
     */
    waitForHostname(timeout?: number, pollInterval?: number): Promise<boolean>;
    /**
     * Check if the service is responding
     */
    checkHealth(): Promise<boolean>;
    /**
     * Wait for an EXISTING running job to respond to health checks
     */
    waitExisting(timeout?: number): Promise<boolean>;
    /**
     * Wait for a NEW job to be ready (running state + health check passing)
     */
    waitReady(timeout?: number, pollInterval?: number, dnsDelay?: number): Promise<boolean>;
    /**
     * Cancel the job
     */
    shutdown(): Promise<any>;
    /**
     * Extend job runtime
     */
    extend(runtime: number): Promise<this>;
}
//# sourceMappingURL=base.d.ts.map