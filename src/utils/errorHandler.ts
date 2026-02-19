/**
 * Firestore error handling with exponential backoff retry logic
 */

export interface ErrorHandlerConfig {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    
    return (
        code === 'network-error' ||
        code === 'unavailable' ||
        message.includes('network') ||
        message.includes('offline') ||
        message.includes('failed') ||
        message.includes('timeout') ||
        error.name === 'FirebaseError'
    );
};

/**
 * Check if error is retryable
 */
export const isRetryableError = (error: any): boolean => {
    if (!error) return false;
    
    const code = error.code?.toUpperCase() || '';
    
    // These Firestore error codes are retryable
    const retryableCodes = [
        'UNAVAILABLE',
        'DEADLINE_EXCEEDED',
        'INTERNAL',
        'RESOURCE_EXHAUSTED',
        'UNAUTHENTICATED',
    ];
    
    return retryableCodes.some(retryCode => code.includes(retryCode)) || isNetworkError(error);
};

/**
 * Calculate exponential backoff delay
 */
export const calculateBackoffDelay = (
    attempt: number,
    config: ErrorHandlerConfig = {}
): number => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    const exponentialDelay = finalConfig.initialDelayMs! * Math.pow(finalConfig.backoffMultiplier!, attempt);
    // Add jitter (random variation) to prevent thundering herd
    const jitter = exponentialDelay * (Math.random() * 0.1);
    const delayWithJitter = exponentialDelay + jitter;
    
    // Cap at maxDelayMs
    return Math.min(delayWithJitter, finalConfig.maxDelayMs!);
};

/**
 * Retry a function with exponential backoff
 */
export const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    config: ErrorHandlerConfig = {}
): Promise<T> => {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    let lastError: any;
    
    for (let attempt = 0; attempt < finalConfig.maxRetries!; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (!isRetryableError(error) || attempt === finalConfig.maxRetries! - 1) {
                throw error;
            }
            
            const delay = calculateBackoffDelay(attempt, finalConfig);
            console.warn(`Retry attempt ${attempt + 1}/${finalConfig.maxRetries} after ${delay}ms`, error);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    throw lastError;
};

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: any): string => {
    if (!error) return 'An unknown error occurred';
    
    const code = error.code?.toLowerCase() || '';
    const message = error.message || '';
    
    if (code.includes('permission')) {
        return 'Permission denied. Please check your authentication.';
    }
    if (code.includes('not-found')) {
        return 'The requested item was not found.';
    }
    if (code.includes('already-exists')) {
        return 'This item already exists.';
    }
    if (code.includes('unavailable') || isNetworkError(error)) {
        return 'Network error. Please check your connection.';
    }
    if (code.includes('deadline')) {
        return 'Request timed out. Please try again.';
    }
    if (code.includes('unauthenticated')) {
        return 'Please sign in to continue.';
    }
    if (message) {
        return message;
    }
    return 'An error occurred. Please try again.';
};

/**
 * Log error with context
 */
export const logError = (context: string, error: any): void => {
    console.error(`[${context}]`, {
        code: error?.code,
        message: error?.message,
        isNetwork: isNetworkError(error),
        isRetryable: isRetryableError(error),
        fullError: error,
    });
};
