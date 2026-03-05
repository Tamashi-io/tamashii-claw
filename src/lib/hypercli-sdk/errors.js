/**
 * API error with status code and detail message
 */
export class APIError extends Error {
    statusCode;
    detail;
    constructor(statusCode, detail) {
        super(`API Error ${statusCode}: ${detail}`);
        this.statusCode = statusCode;
        this.detail = detail;
        this.name = 'APIError';
        Object.setPrototypeOf(this, APIError.prototype);
    }
}
//# sourceMappingURL=errors.js.map