function encodeBase64(bytes) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return Buffer.from(data).toString('base64');
}
export class VoiceAPI {
    http;
    constructor(http) {
        this.http = http;
    }
    async tts(options) {
        return this.http.postBytes('/agents/voice/tts', {
            text: options.text,
            voice: options.voice ?? 'Chelsie',
            language: options.language ?? 'auto',
            response_format: options.responseFormat ?? 'mp3',
        });
    }
    async clone(options) {
        return this.http.postBytes('/agents/voice/clone', {
            text: options.text,
            ref_audio_base64: encodeBase64(options.refAudio),
            language: options.language ?? 'auto',
            x_vector_only: options.xVectorOnly ?? true,
            response_format: options.responseFormat ?? 'mp3',
        });
    }
    async design(options) {
        return this.http.postBytes('/agents/voice/design', {
            text: options.text,
            instruct: options.description,
            language: options.language ?? 'auto',
            response_format: options.responseFormat ?? 'mp3',
        });
    }
}
//# sourceMappingURL=voice.js.map