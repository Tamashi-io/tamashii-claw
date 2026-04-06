/**
 * Voice capability API
 */
import type { HTTPClient } from './http.js';
export interface TTSOptions {
    text: string;
    voice?: string;
    language?: string;
    responseFormat?: string;
}
export interface CloneOptions {
    text: string;
    refAudio: Uint8Array | ArrayBuffer;
    language?: string;
    xVectorOnly?: boolean;
    responseFormat?: string;
}
export interface DesignOptions {
    text: string;
    description: string;
    language?: string;
    responseFormat?: string;
}
export declare class VoiceAPI {
    private http;
    constructor(http: HTTPClient);
    tts(options: TTSOptions): Promise<Uint8Array>;
    clone(options: CloneOptions): Promise<Uint8Array>;
    design(options: DesignOptions): Promise<Uint8Array>;
}
//# sourceMappingURL=voice.d.ts.map