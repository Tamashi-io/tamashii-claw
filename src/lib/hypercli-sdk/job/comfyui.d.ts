/**
 * ComfyUI job helpers and workflow conversion utilities
 */
import type { HyperCLI } from '../client.js';
import type { Job } from '../jobs.js';
import { BaseJob } from './base.js';
export declare const DEFAULT_OBJECT_INFO: Record<string, any>;
/**
 * Find nodes in API-format workflow by class_type and optional title pattern
 */
export declare function findNodes(workflow: Record<string, any>, classType: string, titleContains?: string): Array<[string, any]>;
/**
 * Find first node matching class_type and optional title pattern
 */
export declare function findNode(workflow: Record<string, any>, classType: string, titleContains?: string): [string, any] | [null, null];
/**
 * Apply parameters to workflow nodes
 */
export declare function applyParams(workflow: Record<string, any>, params: Record<string, any>): Record<string, any>;
/**
 * Convert ComfyUI graph format to API format
 */
export declare function graphToApi(graph: any, objectInfo?: Record<string, any>, _debug?: boolean): Record<string, any>;
/**
 * Apply graph modes (enable/disable nodes)
 */
export declare function applyGraphModes(graph: any, nodesConfig: Record<string, any>): any;
/**
 * ComfyUI-specific job with workflow execution helpers
 */
export declare class ComfyUIJob extends BaseJob {
    static DEFAULT_IMAGE: string;
    static DEFAULT_GPU_TYPE: string;
    static HEALTH_ENDPOINT: string;
    static COMFYUI_PORT: number;
    private _objectInfo;
    private _jobToken;
    private _useLb;
    useAuth: boolean;
    template: string | null;
    constructor(client: HyperCLI, job: Job, template?: string, useLb?: boolean, useAuth?: boolean);
    get useLb(): boolean;
    set useLb(value: boolean);
    get baseUrl(): string;
    get authHeaders(): Record<string, string>;
    jobToken(): Promise<string>;
    /**
     * Create a new ComfyUI job configured for a specific template
     */
    static createForTemplate(client: HyperCLI, template: string, options?: {
        gpuType?: string;
        gpuCount?: number;
        runtime?: number;
        lb?: number;
        auth?: boolean;
        [key: string]: any;
    }): Promise<ComfyUIJob>;
    /**
     * Get object_info from ComfyUI (cached)
     */
    getObjectInfo(refresh?: boolean): Promise<Record<string, any>>;
    /**
     * Convert graph format workflow to API format
     */
    convertWorkflow(graph: any, debug?: boolean): Promise<Record<string, any>>;
    /**
     * Upload image to ComfyUI server
     */
    uploadImage(filePath: string, filename?: string): Promise<string>;
    /**
     * Upload audio to ComfyUI server
     */
    uploadAudio(filePath: string, filename?: string): Promise<string>;
}
//# sourceMappingURL=comfyui.d.ts.map