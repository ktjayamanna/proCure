import React, { useState } from 'react';
import { useSyncContext } from './sync-context';

interface SyncStatusDisplayProps {
  onSyncComplete?: () => void;
}

export const SyncStatusDisplay: React.FC<SyncStatusDisplayProps> = ({ onSyncComplete }) => {
  const { syncStatus, lastSyncTime, syncDomainEntries, isLoading } = useSyncContext();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const formatSyncTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      const success = await syncDomainEntries();

      // If sync was successful and callback exists, call it to refresh the list
      if (success && onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <div className="sync-status">
      <div className="sync-info">
        <div className="status-container">
          <span className="status-label">Status:</span>
          <span className={`status-value status-${syncStatus}`}>
            {syncStatus === 'idle' && 'Idle'}
            {syncStatus === 'syncing' && 'Syncing...'}
            {syncStatus === 'success' && 'Synced'}
            {syncStatus === 'error' && 'Error'}
          </span>
        </div>
        <div className="last-sync-container">
          <span className="last-sync-label">Last sync:</span>
          <span className="last-sync-value">{formatSyncTime(lastSyncTime)}</span>
        </div>
      </div>
      <div className="sync-actions">
        <button
          onClick={handleManualSync}
          disabled={isManualSyncing || isLoading}
          className="sync-button"
        >
          {isManualSyncing || isLoading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      <p className="sync-note">
        Site data is automatically synced every 2 hours.
      </p>
    </div>
  );
};
