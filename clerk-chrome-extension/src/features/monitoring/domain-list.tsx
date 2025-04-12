import { useEffect, useState } from 'react';
import { MonitoringService } from './monitoring-service';

interface DomainEntry {
  domain: string;
  timestamp: number;
}

export const DomainList = () => {
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setLoading(true);
        const activeDomains = await MonitoringService.getActiveDomainEntries();
        setDomains(activeDomains);
      } catch (error) {
        console.error('Error fetching domains:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDomains();

    // Refresh domains every minute
    const intervalId = setInterval(fetchDomains, 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return <div className="plasmo-text-center plasmo-py-4">Loading domains...</div>;
  }

  if (domains.length === 0) {
    return <div className="plasmo-text-center plasmo-py-4">No domains visited in the last 24 hours.</div>;
  }

  return (
    <div className="plasmo-w-full plasmo-max-h-[400px] plasmo-overflow-y-auto">
      <h2 className="plasmo-text-lg plasmo-font-semibold plasmo-mb-2">Domains Visited (Last 24 Hours)</h2>
      <ul className="plasmo-divide-y plasmo-divide-gray-200">
        {domains.map((entry) => (
          <li key={entry.domain} className="plasmo-py-2">
            <div className="plasmo-flex plasmo-justify-between">
              <span className="plasmo-font-medium">{entry.domain}</span>
              <span className="plasmo-text-sm plasmo-text-gray-500">{formatDate(entry.timestamp)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
