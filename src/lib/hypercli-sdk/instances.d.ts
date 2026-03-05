/**
 * Instances API - GPU types, regions, and pricing
 */
import type { HTTPClient } from './http.js';
export interface GPUConfig {
    gpuCount: number;
    cpuCores: number;
    memoryGb: number;
    storageGb: number;
    regions: string[];
}
export interface GPUType {
    id: string;
    name: string;
    description: string;
    configs: GPUConfig[];
}
export interface Region {
    id: string;
    description: string;
    country: string;
}
export interface PricingTier {
    region: string;
    onDemand: number | null;
    interruptible: number | null;
}
export interface GPUPricing {
    gpuType: string;
    gpuCount: number;
    tiers: PricingTier[];
}
export interface AvailableGPU {
    gpuType: string;
    gpuName: string;
    gpuCount: number;
    cpuCores: number;
    memoryGb: number;
    storageGb: number;
    region: string;
    regionName: string;
    country: string;
    priceSpot: number | null;
    priceOnDemand: number | null;
}
export declare class Instances {
    private http;
    private typesCache;
    private regionsCache;
    private pricingCache;
    constructor(http: HTTPClient);
    /**
     * Get available GPU types
     */
    types(refresh?: boolean): Promise<Record<string, GPUType>>;
    /**
     * Get available regions
     */
    regions(refresh?: boolean): Promise<Record<string, Region>>;
    /**
     * Get pricing information
     */
    pricing(refresh?: boolean): Promise<Record<string, GPUPricing>>;
    /**
     * Get a specific GPU type by ID
     */
    getType(gpuType: string): Promise<GPUType | null>;
    /**
     * Get a specific region by ID
     */
    getRegion(regionId: string): Promise<Region | null>;
    /**
     * Get price for a specific GPU configuration
     */
    getPrice(gpuType: string, gpuCount?: number, region?: string, interruptible?: boolean): Promise<number | null>;
    /**
     * Get real-time GPU capacity by type and region
     */
    capacity(gpuType?: string): Promise<any>;
    /**
     * List available GPU configurations, optionally filtered
     */
    listAvailable(gpuType?: string, region?: string): Promise<AvailableGPU[]>;
    /**
     * Get available regions for a GPU type and count
     */
    availableRegions(gpu: GPUType, gpuCount?: number): string[];
    /**
     * Get available GPU counts for a type
     */
    availableCounts(gpu: GPUType): number[];
}
//# sourceMappingURL=instances.d.ts.map