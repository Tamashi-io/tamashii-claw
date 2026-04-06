import { Billing } from './billing.js';
export { GatewayClient, normalizeChatAttachments, extractGatewayChatThinking, extractGatewayChatMediaUrls, extractGatewayChatToolCalls, normalizeGatewayChatMessage, } from './gateway.js';
import { HTTPClient } from './http.js';
import { Instances } from './instances.js';
import { KeysAPI, } from './keys.js';
import { UserAPI } from './user.js';
import { VoiceAPI } from './voice.js';
export { API_KEY_BASELINE_FAMILIES, } from './keys.js';
function normalizeApiUrl(apiUrl) {
    const trimmed = apiUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}
/**
 * Browser-safe HyperCLI client for JWT-authenticated frontend apps.
 */
export class BrowserHyperCLI {
    http;
    billing;
    user;
    instances;
    keys;
    voice;
    constructor(options) {
        const apiUrl = normalizeApiUrl(options.apiUrl);
        this.http = new HTTPClient(apiUrl, options.token, options.timeout);
        this.billing = new Billing(this.http);
        this.user = new UserAPI(this.http);
        this.instances = new Instances(this.http);
        this.keys = new KeysAPI(this.http);
        this.voice = new VoiceAPI(this.http);
    }
}
//# sourceMappingURL=browser.js.map