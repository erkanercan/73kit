import { expect, test, type Page, type Route } from "@playwright/test"

const productionOrigin = "https://73kit.erkan.dev"
const storageKey = "73kit.analytics.v1"

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" })
})

test("loads the stubbed tracker, shows the first-visit notice, and honors opt-out", async ({
  page,
}) => {
  const requests: string[] = []
  await stubUmami(page, requests)

  await page.goto(`${productionOrigin}/en/cps/tyt-uvl15w`)
  await expect(
    page.getByText("Anonymous analytics", { exact: true })
  ).toBeVisible()
  await expect.poll(() => requests.length).toBeGreaterThan(0)
  await expect
    .poll(() =>
      requests.some(
        (body) =>
          (JSON.parse(body) as Record<string, unknown>).name ===
          "serial_capability_checked"
      )
    )
    .toBe(true)

  const beforeOptOut = requests.length
  const reloaded = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame()
  )
  await page.getByRole("button", { name: "Turn off analytics" }).click()
  await reloaded
  await page.waitForLoadState("domcontentloaded")
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), storageKey))
    .toContain('"preference":"disabled"')
  await page.waitForTimeout(100)
  expect(requests).toHaveLength(beforeOptOut)
  await expect(
    page.getByText("Anonymous analytics", { exact: true })
  ).toHaveCount(0)
})

test("re-enables analytics from the privacy page", async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(
          key,
          JSON.stringify({ preference: "disabled", noticeVersion: 1 })
        )
      }
    },
    { key: storageKey }
  )
  const requests: string[] = []
  await stubUmami(page, requests)
  await page.goto(`${productionOrigin}/en/privacy`)
  await expect(page.getByRole("heading", { name: "Privacy" })).toBeVisible()
  const reenabled = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame()
  )
  await page.getByRole("button", { name: "Allow anonymous analytics" }).click()
  await reenabled
  await expect.poll(() => requests.length).toBeGreaterThan(0)
})

test("DNT overrides a stored enabled preference", async ({ page }) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ preference: "enabled", noticeVersion: 1 })
      )
      Object.defineProperty(navigator, "doNotTrack", {
        configurable: true,
        value: "1",
      })
    },
    { key: storageKey }
  )
  const requests: string[] = []
  await stubUmami(page, requests)

  await page.goto(`${productionOrigin}/tr/privacy`)
  await expect(
    page.getByText("tarayıcı gizlilik sinyaliyle devre dışı")
  ).toBeVisible()
  expect(requests).toEqual([])
})

test("sends one sanitized pageview per SPA navigation and no forbidden payload", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ preference: "enabled", noticeVersion: 1 })
      )
    },
    { key: storageKey }
  )
  const requests: string[] = []
  await stubUmami(page, requests)

  await page.goto(`${productionOrigin}/en/cps/tyt-uvl15w?secret=value#fragment`)
  await expect.poll(() => pageviews(requests).length).toBe(1)
  await page.evaluate(() => {
    history.pushState({}, "", "/en/privacy?private=value#details")
  })
  await expect.poll(() => pageviews(requests).length).toBe(2)

  const payloads = requests.map(
    (body) => JSON.parse(body) as Record<string, unknown>
  )
  expect(
    payloads
      .filter((payload) => payload.name === undefined)
      .map((payload) => payload.url)
  ).toEqual(["/en/cps/tyt-uvl15w", "/en/privacy"])
  for (const payload of payloads) {
    expect(payload).not.toHaveProperty("screen")
    expect(payload).not.toHaveProperty("language")
    expect(payload).not.toHaveProperty("timestamp")
    expect(JSON.stringify(payload)).not.toContain("secret")
    expect(JSON.stringify(payload)).not.toContain("fragment")
  }
})

test("English and Turkish privacy controls are keyboard accessible", async ({
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ preference: "enabled", noticeVersion: 1 })
      )
    },
    { key: storageKey }
  )
  const requests: string[] = []
  await stubUmami(page, requests)

  for (const locale of ["en", "tr"] as const) {
    await page.goto(`${productionOrigin}/${locale}/privacy`)
    const allow = page.getByRole("button", {
      name:
        locale === "en"
          ? "Allow anonymous analytics"
          : "Anonim kullanım analitiğine izin ver",
    })
    await expect(allow).toBeEnabled()
    await allow.focus()
    await expect(allow).toBeFocused()
    await page.keyboard.press("Tab")
    await expect(
      page.getByRole("button", {
        name:
          locale === "en" ? "Turn off analytics" : "Kullanım analitiğini kapat",
      })
    ).toBeFocused()
  }
})

async function stubUmami(page: Page, requests: string[]) {
  await page.route("https://73kit.erkan.dev/**", async (route) => {
    const url = new URL(route.request().url())
    const response = await route.fetch({
      url: `http://127.0.0.1:3100${url.pathname}${url.search}`,
    })
    await route.fulfill({ response })
  })
  await page.route("https://cloud.umami.is/script.js", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: trackerStub,
    })
  })
  await page.route("https://cloud.umami.is/api/send", async (route: Route) => {
    requests.push(route.request().postData() ?? "")
    await route.fulfill({ status: 204 })
  })
}

function pageviews(requests: string[]) {
  return requests.filter(
    (body) => (JSON.parse(body) as Record<string, unknown>).name === undefined
  )
}

const trackerStub = String.raw`
(() => {
  if (window.__stubUmamiLoaded) return;
  window.__stubUmamiLoaded = true;
  const script = document.currentScript;
  let lastPageview = "";
  const send = (name, data) => {
    if (!name && lastPageview === location.pathname) return;
    if (!name) lastPageview = location.pathname;
    const input = {
      website: script.dataset.websiteId,
      hostname: location.hostname,
      url: location.href,
      title: document.title,
      referrer: document.referrer,
      screen: screen.width + "x" + screen.height,
      language: navigator.language,
      timestamp: Date.now(),
      ...(name ? { name, data } : {}),
    };
    const payload = window[script.dataset.beforeSend]("event", input);
    if (payload) fetch("https://cloud.umami.is/api/send", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  };
  window.umami = { track: send };
  send();
  const pushState = history.pushState.bind(history);
  history.pushState = (...args) => {
    pushState(...args);
    send();
  };
})();
`
