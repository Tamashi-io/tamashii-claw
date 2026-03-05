/**
 * Billing API - balance and transactions
 */
import type { HTTPClient } from './http.js';
export interface Balance {
    total: string;
    rewards: string;
    paid: string;
    available: string;
}
export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    amountUsd: number;
    transactionType: string;
    status: string;
    rewards: boolean;
    jobId: string | null;
    createdAt: string;
}
export declare class Billing {
    private http;
    constructor(http: HTTPClient);
    /**
     * Get account balance
     */
    balance(): Promise<Balance>;
    /**
     * List transactions
     */
    transactions(limit?: number, page?: number): Promise<Transaction[]>;
    /**
     * Get a specific transaction
     */
    getTransaction(transactionId: string): Promise<Transaction>;
}
//# sourceMappingURL=billing.d.ts.map