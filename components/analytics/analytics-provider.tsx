"use client"

import Script from "next/script"
import * as React from "react"

import { analyticsConfig } from "@/lib/analytics/config"
import {
  applyAnalyticsPreference,
  isAnalyticsConfigured,
  readAnalyticsPreference,
  resolveAnalyticsEnabled,
  sanitizeUmamiPayload,
  setAnalyticsRuntimeEnabled,
  writeAnalyticsPreference,
  type AnalyticsPreference,
} from "@/lib/analytics/index"

type AnalyticsContextValue = {
  configured: boolean
  enabled: boolean
  preference: AnalyticsPreference
  noticeVersion: number
  privacySignal: boolean
  storageAvailable: boolean
  resolved: boolean
  trackerReady: boolean
  setPreference(preference: Exclude<AnalyticsPreference, "unset">): void
  acknowledgeNotice(): void
}

const AnalyticsContext = React.createContext<AnalyticsContextValue | null>(null)

function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const configured = isAnalyticsConfigured()
  const [state, setState] = React.useState({
    available: false,
    enabled: false,
    preference: "unset" as AnalyticsPreference,
    noticeVersion: 0,
    privacySignal: false,
    storageAvailable: false,
    resolved: false,
    trackerReady: false,
  })

  React.useEffect(() => {
    window.__73kitUmamiBeforeSend = sanitizeUmamiPayload
    let stored: ReturnType<typeof readAnalyticsPreference>
    try {
      stored = readAnalyticsPreference(window.localStorage)
    } catch {
      stored = {
        storageAvailable: false,
        preference: "unset",
        noticeVersion: 0,
      }
    }
    const privacySignal =
      navigator.doNotTrack === "1" ||
      (navigator as Navigator & { globalPrivacyControl?: boolean })
        .globalPrivacyControl === true
    const enabled = resolveAnalyticsEnabled({
      configured,
      hostname: window.location.hostname,
      storageAvailable: stored.storageAvailable,
      preference: stored.preference,
      mode: analyticsConfig.mode,
      doNotTrack: navigator.doNotTrack === "1",
      globalPrivacyControl: privacySignal && navigator.doNotTrack !== "1",
    })
    setAnalyticsRuntimeEnabled(enabled)
    const available =
      configured && window.location.hostname === analyticsConfig.allowedDomain
    const resolveTimer = window.setTimeout(() => {
      setState({
        available,
        enabled,
        preference: stored.preference,
        noticeVersion: stored.noticeVersion,
        privacySignal,
        storageAvailable: stored.storageAvailable,
        resolved: true,
        trackerReady: false,
      })
    }, 0)

    return () => {
      window.clearTimeout(resolveTimer)
      setAnalyticsRuntimeEnabled(false)
      delete window.__73kitUmamiBeforeSend
    }
  }, [configured])

  const persistAndReload = React.useCallback(
    (preference: Exclude<AnalyticsPreference, "unset">) => {
      let stored = false
      try {
        stored = applyAnalyticsPreference(
          window.localStorage,
          { preference, noticeVersion: analyticsConfig.noticeVersion },
          () => window.location.reload()
        )
      } catch {
        setAnalyticsRuntimeEnabled(false)
      }
      if (!stored) {
        setState((current) => ({
          ...current,
          enabled: false,
          preference: "disabled",
          trackerReady: false,
        }))
      }
    },
    []
  )

  const acknowledgeNotice = React.useCallback(() => {
    const preference =
      state.preference === "unset" ? "enabled" : state.preference
    let stored = false
    try {
      stored = writeAnalyticsPreference(window.localStorage, {
        preference,
        noticeVersion: analyticsConfig.noticeVersion,
      })
    } catch {
      setAnalyticsRuntimeEnabled(false)
    }
    if (!stored) {
      setAnalyticsRuntimeEnabled(false)
      setState((current) => ({ ...current, enabled: false }))
      return
    }
    setState((current) => ({
      ...current,
      preference,
      noticeVersion: analyticsConfig.noticeVersion,
    }))
  }, [state.preference])

  const value = React.useMemo<AnalyticsContextValue>(
    () => ({
      configured: state.available,
      enabled: state.enabled,
      preference: state.preference,
      noticeVersion: state.noticeVersion,
      privacySignal: state.privacySignal,
      storageAvailable: state.storageAvailable,
      resolved: state.resolved,
      trackerReady: state.trackerReady,
      setPreference: persistAndReload,
      acknowledgeNotice,
    }),
    [acknowledgeNotice, persistAndReload, state]
  )

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      {state.resolved && state.enabled && (
        <Script
          id="umami-analytics"
          src={analyticsConfig.scriptUrl}
          strategy="afterInteractive"
          data-website-id={analyticsConfig.websiteId}
          data-domains={analyticsConfig.allowedDomain}
          data-exclude-search="true"
          data-exclude-hash="true"
          data-do-not-track="true"
          data-before-send="__73kitUmamiBeforeSend"
          onReady={() =>
            setState((current) => ({ ...current, trackerReady: true }))
          }
          onError={() => {
            setAnalyticsRuntimeEnabled(false)
            setState((current) => ({
              ...current,
              enabled: false,
              trackerReady: false,
            }))
          }}
        />
      )}
    </AnalyticsContext.Provider>
  )
}

function useAnalytics() {
  const value = React.useContext(AnalyticsContext)
  if (!value)
    throw new Error("useAnalytics must be used inside AnalyticsProvider")
  return value
}

export { AnalyticsProvider, useAnalytics }
