type AnalyticsMode = "notice-opt-out" | "consent-opt-in"

/**
 * Public Umami browser configuration.
 *
 * The website ID and tracker URL are intentionally not secrets. These values
 * are checked in because the browser must receive them to load Umami. Private
 * API credentials must never be added here.
 */
const analyticsConfig = Object.freeze({
  enabled: true,
  mode: "notice-opt-out" as AnalyticsMode,
  websiteId: "9a553594-03ac-4009-a1b6-3f6267387aa6",
  scriptUrl: "https://cloud.umami.is/script.js",
  allowedDomain: "73kit.erkan.dev",
  noticeVersion: 1,
})

export { analyticsConfig }
export type { AnalyticsMode }
