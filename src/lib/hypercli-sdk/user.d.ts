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
}
export declare class UserAPI {
    private http;
    constructor(http: HTTPClient);
    /**
     * Get current user info
     */
    get(): Promise<User>;
}
//# sourceMappingURL=user.d.ts.map