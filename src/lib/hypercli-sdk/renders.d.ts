/**
 * Renders API - managed AI rendering workflows
 */
import type { HTTPClient } from './http.js';
export interface Render {
    renderId: string;
    state: string;
    template: string | null;
    renderType: string | null;
    resultUrl: string | null;
    error: string | null;
    createdAt: number | null;
    startedAt: number | null;
    completedAt: number | null;
}
export interface RenderStatus {
    renderId: string;
    state: string;
    progress: number | null;
}
export declare class Renders {
    private http;
    constructor(http: HTTPClient);
    /**
     * List all renders
     */
    list(options?: {
        state?: string;
        template?: string;
        type?: string;
    }): Promise<Render[]>;
    /**
     * Get render details
     */
    get(renderId: string): Promise<Render>;
    /**
     * Create a new render
     */
    create(params: Record<string, any>, renderType?: string, notifyUrl?: string): Promise<Render>;
    /**
     * Cancel a render
     */
    cancel(renderId: string): Promise<any>;
    /**
     * Get render status (lightweight polling endpoint)
     */
    status(renderId: string): Promise<RenderStatus>;
    private flow;
    /**
     * Generate an image using Qwen-Image
     */
    textToImage(options: {
        prompt: string;
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Generate an image using HiDream I1 Full
     */
    textToImageHidream(options: {
        prompt: string;
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Generate a video using Wan 2.2 14B
     */
    textToVideo(options: {
        prompt: string;
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Animate an image using Wan 2.2 Animate
     */
    imageToVideo(options: {
        prompt: string;
        imageUrl?: string;
        fileIds?: string[];
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Generate a lip-sync video using HuMo
     */
    speakingVideo(options: {
        prompt: string;
        imageUrl?: string;
        audioUrl?: string;
        fileIds?: string[];
        negative?: string;
        length?: number;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Generate an audio-driven video using Wan 2.2 S2V
     */
    speakingVideoWan(options: {
        prompt: string;
        imageUrl: string;
        audioUrl: string;
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Transform images using Qwen Image Edit
     */
    imageToImage(options: {
        prompt: string;
        imageUrls?: string[];
        fileIds?: string[];
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Generate video morphing between two images using Wan 2.2
     */
    firstLastFrameVideo(options: {
        prompt: string;
        startImageUrl?: string;
        endImageUrl?: string;
        fileIds?: string[];
        negative?: string;
        width?: number;
        height?: number;
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Transcribe audio/video to text using WhisperX
     */
    audioToText(options: {
        audioUrl?: string;
        fileIds?: string[];
        notifyUrl?: string;
    }): Promise<Render>;
    /**
     * Generate speech from text using Qwen3-TTS
     */
    textToSpeech(options: {
        text: string;
        mode?: string;
        language?: string;
        speaker?: string;
        style?: string;
        modelSize?: string;
        voiceDescription?: string;
        refAudioUrl?: string;
        fileIds?: string[];
        refText?: string;
        useXvectorOnly?: boolean;
        notifyUrl?: string;
    }): Promise<Render>;
}
//# sourceMappingURL=renders.d.ts.map