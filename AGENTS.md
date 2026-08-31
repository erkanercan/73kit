<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

Issues are tracked in this repository's GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Triage uses the five canonical label names without overrides. See `docs/agents/triage-labels.md`.

### Domain docs

Domain documentation uses the single-context layout. See `docs/agents/domain.md`.

### Target layout

This application targets desktop browsers only. Keep page shells, spacing, and controls consistent with the existing desktop Radio Settings layouts; mobile-specific layouts and responsive behavior are out of scope unless explicitly requested.

### Browser validation

Always use the `chrome:control-chrome` skill for browser validation and UI checks.
