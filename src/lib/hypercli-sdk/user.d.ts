/**
 * User API - current user information
 */
import type { HTTPClient } from './http.js';
export interface User {
    userId: string;
    email: string | null;
    name: string | null;
    isActive: boolean;
    createdAt: string;
    emailVerified?: boolean;
    updatedAt?: string;
    userType?: string | null;
    meta?: string | null;
}
export interface AuthMe {
    userId: string;
    orchestraUserId: string | null;
    teamId: string;
    planId: string;
    email: string | null;
    authType: string;
    capabilities: string[];
    hasActiveSubscription: boolean;
    keyId: string | null;
    keyName: string | null;
}
export interface UpdateUserOptions {
    name?: string;
    email?: string;
}
export declare class UserAPI {
    private http;
    private authHttp;
    constructor(http: HTTPClient, authHttp?: HTTPClient);
    /**
     * Get current user info
     */
    get(): Promise<User>;
    /**
     * Resolve the current auth context, including key capabilities.
     */
    authMe(): Promise<AuthMe>;
    /**
     * Update the current user profile.
     */
    update(options: UpdateUserOptions): Promise<User>;
}
//# sourceMappingURL=user.d.ts.map