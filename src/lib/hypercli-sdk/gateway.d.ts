/**
 * OpenClaw Gateway WebSocket Client
 *
 * Connects to an agent's OpenClaw gateway over WebSocket for real-time
 * configuration, chat, session management, and file operations.
 *
 * Protocol: OpenClaw Gateway v3
 */
export interface GatewayOptions {
    /** WebSocket URL (wss://openclaw-{agent}.hyperclaw.app) */
    url: string;
    /** JWT Bearer token for authentication */
    token: string;
    /** Gateway auth token for challenge-response (default: "traefik-forwarded-auth-not-used") */
    gatewayToken?: string;
    /** Client ID (default: "openclaw-control-ui") */
    clientId?: string;
    /** Client mode (default: "webchat") */
    clientMode?: string;
    /** Origin header (default: "https://hyperclaw.app") */
    origin?: string;
    /** Default RPC timeout in ms (default: 15000) */
    timeout?: number;
}
export interface GatewayEvent {
    type: string;
    event: string;
    payload: Record<string, any>;
    seq?: number;
}
export interface ChatEvent {
    type: 'content' | 'thinking' | 'tool_call' | 'tool_result' | 'done' | 'error';
    text?: string;
    data?: Record<string, any>;
}
export type GatewayEventHandler = (event: GatewayEvent) => void;
export declare class GatewayClient {
    private url;
    private token;
    private gatewayToken;
    private clientId;
    private clientMode;
    private origin;
    private defaultTimeout;
    private ws;
    private pending;
    private eventHandlers;
    private connected;
    private _version;
    private _protocol;
    constructor(options: GatewayOptions);
    get version(): string | null;
    get protocol(): number | null;
    get isConnected(): boolean;
    /** Subscribe to server-sent events */
    onEvent(handler: GatewayEventHandler): () => void;
    /** Connect and perform challenge-response handshake */
    connect(): Promise<void>;
    /** Close the connection */
    close(): void;
    private handleMessage;
    private rpc;
    configGet(): Promise<Record<string, any>>;
    configSchema(): Promise<Record<string, any>>;
    configPatch(patch: Record<string, any>): Promise<void>;
    configSet(config: Record<string, any>): Promise<void>;
    sessionsList(): Promise<any[]>;
    sessionsPreview(sessionKey: string, limit?: number): Promise<any[]>;
    sessionsReset(sessionKey: string): Promise<void>;
    chatSend(message: string, sessionKey: string): AsyncGenerator<ChatEvent>;
    filesList(agentId?: string): Promise<string[]>;
    fileGet(agentId: string, path: string): Promise<string>;
    fileSet(agentId: string, path: string, content: string): Promise<void>;
    agentsList(): Promise<any[]>;
    cronList(): Promise<any[]>;
    status(): Promise<Record<string, any>>;
}
//# sourceMappingURL=gateway.d.ts.map