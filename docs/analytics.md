# Umami analytics handoff

73Kit's analytics boundary is implemented in `lib/analytics/`. Delivery is enabled for `73kit.erkan.dev` with the checked-in Umami Cloud website ID and HTTPS tracker URL. These browser tracker values are intentionally public, so no environment variables or secrets are used.

The application uses automatic Umami SPA pageviews plus an allowlisted, categorical event contract. DNT and Global Privacy Control override every stored preference. If browser storage is unavailable, analytics stays disabled. Disabling or re-enabling reloads the application so Umami's automatic listeners cannot remain active. Analytics is isolated from Radio, Codeplug, persistence, protocol, and transport adapters.

Verified in the Umami account on 2026-09-04: the website name is `73Kit`, its domain is `73kit.erkan.dev`, the website ID and generated tracker URL match `lib/analytics/config.ts`, the account data region is EU, and the current Hobby plan retains data for six months. Replays and Heatmaps require a Business subscription and are therefore unavailable on this account.

## Manual post-implementation checklist

1. Sign in to your existing Umami account.
2. Confirm which Umami region owns the configured website and retain that account record.
3. Create a website for `73kit.erkan.dev`, or open the existing website.
4. Confirm its displayed domain is exactly `73kit.erkan.dev`.
5. Open the website's generated tracking-code screen.
6. Copy only the website ID and complete HTTPS tracker script URL.
7. Confirm Session Replay and Heatmaps are disabled.
8. Do not configure Distinct IDs, user identification, session properties, performance tracking, advertising, or additional automatic event capture.
9. Record the account's actual retention period and regional processing details.
10. Review or accept the Umami DPA and inspect its subprocessors using your account documents.
11. Confirm and retain your records for the KVKK overseas-transfer mechanism and legal basis for default-on, cookieless analytics. If default-on is not approved, change `mode` to `consent-opt-in`.
12. Confirm `lib/analytics/config.ts` still contains the intended website ID, exact tracker URL, `allowedDomain: "73kit.erkan.dev"`, approved mode, and `enabled: true`.
13. If you publish exact account-specific region, retention, legal-basis, or transfer details, update both locale dictionaries from verified account and legal records; do not infer them from the public tracker URL.
14. Run `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm build:vinext`.
15. Review the source diff and ensure it contains no API key, account credential, or secret. The website ID and tracker URL are intentionally public.
16. Deploy through your normal Cloudflare workflow.
17. Open a fresh production browser profile and confirm the first-visit notice appears.
18. In Network tools, confirm the tracker comes from the exact configured Umami origin and payloads contain no query string, fragment, sensitive Radio data, filename, identifier, or free-form error.
19. Select **Turn off analytics**, confirm the application reloads, and confirm no further Umami requests occur.
20. Re-enable analytics from the Privacy page and confirm tracking resumes.
21. Repeat with DNT or GPC enabled and confirm the tracker does not load.
22. Open Umami's real-time view and verify one pageview and representative mocked or otherwise non-destructive events.
23. Create these reports manually: Radio Read completion funnel; full CPS adoption funnel; Radio Read outcome trend; Radio Write outcome trend; Firmware or Resource update outcome trend; and feature usage by section.
24. Confirm no separate Cloudflare Web Analytics beacon or other analytics script is active for this application.
25. Review event payloads and volume after 30 days before expanding the schema.

Do not add an Umami API key unless a future server-side integration genuinely requires it. Such a key must be a server-only secret and is outside this implementation.
