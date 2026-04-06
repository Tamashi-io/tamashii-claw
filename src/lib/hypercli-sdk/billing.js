function balanceFromDict(data) {
    return {
        total: data.total_balance || '0',
        rewards: data.rewards_balance || '0',
        paid: data.balance || '0',
        available: data.available_balance || '0',
        pendingReservations: data.pending_reservations || '0',
        currency: data.currency || 'USD',
        decimals: data.decimals ?? 2,
        userId: data.user_id || '',
    };
}
function transactionFromDict(data) {
    return {
        id: data.id || '',
        userId: data.user_id || '',
        amount: data.amount || 0,
        amountUsd: data.amount_usd || 0,
        transactionType: data.transaction_type || '',
        status: data.status || '',
        rewards: data.rewards || false,
        jobId: data.job_id || null,
        createdAt: data.created_at || '',
        updatedAt: data.updated_at || '',
        expiresAt: data.expires_at || null,
        meta: data.meta || null,
    };
}
export class Billing {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Get account balance
     */
    async balance() {
        const data = await this.http.get('/api/balance');
        return balanceFromDict(data);
    }
    /**
     * Alias for balance() when callers want the richer shape explicitly.
     */
    async balanceDetails() {
        return this.balance();
    }
    /**
     * List transactions
     */
    async transactions(limit = 50, page = 1) {
        const data = await this.listTransactions({ page, pageSize: limit });
        return data.transactions;
    }
    /**
     * List transactions with filters and pagination metadata.
     */
    async listTransactions(options = {}) {
        const params = {
            page: String(options.page ?? 1),
            page_size: String(options.pageSize ?? 50),
        };
        if (options.transactionType)
            params.transaction_type = options.transactionType;
        if (options.status)
            params.status = options.status;
        if (options.jobId)
            params.job_id = options.jobId;
        const data = await this.http.get('/api/tx', params);
        const txList = data.transactions || [];
        return {
            transactions: txList.map(transactionFromDict),
            totalCount: data.total_count || txList.length,
        };
    }
    /**
     * Get a specific transaction
     */
    async getTransaction(transactionId) {
        const data = await this.http.get(`/api/tx/${transactionId}`);
        return transactionFromDict(data);
    }
    /**
     * Create a Stripe Checkout session for balance top-ups.
     */
    async createTopUpCheckout(amount) {
        const data = await this.http.post('/api/stripe/top_up', { amount });
        return {
            sessionId: data.session_id || '',
            checkoutUrl: data.checkout_url || '',
        };
    }
}
//# sourceMappingURL=billing.js.map