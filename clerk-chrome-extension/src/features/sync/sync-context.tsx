import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Storage } from '@plasmohq/storage';
import { MonitoringService } from '~features/monitoring/monitoring-service';
import { type SyncStatus } from './background-sync';

// Create a storage instance for sync-related data
const storage = new Storage({
  area: "local"
});

// Storage keys
const LAST_SYNC_TIME_KEY = 'last_sync_time';
const SYNC_STATUS_KEY = 'sync_status';

// Backend API URL
const API_URL = 'http://127.0.0.1:8000/api/v1/url-visits';

// Status types are imported from background-sync

interface SyncContextType {
  syncStatus: SyncStatus;
  lastSyncTime: number | null;
  syncDomainEntries: () => Promise<boolean>;
  isLoading: boolean;
}

// Create the context with a default value
const SyncContext = createContext<SyncContextType | undefined>(undefined);

// Props for the provider component
interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial state from storage
  useEffect(() => {
    const loadInitialState = async () => {
      try {
        const status = await storage.get<SyncStatus>(SYNC_STATUS_KEY);
        const time = await storage.get<number>(LAST_SYNC_TIME_KEY);

        setSyncStatus(status || 'idle');
        setLastSyncTime(time || null);
      } catch (error) {
        console.error('Error loading sync state:', error);
      }
    };

    loadInitialState();
  }, []);

  // Update storage when state changes
  useEffect(() => {
    const updateStorage = async () => {
      try {
        await storage.set(SYNC_STATUS_KEY, syncStatus);
      } catch (error) {
        console.error('Error updating sync status in storage:', error);
      }
    };

    updateStorage();
  }, [syncStatus]);

  useEffect(() => {
    const updateStorage = async () => {
      if (lastSyncTime !== null) {
        try {
          await storage.set(LAST_SYNC_TIME_KEY, lastSyncTime);
        } catch (error) {
          console.error('Error updating last sync time in storage:', error);
        }
      }
    };

    updateStorage();
  }, [lastSyncTime]);

  // Function to sync domain entries with the backend
  const syncDomainEntries = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setSyncStatus('syncing');

      // Get active domain entries
      const entries = await MonitoringService.getActiveDomainEntries();

      if (entries.length === 0) {
        console.log('No entries to sync');
        setSyncStatus('success');
        const now = Date.now();
        setLastSyncTime(now);
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
      setSyncStatus('success');
      const syncTime = Date.now();
      setLastSyncTime(syncTime);

      console.log('Successfully synced domain entries');
      return true;
    } catch (error) {
      console.error('Error syncing domain entries:', error);
      setSyncStatus('error');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create the context value
  const contextValue: SyncContextType = {
    syncStatus,
    lastSyncTime,
    syncDomainEntries,
    isLoading
  };

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

// Custom hook to use the sync context
export const useSyncContext = (): SyncContextType => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};
