function userFromDict(data) {
    return {
        userId: data.user_id || '',
        email: data.email || null,
        name: data.name || null,
        isActive: data.is_active !== false,
        createdAt: data.created_at || '',
        emailVerified: data.email_verified,
        updatedAt: data.updated_at || '',
        userType: data.user_type ?? null,
        meta: data.meta ?? null,
    };
}
function authMeFromDict(data) {
    return {
        userId: data.user_id || '',
        orchestraUserId: data.orchestra_user_id || null,
        teamId: data.team_id || '',
        planId: data.plan_id || '',
        email: data.email || null,
        authType: data.auth_type || '',
        capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
        hasActiveSubscription: Boolean(data.has_active_subscription),
        keyId: data.key_id || null,
        keyName: data.key_name || null,
    };
}
export class UserAPI {
    http;
    authHttp;
    constructor(http, authHttp = http) {
        this.http = http;
        this.authHttp = authHttp;
    }
    /**
     * Get current user info
     */
    async get() {
        const data = await this.http.get('/api/user');
        return userFromDict(data);
    }
    /**
     * Resolve the current auth context, including key capabilities.
     */
    async authMe() {
        const data = await this.authHttp.get('/api/auth/me');
        return authMeFromDict(data);
    }
    /**
     * Update the current user profile.
     */
    async update(options) {
        const data = await this.http.patch('/api/user', options);
        return userFromDict(data);
    }
}
//# sourceMappingURL=user.js.map