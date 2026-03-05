function clawKeyFromDict(data) {
    let expiresAt;
    if (typeof data.expires_at === 'string') {
        expiresAt = new Date(data.expires_at.replace('Z', '+00:00'));
    }
    else {
        expiresAt = new Date(data.expires_at);
    }
    return {
        key: data.key,
        planId: data.plan_id,
        expiresAt,
        tpmLimit: data.tpm_limit || 0,
        rpmLimit: data.rpm_limit || 0,
        userId: data.user_id || null,
    };
}
function clawPlanFromDict(data) {
    return {
        id: data.id,
        name: data.name,
        priceUsd: data.price_usd,
        tpmLimit: data.tpm_limit,
        rpmLimit: data.rpm_limit,
    };
}
function clawModelFromDict(data) {
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
export class Claw {
    http;
    static CLAW_API_BASE = 'https://api.hyperclaw.app/v1';
    static DEV_API_BASE = 'https://dev-api.hyperclaw.app/v1';
    apiKey;
    baseUrl;
    constructor(http, clawApiKey, dev = false) {
        this.http = http;
        this.apiKey = clawApiKey || http['apiKey'];
        this.baseUrl = dev ? Claw.DEV_API_BASE : Claw.CLAW_API_BASE;
    }
    get baseUrlWithoutV1() {
        return this.baseUrl.replace('/v1', '');
    }
    /**
     * Get current API key status and subscription details
     */
    async keyStatus() {
        const response = await fetch(`${this.baseUrlWithoutV1}/api/keys/status`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get key status: ${response.statusText}`);
        }
        const data = await response.json();
        return clawKeyFromDict(data);
    }
    /**
     * List available subscription plans
     */
    async plans() {
        const response = await fetch(`${this.baseUrlWithoutV1}/api/plans`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get plans: ${response.statusText}`);
        }
        const data = await response.json();
        return (data.plans || []).map(clawPlanFromDict);
    }
    /**
     * List available models
     */
    async models() {
        const response = await fetch(`${this.baseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to get models: ${response.statusText}`);
        }
        const data = await response.json();
        return (data.data || []).map((m) => clawModelFromDict({
            id: m.id,
            name: m.name || m.id,
            context_length: m.context_length || 0,
            capabilities: m.capabilities || {},
        }));
    }
    /**
     * Get discovery service health status
     */
    async discoveryHealth() {
        const response = await fetch(`${this.baseUrlWithoutV1}/discovery/health`);
        if (!response.ok) {
            throw new Error(`Failed to get discovery health: ${response.statusText}`);
        }
        return (await response.json());
    }
    /**
     * Get discovery service configuration (requires API key)
     */
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
//# sourceMappingURL=claw.js.map