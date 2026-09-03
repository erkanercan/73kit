import { createHash } from "node:crypto"

import { expect, test, type Page } from "@playwright/test"

test("renders the released English and Turkish shells without console errors", async ({
  page,
}) => {
  const errors = captureConsoleErrors(page)

  await page.goto("/en/cps/tyt-uvl15w")
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible()
  await page.goto("/tr/cps/tyt-uvl15w")
  await expect(page.getByRole("heading", { name: "Genel Bakış" })).toBeVisible()

  expect(errors).toEqual([])
})

test("keeps the Updates route behind its beta acknowledgement", async ({
  page,
}) => {
  await page.goto("/en/cps/tyt-uvl15w/updates")

  await expect(
    page.getByRole("heading", { name: "Beta updater" })
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Continue" })).toBeVisible()
})

test("shows a direct Backup History restore failure", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serial", {
      configurable: true,
      value: {
        getPorts: async () => [],
        requestPort: async () => {
          throw new DOMException("No port selected", "NotFoundError")
        },
      },
    })
  })
  await page.goto("/tr/cps/tyt-uvl15w/backups")
  await seedBackupHistory(page)
  await page.reload()

  await page.getByRole("button", { name: "Yedeği geri yükle" }).click()

  await expect(
    page.getByText("Geri yükleme hazırlığı durdu", { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole("alert").filter({ hasText: "No port selected" })
  ).toBeVisible()
})

function captureConsoleErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

async function seedBackupHistory(page: Page) {
  const byteLength = 0x19000
  const sha256 = createHash("sha256")
    .update(Buffer.alloc(byteLength))
    .digest("hex")

  await page.evaluate(
    async ({ expectedByteLength, expectedSha256 }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("tyt-uvl15-web-cps")
        request.addEventListener("upgradeneeded", () => {
          if (
            !request.result.objectStoreNames.contains("radio-write-operations")
          ) {
            request.result.createObjectStore("radio-write-operations")
          }
          if (!request.result.objectStoreNames.contains("codeplug-backups")) {
            request.result.createObjectStore("codeplug-backups", {
              keyPath: "id",
            })
          }
        })
        request.addEventListener("success", () => resolve(request.result))
        request.addEventListener("error", () => reject(request.error))
      })
      const transaction = database.transaction("codeplug-backups", "readwrite")
      transaction.objectStore("codeplug-backups").put({
        schemaVersion: 1,
        id: "backup:e2e-restore",
        origin: "radio-read",
        sourceRadio: {
          model: "UVL-15W",
          subModel: 1,
          firmwareVersion: "3.07.23",
          imageResourceVersion: "1.01.00",
          cpuId: "00112233445566778899aabb",
          bootloaderModel: "UVL15W-BOOT",
          hardwareVersion: "UVL15W-HW",
          serialNumber: "UVL15W-E2E-0001",
          readProtected: false,
          writeProtected: false,
        },
        createdAt: "2026-08-31T08:00:00.000Z",
        sha256: expectedSha256,
        byteLength: expectedByteLength,
        changeCount: 0,
        bytes: new Uint8Array(expectedByteLength),
      })
      await new Promise<void>((resolve, reject) => {
        transaction.addEventListener("complete", () => resolve())
        transaction.addEventListener("error", () => reject(transaction.error))
        transaction.addEventListener("abort", () => reject(transaction.error))
      })
      database.close()
    },
    { expectedByteLength: byteLength, expectedSha256: sha256 }
  )
}
