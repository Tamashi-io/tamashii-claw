function userFromDict(data) {
    return {
        userId: data.user_id || '',
        email: data.email || null,
        name: data.name || null,
        isActive: data.is_active !== false,
        createdAt: data.created_at || '',
    };
}
export class UserAPI {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Get current user info
     */
    async get() {
        const data = await this.http.get('/api/user');
        return userFromDict(data);
    }
}
//# sourceMappingURL=user.js.map