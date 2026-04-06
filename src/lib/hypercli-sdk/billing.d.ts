/**
 * Billing API - balance and transactions
 */
import type { HTTPClient } from './http.js';
export interface Balance {
    total: string;
    rewards: string;
    paid: string;
    available: string;
    pendingReservations?: string;
    currency?: string;
    decimals?: number;
    userId?: string;
}
export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    amountUsd: string;
    transactionType: string;
    status: string;
    rewards: boolean;
    jobId: string | null;
    createdAt: string;
    updatedAt: string;
    expiresAt: string | null;
    meta: Record<string, any> | null;
}
export interface ListTransactionsOptions {
    page?: number;
    pageSize?: number;
    transactionType?: string;
    status?: string;
    jobId?: string;
}
export interface TransactionListResponse {
    transactions: Transaction[];
    totalCount: number;
}
export interface TopUpCheckoutSession {
    sessionId: string;
    checkoutUrl: string;
}
export declare class Billing {
    private http;
    constructor(http: HTTPClient);
    /**
     * Get account balance
     */
    balance(): Promise<Balance>;
    /**
     * Alias for balance() when callers want the richer shape explicitly.
     */
    balanceDetails(): Promise<Balance>;
    /**
     * List transactions
     */
    transactions(limit?: number, page?: number): Promise<Transaction[]>;
    /**
     * List transactions with filters and pagination metadata.
     */
    listTransactions(options?: ListTransactionsOptions): Promise<TransactionListResponse>;
    /**
     * Get a specific transaction
     */
    getTransaction(transactionId: string): Promise<Transaction>;
    /**
     * Create a Stripe Checkout session for balance top-ups.
     */
    createTopUpCheckout(amount: number): Promise<TopUpCheckoutSession>;
}
//# sourceMappingURL=billing.d.ts.map