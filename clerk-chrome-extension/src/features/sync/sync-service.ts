import { Storage } from '@plasmohq/storage';
import { MonitoringService } from '~features/monitoring/monitoring-service';

// Create a storage instance for sync-related data
const storage = new Storage({
  area: "local"
});

// Storage keys
const LAST_SYNC_TIME_KEY = 'last_sync_time';
const SYNC_STATUS_KEY = 'sync_status';

// Backend API URL
const API_URL = 'http://127.0.0.1:8000/api/v1/url-visits';

// Status types
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Service to handle syncing domain entries with the backend
 */
export class SyncService {
  /**
   * Sync domain entries with the backend
   */
  static async syncDomainEntries(): Promise<boolean> {
    try {
      // Update sync status to syncing
      await this.setSyncStatus('syncing');
      
      // Get active domain entries
      const entries = await MonitoringService.getActiveDomainEntries();
      
      if (entries.length === 0) {
        console.log('No entries to sync');
        await this.setSyncStatus('success');
        await this.setLastSyncTime(Date.now());
        return true;
      }
      
      // Format entries for the API
      const formattedEntries = entries.map(entry => ({
        url: `https://${entry.hostname}/`,
        timestamp: entry.timestamp,
        browser: 'Chrome'
      }));
      
      // Prepare request payload
      // Note: Using a placeholder email since we're not implementing auth yet
      const payload = {
        user_email: 'test1@example.com',
        entries: formattedEntries
      };
      
      // Send request to backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      // Reset domain entries on successful sync
      await MonitoringService.clearDomainEntries();
      
      // Update sync status and time
      await this.setSyncStatus('success');
      await this.setLastSyncTime(Date.now());
      
      console.log('Successfully synced domain entries');
      return true;
    } catch (error) {
      console.error('Error syncing domain entries:', error);
      await this.setSyncStatus('error');
      return false;
    }
  }
  
  /**
   * Set the last sync time
   */
  static async setLastSyncTime(timestamp: number): Promise<void> {
    try {
      await storage.set(LAST_SYNC_TIME_KEY, timestamp);
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }
  
  /**
   * Get the last sync time
   */
  static async getLastSyncTime(): Promise<number | null> {
    try {
      const timestamp = await storage.get<number>(LAST_SYNC_TIME_KEY);
      return timestamp || null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }
  
  /**
   * Set the sync status
   */
  static async setSyncStatus(status: SyncStatus): Promise<void> {
    try {
      await storage.set(SYNC_STATUS_KEY, status);
    } catch (error) {
      console.error('Error setting sync status:', error);
    }
  }
  
  /**
   * Get the current sync status
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    try {
      const status = await storage.get<SyncStatus>(SYNC_STATUS_KEY);
      return status || 'idle';
    } catch (error) {
      console.error('Error getting sync status:', error);
      return 'idle';
    }
  }
}
