import { getAgentsApiBaseUrl } from './config.js';
function resolveHyperAgentBaseUrl(agentsApiBaseUrl, dev) {
    const raw = (agentsApiBaseUrl || '').replace(/\/+$/, '');
    if (!raw) {
        const fallback = getAgentsApiBaseUrl(dev);
        return resolveHyperAgentBaseUrl(fallback, dev);
    }
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = parsed.host.toLowerCase();
    if (host === 'api.hypercli.com' || host === 'api.hyperclaw.app' || host === 'api.agents.hypercli.com') {
        return 'https://api.agents.hypercli.com/v1';
    }
    if (host === 'api.dev.hypercli.com' ||
        host === 'api.dev.hyperclaw.app' ||
        host === 'dev-api.hyperclaw.app' ||
        host === 'api.agents.dev.hypercli.com') {
        return 'https://api.agents.dev.hypercli.com/v1';
    }
    if (raw.endsWith('/api')) {
        return `${raw.slice(0, -4)}/v1`;
    }
    if (raw.endsWith('/agents')) {
        return `${raw.slice(0, -7)}/v1`;
    }
    return `${raw}/v1`;
}
function hyperAgentPlanFromDict(data) {
    return {
        id: data.id,
        name: data.name,
        priceUsd: data.price_usd,
        tpmLimit: data.tpm_limit,
        rpmLimit: data.rpm_limit,
    };
}
function hyperAgentCurrentPlanFromDict(data) {
    return {
        id: data.id,
        name: data.name,
        price: data.price,
        aiu: data.aiu,
        agents: data.agents,
        tpmLimit: data.tpm_limit || 0,
        rpmLimit: data.rpm_limit || 0,
        expiresAt: data.expires_at ? new Date(String(data.expires_at).replace('Z', '+00:00')) : null,
        cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    };
}
function hyperAgentModelFromDict(data) {
    const caps = data.capabilities || {};
    return {
        id: data.id,
        name: data.name || data.id,
        contextLength: data.context_length || 0,
        supportsVision: caps.supports_vision || false,
        supportsFunctionCalling: caps.supports_function_calling || false,
        supportsToolChoice: caps.supports_tool_choice || false,
    };
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
export class HyperAgent {
    http;
    static AGENT_API_BASE = 'https://api.hypercli.com/v1';
    static DEV_API_BASE = 'https://api.dev.hypercli.com/v1';
    apiKey;
    baseUrl;
    constructor(http, agentApiKey, dev = false, agentsApiBaseUrl) {
        this.http = http;
        this.apiKey = agentApiKey || http['apiKey'];
        const fallbackBaseUrl = typeof http['baseUrl'] === 'string' ? http['baseUrl'] : (dev ? HyperAgent.DEV_API_BASE : HyperAgent.AGENT_API_BASE);
        const configuredBaseUrl = agentsApiBaseUrl || getAgentsApiBaseUrl(dev) || fallbackBaseUrl;
        this.baseUrl = resolveHyperAgentBaseUrl(configuredBaseUrl, dev);
    }
    get baseUrlWithoutV1() {
        return this.baseUrl.replace(/\/v1$/, '');
    }
    async plans() {
        const response = await fetch(`${this.baseUrlWithoutV1}/api/plans`, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get plans: ${response.statusText}`);
        }
        const data = await response.json();
        return (data.plans || []).map(hyperAgentPlanFromDict);
    }
    async currentPlan() {
        const response = await fetch(`${this.baseUrlWithoutV1}/api/plans/current`, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get current plan: ${response.statusText}`);
        }
        const data = await response.json();
        return hyperAgentCurrentPlanFromDict(data);
    }
    async models() {
        const response = await fetch(`${this.baseUrl}/models`, {
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get models: ${response.statusText}`);
        }
        const data = await response.json();
        return (data.data || []).map((model) => hyperAgentModelFromDict({
            id: model.id,
            name: model.name || model.id,
            context_length: model.context_length || 0,
            capabilities: model.capabilities || {},
        }));
    }
    async discoveryHealth() {
        const response = await fetch(`${this.baseUrlWithoutV1}/discovery/health`);
        if (!response.ok) {
            throw new Error(`Failed to get discovery health: ${response.statusText}`);
        }
        return (await response.json());
    }
    async discoveryConfig(apiKey) {
        const headers = {};
        if (apiKey) {
            headers['X-API-KEY'] = apiKey;
        }
        const response = await fetch(`${this.baseUrlWithoutV1}/discovery/config`, {
            headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to get discovery config: ${response.statusText}`);
        }
        return await response.json();
    }
}
//# sourceMappingURL=agent.js.map