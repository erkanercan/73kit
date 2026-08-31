# SEO and Generative-Search Discoverability Research

Date: 2026-08-31

## Implementation decisions

The owner selected the following implementation contract on 2026-08-31:

- canonical origin: `https://cps.erkan.dev`;
- preserve every existing CPS URL rather than adding a `/cps` prefix;
- describe the project as free, independent, unofficial software by Erkan;
- publish it under `AGPL-3.0-only`;
- allow search/retrieval crawlers while disallowing the training-oriented
  `GPTBot` and `ClaudeBot`; and
- add no analytics in the initial implementation.

The owner subsequently rejected the unapproved public-site implementation.
No separate landing, guide, compatibility, privacy, or about pages are part of
the implementation. Any future public surface requires prior content and design
approval.

The Turkish-market product name is **Tekser TR-UV15**, confirmed on Tekser
Elektronik's product page
([Tekser TR-UV15](https://tekserelektronik.com/tekser-tr-uv15-15w-ultra-yuksek-guclu-dual-bant-el-telsizi)).
Search metadata uses both `Tekser TR-UV15` and `TYT UVL-15W`; technical
compatibility remains bounded by the firmware and physical-validation evidence
in this repository.

## Decision

The best strategy is **not a separate collection of GEO tricks**. It is a
two-surface product architecture:

1. a public, server-rendered, bilingual product and documentation surface that
   explains the CPS, its exact support boundary, and its evidence-backed
   workflows; and
2. the stateful browser CPS surface, kept local-first and excluded from the
   search index where its pages are thin, duplicated, or meaningful only after
   a Radio Read.

Then make the public surface technically unambiguous with canonical URLs,
`hreflang`, a sitemap, crawlable links, unique metadata, accurate structured
data, and explicit crawler/WAF policy. Submit and measure it in Google Search
Console and Bing Webmaster Tools. Add `llms.txt` only as an optional, low-cost
experiment after the canonical HTML documentation exists.

This order follows the platforms' own guidance. Google says its generative
features use the core Search index and ranking systems, that ordinary SEO
remains the foundation, and that valuable non-commodity content matters more
than AI-specific formatting. It explicitly says Google Search ignores
`llms.txt` and that no special schema is required for generative results
([Google generative-search guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).
Bing likewise ties discoverability and grounding eligibility in Bing and
Copilot to clear content, crawlable URLs, sitemaps, internal/external links,
and IndexNow rather than a separate GEO layer
([Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)).

## Current repository assessment

The repository already has unusually strong source material for useful,
original public content:

- a concise product definition and exact production scope in the
  [README](../../README.md);
- dated evidence and strict supported/unsupported boundaries in
  [production readiness](../production-readiness.md);
- original hardware, protocol, and feature investigations in this research
  directory; and
- a local-first architecture that keeps Codeplugs and Radio communication out
  of a server path
  ([ADR 0002](../adr/0002-keep-radio-communication-local.md)).

The current web surface does not expose that material effectively:

- There are 20 page routes per locale under `app/[locale]`, but none of the
  individual pages has route-specific metadata. The locale layout gives every
  page the title `UVL-15W CPS` and one shared localized description
  ([locale layout](../../app/%5Blocale%5D/layout.tsx)).
- Turkish and English use stable, separate `/tr/...` and `/en/...` paths, but
  the metadata does not currently declare canonical or alternate-language
  URLs ([routing](../../i18n/routing.ts)).
- There is no `robots.txt`, sitemap, JSON-LD, `metadataBase`, public
  documentation route, or deployment-domain configuration in the repository.
- The locale root is the interactive CPS overview, and the primary navigation
  leads mainly to stateful editors. Much of their useful detail is conditional
  on a browser capability or a successful Radio Read
  ([overview](../../components/overview-workspace.tsx),
  [CPS shell](../../components/cps-app-shell.tsx)).
- The application already pre-generates both locale roots and uses Next.js
  App Router metadata. Next.js 16.2.6 has first-class metadata routes for
  `robots.txt` and `sitemap.xml`, localized sitemap alternates, per-route
  metadata, and server-rendered JSON-LD
  ([package](../../package.json),
  [Next.js sitemap](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap),
  [robots](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots),
  [metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata),
  [JSON-LD](https://nextjs.org/docs/app/guides/json-ld)).

The conclusion is that crawl control is not the primary gap. The primary gap
is a stable, public body of content that clearly answers what the product is,
who it is for, what it supports, how it works, and why its claims are credible.

## Proven mechanisms versus experimental GEO tactics

| Mechanism                                                                                          | Evidence level                                                                                                                              | Recommendation                               |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Public, useful, original HTML content with crawlable links                                         | Established discovery, indexing, and retrieval mechanism                                                                                    | Highest priority                             |
| Unique titles/descriptions, canonical URLs, status `200`, semantic HTML, accessible text           | Established technical SEO                                                                                                                   | Required                                     |
| XML sitemap containing only canonical indexable URLs                                               | Established discovery/freshness signal; not an indexing guarantee                                                                           | Required                                     |
| Separate localized URLs plus reciprocal `hreflang`                                                 | Established language-routing signal                                                                                                         | Required for Turkish/English                 |
| Allow search crawlers in `robots.txt` and through the WAF/CDN                                      | Documented requirement for OpenAI, Anthropic, and Perplexity search visibility                                                              | Required if those systems are in scope       |
| Accurate `WebApplication`, `TechArticle`, `WebSite`, publisher, and breadcrumb JSON-LD             | Standardized entity/content description; selected Google rich-result eligibility                                                            | Useful, secondary to visible content         |
| Search Console and Bing Webmaster Tools                                                            | First-party indexing, query, and crawl measurement                                                                                          | Required                                     |
| IndexNow on actual content changes                                                                 | Established Bing/participating-engine freshness notification; receipt is not indexing                                                       | Useful once public content changes regularly |
| Legitimate links and references from relevant radio/software communities                           | Established discovery and authority signal                                                                                                  | Important; earn rather than manufacture      |
| `llms.txt` and Markdown mirrors                                                                    | A third-party proposal with adoption, but no documented ranking/indexing role in Google, OpenAI Search, Claude Search, or Perplexity Search | Optional experiment only                     |
| Tiny “AI chunks,” keyword permutations, AI-only rewrites, or mass FAQ pages                        | Google explicitly says these are unnecessary or can become scaled-content abuse                                                             | Do not do                                    |
| Fabricated ratings, reviews, authorship, organization relationships, or unsupported product claims | Violates structured-data/content trust principles                                                                                           | Never do                                     |

Google's developer guide says crawlers discover pages through real links,
sitemaps, and redirects; each meaningful screen needs a URL; textual content
must be visible in the DOM; and each page should have a descriptive title and
description
([Google developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers)).
Google can render JavaScript, but it still recommends server-side rendering or
pre-rendering because it is faster and not every bot runs JavaScript
([Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)).

## Recommended information architecture

### Separate “learn” from “operate”

The ideal clean structure is:

```text
/
  language choice or stable x-default landing
/tr/ and /en/
  public product landing pages
/tr/guides/... and /en/guides/...
  public, indexable documentation
/tr/cps/... and /en/cps/...
  the interactive local-first CPS
```

Moving the current workspace below `/[locale]/cps` is a product/navigation
decision, not a prerequisite for initial SEO work. A lower-risk first release
can add `/[locale]/guides` and other public pages beside the existing routes.
However, making `/tr` and `/en` genuine public landing pages will communicate
the product far better to a first-time human, Googlebot, and retrieval systems
than the current disconnected-Radio workspace.

Use a dedicated layout boundary so that:

- public pages are indexable, listed in the sitemap, server-rendered, and
  connected by ordinary `<a href>` links;
- interactive CPS pages carry `noindex,follow` when they do not provide unique
  public value and are omitted from the sitemap; and
- `robots.txt` does not block a URL that relies on a `noindex` directive,
  because a crawler must fetch the page to see that directive.

Do not put any Codeplug, Source Radio identity, Backup History, serial traffic,
or browser-local state in public pages, metadata, telemetry, or structured
data. That preserves the repository's local-communication ADR while allowing
static product knowledge to be public.

### Publish the product's real information advantage

The first public pages should be few, complete, and maintained in both Turkish
and English:

1. **Product landing:** “TYT UVL-15W Browser CPS” with one-sentence value,
   verified scope, a visible “Open CPS” action, screenshots, and an explicit
   relationship statement to TYT. Confirm whether the project is official,
   affiliated, or independent before publishing that statement.
2. **Compatibility and requirements:** desktop Chromium, HTTPS, Web Serial,
   USB CDC, firmware `3.07.23`, exact supported/unsupported matrix, and a
   dated “last verified” field. This should be generated from or reviewed
   against the same source of truth as production readiness.
3. **Features:** Radio Read, immutable Codeplug Backup, Working Codeplug,
   Channels, Zones, Scan Lists, settings, Backup History, reviewed Change Set,
   Radio Write, and the separate beta updater workflow. Use the domain terms in
   [CONTEXT.md](../../CONTEXT.md) rather than generic radio-software synonyms.
4. **How to program a UVL-15W in the browser:** prerequisites, complete Radio
   Read, backup, edit, review, Radio Write, verification, and stop/recovery
   conditions. Do not imply support beyond the physical evidence.
5. **Backup and restore safety:** explain Raw Backup Export, CPS File, Source
   Radio binding, fresh reads, Restore Plans, and “Write Outcome Unknown.”
6. **Privacy and local operation:** explain exactly which data remains in the
   browser, IndexedDB/session behavior, what the server receives, and any
   optional analytics separately. This is a strong differentiator, not boilerplate.
7. **Troubleshooting and support matrix:** Web Serial availability, secure
   context, USB detection, exact firmware mismatch, write protection, and
   recovery paths, all dated and source-linked.
8. **Release notes/about:** real publisher/maintainer identity, version history,
   test evidence, contact/support path, license, and genuine links to the
   project's public source or issue tracker if those are made public.

This is exactly the kind of first-hand, non-commodity content Google says is
useful to both ordinary and generative Search. Do not publish hundreds of
slightly different query pages. One strong compatibility page should answer
“supported browser,” “supported firmware,” and “does Bluetooth work” with
precise sections and anchors.

## Technical SEO specification

### URLs, locale, and metadata

- Choose the production canonical origin before implementation. There is no
  deploy-domain source of truth in the repository today, so canonical URLs,
  sitemap entries, Open Graph images, and verification cannot be correct until
  that is decided.
- Give every public route a localized, route-specific title, description,
  canonical URL, Open Graph/Twitter metadata, and share image. Titles should
  name the entity and task naturally, for example “TYT UVL-15W Browser CPS -
  Program and Back Up Your Radio” rather than repeating keyword variants.
- Declare reciprocal `tr`, `en`, and where appropriate `x-default` alternates.
  Each localized page must link to itself and its corresponding translation.
  Google treats HTML, HTTP-header, and sitemap `hreflang` methods as equivalent;
  use one consistently rather than maintaining three duplicate systems
  ([Google localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions)).
- Keep one canonical URL per content item. Redirect old URLs permanently if
  the workspace routes move.
- Ensure the initial HTML contains the page's heading, summary, supported scope,
  and internal links. Progressive interactive components may hydrate later.

### Sitemap, robots, status, and crawl access

- Generate `/sitemap.xml` from an explicit registry of public routes and both
  locales. Include only canonical, indexable URLs. Use `lastModified` only when
  it represents a real material content review; do not stamp every deployment.
- Generate `/robots.txt`, allow ordinary public crawling, and point to the
  absolute sitemap URL. Keep preview, test, and non-production deployments
  protected at the deployment layer so they cannot become duplicate origins.
- Return normal `200` responses for valid public pages, permanent redirects for
  moved pages, and real `404` responses for missing pages. Avoid soft 404s.
- Verify that the CDN/WAF does not challenge or block verified search bots.
  User-agent strings alone are spoofable; where a provider publishes IP ranges,
  combine agent and current provider-owned IP data.

Sitemaps help discovery but do not guarantee indexing
([Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[Bing sitemap guidance](https://blogs.bing.com/webmaster/July-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search)).
For Bing and participating engines, IndexNow can notify additions, material
updates, and deletions. A successful submission only confirms receipt, not
indexing
([IndexNow protocol](https://www.indexnow.org/documentation)). For this small,
mostly static site, a correct sitemap comes first; add IndexNow when release
notes or support pages begin changing regularly.

### Structured data

Render JSON-LD that describes visible page content, with stable absolute `@id`
values that connect the site, publisher, application, and articles:

- `WebSite` once per locale/site identity;
- `WebApplication` on the public product page, using truthful `name`, `url`,
  `description`, `applicationCategory`, `operatingSystem`,
  `browserRequirements`, `featureList`, `screenshot`, `inLanguage`, publisher,
  and version/release information where maintained;
- `TechArticle` for substantial procedural guides, with headline, description,
  author/publisher, date published, date modified, language, prerequisites, and
  canonical URL;
- `BreadcrumbList` where public documentation has real hierarchy; and
- a real `Person` or `Organization` publisher only after ownership, name,
  logo, and genuine `sameAs` profiles are confirmed.

Schema.org defines `WebApplication` as a `SoftwareApplication` and provides
specific browser requirements, feature list, operating system, and screenshot
properties
([Schema.org `WebApplication`](https://schema.org/WebApplication)). It defines
`TechArticle` for specifications, procedural troubleshooting, and how-to
material
([Schema.org `TechArticle`](https://schema.org/TechArticle)).

Google supports software-app structured data, but its software rich result
requires `name`, an offer price, and a genuine rating or review. Do not invent
a review to satisfy the validator. If the CPS is genuinely free, an offer price
of `0` is accurate, but without a real rating/review the page may not qualify
for that rich result
([Google software-app structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)).
The JSON-LD still has entity-description value, but it is not a ranking switch
or a special LLM channel. Google explicitly warns against over-focusing on
structured data for generative search.

Do not prioritize `FAQPage` markup. A human-readable FAQ or troubleshooting
section can be useful, but no current official Google Search documentation
offers a general FAQ rich-result path for an ordinary software project. Use
structured data only where it describes the visible page accurately.

## AI crawler policy

Search/retrieval crawling and foundation-model training are different policy
choices. Decide them independently and document the result.

| Provider agent          | Documented purpose                                                                                     | Visibility recommendation                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `OAI-SearchBot`         | Surface sites in ChatGPT Search                                                                        | Allow and permit its published IP ranges                                 |
| `GPTBot`                | Content that may be used to train OpenAI foundation models                                             | Owner policy decision; not required for ChatGPT Search                   |
| `ChatGPT-User`          | User-triggered page access, not automatic search crawling                                              | Permit if user-directed retrieval is desired; robots rules may not apply |
| `Claude-SearchBot`      | Improve/index content for Claude search results                                                        | Allow                                                                    |
| `Claude-User`           | User-initiated retrieval                                                                               | Allow if user-directed retrieval is desired                              |
| `ClaudeBot`             | Potential foundation-model training data                                                               | Owner policy decision; not required for Claude search                    |
| `PerplexityBot`         | Surface and link sites in Perplexity search                                                            | Allow and permit its published IP ranges                                 |
| `Perplexity-User`       | User-triggered retrieval                                                                               | Permit if desired; Perplexity says it generally ignores `robots.txt`     |
| `Googlebot` / `Bingbot` | Search indexing and the search systems that feed Google generative features and Bing/Copilot grounding | Allow                                                                    |

OpenAI explicitly separates `OAI-SearchBot` from `GPTBot` and says a site may
allow Search while disallowing training
([OpenAI crawler documentation](https://developers.openai.com/api/docs/bots)).
Anthropic similarly separates `Claude-SearchBot`, `Claude-User`, and
training-oriented `ClaudeBot`, and says its bots honor `robots.txt`
([Anthropic crawler documentation](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)).
Perplexity documents separate automated and user-triggered agents and publishes
IP ranges for WAF validation
([Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers)).

A simple general allow policy already permits compliant search crawlers. Add
agent-specific records only when expressing a distinct training or retrieval
choice. Test the deployed `robots.txt` against the final policy; do not assume
that adding bot names increases ranking.

## `llms.txt` assessment

`llms.txt` is a community proposal for a concise Markdown directory plus
optional Markdown page mirrors
([proposal](https://llmstxt.org/)). It is not part of the Robots Exclusion
Protocol, schema.org, or a published indexing requirement from Google,
OpenAI Search, Anthropic Search, or Perplexity Search.

There are two facts worth keeping separate:

- some major developer-documentation sites publish `llms.txt`, which shows it
  can be a convenient agent-facing documentation index; and
- Google Search explicitly says it does not use `llms.txt` and that the file
  neither helps nor hurts Google visibility.

No reviewed OpenAI, Anthropic, or Perplexity crawler documentation says that
their public-search indexes discover or rank third-party sites through
`llms.txt`. Therefore:

1. do not create it before the canonical public documentation;
2. if added, make it a short generated directory of canonical public pages,
   product scope, and documentation links-not a second source of truth;
3. link only public, safe information; and
4. measure bot requests and cited/referral outcomes before investing in
   Markdown mirrors.

This is low-cost experimentation, not the core strategy.

## Authority and distribution

Search engines primarily discover new pages from links, and Bing explicitly
lists relevant external links as a discovery and grounding signal. Once the
public pages are complete:

- link the deployed site from a genuine public source repository and its README
  if the project is made public;
- publish real release notes and link them from releases/issues;
- share the compatibility and safety guides with relevant TYT, amateur-radio,
  and Web Serial communities when they solve an actual question;
- seek inclusion in legitimate radio-software/resource lists; and
- keep product name, canonical URL, author/publisher identity, support status,
  and screenshots consistent across genuine profiles.

Do not buy links, mass-post mentions, create fake reviews, or present the CPS as
official TYT software unless that relationship is real. Google specifically
warns that inauthentic mentions are not a useful generative-search tactic.

## Measurement plan

Measurement must start before content is launched so changes have a baseline.

### First-party search tools

1. Verify the canonical domain in Google Search Console and Bing Webmaster
   Tools.
2. Submit the sitemap to both. Inspect the Turkish and English landing,
   compatibility, and top guide URLs individually.
3. Record indexed/not-indexed state, chosen canonical, rendered HTML, crawl
   errors, and structured-data validation after each release.
4. Track impressions, clicks, click-through rate, position, landing page,
   country, device, and queries. Google now exposes generative-feature
   performance through its Search Console generative AI report where available
   ([Google generative-search guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)).
5. Use Bing Webmaster Tools for Bing/Copilot discovery, sitemap, crawl, and
   query evidence. Use IndexNow response and crawl logs as delivery evidence,
   not as proof of indexing or citation.

### Product and server evidence

- Maintain a small, privacy-reviewed analytics plan for public pages and CPS
  entry actions. Do not send Codeplug content, Source Radio identity, selected
  serial ports, frequencies, callsigns, or Backup History.
- Separate organic search, AI referrals, direct traffic, and product activation:
  public landing view -> “Open CPS” -> capability available -> successful Radio
  Read. Referral headers may be absent, so “direct” cannot be assumed to mean
  non-AI traffic.
- Log only privacy-safe HTTP request fields needed to verify bot access. Match
  search crawler user agents with provider-published IP ranges rather than
  trusting the header alone.
- Run a monthly manual citation check using a fixed bilingual query set, record
  the exact query, answer, cited URL, engine, locale, date, and whether the
  claim was accurate. This is an observational benchmark, not a rank tracker
  with guaranteed repeatability.

Suggested baseline query families:

- `TYT UVL-15W CPS`, `UVL-15W browser CPS`, `UVL-15W programming software`;
- `TYT UVL-15W programlama`, `UVL-15W Codeplug yedekleme`;
- `UVL-15W Web Serial`, `UVL-15W supported firmware`;
- `how to back up TYT UVL-15W`, `UVL-15W Radio Write safety`; and
- real task/feature questions about Channels, Zones, Scan Lists, APRS, GPS,
  Bluetooth limitations, Backup History, and firmware/resource updates.

The success metrics should be qualified discovery and use, not raw indexed-page
count: non-brand impressions, correct citations to compatibility/safety pages,
organic/AI visits that open the CPS, successful Radio Reads from those visits,
and zero leakage of browser-local Radio data.

## Phased implementation order

### Phase 0 - decisions and baseline

- Confirm canonical production domain and deployment host.
- Confirm official/independent relationship wording, publisher identity,
  license, support/contact path, and whether the CPS is free.
- Decide GPTBot and ClaudeBot training policy separately from search visibility.
- Capture current index/query baseline and decide the public/app URL split.

### Phase 1 - public content foundation

- Create localized public landing, compatibility, features, programming guide,
  backup/restore safety, privacy/local operation, troubleshooting, and
  about/release pages.
- Make content server-rendered, semantic, internally linked, dated, and derived
  from repository source-of-truth documents.
- Add screenshots with meaningful alt text and captions. Show the real desktop
  product; do not create fictional features.

### Phase 2 - technical discovery

- Add metadata base, unique localized metadata, canonical and reciprocal
  alternates, sitemap, robots, real 404/redirect behavior, and public/app index
  policy.
- Add accurate JSON-LD and validate it against Schema.org and Google's Rich
  Results Test.
- Verify CDN/WAF crawler access, submit the sitemap, and inspect representative
  URLs in both webmaster tools.

### Phase 3 - distribution and freshness

- Publish genuine repository/release/community links.
- Add IndexNow if public support/release content changes often enough to benefit.
- Optionally generate a minimal `llms.txt`; compare crawler logs and citations
  before adding Markdown mirrors.

### Phase 4 - iteration

- Review search and activation data monthly for the first three months.
- Improve pages that earn impressions but fail to answer intent or produce a
  useful CPS entry.
- Expand content only from real support questions, new verified compatibility,
  or original project evidence.

## Open decisions before implementation

The research does not justify guessing these values:

1. What is the canonical production domain?
2. Is this an official TYT product, affiliated with TYT, or an independent
   community CPS?
3. Who is the public publisher/maintainer, and which genuine profiles may be
   connected with `sameAs`?
4. Is the CPS free, and under what public license/terms?
5. Should the current `/[locale]` workspace move under `/[locale]/cps`, or
   should the first release add a parallel public `/[locale]/guides` surface?
6. Should foundation-model training bots (`GPTBot`, `ClaudeBot`) be allowed or
   disallowed while search bots remain allowed?
7. Which analytics implementation, if any, is acceptable under the local-first
   privacy promise?

These are the only material policy/product questions. The technical direction
does not depend on speculative GEO claims.
