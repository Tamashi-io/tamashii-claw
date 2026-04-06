import { HTTPClient } from './http.js';
import { GatewayClient, type ChatAttachment, type ChatEvent, type GatewayOptions, type GatewayWaitReadyOptions, type OpenClawConfigSchemaResponse } from './gateway.js';
export declare const DEFAULT_OPENCLAW_IMAGE = "ghcr.io/hypercli/hypercli-openclaw:prod";
export interface AgentExecResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
export interface AgentTokenResponse {
    agent_id?: string;
    pod_id?: string;
    token?: string;
    jwt?: string;
    expires_at?: string | null;
}
export interface AgentInferenceTokenResponse {
    agent_id?: string;
    openclaw_url?: string | null;
    gateway_token?: string | null;
}
export interface AgentShellTokenResponse {
    agent_id?: string;
    jwt: string;
    expires_at?: string | null;
    ws_url?: string;
    shell?: string | null;
    dry_run?: boolean;
}
export interface AgentLogsTokenResponse {
    agent_id?: string;
    jwt: string;
    expires_at?: string | null;
    ws_url?: string;
}
export interface AgentRouteConfig {
    port: number;
    prefix?: string;
    auth?: boolean;
    strip_prefix?: boolean;
    [key: string]: any;
}
export interface RegistryAuth {
    username?: string;
    password?: string;
    token?: string;
    [key: string]: any;
}
export interface BuildAgentConfigOptions {
    env?: Record<string, string>;
    ports?: Record<string, any>[] | null;
    routes?: Record<string, AgentRouteConfig> | null;
    command?: string[] | null;
    entrypoint?: string[] | null;
    image?: string | null;
    syncRoot?: string | null;
    syncEnabled?: boolean | null;
    registryUrl?: string | null;
    registryAuth?: RegistryAuth | null;
    gatewayToken?: string | null;
}
export interface OpenClawRouteOptions {
    includeGateway?: boolean;
    includeDesktop?: boolean;
    gatewayPort?: number;
    desktopPort?: number;
    gatewayAuth?: boolean;
    desktopAuth?: boolean;
    gatewayPrefix?: string;
    desktopPrefix?: string;
}
export interface CreateAgentOptions extends BuildAgentConfigOptions {
    name?: string;
    size?: string;
    cpu?: number;
    memory?: number;
    config?: Record<string, any>;
    tags?: string[];
    dryRun?: boolean;
    start?: boolean;
}
export interface StartAgentOptions extends BuildAgentConfigOptions {
    config?: Record<string, any>;
    dryRun?: boolean;
}
export interface OpenClawCreateAgentOptions extends CreateAgentOptions {
    openClawRoutes?: OpenClawRouteOptions | null;
}
export interface OpenClawStartAgentOptions extends StartAgentOptions {
    openClawRoutes?: OpenClawRouteOptions | null;
}
export interface AgentExecOptions {
    timeout?: number;
    dryRun?: boolean;
}
export interface AgentFileEntry {
    name: string;
    path: string;
    type: 'file' | 'directory';
    size?: number;
    size_formatted?: string;
    last_modified?: string;
    [key: string]: any;
}
export interface AgentDirectoryListing {
    type: 'directory';
    prefix: string;
    directories: AgentFileEntry[];
    files: AgentFileEntry[];
    truncated?: boolean;
    [key: string]: any;
}
export interface AgentStateFields {
    id: string;
    userId: string;
    podId: string;
    podName: string;
    state: string;
    name?: string | null;
    cpu: number;
    memory: number;
    hostname?: string | null;
    tags?: string[];
    jwtToken?: string | null;
    jwtExpiresAt?: Date | null;
    startedAt?: Date | null;
    stoppedAt?: Date | null;
    lastError?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    launchConfig?: Record<string, any> | null;
    routes: Record<string, AgentRouteConfig>;
    command: string[];
    entrypoint: string[];
    ports: Record<string, any>[];
    dryRun: boolean;
}
export interface AgentHydrationData {
    id?: string;
    user_id?: string;
    pod_id?: string;
    pod_name?: string;
    state?: string;
    name?: string | null;
    cpu?: number;
    memory?: number;
    hostname?: string | null;
    tags?: string[] | null;
    jwt_token?: string | null;
    jwt_expires_at?: string | null;
    started_at?: string | null;
    stopped_at?: string | null;
    last_error?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    launch_config?: Record<string, any> | null;
    routes?: Record<string, AgentRouteConfig> | null;
    command?: string[] | null;
    entrypoint?: string[] | null;
    ports?: Record<string, any>[] | null;
    dry_run?: boolean;
    openclaw_url?: string | null;
    gateway_url?: string | null;
    gateway_token?: string | null;
    [key: string]: any;
}
export declare function resolveAgentsApiBase(apiBase: string): string;
export declare function buildAgentConfig(config?: Record<string, any>, options?: BuildAgentConfigOptions): {
    config: Record<string, any>;
    gatewayToken: string;
};
export declare function buildOpenClawRoutes(options?: OpenClawRouteOptions): Record<string, AgentRouteConfig>;
export declare class Agent {
    readonly id: string;
    readonly userId: string;
    readonly podId: string;
    readonly podName: string;
    readonly state: string;
    readonly name: string | null;
    readonly cpu: number;
    readonly memory: number;
    readonly hostname: string | null;
    readonly tags: string[];
    jwtToken: string | null;
    jwtExpiresAt: Date | null;
    readonly startedAt: Date | null;
    readonly stoppedAt: Date | null;
    readonly lastError: string | null;
    readonly createdAt: Date | null;
    readonly updatedAt: Date | null;
    launchConfig: Record<string, any> | null;
    routes: Record<string, AgentRouteConfig>;
    command: string[];
    entrypoint: string[];
    ports: Record<string, any>[];
    readonly dryRun: boolean;
    _deployments: Deployments | null;
    constructor(fields: AgentStateFields);
    static fromDict(data: AgentHydrationData): Agent;
    get publicUrl(): string | null;
    protected routePrefix(routeName: string, defaultPrefix?: string | null): string | null;
    routeUrl(routeName: string, defaultPrefix?: string | null): string | null;
    get desktopUrl(): string | null;
    get vncUrl(): string | null;
    get shellUrl(): string | null;
    get executorUrl(): string | null;
    get isRunning(): boolean;
    protected requireDeployments(): Deployments;
    routeRequiresAuth(routeName: string, defaultValue?: boolean): boolean;
    refreshToken(): Promise<AgentTokenResponse>;
    waitRunning(timeoutMs?: number, pollIntervalMs?: number): Promise<Agent>;
    env(): Promise<Record<string, string>>;
    exec(command: string, options?: AgentExecOptions): Promise<AgentExecResult>;
    health(): Promise<Record<string, any>>;
    filesList(path?: string): Promise<AgentFileEntry[]>;
    fileReadBytes(path: string): Promise<Uint8Array>;
    fileRead(path: string): Promise<string>;
    fileWriteBytes(path: string, content: Uint8Array | ArrayBuffer | string): Promise<Record<string, any>>;
    fileWrite(path: string, content: string): Promise<Record<string, any>>;
    fileDelete(path: string, options?: {
        recursive?: boolean;
    }): Promise<Record<string, any>>;
    cpTo(localPath: string, remotePath: string): Promise<Record<string, any>>;
    cpFrom(remotePath: string, localPath: string): Promise<string>;
    shellConnect(shell?: string): Promise<WebSocket>;
}
export declare class OpenClawAgent extends Agent {
    gatewayUrl: string | null;
    gatewayToken: string | null;
    constructor(fields: AgentStateFields & {
        gatewayUrl?: string | null;
        gatewayToken?: string | null;
    });
    static fromDict(data: AgentHydrationData): OpenClawAgent;
    /**
     * Resolve the gateway token. If not set locally (e.g. page refresh),
     * fetches from the pod's runtime env via the backend.
     */
    resolveGatewayToken(): Promise<string | null>;
    gateway(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): GatewayClient;
    connect(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<GatewayClient>;
    gatewayStatus(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    waitReady(timeoutMs?: number, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & GatewayWaitReadyOptions): Promise<Record<string, any>>;
    configGet(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    configSchema(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<OpenClawConfigSchemaResponse>;
    configPatch(patch: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<void>;
    configApply(config: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<void>;
    modelsList(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<any[]>;
    sessionsList(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<any[]>;
    chatSend(message: string, sessionKey: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        attachments?: ChatAttachment[];
    }): AsyncGenerator<ChatEvent>;
    channelsStatus(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        probe?: boolean;
        timeoutMs?: number;
    }): Promise<Record<string, any>>;
    channelsLogout(channel: string, accountId?: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    webLoginStart(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        force?: boolean;
        timeoutMs?: number;
        verbose?: boolean;
        accountId?: string;
    }): Promise<Record<string, any>>;
    webLoginWait(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        timeoutMs?: number;
        accountId?: string;
    }): Promise<Record<string, any>>;
    workspaceFiles(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<{
        agentId: string;
        files: any[];
    }>;
    fileGet(name: string, agentId?: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<string>;
    fileSet(name: string, content: string, agentId?: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<void>;
    chatHistory(sessionKey?: string, limit?: number, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<any[]>;
    chatSendMessage(message: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        sessionKey?: string;
        agentId?: string;
        attachments?: ChatAttachment[];
    }): Promise<any>;
    private mutateConfig;
    providerUpsert(providerId: string, providerConfig: {
        api: string;
        baseUrl: string;
        apiKey?: string;
        models?: Array<Record<string, any>>;
        [key: string]: any;
    }, gatewayOptions?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    providerRemove(providerId: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    modelUpsert(providerId: string, modelId: string, modelConfig?: {
        name?: string;
        reasoning?: boolean;
        contextWindow?: number;
        maxTokens?: number;
        input?: string[];
        [key: string]: any;
    }, gatewayOptions?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    modelRemove(providerId: string, modelId: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Array<Record<string, any>>>;
    setDefaultModel(providerId: string, modelId: string, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<string>;
    setMemorySearch(memorySearchConfig: {
        provider: string;
        model: string;
        baseUrl?: string;
        apiKey?: string;
        [key: string]: any;
    }, gatewayOptions?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<Record<string, any>>;
    channelUpsert(channelId: string, channelConfig: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        accountId?: string;
    }): Promise<Record<string, any>>;
    channelPatch(channelId: string, patch: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        accountId?: string;
    }): Promise<Record<string, any>>;
    telegramUpsert(channelConfig: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        accountId?: string;
    }): Promise<Record<string, any>>;
    slackUpsert(channelConfig: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        accountId?: string;
    }): Promise<Record<string, any>>;
    discordUpsert(channelConfig: Record<string, any>, options?: Omit<Partial<GatewayOptions>, 'url' | 'token'> & {
        accountId?: string;
    }): Promise<Record<string, any>>;
    cronList(options?: Omit<Partial<GatewayOptions>, 'url' | 'token'>): Promise<any[]>;
}
export declare class Deployments {
    private readonly http;
    private readonly apiKey;
    private readonly apiBase;
    private readonly agentsWsUrl;
    private readonly agentHttp;
    constructor(http: HTTPClient, agentApiKey?: string, agentApiBase?: string, agentsWsUrl?: string);
    get agentApiKey(): string;
    get agentApiBase(): string;
    private hydrateAgent;
    private agentIdFor;
    private fetchRaw;
    create(options?: CreateAgentOptions): Promise<Agent>;
    createOpenClaw(options?: OpenClawCreateAgentOptions): Promise<Agent>;
    budget(): Promise<Record<string, any>>;
    metrics(agentId: string): Promise<Record<string, any>>;
    list(): Promise<Agent[]>;
    get(agentId: string): Promise<Agent>;
    waitRunning(agentId: string, timeoutMs?: number, pollIntervalMs?: number): Promise<Agent>;
    start(agentId: string, options?: StartAgentOptions): Promise<Agent>;
    startOpenClaw(agentId: string, options?: OpenClawStartAgentOptions): Promise<Agent>;
    stop(agentId: string): Promise<Agent>;
    delete(agentId: string): Promise<Record<string, any>>;
    refreshToken(agentId: string): Promise<AgentTokenResponse>;
    inferenceToken(agentId: string): Promise<AgentInferenceTokenResponse>;
    createScopedKey(agentId: string, name?: string): Promise<Record<string, any>>;
    logsToken(agentId: string): Promise<AgentLogsTokenResponse>;
    env(agentId: string): Promise<{
        agent_id: string;
        env: Record<string, string>;
    }>;
    exec(target: Agent | string, command: string, options?: AgentExecOptions): Promise<AgentExecResult>;
    health(target: Agent): Promise<Record<string, any>>;
    filesList(target: Agent | string, path?: string): Promise<AgentFileEntry[]>;
    fileReadBytes(target: Agent | string, path: string): Promise<Uint8Array>;
    fileRead(target: Agent | string, path: string): Promise<string>;
    fileWriteBytes(target: Agent | string, path: string, content: Uint8Array | ArrayBuffer | string): Promise<Record<string, any>>;
    fileWrite(target: Agent | string, path: string, content: string): Promise<Record<string, any>>;
    fileDelete(target: Agent | string, path: string, options?: {
        recursive?: boolean;
    }): Promise<Record<string, any>>;
    cpTo(target: Agent | string, localPath: string, remotePath: string): Promise<Record<string, any>>;
    cpFrom(target: Agent | string, remotePath: string, localPath: string): Promise<string>;
    logsConnect(agentId: string, options?: {
        tailLines?: number;
        container?: string;
    }): Promise<WebSocket>;
    shellToken(agentId: string, shell?: string, dryRun?: boolean): Promise<AgentShellTokenResponse>;
    shellConnect(agentId: string, shell?: string): Promise<WebSocket>;
}
//# sourceMappingURL=agents.d.ts.map