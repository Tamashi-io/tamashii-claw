function jobFromDict(data) {
    return {
        jobId: data.job_id || '',
        jobKey: data.job_key || '',
        state: data.state || '',
        gpuType: data.gpu_type || '',
        gpuCount: data.gpu_count || 1,
        region: data.region || '',
        interruptible: data.interruptible !== false,
        pricePerHour: data.price_per_hour || 0,
        pricePerSecond: data.price_per_second || 0,
        dockerImage: data.docker_image || '',
        runtime: data.runtime || 0,
        hostname: data.hostname || null,
        createdAt: data.created_at || null,
        startedAt: data.started_at || null,
        completedAt: data.completed_at || null,
    };
}
function gpuMetricsFromDict(data) {
    return {
        index: data.index || 0,
        name: data.name || '',
        utilization: data.utilization_gpu_percent || 0,
        memoryUsed: data.memory_used_mb || 0,
        memoryTotal: data.memory_total_mb || 0,
        temperature: data.temperature_c || 0,
        powerDraw: data.power_draw_w || 0,
    };
}
function systemMetricsFromDict(data) {
    return {
        cpuPercent: data.cpu_percent || 0,
        cpuCores: data.cpu_cores || 1,
        cpuUnixPercent: data.cpu_unix_percent || data.cpu_percent || 0,
        memoryUsed: data.memory_used_mb || 0,
        memoryLimit: data.memory_limit_mb || 0,
    };
}
function jobMetricsFromDict(data) {
    return {
        gpus: (data.gpus || []).map(gpuMetricsFromDict),
        system: data.system ? systemMetricsFromDict(data.system) : null,
    };
}
export class Jobs {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * List all jobs
     */
    async list(state) {
        const params = {};
        if (state) {
            params.state = state;
        }
        const data = await this.http.get('/api/jobs', params);
        // API returns {"jobs": [...], "total_count": ...}
        const jobs = typeof data === 'object' && data.jobs ? data.jobs : data;
        return (jobs || []).map(jobFromDict);
    }
    /**
     * Get job details
     */
    async get(jobId) {
        const data = await this.http.get(`/api/jobs/${jobId}`);
        return jobFromDict(data);
    }
    /**
     * Create a new job
     */
    async create(options) {
        const { image, command, gpuType = 'l40s', gpuCount = 1, region, runtime, interruptible = true, env, ports, auth, registryAuth, } = options;
        const payload = {
            docker_image: image,
            gpu_type: gpuType,
            gpu_count: gpuCount,
            interruptible,
            command: command ? Buffer.from(command).toString('base64') : '',
        };
        if (region)
            payload.region = region;
        if (runtime)
            payload.runtime = runtime;
        if (env)
            payload.env_vars = env;
        if (ports)
            payload.ports = ports;
        if (auth)
            payload.auth = auth;
        if (registryAuth)
            payload.registry_auth = registryAuth;
        const data = await this.http.post('/api/jobs', payload);
        return jobFromDict(data);
    }
    /**
     * Cancel a job
     */
    async cancel(jobId) {
        return await this.http.delete(`/api/jobs/${jobId}`);
    }
    /**
     * Extend job runtime
     */
    async extend(jobId, runtime) {
        const data = await this.http.patch(`/api/jobs/${jobId}`, { runtime });
        return jobFromDict(data);
    }
    /**
     * Get job logs
     */
    async logs(jobId) {
        const data = await this.http.get(`/api/jobs/${jobId}/logs`);
        return data.logs || '';
    }
    /**
     * Get job GPU metrics
     */
    async metrics(jobId) {
        const data = await this.http.get(`/api/jobs/${jobId}/metrics`);
        return jobMetricsFromDict(data);
    }
    /**
     * Get job auth token
     */
    async token(jobId) {
        const data = await this.http.get(`/api/jobs/${jobId}/token`);
        return data.token || '';
    }
}
// Utility functions for finding jobs
/**
 * Check if string looks like a UUID (job ID)
 */
export function isUuid(s) {
    return s.includes('-') && s.length > 30;
}
/**
 * Find job by UUID via direct API call
 */
export async function findById(jobs, jobId) {
    try {
        return await jobs.get(jobId);
    }
    catch {
        return null;
    }
}
/**
 * Find job by hostname (exact or prefix match)
 */
export function findByHostname(jobList, hostname) {
    for (const job of jobList) {
        if (job.hostname && (job.hostname === hostname || job.hostname.startsWith(hostname))) {
            return job;
        }
    }
    return null;
}
/**
 * Find job by IP address (extracted from hostname)
 */
export async function findByIp(jobList, ip) {
    const dns = await import('dns').then(m => m.promises);
    for (const job of jobList) {
        if (!job.hostname)
            continue;
        try {
            const addresses = await dns.resolve4(job.hostname);
            if (addresses.includes(ip)) {
                return job;
            }
        }
        catch {
            continue;
        }
    }
    return null;
}
/**
 * Find a job by UUID, hostname, or IP address
 */
export async function findJob(jobs, identifier, state) {
    // Try UUID first (direct API call)
    if (isUuid(identifier)) {
        return await findById(jobs, identifier);
    }
    // Get job list for hostname/IP search
    const jobList = await jobs.list(state);
    // Try hostname match
    const byHostname = findByHostname(jobList, identifier);
    if (byHostname) {
        return byHostname;
    }
    // Try IP match (slower, requires DNS lookup)
    return await findByIp(jobList, identifier);
}
//# sourceMappingURL=jobs.js.map