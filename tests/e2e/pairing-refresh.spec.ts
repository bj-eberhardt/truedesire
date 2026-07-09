import { expect, test } from '@playwright/test'

test('pairing page polls requests and keeps refresh control compact', async ({ page }) => {
  let requestChecks = 0

  await page.route('**/auth/register', async (route) => {
    await route.fulfill({ json: { userId: 'user-a' } })
  })
  await page.route('**/auth/me', async (route) => {
    await route.fulfill({ json: { id: 'user-a', code: 'AAAA1111', nickname: 'Alex', ecdhPublicRawB64: 'partner-key' } })
  })
  await page.route('**/pairs', async (route) => {
    await route.fulfill({ json: { pairs: [] } })
  })
  await page.route('**/pairing/requests', async (route) => {
    requestChecks += 1
    await route.fulfill({
      json: {
        incoming: requestChecks >= 2 ? [{ id: 'req-1', from: { id: 'user-b', code: 'BBBB2222', nickname: 'Sam' }, createdAt: Date.now() }] : [],
        outgoing: [],
      },
    })
  })

  await page.goto('/#/v3')
  await page.getByRole('button', { name: 'Nein, neues Konto' }).click()
  await page.getByRole('textbox', { name: 'Nickname' }).fill('Alex')
  await page.getByRole('button', { name: 'Konto erstellen' }).click()
  await page.getByRole('button', { name: 'Fertigstellen' }).click()

  const refreshButton = page.getByRole('button', { name: 'Neue Pair-Anfragen prüfen' })
  await expect(refreshButton).toBeVisible()
  await expect(page.getByText(/Nächste Prüfung in \d+s · zuletzt:/)).toBeVisible()

  const box = await refreshButton.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(34)
  expect(box!.height).toBeLessThanOrEqual(34)

  await expect(page.locator('.v3-pairing-refresh-meta')).toHaveCSS('align-items', 'center')

  await refreshButton.click()
  await expect(page.getByText('Sam')).toBeVisible()
  expect(requestChecks).toBeGreaterThanOrEqual(2)
})
