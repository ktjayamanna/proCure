import type { PlasmoCSConfig } from "plasmo"
import { useEffect } from "react"

import { MonitoringService } from "~features/monitoring/monitoring-service"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const PlasmoOverlay = () => {
  useEffect(() => {
    // Capture the current URL when the content script loads
    const captureCurrentDomain = async () => {
      try {
        await MonitoringService.addDomain(window.location.href)
      } catch (error) {
        console.error("Error capturing domain:", error)
      }
    }

    captureCurrentDomain()
  }, [])

  // Return an empty div - no visible UI in the content script
  return <div style={{ display: "none" }} />
}

export default PlasmoOverlay
