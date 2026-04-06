/**
 * Jobs API - GPU job management
 */
import type { HTTPClient } from './http.js';
import WebSocket from 'ws';
export interface Job {
    jobId: string;
    jobKey: string;
    state: string;
    gpuType: string;
    gpuCount: number;
    region: string;
    constraints: Record<string, string> | null;
    interruptible: boolean;
    pricePerHour: number;
    pricePerSecond: number;
    dockerImage: string;
    runtime: number;
    elapsed: number;
    timeLeft: number;
    hostname: string | null;
    coldBoot: boolean;
    createdAt: number | null;
    startedAt: number | null;
    completedAt: number | null;
    tags?: string[] | null;
}
export interface ExecResult {
    jobId: string;
    stdout: string;
    stderr: string;
    exitCode: number;
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
    constraints?: Record<string, string>;
    runtime?: number;
    interruptible?: boolean;
    env?: Record<string, string>;
    ports?: Record<string, number>;
    auth?: boolean;
    registryAuth?: {
        username: string;
        password: string;
    };
    tags?: Record<string, string> | string[];
    dockerfile?: string;
    dryRun?: boolean;
}
export interface ListJobsOptions {
    state?: string;
    tags?: Record<string, string> | string[];
    page?: number;
    pageSize?: number;
}
export interface JobListPage {
    jobs: Job[];
    totalCount: number;
    page: number;
    pageSize: number;
}
export declare class Jobs {
    private http;
    constructor(http: HTTPClient);
    private buildListParams;
    /**
     * List all jobs
     */
    list(state?: string, tags?: Record<string, string> | string[]): Promise<Job[]>;
    list(options?: ListJobsOptions): Promise<Job[]>;
    listPage(options?: ListJobsOptions): Promise<JobListPage>;
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
    /**
     * Execute a command non-interactively on a running job container.
     */
    exec(jobId: string, command: string, timeout?: number): Promise<ExecResult>;
    /**
     * Connect to a job shell via director WebSocket proxy.
     */
    shellConnect(jobId: string, shell?: string): Promise<WebSocket>;
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