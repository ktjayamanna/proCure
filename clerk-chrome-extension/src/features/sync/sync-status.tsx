import { useState } from 'react';
import { useSyncContext } from './sync-context';

interface SyncStatusDisplayProps {
  onSyncComplete?: () => void;
}

export const SyncStatusDisplay = ({ onSyncComplete }: SyncStatusDisplayProps) => {
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

  const getStatusColor = () => {
    switch (syncStatus) {
      case 'success':
        return 'plasmo-text-green-600';
      case 'error':
        return 'plasmo-text-red-600';
      case 'syncing':
        return 'plasmo-text-blue-600';
      default:
        return 'plasmo-text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync failed';
      case 'syncing':
        return 'Syncing...';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="plasmo-mt-4 plasmo-border-t plasmo-border-gray-200 plasmo-pt-4">
      <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
        <div>
          <h3 className="plasmo-text-sm plasmo-font-medium">Sync Status</h3>
          <div className="plasmo-flex plasmo-items-center plasmo-mt-1">
            <span className={`plasmo-text-sm ${getStatusColor()}`}>{getStatusText()}</span>
            <span className="plasmo-mx-2 plasmo-text-gray-400">•</span>
            <span className="plasmo-text-xs plasmo-text-gray-500">
              Last sync: {formatSyncTime(lastSyncTime)}
            </span>
          </div>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isManualSyncing || isLoading || syncStatus === 'syncing'}
          className="plasmo-bg-blue-600 plasmo-text-white plasmo-text-sm plasmo-px-3 plasmo-py-1 plasmo-rounded plasmo-hover:plasmo-bg-blue-700 plasmo-disabled:plasmo-opacity-50"
        >
          {isManualSyncing || isLoading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      <p className="plasmo-text-xs plasmo-text-gray-500 plasmo-mt-2">
        Site data is automatically synced every 2 minutes.
      </p>
    </div>
  );
};
