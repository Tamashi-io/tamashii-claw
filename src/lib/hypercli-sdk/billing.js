function balanceFromDict(data) {
    return {
        total: data.total_balance || '0',
        rewards: data.rewards_balance || '0',
        paid: data.balance || '0',
        available: data.available_balance || '0',
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
     * List transactions
     */
    async transactions(limit = 50, page = 1) {
        const data = await this.http.get('/api/tx', {
            page: String(page),
            page_size: String(limit),
        });
        const txList = data.transactions || [];
        return txList.map(transactionFromDict);
    }
    /**
     * Get a specific transaction
     */
    async getTransaction(transactionId) {
        const data = await this.http.get(`/api/tx/${transactionId}`);
        return transactionFromDict(data);
    }
}
//# sourceMappingURL=billing.js.map