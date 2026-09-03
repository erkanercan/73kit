import { expect, test, type Page } from "@playwright/test"

const CODEPLUG_SIZE = 0x19000
const CHANNEL_RECORD_SIZE = 0x30
const VALIDITY_BITMAP_OFFSET = 0xd000

test("moves the intended channel after the virtualized table is scrolled", async ({
  page,
}) => {
  await openSyntheticCodeplug(page)
  await openChannels(page)

  const source = page.getByRole("button", { name: "Move channel 31" })
  const destination = page.getByRole("button", { name: "Move channel 32" })

  const sourceBox = await source.boundingBox()
  const destinationBox = await destination.boundingBox()
  if (!sourceBox || !destinationBox) throw new Error("Drag handles are hidden")

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2
  )
  await page.mouse.down()
  await page.mouse.move(
    destinationBox.x + destinationBox.width / 2,
    destinationBox.y + destinationBox.height / 2,
    { steps: 10 }
  )
  await page.mouse.up()

  await expect(channelRow(page, 32)).toContainText("Channel 31")
})

test("keeps keyboard reordering aligned after the virtualized table is scrolled", async ({
  page,
}) => {
  await openSyntheticCodeplug(page)
  await openChannels(page)

  const source = page.getByRole("button", { name: "Move channel 31" })
  await source.focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowDown")
  await expect(
    page.getByText("Channel 31 moved to channel 32.", { exact: true })
  ).toBeAttached()
  await page.keyboard.press("Space")

  await expect(channelRow(page, 32)).toContainText("Channel 31")
  await expect(
    page.getByRole("button", { name: "Move channel 32" })
  ).toBeFocused()
  await expect(
    page.getByText("Channel 31 moved to channel 32.", { exact: true })
  ).toBeAttached()
})

async function openSyntheticCodeplug(page: Page) {
  await page.goto("/en/cps/tyt-uvl15w/backups")

  const bytes = Buffer.alloc(CODEPLUG_SIZE)
  for (let index = 0; index < 40; index += 1) {
    bytes.write(`Channel ${index + 1}`, index * CHANNEL_RECORD_SIZE + 0x08)
  }
  bytes.fill(0xff, VALIDITY_BITMAP_OFFSET, VALIDITY_BITMAP_OFFSET + 5)
  bytes.fill(0xff, 0x10000, 0x16000)

  await page.locator('input[accept^=".PF"]').setInputFiles({
    name: "channel-reorder.bin",
    mimeType: "application/octet-stream",
    buffer: bytes,
  })
  await page.getByRole("button", { name: "Open Unbound Codeplug" }).click()
}

async function openChannels(page: Page) {
  await page.getByRole("link", { name: "Channels" }).click()
  await expect(page.getByRole("heading", { name: "Channels" })).toBeVisible()

  await page.locator('[data-slot="table-container"]').evaluate((element) => {
    element.scrollTop = 30 * 44
    element.dispatchEvent(new Event("scroll"))
  })
  await expect(
    page.getByRole("button", { name: "Move channel 31" })
  ).toBeVisible()
}

function channelRow(page: Page, number: number) {
  return page.getByRole("row").filter({
    has: page.getByText(String(number).padStart(4, "0"), { exact: true }),
  })
}
