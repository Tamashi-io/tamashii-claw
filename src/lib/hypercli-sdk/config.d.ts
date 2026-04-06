export declare const CONFIG_DIR: string;
export declare const CONFIG_FILE: string;
export declare const DEFAULT_API_URL = "https://api.hypercli.com";
export declare const DEFAULT_WS_URL = "wss://api.hypercli.com";
export declare const DEFAULT_AGENTS_API_BASE_URL = "https://api.hypercli.com/agents";
export declare const DEFAULT_AGENTS_WS_URL = "wss://api.agents.hypercli.com/ws";
export declare const DEV_AGENTS_API_BASE_URL = "https://api.dev.hypercli.com/agents";
export declare const DEV_AGENTS_WS_URL = "wss://api.agents.dev.hypercli.com/ws";
export declare const WS_LOGS_PATH = "/orchestra/ws/logs";
export declare const GHCR_IMAGES = "ghcr.io/compute3ai/images";
export declare const COMFYUI_IMAGE = "ghcr.io/compute3ai/images/comfyui";
/**
 * Get config value: env var > config file > default
 */
export declare function getConfigValue(key: string, defaultValue?: string): string | undefined;
/**
 * Get API key from env or config file
 */
export declare function getApiKey(): string | undefined;
/**
 * Get agent API key, preferring the restricted agent token.
 */
export declare function getAgentApiKey(): string | undefined;
/**
 * Get API URL
 */
export declare function getApiUrl(): string;
/**
 * Get WebSocket URL
 */
export declare function getWsUrl(): string;
/**
 * Get HyperClaw agents API base URL
 */
export declare function getAgentsApiBaseUrl(dev?: boolean): string;
export declare function getAgentsApiBaseUrlFromProductBase(productBase: string): string;
/**
 * Get HyperClaw agents WebSocket URL
 */
export declare function getAgentsWsUrl(dev?: boolean): string;
export declare function getAgentsWsUrlFromProductBase(productBase: string): string;
/**
 * Save configuration to ~/.hypercli/config
 */
export declare function configure(apiKey: string, apiUrl?: string, agentsApiBaseUrl?: string, agentsWsUrl?: string): void;
//# sourceMappingURL=config.d.ts.map