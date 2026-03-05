import { findJob } from '../jobs.js';
import { requestWithRetry } from '../http.js';
/**
 * Base class for managed GPU jobs with lifecycle helpers
 */
export class BaseJob {
    client;
    job;
    static DEFAULT_IMAGE = '';
    static DEFAULT_GPU_TYPE = 'l40s';
    static HEALTH_ENDPOINT = '/';
    static HEALTH_TIMEOUT = 5000;
    _baseUrl = null;
    constructor(client, job) {
        this.client = client;
        this.job = job;
    }
    get jobId() {
        return this.job.jobId;
    }
    get hostname() {
        return this.job.hostname;
    }
    get baseUrl() {
        if (!this._baseUrl && this.hostname) {
            this._baseUrl = `http://${this.hostname}`;
        }
        return this._baseUrl || '';
    }
    get authHeaders() {
        return { 'Authorization': `Bearer ${this.client.apiKey}` };
    }
    /**
     * Find an existing running job, optionally filtering by image
     */
    static async getRunning(client, imageFilter) {
        const jobs = await client.jobs.list('running');
        for (const job of jobs) {
            if (imageFilter && !job.dockerImage.includes(imageFilter)) {
                continue;
            }
            return new this(client, job);
        }
        return null;
    }
    /**
     * Get a job by ID, hostname, or IP address
     */
    static async getByInstance(client, instance, state = 'running') {
        const job = await findJob(client.jobs, instance, state);
        if (!job) {
            throw new Error(`No job found matching: ${instance}`);
        }
        return new this(client, job);
    }
    /**
     * Create a new job
     */
    static async create(client, options = {}) {
        const { image, gpuType, gpuCount = 1, runtime = 3600, ...kwargs } = options;
        const job = await client.jobs.create({
            image: image || this.DEFAULT_IMAGE,
            gpuType: gpuType || this.DEFAULT_GPU_TYPE,
            gpuCount,
            runtime,
            ...kwargs,
        });
        return new this(client, job);
    }
    /**
     * Get existing running job or create new one
     */
    static async getOrCreate(client, options = {}) {
        const { reuse = true, image, ...restOptions } = options;
        if (reuse) {
            const existing = await this.getRunning(client, image || this.DEFAULT_IMAGE);
            if (existing) {
                return existing;
            }
        }
        return this.create(client, { image, ...restOptions });
    }
    /**
     * Refresh job state from API
     */
    async refresh() {
        this.job = await this.client.jobs.get(this.jobId);
        this._baseUrl = null;
        return this;
    }
    /**
     * Wait for job to reach running state via API polling
     */
    async waitForRunning(timeout = 300000, pollInterval = 5000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            await this.refresh();
            if (this.job.state === 'running' && this.hostname) {
                return true;
            }
            if (['failed', 'cancelled', 'completed', 'terminated'].includes(this.job.state)) {
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
        return false;
    }
    /**
     * Alias for waitForRunning
     */
    async waitForHostname(timeout = 300000, pollInterval = 5000) {
        return this.waitForRunning(timeout, pollInterval);
    }
    /**
     * Check if the service is responding
     */
    async checkHealth() {
        if (!this.baseUrl || this.job.state !== 'running') {
            return false;
        }
        try {
            const Constructor = this.constructor;
            const response = await requestWithRetry({
                method: 'GET',
                url: `${this.baseUrl}${Constructor.HEALTH_ENDPOINT}`,
                headers: this.authHeaders,
                timeout: Constructor.HEALTH_TIMEOUT,
                retries: 3,
            });
            return response.status === 200;
        }
        catch {
            return false;
        }
    }
    /**
     * Wait for an EXISTING running job to respond to health checks
     */
    async waitExisting(timeout = 15000) {
        await this.refresh();
        if (this.job.state !== 'running' || !this.hostname) {
            return false;
        }
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (await this.checkHealth()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        return false;
    }
    /**
     * Wait for a NEW job to be ready (running state + health check passing)
     */
    async waitReady(timeout = 300000, pollInterval = 5000, dnsDelay = 15000) {
        const start = Date.now();
        // Wait for running state via API
        await this.refresh();
        if (['failed', 'cancelled', 'completed', 'terminated'].includes(this.job.state)) {
            return false;
        }
        if (this.job.state !== 'running' || !this.hostname) {
            if (!await this.waitForRunning(timeout, pollInterval)) {
                return false;
            }
        }
        // DNS propagation delay
        if (dnsDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, dnsDelay));
        }
        // Job is running, check health
        const elapsed = Date.now() - start;
        const remaining = timeout - elapsed;
        while (remaining > 0) {
            if (await this.checkHealth()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 2000));
            const newRemaining = timeout - (Date.now() - start);
            if (newRemaining <= 0)
                break;
        }
        return false;
    }
    /**
     * Cancel the job
     */
    async shutdown() {
        return await this.client.jobs.cancel(this.jobId);
    }
    /**
     * Extend job runtime
     */
    async extend(runtime) {
        this.job = await this.client.jobs.extend(this.jobId, runtime);
        return this;
    }
}
//# sourceMappingURL=base.js.map