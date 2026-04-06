import { Billing } from './billing.js';
export { GatewayClient, type GatewayOptions, type GatewayEvent, type ChatEvent, type ChatAttachment, type BrowserChatAttachment, type GatewayChatAttachmentPayload, type GatewayChatToolCall, type GatewayChatMessageSummary, type GatewayEventHandler, normalizeChatAttachments, extractGatewayChatThinking, extractGatewayChatMediaUrls, extractGatewayChatToolCalls, normalizeGatewayChatMessage, } from './gateway.js';
import { Instances } from './instances.js';
import { KeysAPI } from './keys.js';
import { UserAPI } from './user.js';
import { VoiceAPI } from './voice.js';
export { API_KEY_BASELINE_FAMILIES, type ApiKeyBaselineFamily, type ApiKeyBaselineValue, } from './keys.js';
export interface BrowserHyperCLIOptions {
    apiUrl: string;
    token: string;
    timeout?: number;
}
/**
 * Browser-safe HyperCLI client for JWT-authenticated frontend apps.
 */
export declare class BrowserHyperCLI {
    private readonly http;
    readonly billing: Billing;
    readonly user: UserAPI;
    readonly instances: Instances;
    readonly keys: KeysAPI;
    readonly voice: VoiceAPI;
    constructor(options: BrowserHyperCLIOptions);
}
//# sourceMappingURL=browser.d.ts.map