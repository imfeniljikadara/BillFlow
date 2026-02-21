/**
 * Network status monitoring and offline queue sync
 */
import { AppState, AppStateStatus } from 'react-native';
import { useAppStore } from '../store/appStore';

let appState: AppStateStatus = 'active';
let lastOnlineTime = Date.now();

/**
 * Initialize network listener
 * Monitors app state changes and triggers offline queue sync when app comes back online
 */
export function initializeNetworkListener() {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
        subscription.remove();
    };
}

/**
 * Handle app state changes
 */
async function handleAppStateChange(nextAppState: AppStateStatus) {
    // If app is transitioning to active state from another state
    if (appState !== 'active' && nextAppState === 'active') {
        console.log('[Network] App came to foreground');
        
        // Wait a bit for connection to stabilize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Attempt to sync offline queue
        try {
            const store = useAppStore.getState();
            const queueSize = await require('./offlineQueue').getQueueSize();
            
            if (queueSize > 0) {
                console.log(`[Network] Found ${queueSize} pending operations, syncing...`);
                await store.syncOfflineQueue();
            }
        } catch (error) {
            console.error('[Network] Error syncing offline queue:', error);
        }
    }
    
    appState = nextAppState;
}

/**
 * Check if device is currently online
 * This is a simple check - for better reliability use a library like @react-native-community/netinfo
 */
export function isOnline(): boolean {
    return Date.now() - lastOnlineTime < 5000; // Simple heuristic
}

/**
 * Mark device as online
 */
export function markOnline() {
    lastOnlineTime = Date.now();
}

/**
 * Mark device as offline
 */
export function markOffline() {
    lastOnlineTime = 0;
}
