/**
 * HyperClaw agents API - typed agent lifecycle, files, exec, and OpenClaw access.
 */
import { getAgentsApiBaseUrl, getConfigValue } from './config.js';
import { APIError } from './errors.js';
import { HTTPClient } from './http.js';
import { GatewayClient, } from './gateway.js';
const AGENTS_API_BASE = 'https://api.hypercli.com/agents';
const DEV_AGENTS_API_BASE = 'https://api.dev.hypercli.com/agents';
const DEPLOYMENTS_API_PREFIX = '/deployments';
const AGENTS_WS_URL = 'wss://api.agents.hypercli.com/ws';
const DEV_AGENTS_WS_URL = 'wss://api.agents.dev.hypercli.com/ws';
export const DEFAULT_OPENCLAW_IMAGE = 'ghcr.io/hypercli/hypercli-openclaw:prod';
const LAUNCH_CONFIG_KEYS = new Set(['image', 'env', 'routes', 'ports', 'command', 'entrypoint', 'sync_root', 'registry_url', 'registry_auth']);
const DEFAULT_OPENCLAW_SYNC_ROOT = '/home/ubuntu';
function parseDate(value) {
    if (typeof value !== 'string' || !value)
        return null;
    return new Date(value.replace('Z', '+00:00'));
}
function deepMergeConfig(base, patch) {
    const merged = structuredClone(base);
    for (const [key, value] of Object.entries(patch)) {
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            merged[key] &&
            typeof merged[key] === 'object' &&
            !Array.isArray(merged[key])) {
            merged[key] = deepMergeConfig(merged[key], value);
        }
        else {
            merged[key] = structuredClone(value);
        }
    }
    return merged;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function isDirectoryListingPayload(value) {
    if (!value || typeof value !== 'object')
        return false;
    const payload = value;
    return (payload.type === 'directory' &&
        Array.isArray(payload.directories) &&
        Array.isArray(payload.files));
}
function toWsBaseUrl(baseUrl) {
    const base = (baseUrl || '').replace(/\/+$/, '');
    if (!base)
        return '';
    if (base.startsWith('https://'))
        return `wss://${base.slice('https://'.length)}`;
    if (base.startsWith('http://'))
        return `ws://${base.slice('http://'.length)}`;
    return base;
}
function normalizeAgentsWsUrl(url) {
    const base = toWsBaseUrl(url);
    if (!base)
        return '';
    return base.endsWith('/ws') ? base : `${base}/ws`;
}
export function resolveAgentsApiBase(apiBase) {
    const raw = (apiBase || '').trim();
    if (!raw)
        return AGENTS_API_BASE;
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    const host = parsed.host.toLowerCase();
    if (normalizedPath.endsWith('/agents')) {
        return `${parsed.origin}${normalizedPath}`;
    }
    if (normalizedPath.endsWith('/api')) {
        if (host === 'api.agents.hypercli.com') {
            return AGENTS_API_BASE;
        }
        if (host === 'api.agents.dev.hypercli.com') {
            return DEV_AGENTS_API_BASE;
        }
        return `${parsed.origin}${normalizedPath.slice(0, -4)}/agents`;
    }
    if (host === 'api.agents.hypercli.com' || host === 'api.hypercli.com' || host === 'api.hyperclaw.app') {
        return AGENTS_API_BASE;
    }
    if (host === 'api.agents.dev.hypercli.com' ||
        host === 'api.dev.hypercli.com' ||
        host === 'api.dev.hyperclaw.app' ||
        host === 'dev-api.hyperclaw.app') {
        return DEV_AGENTS_API_BASE;
    }
    const normalized = raw.replace(/\/$/, '');
    return `${normalized}/agents`;
}
function defaultAgentsWsUrl(apiBase) {
    const resolvedApiBase = resolveAgentsApiBase(apiBase);
    const parsed = new URL(resolvedApiBase.includes('://') ? resolvedApiBase : `https://${resolvedApiBase}`);
    const host = parsed.host.toLowerCase();
    if (host === 'api.agents.hypercli.com' || host === 'api.hypercli.com' || host === 'api.hyperclaw.app')
        return AGENTS_WS_URL;
    if (host === 'api.agents.dev.hypercli.com' ||
        host === 'api.dev.hypercli.com' ||
        host === 'api.dev.hyperclaw.app' ||
        host === 'dev-api.hyperclaw.app') {
        return DEV_AGENTS_WS_URL;
    }
    return normalizeAgentsWsUrl(resolvedApiBase);
}
function randomHexToken(bytes) {
    const buffer = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(buffer);
    return Array.from(buffer, (value) => value.toString(16).padStart(2, '0')).join('');
}
function encodeFilePath(path) {
    return path
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean)
        .map((part) => encodeURIComponent(part))
        .join('/');
}
function decodeUtf8(content) {
    return new TextDecoder().decode(content);
}
function encodeUtf8(content) {
    return new TextEncoder().encode(content);
}
function toUint8Array(content) {
    if (typeof content === 'string')
        return encodeUtf8(content);
    if (content instanceof Uint8Array)
        return content;
    return new Uint8Array(content);
}
function execResultFromDict(data) {
    return {
        exitCode: data.exit_code ?? -1,
        stdout: data.stdout || '',
        stderr: data.stderr || '',
    };
}
function agentStateFromDict(data) {
    return {
        id: data.id ?? '',
        userId: data.user_id ?? '',
        podId: data.pod_id ?? '',
        podName: data.pod_name ?? '',
        state: data.state ?? 'unknown',
        name: data.name ?? null,
        cpu: data.cpu ?? 0,
        memory: data.memory ?? 0,
        hostname: data.hostname ?? null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        jwtToken: data.jwt_token ?? null,
        jwtExpiresAt: parseDate(data.jwt_expires_at),
        startedAt: parseDate(data.started_at),
        stoppedAt: parseDate(data.stopped_at),
        lastError: data.last_error ?? null,
        createdAt: parseDate(data.created_at),
        updatedAt: parseDate(data.updated_at),
        launchConfig: data.launch_config ?? null,
        routes: data.routes ?? {},
        command: data.command ?? [],
        entrypoint: data.entrypoint ?? [],
        ports: data.ports ?? [],
        dryRun: Boolean(data.dry_run),
    };
}
export function buildAgentConfig(config = {}, options = {}) {
    const preparedConfig = { ...config };
    const nestedLaunchKeys = Object.keys(preparedConfig).filter((key) => LAUNCH_CONFIG_KEYS.has(key));
    if (nestedLaunchKeys.length) {
        throw new Error(`Launch settings must be top-level fields, not nested under config: ${nestedLaunchKeys.join(', ')}`);
    }
    const env = { ...(options.env ?? {}) };
    let gatewayToken = options.gatewayToken?.trim() || env.OPENCLAW_GATEWAY_TOKEN?.trim() || '';
    if (!gatewayToken) {
        gatewayToken = randomHexToken(32);
    }
    env.OPENCLAW_GATEWAY_TOKEN = gatewayToken;
    const prepared = {};
    if (Object.keys(preparedConfig).length > 0)
        prepared.config = preparedConfig;
    if (Object.keys(env).length > 0)
        prepared.env = env;
    if (options.ports !== undefined && options.ports !== null)
        prepared.ports = options.ports;
    if (options.routes !== undefined && options.routes !== null)
        prepared.routes = options.routes;
    if (options.command !== undefined && options.command !== null)
        prepared.command = options.command;
    if (options.entrypoint !== undefined && options.entrypoint !== null)
        prepared.entrypoint = options.entrypoint;
    if (options.image !== undefined && options.image !== null)
        prepared.image = options.image;
    if (options.syncRoot !== undefined && options.syncRoot !== null)
        prepared.sync_root = options.syncRoot;
    if (options.syncEnabled !== undefined && options.syncEnabled !== null)
        prepared.sync_enabled = options.syncEnabled;
    if (options.registryUrl !== undefined && options.registryUrl !== null)
        prepared.registry_url = options.registryUrl;
    if (options.registryAuth !== undefined && options.registryAuth !== null)
        prepared.registry_auth = options.registryAuth;
    return { config: prepared, gatewayToken };
}
function defaultOpenClawImage(image) {
    if (image !== undefined && image !== null)
        return image;
    return DEFAULT_OPENCLAW_IMAGE;
}
export function buildOpenClawRoutes(options = {}) {
    const routes = {};
    if (options.includeGateway ?? true) {
        routes.openclaw = {
            port: options.gatewayPort ?? 18789,
            auth: options.gatewayAuth ?? false,
            prefix: options.gatewayPrefix ?? '',
        };
    }
    if (options.includeDesktop ?? true) {
        routes.desktop = {
            port: options.desktopPort ?? 3000,
            auth: options.desktopAuth ?? true,
            prefix: options.desktopPrefix ?? 'desktop',
        };
    }
    return routes;
}
async function getFsPromises() {
    return import('node:fs/promises');
}
function bindAgent(agent, deployments) {
    agent._deployments = deployments;
    return agent;
}
export class Agent {
    id;
    userId;
    podId;
    podName;
    state;
    name;
    cpu;
    memory;
    hostname;
    tags;
    jwtToken;
    jwtExpiresAt;
    startedAt;
    stoppedAt;
    lastError;
    createdAt;
    updatedAt;
    launchConfig;
    routes;
    command;
    entrypoint;
    ports;
    dryRun;
    _deployments = null;
    constructor(fields) {
        this.id = fields.id;
        this.userId = fields.userId;
        this.podId = fields.podId;
        this.podName = fields.podName;
        this.state = fields.state;
        this.name = fields.name ?? null;
        this.cpu = fields.cpu;
        this.memory = fields.memory;
        this.hostname = fields.hostname ?? null;
        this.tags = [...(fields.tags ?? [])];
        this.jwtToken = fields.jwtToken ?? null;
        this.jwtExpiresAt = fields.jwtExpiresAt ?? null;
        this.startedAt = fields.startedAt ?? null;
        this.stoppedAt = fields.stoppedAt ?? null;
        this.lastError = fields.lastError ?? null;
        this.createdAt = fields.createdAt ?? null;
        this.updatedAt = fields.updatedAt ?? null;
        this.launchConfig = fields.launchConfig ?? null;
        this.routes = { ...fields.routes };
        this.command = [...fields.command];
        this.entrypoint = [...fields.entrypoint];
        this.ports = [...fields.ports];
        this.dryRun = fields.dryRun;
    }
    static fromDict(data) {
        return new Agent(agentStateFromDict(data));
    }
    get publicUrl() {
        return this.hostname ? `https://${this.hostname}` : null;
    }
    routePrefix(routeName, defaultPrefix = null) {
        const route = this.routes[routeName] ?? {};
        const prefix = route.prefix;
        if (typeof prefix === 'undefined' || prefix === null) {
            return defaultPrefix;
        }
        return String(prefix);
    }
    routeUrl(routeName, defaultPrefix = null) {
        if (!this.hostname)
            return null;
        const prefix = this.routePrefix(routeName, defaultPrefix);
        if (prefix === null)
            return null;
        return prefix === '' ? `https://${this.hostname}` : `https://${prefix}-${this.hostname}`;
    }
    get desktopUrl() {
        return this.routeUrl('desktop', 'desktop');
    }
    get vncUrl() {
        return this.desktopUrl;
    }
    get shellUrl() {
        return this.routeUrl('shell');
    }
    get executorUrl() {
        return this.shellUrl;
    }
    get isRunning() {
        return this.state.toLowerCase() === 'running';
    }
    requireDeployments() {
        if (!this._deployments) {
            throw new Error('Agent is not bound to a Deployments client');
        }
        return this._deployments;
    }
    routeRequiresAuth(routeName, defaultValue = true) {
        const route = this.routes[routeName];
        if (!route || typeof route.auth === 'undefined') {
            return defaultValue;
        }
        return Boolean(route.auth);
    }
    async refreshToken() {
        const data = await this.requireDeployments().refreshToken(this.id);
        this.jwtToken = data.token ?? data.jwt ?? null;
        this.jwtExpiresAt = parseDate(data.expires_at);
        return data;
    }
    async waitRunning(timeoutMs = 300_000, pollIntervalMs = 5_000) {
        return this.requireDeployments().waitRunning(this.id, timeoutMs, pollIntervalMs);
    }
    async env() {
        const data = await this.requireDeployments().env(this.id);
        return data.env ?? {};
    }
    async exec(command, options = {}) {
        return this.requireDeployments().exec(this, command, options);
    }
    async health() {
        return this.requireDeployments().health(this);
    }
    async filesList(path = '') {
        return this.requireDeployments().filesList(this, path);
    }
    async fileReadBytes(path) {
        return this.requireDeployments().fileReadBytes(this, path);
    }
    async fileRead(path) {
        return decodeUtf8(await this.fileReadBytes(path));
    }
    async fileWriteBytes(path, content) {
        return this.requireDeployments().fileWriteBytes(this, path, content);
    }
    async fileWrite(path, content) {
        return this.requireDeployments().fileWrite(this, path, content);
    }
    async fileDelete(path, options = {}) {
        return this.requireDeployments().fileDelete(this, path, options);
    }
    async cpTo(localPath, remotePath) {
        return this.requireDeployments().cpTo(this, localPath, remotePath);
    }
    async cpFrom(remotePath, localPath) {
        return this.requireDeployments().cpFrom(this, remotePath, localPath);
    }
    async shellConnect(shell) {
        return this.requireDeployments().shellConnect(this.id, shell);
    }
}
export class OpenClawAgent extends Agent {
    gatewayUrl;
    gatewayToken;
    constructor(fields) {
        super(fields);
        this.gatewayUrl = fields.gatewayUrl ?? null;
        this.gatewayToken = fields.gatewayToken ?? null;
    }
    static fromDict(data) {
        return new OpenClawAgent({
            ...agentStateFromDict(data),
            gatewayUrl: data.openclaw_url ?? data.gateway_url ?? (data.hostname ? `wss://${data.hostname}` : null),
            gatewayToken: data.gateway_token ?? null,
        });
    }
    /**
     * Resolve the gateway token. If not set locally (e.g. page refresh),
     * fetches from the pod's runtime env via the backend.
     */
    async resolveGatewayToken() {
        if (this.gatewayToken)
            return this.gatewayToken;
        const tokenData = await this.requireDeployments().inferenceToken(this.id);
        this.gatewayToken = tokenData.gateway_token ?? null;
        this.gatewayUrl = tokenData.openclaw_url ?? this.gatewayUrl;
        return this.gatewayToken;
    }
    gateway(options = {}) {
        if (!this.gatewayUrl) {
            throw new Error('Agent has no OpenClaw gateway URL');
        }
        const deployments = this.requireDeployments();
        return new GatewayClient({
            url: this.gatewayUrl,
            token: undefined,
            gatewayToken: options.gatewayToken ?? this.gatewayToken ?? undefined,
            deploymentId: options.deploymentId ?? this.id,
            apiKey: options.apiKey ?? deployments.agentApiKey,
            apiBase: options.apiBase ?? deployments.agentApiBase,
            autoApprovePairing: options.autoApprovePairing ?? true,
            clientId: options.clientId,
            clientMode: options.clientMode,
            clientDisplayName: options.clientDisplayName,
            clientVersion: options.clientVersion,
            platform: options.platform,
            instanceId: options.instanceId,
            caps: options.caps,
            origin: options.origin,
            timeout: options.timeout,
            onHello: options.onHello,
            onClose: options.onClose,
            onGap: options.onGap,
            onPairing: options.onPairing,
        });
    }
    async connect(options = {}) {
        // Auto-resolve gateway token if missing
        if (!this.gatewayToken && !options.gatewayToken) {
            await this.resolveGatewayToken();
        }
        const client = this.gateway(options);
        await client.connect();
        return client;
    }
    async gatewayStatus(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.status();
        }
        finally {
            client.close();
        }
    }
    async waitReady(timeoutMs = 300_000, options = {}) {
        const client = this.gateway(options);
        try {
            return await client.waitReady(timeoutMs, {
                retryIntervalMs: options.retryIntervalMs,
                probe: options.probe,
            });
        }
        finally {
            client.close();
        }
    }
    async configGet(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.configGet();
        }
        finally {
            client.close();
        }
    }
    async configSchema(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.configSchema();
        }
        finally {
            client.close();
        }
    }
    async configPatch(patch, options = {}) {
        const client = await this.connect(options);
        try {
            await client.configPatch(patch);
        }
        finally {
            client.close();
        }
    }
    async configApply(config, options = {}) {
        const client = await this.connect(options);
        try {
            await client.configApply(config);
        }
        finally {
            client.close();
        }
    }
    async modelsList(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.modelsList();
        }
        finally {
            client.close();
        }
    }
    async sessionsList(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.sessionsList();
        }
        finally {
            client.close();
        }
    }
    async *chatSend(message, sessionKey, options = {}) {
        const client = await this.connect(options);
        try {
            for await (const event of client.chatSend(message, sessionKey, options.attachments)) {
                yield event;
            }
        }
        finally {
            client.close();
        }
    }
    async channelsStatus(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.channelsStatus(options.probe ?? false, options.timeoutMs);
        }
        finally {
            client.close();
        }
    }
    async channelsLogout(channel, accountId, options = {}) {
        const client = await this.connect(options);
        try {
            return await client.channelsLogout(channel, accountId);
        }
        finally {
            client.close();
        }
    }
    async webLoginStart(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.webLoginStart({
                force: options.force,
                timeoutMs: options.timeoutMs,
                verbose: options.verbose,
                accountId: options.accountId,
            });
        }
        finally {
            client.close();
        }
    }
    async webLoginWait(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.webLoginWait({
                timeoutMs: options.timeoutMs,
                accountId: options.accountId,
            });
        }
        finally {
            client.close();
        }
    }
    async workspaceFiles(options = {}) {
        const client = await this.connect(options);
        try {
            const agents = await client.agentsList();
            const agentId = agents[0]?.id ?? 'main';
            const files = await client.filesList(agentId);
            return { agentId, files };
        }
        finally {
            client.close();
        }
    }
    async fileGet(name, agentId, options = {}) {
        const client = await this.connect(options);
        try {
            let resolvedAgentId;
            if (agentId) {
                resolvedAgentId = agentId;
            }
            else {
                const agents = await client.agentsList();
                resolvedAgentId = agents[0]?.id ?? 'main';
            }
            return await client.fileGet(resolvedAgentId, name);
        }
        finally {
            client.close();
        }
    }
    async fileSet(name, content, agentId, options = {}) {
        const client = await this.connect(options);
        try {
            let resolvedAgentId;
            if (agentId) {
                resolvedAgentId = agentId;
            }
            else {
                const agents = await client.agentsList();
                resolvedAgentId = agents[0]?.id ?? 'main';
            }
            await client.fileSet(resolvedAgentId, name, content);
        }
        finally {
            client.close();
        }
    }
    async chatHistory(sessionKey, limit = 50, options = {}) {
        const client = await this.connect(options);
        try {
            return await client.chatHistory(sessionKey, limit);
        }
        finally {
            client.close();
        }
    }
    async chatSendMessage(message, options = {}) {
        const client = await this.connect(options);
        try {
            return await client.sendChat(message, options.sessionKey ?? 'main', options.agentId, options.attachments);
        }
        finally {
            client.close();
        }
    }
    async mutateConfig(mutator, options = {}) {
        const config = structuredClone(await this.configGet(options));
        await mutator(config);
        await this.configApply(config, options);
        return config;
    }
    async providerUpsert(providerId, providerConfig, gatewayOptions = {}) {
        const { api, baseUrl, apiKey, models, ...extra } = providerConfig;
        const config = await this.mutateConfig((next) => {
            const modelsCfg = (next.models ??= {});
            const providers = (modelsCfg.providers ??= {});
            const provider = { ...(providers[providerId] ?? {}) };
            provider.api = api;
            provider.baseUrl = baseUrl;
            if (apiKey !== undefined)
                provider.apiKey = apiKey;
            if (models !== undefined)
                provider.models = structuredClone(models);
            Object.assign(provider, extra);
            providers[providerId] = provider;
        }, gatewayOptions);
        return config.models?.providers?.[providerId] ?? {};
    }
    async providerRemove(providerId, options = {}) {
        const config = await this.mutateConfig((next) => {
            if (next.models?.providers) {
                delete next.models.providers[providerId];
            }
        }, options);
        return config.models?.providers ?? {};
    }
    async modelUpsert(providerId, modelId, modelConfig = {}, gatewayOptions = {}) {
        const config = await this.mutateConfig((next) => {
            const providers = ((next.models ??= {}).providers ??= {});
            const provider = { ...(providers[providerId] ?? {}) };
            const models = Array.isArray(provider.models)
                ? provider.models.map((entry) => ({ ...entry }))
                : [];
            let model = models.find((entry) => entry.id === modelId);
            if (!model) {
                model = { id: modelId };
                models.push(model);
            }
            Object.assign(model, modelConfig);
            provider.models = models;
            providers[providerId] = provider;
        }, gatewayOptions);
        return (config.models?.providers?.[providerId]?.models?.find((entry) => entry.id === modelId) ??
            {});
    }
    async modelRemove(providerId, modelId, options = {}) {
        const config = await this.mutateConfig((next) => {
            const providers = ((next.models ??= {}).providers ??= {});
            const provider = { ...(providers[providerId] ?? {}) };
            provider.models = Array.isArray(provider.models)
                ? provider.models.filter((entry) => entry.id !== modelId)
                : [];
            providers[providerId] = provider;
        }, options);
        return config.models?.providers?.[providerId]?.models ?? [];
    }
    async setDefaultModel(providerId, modelId, options = {}) {
        const primary = `${providerId}/${modelId}`;
        await this.mutateConfig((next) => {
            const defaults = ((next.agents ??= {}).defaults ??= {});
            const model = (defaults.model ??= {});
            model.primary = primary;
        }, options);
        return primary;
    }
    async setMemorySearch(memorySearchConfig, gatewayOptions = {}) {
        const { provider, model, baseUrl, apiKey, ...extra } = memorySearchConfig;
        const config = await this.mutateConfig((next) => {
            const defaults = ((next.agents ??= {}).defaults ??= {});
            const memorySearch = { ...(defaults.memorySearch ?? {}) };
            memorySearch.provider = provider;
            memorySearch.model = model;
            const remote = { ...(memorySearch.remote ?? {}) };
            if (baseUrl !== undefined)
                remote.baseUrl = baseUrl;
            if (apiKey !== undefined)
                remote.apiKey = apiKey;
            if (Object.keys(remote).length > 0)
                memorySearch.remote = remote;
            Object.assign(memorySearch, extra);
            defaults.memorySearch = memorySearch;
        }, gatewayOptions);
        return config.agents?.defaults?.memorySearch ?? {};
    }
    async channelUpsert(channelId, channelConfig, options = {}) {
        const { accountId, ...gatewayOptions } = options;
        const config = await this.mutateConfig((next) => {
            const channels = (next.channels ??= {});
            const current = channels[channelId] && typeof channels[channelId] === 'object'
                ? structuredClone(channels[channelId])
                : {};
            if (accountId) {
                const accounts = current.accounts && typeof current.accounts === 'object'
                    ? structuredClone(current.accounts)
                    : {};
                const currentAccount = accounts[accountId] && typeof accounts[accountId] === 'object'
                    ? accounts[accountId]
                    : {};
                accounts[accountId] = deepMergeConfig(currentAccount, channelConfig);
                current.accounts = accounts;
                channels[channelId] = current;
                return;
            }
            channels[channelId] = deepMergeConfig(current, channelConfig);
        }, gatewayOptions);
        const channel = config.channels?.[channelId] ?? {};
        if (accountId) {
            return channel.accounts?.[accountId] ?? {};
        }
        return channel;
    }
    async channelPatch(channelId, patch, options = {}) {
        return await this.channelUpsert(channelId, patch, options);
    }
    async telegramUpsert(channelConfig, options = {}) {
        return await this.channelUpsert('telegram', channelConfig, options);
    }
    async slackUpsert(channelConfig, options = {}) {
        return await this.channelUpsert('slack', channelConfig, options);
    }
    async discordUpsert(channelConfig, options = {}) {
        return await this.channelUpsert('discord', channelConfig, options);
    }
    async cronList(options = {}) {
        const client = await this.connect(options);
        try {
            return await client.cronList();
        }
        finally {
            client.close();
        }
    }
}
export class Deployments {
    http;
    apiKey;
    apiBase;
    agentsWsUrl;
    agentHttp;
    constructor(http, agentApiKey, agentApiBase, agentsWsUrl) {
        this.http = http;
        this.apiKey = agentApiKey || http.apiKey;
        this.apiBase = resolveAgentsApiBase(agentApiBase || getAgentsApiBaseUrl());
        this.agentsWsUrl = normalizeAgentsWsUrl(agentsWsUrl || getConfigValue('AGENTS_WS_URL') || defaultAgentsWsUrl(this.apiBase));
        this.agentHttp = http instanceof HTTPClient ? new HTTPClient(this.apiBase, this.apiKey) : http;
    }
    get agentApiKey() {
        return this.apiKey;
    }
    get agentApiBase() {
        return this.apiBase;
    }
    hydrateAgent(data) {
        const agent = data.openclaw_url || data.gateway_url
            ? OpenClawAgent.fromDict(data)
            : Agent.fromDict(data);
        return bindAgent(agent, this);
    }
    agentIdFor(target) {
        return typeof target === 'string' ? target : target.id;
    }
    async fetchRaw(path, init = {}) {
        const headers = new Headers(init.headers ?? {});
        headers.set('Authorization', `Bearer ${this.apiKey}`);
        const contentType = headers.get('Content-Type');
        const body = init.body && contentType?.includes('application/json') && typeof init.body !== 'string'
            ? JSON.stringify(init.body)
            : init.body;
        const response = await fetch(`${this.apiBase}${path}`, {
            ...init,
            headers,
            body,
        });
        if (!response.ok) {
            let detail = response.statusText;
            try {
                const payload = await response.clone().json();
                detail = typeof payload.detail === 'string' ? payload.detail : response.statusText;
            }
            catch {
                const text = await response.text();
                detail = text || response.statusText;
            }
            throw new APIError(response.status, detail);
        }
        return response;
    }
    async create(options = {}) {
        const { config, gatewayToken } = buildAgentConfig(options.config ?? {}, options);
        const body = { ...config, start: options.start ?? true };
        if (options.dryRun)
            body.dry_run = true;
        if (options.name)
            body.name = options.name;
        if (options.size)
            body.size = options.size;
        if (options.cpu !== undefined)
            body.cpu = options.cpu;
        if (options.memory !== undefined)
            body.memory = options.memory;
        if (options.tags?.length)
            body.tags = [...options.tags];
        const data = await this.agentHttp.post(DEPLOYMENTS_API_PREFIX, body);
        const agent = this.hydrateAgent(data);
        if (agent instanceof OpenClawAgent) {
            agent.gatewayToken = gatewayToken;
        }
        agent.launchConfig = config;
        agent.command = [...(config.command ?? [])];
        agent.entrypoint = [...(config.entrypoint ?? [])];
        return agent;
    }
    async createOpenClaw(options = {}) {
        const effectiveOptions = { ...options };
        if (options.routes === undefined) {
            effectiveOptions.routes = buildOpenClawRoutes(options.openClawRoutes ?? {});
        }
        effectiveOptions.image = defaultOpenClawImage(options.image);
        if (effectiveOptions.syncRoot === undefined)
            effectiveOptions.syncRoot = DEFAULT_OPENCLAW_SYNC_ROOT;
        if (effectiveOptions.syncEnabled === undefined)
            effectiveOptions.syncEnabled = true;
        return this.create(effectiveOptions);
    }
    async budget() {
        return this.agentHttp.get(`${DEPLOYMENTS_API_PREFIX}/budget`);
    }
    async metrics(agentId) {
        return this.agentHttp.get(`${DEPLOYMENTS_API_PREFIX}/${agentId}/metrics`);
    }
    async list() {
        const data = await this.agentHttp.get(DEPLOYMENTS_API_PREFIX);
        const items = Array.isArray(data) ? data : data.items ?? [];
        return items.map((item) => this.hydrateAgent(item));
    }
    async get(agentId) {
        const data = await this.agentHttp.get(`${DEPLOYMENTS_API_PREFIX}/${agentId}`);
        return this.hydrateAgent(data);
    }
    async waitRunning(agentId, timeoutMs = 300_000, pollIntervalMs = 5_000) {
        const deadline = Date.now() + timeoutMs;
        let lastState = '';
        while (Date.now() < deadline) {
            const agent = await this.get(agentId);
            lastState = String(agent.state || '');
            if (lastState.toLowerCase() === 'running') {
                return agent;
            }
            if (lastState.toLowerCase() === 'failed' || lastState.toLowerCase() === 'error') {
                throw new Error(`Agent entered ${lastState} while waiting for RUNNING`);
            }
            await sleep(pollIntervalMs);
        }
        throw new Error(`Timed out waiting for agent ${agentId} to reach RUNNING (last=${lastState})`);
    }
    async start(agentId, options = {}) {
        const { config, gatewayToken } = buildAgentConfig(options.config ?? {}, options);
        const body = { ...config };
        if (options.dryRun)
            body.dry_run = true;
        const data = await this.agentHttp.post(`${DEPLOYMENTS_API_PREFIX}/${agentId}/start`, body);
        const agent = this.hydrateAgent(data);
        if (agent instanceof OpenClawAgent) {
            agent.gatewayToken = gatewayToken;
        }
        agent.launchConfig = config;
        agent.command = [...(config.command ?? [])];
        agent.entrypoint = [...(config.entrypoint ?? [])];
        return agent;
    }
    async startOpenClaw(agentId, options = {}) {
        const effectiveOptions = { ...options };
        if (options.routes === undefined) {
            effectiveOptions.routes = buildOpenClawRoutes(options.openClawRoutes ?? {});
        }
        effectiveOptions.image = defaultOpenClawImage(options.image);
        if (effectiveOptions.syncRoot === undefined)
            effectiveOptions.syncRoot = DEFAULT_OPENCLAW_SYNC_ROOT;
        if (effectiveOptions.syncEnabled === undefined)
            effectiveOptions.syncEnabled = true;
        return this.start(agentId, effectiveOptions);
    }
    async stop(agentId) {
        const data = await this.agentHttp.post(`${DEPLOYMENTS_API_PREFIX}/${agentId}/stop`);
        return this.hydrateAgent(data);
    }
    async delete(agentId) {
        return this.agentHttp.delete(`${DEPLOYMENTS_API_PREFIX}/${agentId}`);
    }
    async refreshToken(agentId) {
        return this.agentHttp.get(`${DEPLOYMENTS_API_PREFIX}/${agentId}/token`);
    }
    async inferenceToken(agentId) {
        return this.agentHttp.get(`${DEPLOYMENTS_API_PREFIX}/${agentId}/inference/token`);
    }
    async createScopedKey(agentId, name) {
        const payload = {};
        if (name)
            payload.name = name;
        return this.agentHttp.post(`${DEPLOYMENTS_API_PREFIX}/${agentId}/keys`, Object.keys(payload).length ? payload : undefined);
    }
    async logsToken(agentId) {
        return this.agentHttp.post(`${DEPLOYMENTS_API_PREFIX}/${agentId}/logs/token`);
    }
    async env(agentId) {
        return this.agentHttp.get(`${DEPLOYMENTS_API_PREFIX}/${agentId}/env`);
    }
    async exec(target, command, options = {}) {
        const agentId = this.agentIdFor(target);
        const payload = {
            command,
            timeout: options.timeout ?? 30,
        };
        if (options.dryRun)
            payload.dry_run = true;
        const data = await this.agentHttp.post(`${DEPLOYMENTS_API_PREFIX}/${agentId}/exec`, payload);
        return execResultFromDict(data);
    }
    async health(target) {
        if (!target.executorUrl) {
            throw new Error('Agent has no executor URL');
        }
        const headers = {};
        if (target.jwtToken) {
            headers.Authorization = `Bearer ${target.jwtToken}`;
            headers.Cookie = `${target.podName}-token=${target.jwtToken}`;
        }
        const response = await fetch(`${target.executorUrl}/health`, { headers });
        if (!response.ok) {
            throw new Error(`Agent health failed: ${response.status} ${response.statusText}`);
        }
        return (await response.json());
    }
    async filesList(target, path = '') {
        const encodedPath = encodeFilePath(path);
        const suffix = encodedPath ? `/${encodedPath}` : '';
        const response = await this.fetchRaw(`${DEPLOYMENTS_API_PREFIX}/${this.agentIdFor(target)}/files${suffix}`);
        const payload = (await response.json());
        return [...(payload.directories ?? []), ...(payload.files ?? [])];
    }
    async fileReadBytes(target, path) {
        const encodedPath = encodeFilePath(path);
        const response = await this.fetchRaw(`${DEPLOYMENTS_API_PREFIX}/${this.agentIdFor(target)}/files/${encodedPath}`, {
            redirect: 'follow',
        });
        const bytes = new Uint8Array(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                const payload = JSON.parse(decodeUtf8(bytes));
                if (isDirectoryListingPayload(payload)) {
                    throw new Error(`Path is a directory: ${path}. Use filesList(path) instead.`);
                }
            }
            catch (error) {
                if (error instanceof Error && error.message.startsWith('Path is a directory:')) {
                    throw error;
                }
            }
        }
        return bytes;
    }
    async fileRead(target, path) {
        return decodeUtf8(await this.fileReadBytes(target, path));
    }
    async fileWriteBytes(target, path, content) {
        const response = await this.fetchRaw(`${DEPLOYMENTS_API_PREFIX}/${this.agentIdFor(target)}/files/${encodeFilePath(path)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: toUint8Array(content),
        });
        return (await response.json());
    }
    async fileWrite(target, path, content) {
        return this.fileWriteBytes(target, path, content);
    }
    async fileDelete(target, path, options = {}) {
        const encodedPath = encodeFilePath(path);
        const params = new URLSearchParams();
        if (options.recursive)
            params.set('recursive', 'true');
        const suffix = params.toString() ? `?${params.toString()}` : '';
        const response = await this.fetchRaw(`${DEPLOYMENTS_API_PREFIX}/${this.agentIdFor(target)}/files/${encodedPath}${suffix}`, { method: 'DELETE' });
        return (await response.json());
    }
    async cpTo(target, localPath, remotePath) {
        const fs = await getFsPromises();
        const content = await fs.readFile(localPath);
        return this.fileWriteBytes(target, remotePath, new Uint8Array(content));
    }
    async cpFrom(target, remotePath, localPath) {
        const fs = await getFsPromises();
        const content = await this.fileReadBytes(target, remotePath);
        const destination = new URL(`file://${localPath}`).pathname;
        const parts = destination.split('/');
        parts.pop();
        const parent = parts.join('/') || '/';
        await fs.mkdir(parent, { recursive: true });
        await fs.writeFile(destination, content);
        return destination;
    }
    async logsConnect(agentId, options = {}) {
        const tokenData = await this.logsToken(agentId);
        const container = options.container ?? 'reef';
        const tailLines = options.tailLines ?? 100;
        const wsUrl = `${this.agentsWsUrl}/logs/${agentId}` +
            `?jwt=${encodeURIComponent(tokenData.jwt)}` +
            `&container=${encodeURIComponent(container)}` +
            `&tail_lines=${encodeURIComponent(String(tailLines))}`;
        const ws = new WebSocket(wsUrl);
        return await new Promise((resolve, reject) => {
            let settled = false;
            ws.onopen = () => {
                settled = true;
                resolve(ws);
            };
            ws.onerror = () => {
                if (!settled) {
                    reject(new Error('WebSocket connection failed'));
                }
            };
        });
    }
    async shellToken(agentId, shell, dryRun = false) {
        const selectedShell = shell ?? '/bin/bash';
        const payload = { shell: selectedShell };
        if (dryRun)
            payload.dry_run = true;
        return this.agentHttp.post(`${DEPLOYMENTS_API_PREFIX}/${agentId}/shell/token`, payload);
    }
    async shellConnect(agentId, shell) {
        const connectWithShell = async (requestedShell) => {
            const tokenData = await this.shellToken(agentId, requestedShell);
            const baseUrl = `${this.agentsWsUrl}/shell/${agentId}`;
            const separator = baseUrl.includes("?") ? "&" : "?";
            const wsUrl = `${baseUrl}${separator}jwt=${encodeURIComponent(tokenData.jwt)}` +
                `&shell=${encodeURIComponent(tokenData.shell || requestedShell)}`;
            const ws = new WebSocket(wsUrl);
            return await new Promise((resolve, reject) => {
                let settled = false;
                ws.onopen = () => {
                    settled = true;
                    resolve(ws);
                };
                ws.onerror = () => {
                    if (!settled) {
                        reject(new Error('WebSocket connection failed'));
                    }
                };
            });
        };
        if (shell) {
            return connectWithShell(shell);
        }
        try {
            return await connectWithShell('/bin/bash');
        }
        catch {
            return connectWithShell('/bin/sh');
        }
    }
}
//# sourceMappingURL=agents.js.map