import { useEffect, useState } from 'react';
import { SyncService, SyncStatus } from './sync-service';

export const SyncStatusDisplay = () => {
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    // Fetch initial sync status and time
    const fetchSyncInfo = async () => {
      const status = await SyncService.getSyncStatus();
      const time = await SyncService.getLastSyncTime();
      
      setSyncStatus(status);
      setLastSyncTime(time);
    };

    fetchSyncInfo();

    // Set up interval to check for updates
    const intervalId = setInterval(fetchSyncInfo, 10000); // Check every 10 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const formatSyncTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString();
  };

  const handleManualSync = async () => {
    try {
      setIsManualSyncing(true);
      await SyncService.syncDomainEntries();
      
      // Update the UI after sync
      const status = await SyncService.getSyncStatus();
      const time = await SyncService.getLastSyncTime();
      
      setSyncStatus(status);
      setLastSyncTime(time);
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
          disabled={isManualSyncing || syncStatus === 'syncing'}
          className="plasmo-bg-blue-600 plasmo-text-white plasmo-text-sm plasmo-px-3 plasmo-py-1 plasmo-rounded plasmo-hover:plasmo-bg-blue-700 plasmo-disabled:plasmo-opacity-50"
        >
          {isManualSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
      <p className="plasmo-text-xs plasmo-text-gray-500 plasmo-mt-2">
        Site data is automatically synced every 2 minutes.
      </p>
    </div>
  );
};
