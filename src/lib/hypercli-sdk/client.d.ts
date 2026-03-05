import { Billing } from './billing.js';
import { Jobs } from './jobs.js';
import { UserAPI } from './user.js';
import { Instances } from './instances.js';
import { Renders } from './renders.js';
import { Files } from './files.js';
import { Claw } from './claw.js';
import { KeysAPI } from './keys.js';
export interface HyperCLIOptions {
    apiKey?: string;
    apiUrl?: string;
    clawApiKey?: string;
    clawDev?: boolean;
    timeout?: number;
}
/**
 * HyperCLI API Client
 *
 * @example
 * ```typescript
 * import { HyperCLI } from '@hypercli/sdk';
 *
 * const client = new HyperCLI(); // Uses HYPERCLI_API_KEY from env or ~/.hypercli/config
 * // or
 * const client = new HyperCLI({ apiKey: 'your_key' });
 *
 * // Billing
 * const balance = await client.billing.balance();
 * console.log(`Balance: $${balance.total}`);
 *
 * // Jobs
 * const job = await client.jobs.create({
 *   image: 'nvidia/cuda:12.0',
 *   gpuType: 'l40s',
 *   command: 'python train.py',
 * });
 * console.log(`Job: ${job.jobId}`);
 *
 * // User
 * const user = await client.user.get();
 * ```
 */
export declare class HyperCLI {
    private _apiKey;
    private _apiUrl;
    private _http;
    readonly billing: Billing;
    readonly jobs: Jobs;
    readonly user: UserAPI;
    readonly instances: Instances;
    readonly renders: Renders;
    readonly files: Files;
    readonly keys: KeysAPI;
    readonly claw: Claw;
    constructor(options?: HyperCLIOptions);
    get apiUrl(): string;
    get apiKey(): string;
}
//# sourceMappingURL=client.d.ts.map