import { APIError } from './errors.js';
function renderFromDict(data) {
    return {
        renderId: data.id || data.render_id || '',
        state: data.state || '',
        template: data.template || data.meta?.template || null,
        renderType: data.type || data.render_type || null,
        tags: Array.isArray(data.tags) ? data.tags : null,
        resultUrl: data.result_url || null,
        error: data.error || null,
        createdAt: data.created_at || null,
        startedAt: data.started_at || null,
        completedAt: data.completed_at || null,
    };
}
function renderStatusFromDict(data) {
    return {
        renderId: data.id || data.render_id || '',
        state: data.state || '',
        progress: data.progress ?? null,
    };
}
export class Renders {
    http;
    authHttp;
    authMeCache = null;
    constructor(http, authHttp = http) {
        this.http = http;
        this.authHttp = authHttp;
    }
    async authMe() {
        if (this.authMeCache == null) {
            this.authMeCache = await this.authHttp.get('/api/auth/me');
        }
        return this.authMeCache;
    }
    async supportsSubscriptionFamily(family, resource) {
        try {
            const authMe = await this.authMe();
            if (!authMe?.has_active_subscription) {
                return false;
            }
            if (authMe.auth_type === 'user') {
                return true;
            }
            const capabilities = new Set(Array.isArray(authMe.capabilities) ? authMe.capabilities : []);
            if (capabilities.has(`${family}:*`)) {
                return true;
            }
            return Boolean(resource && capabilities.has(`${family}:${resource}`));
        }
        catch (error) {
            if (error instanceof APIError) {
                return false;
            }
            throw error;
        }
    }
    async postFlow(flowType, payload) {
        const primary = (await this.supportsSubscriptionFamily('flows', flowType))
            ? `/agents/flow/${flowType}`
            : `/api/flow/${flowType}`;
        try {
            return await this.http.post(primary, payload);
        }
        catch (error) {
            if (primary.startsWith('/agents/flow/') && error instanceof APIError && (error.statusCode === 403 || error.statusCode === 404)) {
                return await this.http.post(`/api/flow/${flowType}`, payload);
            }
            throw error;
        }
    }
    async getRender(renderId, status = false) {
        const suffix = status ? '/status' : '';
        const primary = (await this.supportsSubscriptionFamily('flows'))
            ? `/agents/flow/renders/${renderId}${suffix}`
            : `/api/renders/${renderId}${suffix}`;
        try {
            return await this.http.get(primary);
        }
        catch (error) {
            if (primary.startsWith('/agents/flow/') && error instanceof APIError && (error.statusCode === 403 || error.statusCode === 404)) {
                return await this.http.get(`/api/renders/${renderId}${suffix}`);
            }
            throw error;
        }
    }
    async deleteRender(renderId) {
        const primary = (await this.supportsSubscriptionFamily('flows'))
            ? `/agents/flow/renders/${renderId}`
            : `/api/renders/${renderId}`;
        try {
            return await this.http.delete(primary);
        }
        catch (error) {
            if (primary.startsWith('/agents/flow/') && error instanceof APIError && (error.statusCode === 403 || error.statusCode === 404)) {
                return await this.http.delete(`/api/renders/${renderId}`);
            }
            throw error;
        }
    }
    /**
     * List all renders
     */
    async list(options) {
        const params = {};
        if (options?.state)
            params.state = options.state;
        if (options?.template)
            params.template = options.template;
        if (options?.type)
            params.type = options.type;
        if (options?.tags?.length) {
            params.tag = [...options.tags];
        }
        const data = await this.http.get('/api/renders', params);
        const items = typeof data === 'object' && data.items ? data.items : data;
        return (items || []).map(renderFromDict);
    }
    /**
     * Get render details
     */
    async get(renderId) {
        const data = await this.getRender(renderId);
        return renderFromDict(data);
    }
    /**
     * Create a new render
     */
    async create(params, renderType = 'comfyui', notifyUrl, tags) {
        const payload = {
            type: renderType,
            params,
        };
        if (notifyUrl) {
            payload.notify_url = notifyUrl;
        }
        if (tags?.length) {
            payload.tags = [...tags];
        }
        const data = await this.http.post('/api/renders', payload);
        return renderFromDict(data);
    }
    /**
     * Cancel a render
     */
    async cancel(renderId) {
        return await this.deleteRender(renderId);
    }
    /**
     * Get render status (lightweight polling endpoint)
     */
    async status(renderId) {
        const data = await this.getRender(renderId, true);
        return renderStatusFromDict(data);
    }
    // =========================================================================
    // Flow endpoints - simplified interfaces
    // =========================================================================
    async flow(flowType, params) {
        // Filter out null/undefined values
        const payload = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined) {
                payload[key] = value;
            }
        }
        const data = await this.postFlow(flowType, payload);
        return renderFromDict(data);
    }
    /**
     * Generate an image using Qwen-Image
     */
    async textToImage(options) {
        return this.flow('text-to-image', {
            prompt: options.prompt,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Generate an image using HiDream I1 Full
     */
    async textToImageHidream(options) {
        return this.flow('text-to-image-hidream', {
            prompt: options.prompt,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Generate a video using Wan 2.2 14B
     */
    async textToVideo(options) {
        return this.flow('text-to-video', {
            prompt: options.prompt,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Animate an image using Wan 2.2 Animate
     */
    async imageToVideo(options) {
        return this.flow('image-to-video', {
            prompt: options.prompt,
            image_url: options.imageUrl,
            file_ids: options.fileIds,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Generate a lip-sync video using HuMo
     */
    async speakingVideo(options) {
        return this.flow('speaking-video', {
            prompt: options.prompt,
            image_url: options.imageUrl,
            audio_url: options.audioUrl,
            file_ids: options.fileIds,
            negative: options.negative,
            length: options.length,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Generate an audio-driven video using Wan 2.2 S2V
     */
    async speakingVideoWan(options) {
        return this.flow('speaking-video-wan', {
            prompt: options.prompt,
            image_url: options.imageUrl,
            audio_url: options.audioUrl,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Transform images using Qwen Image Edit
     */
    async imageToImage(options) {
        return this.flow('image-to-image', {
            prompt: options.prompt,
            image_urls: options.imageUrls,
            file_ids: options.fileIds,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Generate video morphing between two images using Wan 2.2
     */
    async firstLastFrameVideo(options) {
        return this.flow('first-last-frame-video', {
            prompt: options.prompt,
            start_image_url: options.startImageUrl,
            end_image_url: options.endImageUrl,
            file_ids: options.fileIds,
            negative: options.negative,
            width: options.width,
            height: options.height,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Transcribe audio/video to text using WhisperX
     */
    async audioToText(options) {
        return this.flow('audio-to-text', {
            audio_url: options.audioUrl,
            file_ids: options.fileIds,
            notify_url: options.notifyUrl,
        });
    }
    /**
     * Generate speech from text using Qwen3-TTS
     */
    async textToSpeech(options) {
        return this.flow('text-to-speech', {
            text: options.text,
            mode: options.mode,
            language: options.language,
            speaker: options.speaker,
            style: options.style,
            model_size: options.modelSize,
            voice_description: options.voiceDescription,
            ref_audio_url: options.refAudioUrl,
            file_ids: options.fileIds,
            ref_text: options.refText,
            use_xvector_only: options.useXvectorOnly,
            notify_url: options.notifyUrl,
        });
    }
}
//# sourceMappingURL=renders.js.map