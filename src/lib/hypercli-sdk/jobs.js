import WebSocket from 'ws';
const TERMINAL_JOB_STATES = new Set(['succeeded', 'failed', 'terminated', 'canceled', 'cancelled']);
function parseRuntimeSeconds(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return null;
    return Math.max(Math.trunc(parsed), 0);
}
function parseTimestampSeconds(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value.getTime() / 1000 : null;
    }
    if (typeof value === 'string') {
        const direct = Number(value);
        if (Number.isFinite(direct)) {
            return direct;
        }
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed / 1000 : null;
    }
    return null;
}
function deriveRuntimeFields(data) {
    const runtimeSeconds = parseRuntimeSeconds(data?.runtime);
    if (runtimeSeconds === null) {
        return { elapsed: 0, timeLeft: 0 };
    }
    const state = String(data?.state ?? '').trim().toLowerCase();
    if (state === 'dry_run') {
        return { elapsed: 0, timeLeft: runtimeSeconds };
    }
    const startedAt = parseTimestampSeconds(data?.started_at);
    const createdAt = parseTimestampSeconds(data?.created_at);
    const completedAt = parseTimestampSeconds(data?.completed_at);
    let anchor = startedAt;
    if (anchor === null && (state === 'running' || completedAt !== null || TERMINAL_JOB_STATES.has(state))) {
        anchor = createdAt;
    }
    if (anchor === null) {
        return { elapsed: 0, timeLeft: runtimeSeconds };
    }
    const endTime = completedAt ?? (Date.now() / 1000);
    const elapsed = Math.max(Math.trunc(endTime - anchor), 0);
    if (completedAt !== null || TERMINAL_JOB_STATES.has(state)) {
        return { elapsed, timeLeft: 0 };
    }
    return { elapsed, timeLeft: Math.max(runtimeSeconds - elapsed, 0) };
}
function jobFromDict(data) {
    const { elapsed, timeLeft } = deriveRuntimeFields(data);
    return {
        jobId: data.job_id || '',
        jobKey: data.job_key || '',
        state: data.state || '',
        gpuType: data.gpu_type || '',
        gpuCount: data.gpu_count || 1,
        region: data.region || '',
        constraints: data.constraints || null,
        interruptible: data.interruptible !== false,
        pricePerHour: data.price_per_hour || 0,
        pricePerSecond: data.price_per_second || 0,
        dockerImage: data.docker_image || '',
        runtime: data.runtime || 0,
        elapsed,
        timeLeft,
        hostname: data.hostname || null,
        coldBoot: data.cold_boot ?? true,
        createdAt: data.created_at || null,
        startedAt: data.started_at || null,
        completedAt: data.completed_at || null,
        tags: data.tags || null,
    };
}
function normalizeTags(tags) {
    if (!tags)
        return undefined;
    if (Array.isArray(tags))
        return [...tags];
    return Object.entries(tags).map(([key, value]) => `${key}=${value}`);
}
function jobListPageFromDict(data) {
    const jobs = Array.isArray(data?.jobs) ? data.jobs.map(jobFromDict) : [];
    return {
        jobs,
        totalCount: Number(data?.total_count ?? jobs.length),
        page: Number(data?.page ?? 1),
        pageSize: Number(data?.page_size ?? (jobs.length || 50)),
    };
}
function execResultFromDict(data) {
    return {
        jobId: data.job_id || '',
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitCode: data.exit_code ?? -1,
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
    buildListParams(options = {}) {
        const params = {};
        if (options.state) {
            params.state = options.state;
        }
        const normalizedTags = normalizeTags(options.tags);
        if (normalizedTags && normalizedTags.length > 0) {
            params.tag = normalizedTags;
        }
        if (options.page !== undefined) {
            params.page = options.page;
        }
        if (options.pageSize !== undefined) {
            params.page_size = options.pageSize;
        }
        return params;
    }
    async list(stateOrOptions, tags) {
        let options;
        if (typeof stateOrOptions === 'string') {
            options = { state: stateOrOptions, tags };
        }
        else if (stateOrOptions) {
            options = stateOrOptions;
        }
        else {
            options = tags ? { tags } : {};
        }
        return (await this.listPage(options)).jobs;
    }
    async listPage(options = {}) {
        const data = await this.http.get('/api/jobs', this.buildListParams(options));
        if (typeof data === 'object' && data && Array.isArray(data.jobs)) {
            return jobListPageFromDict(data);
        }
        const jobs = (data || []).map(jobFromDict);
        return {
            jobs,
            totalCount: jobs.length,
            page: options.page ?? 1,
            pageSize: options.pageSize ?? (jobs.length || 50),
        };
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
        const { image, command, gpuType = 'l40s', gpuCount = 1, region, constraints, runtime, interruptible = true, env, ports, auth, registryAuth, tags, dockerfile, dryRun = false, } = options;
        const payload = {
            docker_image: image,
            gpu_type: gpuType,
            gpu_count: gpuCount,
            interruptible,
            command: command ? Buffer.from(command).toString('base64') : '',
        };
        if (region)
            payload.region = region;
        if (constraints)
            payload.constraints = constraints;
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
        const normalizedTags = normalizeTags(tags);
        if (normalizedTags)
            payload.tags = normalizedTags;
        if (dockerfile)
            payload.dockerfile = dockerfile;
        if (dryRun)
            payload.dry_run = true;
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
    /**
     * Execute a command non-interactively on a running job container.
     */
    async exec(jobId, command, timeout = 30) {
        const data = await this.http.post(`/api/jobs/${jobId}/exec`, {
            command,
            timeout,
        });
        return execResultFromDict(data);
    }
    /**
     * Connect to a job shell via director WebSocket proxy.
     */
    async shellConnect(jobId, shell = '/bin/bash') {
        const job = await this.get(jobId);
        const wsBase = this.http.baseUrl
            .replace('https://', 'wss://')
            .replace('http://', 'ws://')
            .replace(/\/api$/, '');
        const url = `${wsBase}/orchestra/ws/shell/${jobId}?token=${encodeURIComponent(job.jobKey)}&shell=${encodeURIComponent(shell)}`;
        return await new Promise((resolve, reject) => {
            const ws = new WebSocket(url);
            const onError = (err) => reject(err);
            ws.once('error', onError);
            ws.once('open', () => {
                ws.off('error', onError);
                resolve(ws);
            });
        });
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