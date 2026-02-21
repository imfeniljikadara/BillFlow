/**
 * Rate Limiting & Abuse Prevention (Issue 27)
 * Prevents spam and DoS attacks
 */

interface RateLimitMap {
    [key: string]: { count: number; resetTime: number };
}

const rateLimits: RateLimitMap = {};

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number; // Time window in milliseconds
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
    'create_invoice': { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    'update_invoice': { maxRequests: 20, windowMs: 60000 }, // 20 per minute
    'delete_invoice': { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
    'send_reminder': { maxRequests: 3, windowMs: 86400000 }, // 3 per 24 hours per invoice
    'generate_invoice_number': { maxRequests: 50, windowMs: 60000 }, // 50 per minute
};

/**
 * Check if operation is allowed under rate limit
 * Returns: { allowed: boolean, retryAfter?: number }
 */
export function checkRateLimit(
    userId: string,
    operationType: string,
    config?: RateLimitConfig
): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const key = `${userId}:${operationType}`;
    const limit = config || DEFAULT_LIMITS[operationType];

    if (!limit) {
        // No rate limit configured for this operation
        return { allowed: true };
    }

    // Initialize or get existing rate limit entry
    if (!rateLimits[key]) {
        rateLimits[key] = {
            count: 0,
            resetTime: now + limit.windowMs,
        };
    }

    const entry = rateLimits[key];

    // Reset counter if window has passed
    if (now > entry.resetTime) {
        entry.count = 0;
        entry.resetTime = now + limit.windowMs;
    }

    // Check if within limit
    entry.count++;
    
    if (entry.count > limit.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        return {
            allowed: false,
            retryAfter,
        };
    }

    return { allowed: true };
}

/**
 * Reset rate limit for a specific operation
 */
export function resetRateLimit(userId: string, operationType: string): void {
    const key = `${userId}:${operationType}`;
    delete rateLimits[key];
}

/**
 * Reset all rate limits for a user
 */
export function resetAllRateLimits(userId: string): void {
    Object.keys(rateLimits).forEach(key => {
        if (key.startsWith(`${userId}:`)) {
            delete rateLimits[key];
        }
    });
}

/**
 * Get rate limit status for an operation
 */
export function getRateLimitStatus(
    userId: string,
    operationType: string
): {
    currentCount: number;
    limit: number;
    resetInSeconds: number;
} {
    const key = `${userId}:${operationType}`;
    const limit = DEFAULT_LIMITS[operationType];
    
    if (!limit) {
        return { currentCount: 0, limit: 0, resetInSeconds: 0 };
    }

    const entry = rateLimits[key];
    if (!entry) {
        return {
            currentCount: 0,
            limit: limit.maxRequests,
            resetInSeconds: Math.ceil(limit.windowMs / 1000),
        };
    }

    const now = Date.now();
    const resetInMs = Math.max(0, entry.resetTime - now);

    return {
        currentCount: entry.count,
        limit: limit.maxRequests,
        resetInSeconds: Math.ceil(resetInMs / 1000),
    };
}

/**
 * Custom rate limiter with exponential backoff for errors
 */
export class AdaptiveRateLimiter {
    private baseLimit: RateLimitConfig;
    private currentLimit: RateLimitConfig;
    private errorCount: number = 0;
    private lastResetTime: number = Date.now();

    constructor(baseLimit: RateLimitConfig) {
        this.baseLimit = baseLimit;
        this.currentLimit = { ...baseLimit };
    }

    /**
     * Record an error and reduce rate limit
     */
    recordError(): void {
        this.errorCount++;
        // Reduce allowed requests by 25% for each consecutive error
        this.currentLimit.maxRequests = Math.max(
            1,
            Math.floor(this.baseLimit.maxRequests * (0.75 ** this.errorCount))
        );
        console.warn(`Rate limit reduced to ${this.currentLimit.maxRequests} requests`);
    }

    /**
     * Record success and gradually increase rate limit
     */
    recordSuccess(): void {
        if (this.errorCount > 0) {
            this.errorCount--;
            this.currentLimit.maxRequests = Math.min(
                this.baseLimit.maxRequests,
                Math.floor(this.baseLimit.maxRequests * (0.75 ** this.errorCount))
            );
            console.log(`Rate limit increased to ${this.currentLimit.maxRequests} requests`);
        }
    }

    /**
     * Get current limit config
     */
    getConfig(): RateLimitConfig {
        return { ...this.currentLimit };
    }

    /**
     * Reset to base limit
     */
    reset(): void {
        this.errorCount = 0;
        this.currentLimit = { ...this.baseLimit };
        this.lastResetTime = Date.now();
    }
}

/**
 * Detect suspicious activity patterns
 */
export function detectAbusePattern(
    userId: string,
    operationType: string,
    threshold: number = 85 // Alert at 85% of limit
): boolean {
    const status = getRateLimitStatus(userId, operationType);
    const percentageUsed = (status.currentCount / status.limit) * 100;
    return percentageUsed >= threshold;
}
