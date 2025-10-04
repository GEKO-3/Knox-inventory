// Offline Data Manager
class OfflineDataManager {
    constructor() {
        this.dbKeys = {
            supply: 'knox_supply_data',
            stock: 'knox_stock_data',
            recipes: 'knox_recipes_data',
            pendingChanges: 'knox_pending_changes',
            lastSync: 'knox_last_sync'
        };
        this.syncInProgress = false;
        this.setupSyncListeners();
    }

    // Save data to localStorage with timestamp
    saveToLocal(key, data) {
        try {
            const dataWithTimestamp = {
                data: data,
                timestamp: Date.now(),
                lastModified: new Date().toISOString()
            };
            localStorage.setItem(this.dbKeys[key], JSON.stringify(dataWithTimestamp));
            console.log(`Data saved to local storage: ${key}`);
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    // Get data from localStorage
    getFromLocal(key) {
        try {
            const stored = localStorage.getItem(this.dbKeys[key]);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.data || [];
            }
        } catch (error) {
            console.error('Error reading from localStorage:', error);
        }
        return [];
    }

    // Get timestamp of last local data update
    getLocalTimestamp(key) {
        try {
            const stored = localStorage.getItem(this.dbKeys[key]);
            if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.timestamp || 0;
            }
        } catch (error) {
            console.error('Error reading timestamp from localStorage:', error);
        }
        return 0;
    }

    // Queue changes for later sync
    queueChange(type, action, data, id = null) {
        try {
            const pendingChanges = this.getPendingChanges();
            const changeId = `${type}_${action}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const change = {
                id: changeId,
                type: type, // 'supply', 'stock', 'recipes'
                action: action, // 'create', 'update', 'delete'
                data: data,
                itemId: id,
                timestamp: Date.now(),
                dateCreated: new Date().toISOString(),
                synced: false,
                retryCount: 0
            };

            pendingChanges.push(change);
            localStorage.setItem(this.dbKeys.pendingChanges, JSON.stringify(pendingChanges));
            console.log('Change queued for sync:', change);
            
            // Show offline indicator if not online
            if (!navigator.onLine) {
                this.showOfflineChangeNotification();
            }
        } catch (error) {
            console.error('Error queuing change:', error);
        }
    }

    // Get pending changes
    getPendingChanges() {
        try {
            const stored = localStorage.getItem(this.dbKeys.pendingChanges);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error reading pending changes:', error);
            return [];
        }
    }

    // Remove synced change
    removeChange(changeId) {
        try {
            const pendingChanges = this.getPendingChanges();
            const filteredChanges = pendingChanges.filter(change => change.id !== changeId);
            localStorage.setItem(this.dbKeys.pendingChanges, JSON.stringify(filteredChanges));
        } catch (error) {
            console.error('Error removing change:', error);
        }
    }

    // Sync pending changes when online
    async syncPendingChanges() {
        if (this.syncInProgress || !navigator.onLine) {
            return;
        }

        this.syncInProgress = true;
        const pendingChanges = this.getPendingChanges();
        
        if (pendingChanges.length === 0) {
            this.syncInProgress = false;
            return;
        }

        console.log(`Syncing ${pendingChanges.length} pending changes...`);
        this.showSyncNotification(pendingChanges.length);

        let syncedCount = 0;
        let failedCount = 0;

        for (const change of pendingChanges) {
            try {
                await this.syncSingleChange(change);
                this.removeChange(change.id);
                syncedCount++;
            } catch (error) {
                console.error('Failed to sync change:', change, error);
                change.retryCount = (change.retryCount || 0) + 1;
                failedCount++;
                
                // Remove changes that have failed too many times
                if (change.retryCount >= 3) {
                    console.warn('Removing change after 3 failed attempts:', change);
                    this.removeChange(change.id);
                }
            }
        }

        // Update last sync timestamp
        localStorage.setItem(this.dbKeys.lastSync, Date.now().toString());
        
        this.syncInProgress = false;
        this.hideSyncNotification();
        
        if (syncedCount > 0) {
            console.log(`Successfully synced ${syncedCount} changes`);
            // Reload data from server to get latest state
            await this.refreshDataFromServer();
        }
        
        if (failedCount > 0) {
            console.warn(`${failedCount} changes failed to sync`);
        }
    }

    // Sync a single change to Firebase
    async syncSingleChange(change) {
        const { ref, push, update, remove } = await import('https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js');
        
        switch (change.action) {
            case 'create':
                const createRef = ref(window.db, change.type);
                await push(createRef, change.data);
                break;
                
            case 'update':
                const updateRef = ref(window.db, `${change.type}/${change.itemId}`);
                await update(updateRef, change.data);
                break;
                
            case 'delete':
                const deleteRef = ref(window.db, `${change.type}/${change.itemId}`);
                await remove(deleteRef);
                break;
                
            default:
                throw new Error(`Unknown action: ${change.action}`);
        }
    }

    // Refresh data from server after sync
    async refreshDataFromServer() {
        try {
            if (window.loadData && typeof window.loadData === 'function') {
                await window.loadData();
            }
        } catch (error) {
            console.error('Error refreshing data from server:', error);
        }
    }

    // Setup listeners for online/offline events
    setupSyncListeners() {
        window.addEventListener('online', () => {
            console.log('Connection restored, attempting to sync...');
            setTimeout(() => {
                this.syncPendingChanges();
            }, 1000); // Wait a moment for connection to stabilize
        });
    }

    // Apply local change immediately for UI responsiveness
    applyLocalChange(type, action, data, id = null) {
        const localData = this.getFromLocal(type);
        
        switch (action) {
            case 'create':
                // Generate temporary ID for local use
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newItem = { ...data, id: tempId, isTemporary: true };
                localData.push(newItem);
                break;
                
            case 'update':
                const updateIndex = localData.findIndex(item => item.id === id);
                if (updateIndex !== -1) {
                    localData[updateIndex] = { ...localData[updateIndex], ...data };
                }
                break;
                
            case 'delete':
                const deleteIndex = localData.findIndex(item => item.id === id);
                if (deleteIndex !== -1) {
                    localData.splice(deleteIndex, 1);
                }
                break;
        }
        
        this.saveToLocal(type, localData);
        
        // Update global variables
        this.updateGlobalData(type, localData);
    }

    // Update global variables with local data
    updateGlobalData(type, data) {
        switch (type) {
            case 'supply':
                window.supplyItems = data;
                break;
            case 'stock':
                window.stockItems = data;
                break;
            case 'recipes':
                window.recipes = data;
                break;
        }
    }

    // Check if we should use local data (offline or local is newer)
    shouldUseLocalData(key) {
        return !navigator.onLine || this.hasNewerLocalData(key);
    }

    // Check if local data is newer than a certain threshold
    hasNewerLocalData(key) {
        const localTimestamp = this.getLocalTimestamp(key);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        return (now - localTimestamp) < fiveMinutes;
    }

    // Get pending changes count
    getPendingChangesCount() {
        return this.getPendingChanges().length;
    }

    // Show notifications
    showOfflineChangeNotification() {
        const existingNotification = document.getElementById('offline-changes-notification');
        if (existingNotification) return;

        const notification = document.createElement('div');
        notification.id = 'offline-changes-notification';
        notification.className = 'offline-changes-notification';
        notification.innerHTML = `
            <span>💾 Changes saved locally</span>
            <small>Will sync when online</small>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    showSyncNotification(count) {
        const notification = document.createElement('div');
        notification.id = 'sync-notification';
        notification.className = 'sync-notification';
        notification.innerHTML = `
            <span>🔄 Syncing ${count} changes...</span>
            <div class="sync-progress"></div>
        `;
        document.body.appendChild(notification);
    }

    hideSyncNotification() {
        const notification = document.getElementById('sync-notification');
        if (notification) {
            notification.remove();
        }
    }

    // Clear all local data (useful for debugging)
    clearAllLocalData() {
        Object.values(this.dbKeys).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('All local data cleared');
    }
}

// Create global instance
window.offlineManager = new OfflineDataManager();