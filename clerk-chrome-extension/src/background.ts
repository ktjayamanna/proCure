import { MonitoringService } from "~features/monitoring/monitoring-service"

// Listen for tab updates to capture navigation events
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the URL has changed and is complete
  if (changeInfo.status === "complete" && tab.url) {
    try {
      // Add the domain to monitoring
      await MonitoringService.addDomain(tab.url)
    } catch (error) {
      console.error("Error monitoring domain in background:", error)
    }
  }
})

// Listen for tab activation to capture the current active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      // Add the domain to monitoring
      await MonitoringService.addDomain(tab.url)
    }
  } catch (error) {
    console.error("Error monitoring active tab:", error)
  }
})

// Clean up expired domains periodically (every hour)
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

const cleanupExpiredDomains = async () => {
  try {
    // This will automatically filter out expired domains
    const activeDomains = await MonitoringService.getActiveDomainEntries()

    // Get all domains and replace with only active ones
    const allDomains = await MonitoringService.getDomainEntries()

    if (allDomains.length !== activeDomains.length) {
      // Save only the active domains back to storage
      await MonitoringService.clearDomainEntries()

      // Add each active domain back
      for (const domain of activeDomains) {
        await MonitoringService.addDomain(domain.domain)
      }
    }
  } catch (error) {
    console.error("Error cleaning up expired domains:", error)
  }
}

// Run cleanup on startup
cleanupExpiredDomains()

// Set up periodic cleanup
setInterval(cleanupExpiredDomains, CLEANUP_INTERVAL)
