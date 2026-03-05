function gpuConfigFromDict(data) {
    return {
        gpuCount: data.gpu_count || 1,
        cpuCores: data.cpu_cores || 0,
        memoryGb: data.memory_gb || 0,
        storageGb: data.storage_gb || 0,
        regions: data.regions || [],
    };
}
function gpuTypeFromDict(id, data) {
    return {
        id,
        name: data.name || id,
        description: data.description || '',
        configs: (data.configs || []).map(gpuConfigFromDict),
    };
}
function regionFromDict(id, data) {
    return {
        id,
        description: data.description || id,
        country: data.country || '',
    };
}
function pricingTierFromDict(region, data) {
    return {
        region,
        onDemand: data['on-demand'] ?? null,
        interruptible: data.interruptable ?? null, // Note: API has typo
    };
}
function gpuPricingFromKey(key, data) {
    // Parse key like "h100_x8" -> gpu_type="h100", gpu_count=8
    const parts = key.split('_x');
    const gpuType = parts[0];
    const gpuCount = parts.length > 1 ? parseInt(parts[1]) : 1;
    const tiers = Object.entries(data).map(([region, prices]) => pricingTierFromDict(region, prices));
    return { gpuType, gpuCount, tiers };
}
export class Instances {
    http;
    typesCache = null;
    regionsCache = null;
    pricingCache = null;
    constructor(http) {
        this.http = http;
    }
    /**
     * Get available GPU types
     */
    async types(refresh = false) {
        if (this.typesCache === null || refresh) {
            const data = await this.http.get('/instances/types');
            this.typesCache = {};
            for (const [id, info] of Object.entries(data)) {
                this.typesCache[id] = gpuTypeFromDict(id, info);
            }
        }
        return this.typesCache;
    }
    /**
     * Get available regions
     */
    async regions(refresh = false) {
        if (this.regionsCache === null || refresh) {
            const data = await this.http.get('/instances/regions');
            this.regionsCache = {};
            for (const [id, info] of Object.entries(data)) {
                this.regionsCache[id] = regionFromDict(id, info);
            }
        }
        return this.regionsCache;
    }
    /**
     * Get pricing information
     */
    async pricing(refresh = false) {
        if (this.pricingCache === null || refresh) {
            const data = await this.http.get('/instances/pricing');
            this.pricingCache = {};
            for (const [key, prices] of Object.entries(data)) {
                this.pricingCache[key] = gpuPricingFromKey(key, prices);
            }
        }
        return this.pricingCache;
    }
    /**
     * Get a specific GPU type by ID
     */
    async getType(gpuType) {
        const types = await this.types();
        return types[gpuType] || null;
    }
    /**
     * Get a specific region by ID
     */
    async getRegion(regionId) {
        const regions = await this.regions();
        return regions[regionId] || null;
    }
    /**
     * Get price for a specific GPU configuration
     */
    async getPrice(gpuType, gpuCount = 1, region, interruptible = true) {
        const key = `${gpuType}_x${gpuCount}`;
        const pricing = await this.pricing();
        const gpuPricing = pricing[key];
        if (gpuPricing && region) {
            for (const tier of gpuPricing.tiers) {
                if (tier.region === region) {
                    return interruptible ? tier.interruptible : tier.onDemand;
                }
            }
        }
        return null;
    }
    /**
     * Get real-time GPU capacity by type and region
     */
    async capacity(gpuType) {
        const params = {};
        if (gpuType) {
            params.gpu_type = gpuType;
        }
        return await this.http.get('/api/jobs/instances/capacity', params);
    }
    /**
     * List available GPU configurations, optionally filtered
     */
    async listAvailable(gpuType, region) {
        const types = await this.types();
        const regions = await this.regions();
        const pricing = await this.pricing();
        const results = [];
        for (const [typeId, gpu] of Object.entries(types)) {
            if (gpuType && typeId !== gpuType)
                continue;
            for (const config of gpu.configs) {
                if (!config.regions.length)
                    continue;
                if (region && !config.regions.includes(region))
                    continue;
                const key = `${typeId}_x${config.gpuCount}`;
                const gpuPricing = pricing[key];
                for (const r of config.regions) {
                    if (region && r !== region)
                        continue;
                    const regionInfo = regions[r];
                    let priceSpot = null;
                    let priceOnDemand = null;
                    if (gpuPricing) {
                        for (const tier of gpuPricing.tiers) {
                            if (tier.region === r) {
                                priceSpot = tier.interruptible;
                                priceOnDemand = tier.onDemand;
                                break;
                            }
                        }
                    }
                    results.push({
                        gpuType: typeId,
                        gpuName: gpu.name,
                        gpuCount: config.gpuCount,
                        cpuCores: config.cpuCores,
                        memoryGb: config.memoryGb,
                        storageGb: config.storageGb,
                        region: r,
                        regionName: regionInfo?.description || r,
                        country: regionInfo?.country || '',
                        priceSpot,
                        priceOnDemand,
                    });
                }
            }
        }
        return results;
    }
    /**
     * Get available regions for a GPU type and count
     */
    availableRegions(gpu, gpuCount = 1) {
        for (const config of gpu.configs) {
            if (config.gpuCount === gpuCount) {
                return config.regions;
            }
        }
        return [];
    }
    /**
     * Get available GPU counts for a type
     */
    availableCounts(gpu) {
        return gpu.configs.filter(c => c.regions.length > 0).map(c => c.gpuCount);
    }
}
//# sourceMappingURL=instances.js.map