import React from 'react'

const GuestBannerContext = React.createContext(false)

export const GuestBannerProvider = GuestBannerContext.Provider

/** Returns true when the guest banner is currently visible at the top of the app. */
export function useGuestBannerVisible() {
  return React.useContext(GuestBannerContext)
}
