import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Storage } from '@plasmohq/storage';
import { MonitoringService } from '../monitoring/monitoring-service';
import { type SyncStatus } from './background-sync';
import { getAuthToken } from '../../auth';

// Create a storage instance for sync-related data
const storage = new Storage({
  area: "local"
});

// Storage keys
const LAST_SYNC_TIME_KEY = 'last_sync_time';
const SYNC_STATUS_KEY = 'sync_status';

// Backend API URL
const API_URL = 'http://localhost:8000/api/v1/url-visits';

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

      // Get authentication token
      const token = await getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Prepare request payload
      const payload = {
        entries: formattedEntries
      };

      // Send request to backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

// Hook to use the sync context
export const useSyncContext = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSyncContext must be used within a SyncProvider');
  }
  return context;
};
