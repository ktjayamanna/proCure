import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/chrome-extension'

import { DomainList } from '~features/monitoring/domain-list'
import { SyncProvider } from '~features/sync/sync-context'

import '~style.css'

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const EXTENSION_URL = chrome.runtime.getURL('.')

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

function IndexPopup() {
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
      signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
    >
      <SyncProvider>
        <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-[600px] plasmo-w-[800px] plasmo-flex-col">
          <header className="plasmo-w-full">
            <SignedOut>
              <SignInButton mode="modal" />
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <main className="plasmo-grow plasmo-w-full plasmo-p-4">
            <SignedOut>
              <div className="plasmo-text-center plasmo-py-8">
                <h2 className="plasmo-text-xl plasmo-font-semibold plasmo-mb-2">Welcome to proCure</h2>
                <p className="plasmo-text-gray-600 plasmo-mb-4">Sign in to see your domain monitoring activity</p>
              </div>
            </SignedOut>
            <SignedIn>
              <DomainList />
            </SignedIn>
          </main>
        </div>
      </SyncProvider>
    </ClerkProvider>
  )
}

export default IndexPopup