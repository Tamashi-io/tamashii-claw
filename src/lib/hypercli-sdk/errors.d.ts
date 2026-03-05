/**
 * API error with status code and detail message
 */
export declare class APIError extends Error {
    readonly statusCode: number;
    readonly detail: string;
    constructor(statusCode: number, detail: string);
}
//# sourceMappingURL=errors.d.ts.map