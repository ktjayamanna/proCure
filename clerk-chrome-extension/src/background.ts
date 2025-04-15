import { MonitoringService } from "~features/monitoring/monitoring-service"
import { BackgroundSync } from "~features/sync/background-sync"
import { refreshToken, isTokenExpired } from "~background/token-refresh"

// Listen for tab updates to capture navigation events
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only process when the URL has changed and is complete
  if (changeInfo.status === "complete" && tab.url) {
    try {
      // Add the hostname to monitoring
      await MonitoringService.addDomain(tab.url)
    } catch (error) {
      console.error("Error monitoring hostname in background:", error)
    }
  }
})

// Listen for tab activation to capture the current active tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      // Add the hostname to monitoring
      await MonitoringService.addDomain(tab.url)
    }
  } catch (error) {
    console.error("Error monitoring active tab:", error)
  }
})

// Clean up expired hostnames periodically
const cleanupExpiredHostnames = async () => {
  try {
    // This will automatically filter out expired hostnames
    const activeHostnames = await MonitoringService.getActiveDomainEntries()

    // Get all hostnames and replace with only active ones
    const allHostnames = await MonitoringService.getDomainEntries()

    if (allHostnames.length !== activeHostnames.length) {
      // Save only the active hostnames back to storage
      await MonitoringService.clearDomainEntries()

      // Add each active hostname back
      for (const entry of activeHostnames) {
        await MonitoringService.addDomain(entry.hostname)
      }
    }
  } catch (error) {
    console.error("Error cleaning up expired hostnames:", error)
  }
}

// Run cleanup on startup
cleanupExpiredHostnames()

// Set up alarm for cleanup (every hour)
chrome.alarms.create('cleanupExpiredHostnames', {
  periodInMinutes: 60 // 1 hour
})

// Function to sync domain entries with backend
const syncDomainEntries = async () => {
  try {
    console.log('Starting sync with backend...')
    await BackgroundSync.syncDomainEntries()
  } catch (error) {
    console.error('Error during sync process:', error)
  }
}

// Set up alarm for syncing (every 2 minutes)
chrome.alarms.create('syncDomainEntries', {
  periodInMinutes: 2
})

// Function to refresh the authentication token
const refreshAuthToken = async () => {
  try {
    console.log('Starting token refresh check...')
    const isExpired = await isTokenExpired()
    if (isExpired) {
      console.log('Token is expired or about to expire, refreshing...')
      const token = await refreshToken()
      if (token) {
        console.log('Token refreshed successfully')
      } else {
        console.log('Token refresh failed or no active session')
      }
    } else {
      console.log('Token is still valid, no refresh needed')
    }
  } catch (error) {
    console.error('Error during token refresh check:', error)
  }
}

// Set up alarm for token refresh (every 5 minutes)
chrome.alarms.create('refreshAuthToken', {
  periodInMinutes: 5
})

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncDomainEntries') {
    syncDomainEntries()
  } else if (alarm.name === 'cleanupExpiredHostnames') {
    cleanupExpiredHostnames()
  } else if (alarm.name === 'refreshAuthToken') {
    refreshAuthToken()
  }
})

// Run token refresh check on startup (after a short delay to allow extension to initialize)
setTimeout(refreshAuthToken, 3000)

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'refresh-token') {
    refreshAuthToken()
      .then(() => sendResponse({ success: true }))
      .catch(error => {
        console.error('Error refreshing token:', error)
        sendResponse({ success: false, error: error.message })
      })
    return true // Keep the message channel open for async response
  }
  return false
})

// Run sync on startup (after a short delay to allow extension to initialize)
setTimeout(syncDomainEntries, 5000)
