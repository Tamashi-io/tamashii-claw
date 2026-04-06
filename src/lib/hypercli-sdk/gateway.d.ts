/**
 * OpenClaw Gateway WebSocket Client
 *
 * Connects to an agent's OpenClaw gateway over WebSocket for real-time
 * configuration, chat, session management, and file operations.
 *
 * Protocol: OpenClaw Gateway v3
 */
export interface GatewayOptions {
    /** WebSocket URL for the agent gateway (typically wss://{agent-host}) */
    url: string;
    /** Optional legacy query token for edge/proxy auth. Gateway auth uses `gatewayToken`. */
    token?: string;
    /** Shared gateway auth token used in the WebSocket connect handshake. */
    gatewayToken?: string;
    /** Deployment id used for trusted pairing approval via agent exec. */
    deploymentId?: string;
    /** HyperCLI API bearer token used for trusted pairing approval via agent exec. */
    apiKey?: string;
    /** HyperCLI API base URL used for trusted pairing approval via agent exec. */
    apiBase?: string;
    /** Automatically approve first-time browser pairing using trusted agent exec. */
    autoApprovePairing?: boolean;
    /** Client ID (default: "cli") */
    clientId?: string;
    /** Client mode (default: "cli") */
    clientMode?: string;
    /** Optional client display name */
    clientDisplayName?: string;
    /** Client version sent to the gateway */
    clientVersion?: string;
    /** Client platform sent to the gateway */
    platform?: string;
    /** Optional client instance ID */
    instanceId?: string;
    /** Optional gateway capability list */
    caps?: string[];
    /** Origin header (default: omitted for non-browser SDK clients) */
    origin?: string;
    /** Default RPC timeout in ms (default: 15000) */
    timeout?: number;
    /** Called after a successful hello-ok response */
    onHello?: (hello: Record<string, any>) => void;
    /** Called after the socket closes */
    onClose?: (info: GatewayCloseInfo) => void;
    /** Called when an event sequence gap is detected */
    onGap?: (info: {
        expected: number;
        received: number;
    }) => void;
    /** Called when a browser device pairing request is pending or updated. */
    onPairing?: (pairing: GatewayPairingState | null) => void;
}
export interface GatewayEvent {
    type: string;
    event: string;
    payload: Record<string, any>;
    seq?: number;
}
export interface ChatEvent {
    type: "content" | "thinking" | "tool_call" | "tool_result" | "done" | "error";
    text?: string;
    data?: Record<string, any>;
}
export interface GatewayChatToolCall {
    id?: string;
    name: string;
    args?: unknown;
    result?: string;
}
export interface GatewayChatMessageSummary {
    role: string;
    text: string;
    thinking: string;
    toolCalls: GatewayChatToolCall[];
    mediaUrls: string[];
    timestamp?: number;
}
export interface GatewayChatAttachmentPayload {
    type: string;
    mimeType?: string;
    content?: string;
    fileName?: string;
    [key: string]: unknown;
}
export interface BrowserChatAttachment {
    id?: string;
    dataUrl: string;
    mimeType: string;
    fileName?: string;
}
export type ChatAttachment = GatewayChatAttachmentPayload | BrowserChatAttachment;
export interface GatewayCloseInfo {
    code: number;
    reason: string;
    error?: GatewayErrorShape | null;
}
export interface GatewayWaitReadyOptions {
    retryIntervalMs?: number;
    probe?: "config" | "status";
}
export interface GatewayPairingState {
    requestId: string;
    role: string;
    gatewayUrl: string;
    deviceId?: string;
    status: "pending" | "approving" | "approved" | "failed";
    updatedAtMs: number;
    error?: string;
}
export interface OpenClawConfigUiHint {
    label?: string;
    help?: string;
    tags?: string[];
    group?: string;
    order?: number;
    advanced?: boolean;
    sensitive?: boolean;
    placeholder?: string;
    itemTemplate?: unknown;
}
export interface OpenClawConfigSchemaResponse {
    schema: Record<string, any>;
    uiHints: Record<string, OpenClawConfigUiHint>;
    version?: string;
    generatedAt?: string;
}
export interface OpenClawConfigNodeDescriptor {
    schema: Record<string, any>;
    type?: string;
    properties: Record<string, Record<string, any>>;
    additionalProperties: boolean;
    additionalPropertySchema: Record<string, any> | null;
    isDynamicMap: boolean;
}
export type GatewayEventHandler = (event: GatewayEvent) => void;
type GatewayErrorShape = {
    code: string;
    message: string;
    details?: unknown;
};
export declare function normalizeChatAttachments(attachments?: ChatAttachment[]): GatewayChatAttachmentPayload[] | undefined;
export declare function extractGatewayChatThinking(message: unknown): string;
export declare function extractGatewayChatMediaUrls(message: unknown): string[];
export declare function extractGatewayChatToolCalls(message: unknown): GatewayChatToolCall[];
export declare function normalizeGatewayChatMessage(message: unknown): GatewayChatMessageSummary | null;
export declare function normalizeOpenClawConfigSchemaNode(value: unknown): Record<string, any>;
export declare function describeOpenClawConfigNode(value: unknown): OpenClawConfigNodeDescriptor;
export declare function createOpenClawConfigValue(value: unknown): unknown;
export declare function normalizeOpenClawConfigSchema(value: unknown): OpenClawConfigSchemaResponse | null;
export declare function resolveOpenClawConfigUiHint(source: OpenClawConfigSchemaResponse | Record<string, OpenClawConfigUiHint> | null | undefined, path: string): {
    path: string;
    hint: OpenClawConfigUiHint;
} | null;
export declare class GatewayClient {
    private url;
    private token?;
    private gatewayToken?;
    private deploymentId?;
    private apiKey?;
    private apiBase?;
    private autoApprovePairing;
    private clientId;
    private clientMode;
    private clientDisplayName?;
    private clientVersion;
    private clientPlatform;
    private clientInstanceId?;
    private caps;
    private origin?;
    private defaultTimeout;
    private ws;
    private pending;
    private eventHandlers;
    private connected;
    private closed;
    private reconnectTimer;
    private connectTimer;
    private backoffMs;
    private connectNonce;
    private connectSent;
    private pendingConnectError;
    private pairingState;
    private autoApproveAttemptedRequestIds;
    private deviceTokenMismatchRetried;
    private lastSeq;
    private connectPromise;
    private resolveConnectPromise;
    private rejectConnectPromise;
    private _version;
    private _protocol;
    onDisconnect: (() => void) | null;
    constructor(options: GatewayOptions);
    private readonly onHello?;
    private readonly onClose?;
    private readonly onGap?;
    private readonly onPairing?;
    get version(): string | null;
    get protocol(): number | null;
    get isConnected(): boolean;
    get pendingPairing(): GatewayPairingState | null;
    /** Update the gateway token for subsequent connect attempts. */
    setGatewayToken(token: string): void;
    private storageScope;
    /** Subscribe to server-sent events */
    onEvent(handler: GatewayEventHandler): () => void;
    /** Connect and keep reconnecting until stopped */
    connect(): Promise<void>;
    start(): Promise<void>;
    /** Close permanently and stop reconnecting */
    close(): void;
    stop(): void;
    private updatePairingState;
    private canAutoApprovePairing;
    private approvePairingRequest;
    private openSocket;
    private queueConnect;
    private scheduleReconnect;
    private flushPending;
    private handleClose;
    private sendConnect;
    private handleMessage;
    private sendRawRequest;
    private rpc;
    request<T = any>(method: string, params?: Record<string, any>, timeout?: number): Promise<T>;
    configGet(): Promise<Record<string, any>>;
    configSchema(): Promise<OpenClawConfigSchemaResponse>;
    configPatch(patch: Record<string, any>): Promise<void>;
    configApply(config: Record<string, any>): Promise<void>;
    configSet(config: Record<string, any>): Promise<void>;
    modelsList(): Promise<any[]>;
    waitReady(timeoutMs?: number, options?: GatewayWaitReadyOptions): Promise<Record<string, any>>;
    channelsStatus(probe?: boolean, timeoutMs?: number): Promise<Record<string, any>>;
    channelsLogout(channel: string, accountId?: string): Promise<Record<string, any>>;
    webLoginStart(options?: {
        force?: boolean;
        timeoutMs?: number;
        verbose?: boolean;
        accountId?: string;
    }): Promise<Record<string, any>>;
    webLoginWait(options?: {
        timeoutMs?: number;
        accountId?: string;
    }): Promise<Record<string, any>>;
    sessionsList(): Promise<any[]>;
    sessionsPreview(sessionKey: string, limit?: number): Promise<any[]>;
    sessionsPatch(patch: Record<string, any> & {
        key: string;
    }): Promise<Record<string, any>>;
    chatHistory(sessionKey?: string, limit?: number): Promise<any[]>;
    chatAbort(sessionKey?: string): Promise<void>;
    sendChat(message: string, sessionKey?: string, agentId?: string, attachments?: ChatAttachment[]): Promise<any>;
    sessionsReset(sessionKey: string, reason?: "new" | "reset"): Promise<void>;
    chatSend(message: string, sessionKey: string, attachments?: ChatAttachment[]): AsyncGenerator<ChatEvent>;
    filesList(agentId?: string): Promise<any[]>;
    fileGet(agentId: string, name: string): Promise<string>;
    fileSet(agentId: string, name: string, content: string): Promise<void>;
    agentsList(): Promise<any[]>;
    agentGet(agentId?: string): Promise<any>;
    cronList(): Promise<any[]>;
    cronAdd(job: Record<string, any>): Promise<any>;
    cronRemove(jobId: string): Promise<void>;
    cronRun(jobId: string): Promise<any>;
    execApprove(execId: string): Promise<void>;
    execDeny(execId: string): Promise<void>;
    status(): Promise<Record<string, any>>;
}
export {};
//# sourceMappingURL=gateway.d.ts.map