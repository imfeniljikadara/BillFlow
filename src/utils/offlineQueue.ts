import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Offline queue system for storing mutations when the app is offline
 * Syncs automatically when connection is restored
 */

export interface QueuedOperation {
    id: string;
    type: 'ADD_INVOICE' | 'UPDATE_INVOICE' | 'DELETE_INVOICE' | 'ADD_PRODUCT' | 'ADD_CLIENT' | 'UPDATE_CLIENT';
    data: any;
    timestamp: number;
    retries: number;
    maxRetries: number;
}

const QUEUE_STORAGE_KEY = 'invoiceapp_offline_queue';
const MAX_RETRIES = 3;

/**
 * Add operation to offline queue
 */
export const queueOperation = async (operation: Omit<QueuedOperation, 'id' | 'retries' | 'maxRetries'>): Promise<void> => {
    try {
        const existingQueue = await getQueue();
        const newOperation: QueuedOperation = {
            ...operation,
            id: `${operation.type}_${Date.now()}_${Math.random()}`,
            retries: 0,
            maxRetries: MAX_RETRIES,
        };
        existingQueue.push(newOperation);
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(existingQueue));
    } catch (e) {
        console.error('Error queueing operation:', e);
    }
};

/**
 * Get all queued operations
 */
export const getQueue = async (): Promise<QueuedOperation[]> => {
    try {
        const queue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
        return queue ? JSON.parse(queue) : [];
    } catch (e) {
        console.error('Error retrieving queue:', e);
        return [];
    }
};

/**
 * Remove operation from queue
 */
export const removeFromQueue = async (operationId: string): Promise<void> => {
    try {
        const queue = await getQueue();
        const updated = queue.filter(op => op.id !== operationId);
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error('Error removing from queue:', e);
    }
};

/**
 * Increment retry count
 */
export const incrementRetry = async (operationId: string): Promise<void> => {
    try {
        const queue = await getQueue();
        const operation = queue.find(op => op.id === operationId);
        if (operation) {
            operation.retries += 1;
            await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        }
    } catch (e) {
        console.error('Error incrementing retry:', e);
    }
};

/**
 * Clear entire queue (use with caution)
 */
export const clearQueue = async (): Promise<void> => {
    try {
        await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (e) {
        console.error('Error clearing queue:', e);
    }
};

/**
 * Get queue size
 */
export const getQueueSize = async (): Promise<number> => {
    const queue = await getQueue();
    return queue.length;
};
