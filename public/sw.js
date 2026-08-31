const CACHE_VERSION = "uvl15w-shell-v1"
const SHELL_URLS = [
  "/tr",
  "/en",
  "/icons/app-icon.svg",
  "/aprs-symbols/primary@2x.png",
  "/aprs-symbols/secondary@2x.png",
]

const NEVER_CACHE_EXTENSIONS = [".uvl15cps", ".bin", ".dat", ".fir", ".json"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      await Promise.allSettled(
        SHELL_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" }))
        )
      )
    })
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith("uvl15w-shell-") && key !== CACHE_VERSION
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (!isCacheableRequest(request)) return

  const url = new URL(request.url)
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    isStaticAsset(url.pathname)
  ) {
    event.respondWith(cacheFirst(request))
  }
})

function isCacheableRequest(request) {
  if (request.method !== "GET") return false
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  const pathname = url.pathname.toLowerCase()
  return !NEVER_CACHE_EXTENSIONS.some((extension) =>
    pathname.endsWith(extension)
  )
}

function isStaticAsset(pathname) {
  return /\.(?:css|js|png|svg|ico|woff2?)$/i.test(pathname)
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  await cacheSuccessfulResponse(request, response)
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    await cacheSuccessfulResponse(request, response)
    return response
  } catch (error) {
    const cached = await caches.match(request)
    if (cached) return cached

    const localeFallback = new URL(request.url).pathname.startsWith("/en")
      ? "/en"
      : "/tr"
    const shell = await caches.match(localeFallback)
    if (shell) return shell
    throw error
  }
}

async function cacheSuccessfulResponse(request, response) {
  if (!response.ok || response.type !== "basic") return
  const cache = await caches.open(CACHE_VERSION)
  await cache.put(request, response.clone())
}
