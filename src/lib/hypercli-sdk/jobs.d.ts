/**
 * Jobs API - GPU job management
 */
import type { HTTPClient } from './http.js';
export interface Job {
    jobId: string;
    jobKey: string;
    state: string;
    gpuType: string;
    gpuCount: number;
    region: string;
    interruptible: boolean;
    pricePerHour: number;
    pricePerSecond: number;
    dockerImage: string;
    runtime: number;
    hostname: string | null;
    createdAt: number | null;
    startedAt: number | null;
    completedAt: number | null;
}
export interface GPUMetrics {
    index: number;
    name: string;
    utilization: number;
    memoryUsed: number;
    memoryTotal: number;
    temperature: number;
    powerDraw: number;
}
export interface SystemMetrics {
    cpuPercent: number;
    cpuCores: number;
    cpuUnixPercent: number;
    memoryUsed: number;
    memoryLimit: number;
}
export interface JobMetrics {
    gpus: GPUMetrics[];
    system: SystemMetrics | null;
}
export interface CreateJobOptions {
    image: string;
    command?: string;
    gpuType?: string;
    gpuCount?: number;
    region?: string;
    runtime?: number;
    interruptible?: boolean;
    env?: Record<string, string>;
    ports?: Record<string, number>;
    auth?: boolean;
    registryAuth?: {
        username: string;
        password: string;
    };
}
export declare class Jobs {
    private http;
    constructor(http: HTTPClient);
    /**
     * List all jobs
     */
    list(state?: string): Promise<Job[]>;
    /**
     * Get job details
     */
    get(jobId: string): Promise<Job>;
    /**
     * Create a new job
     */
    create(options: CreateJobOptions): Promise<Job>;
    /**
     * Cancel a job
     */
    cancel(jobId: string): Promise<any>;
    /**
     * Extend job runtime
     */
    extend(jobId: string, runtime: number): Promise<Job>;
    /**
     * Get job logs
     */
    logs(jobId: string): Promise<string>;
    /**
     * Get job GPU metrics
     */
    metrics(jobId: string): Promise<JobMetrics>;
    /**
     * Get job auth token
     */
    token(jobId: string): Promise<string>;
}
/**
 * Check if string looks like a UUID (job ID)
 */
export declare function isUuid(s: string): boolean;
/**
 * Find job by UUID via direct API call
 */
export declare function findById(jobs: Jobs, jobId: string): Promise<Job | null>;
/**
 * Find job by hostname (exact or prefix match)
 */
export declare function findByHostname(jobList: Job[], hostname: string): Job | null;
/**
 * Find job by IP address (extracted from hostname)
 */
export declare function findByIp(jobList: Job[], ip: string): Promise<Job | null>;
/**
 * Find a job by UUID, hostname, or IP address
 */
export declare function findJob(jobs: Jobs, identifier: string, state?: string): Promise<Job | null>;
//# sourceMappingURL=jobs.d.ts.map