import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

test("platform admin can export and import portable tenant CSV packages from tenants", async ({
  page,
}, testInfo) => {
  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const exportButton = page.getByRole("button", {
    name: /Exportar CSV portable|Export portable CSV/i,
  });

  const preferredTenantPatterns = [
    /condominio-demo|condominio demo/i,
    /empresa-bootstrap|empresa bootstrap/i,
    /empresa-demo|empresa demo/i,
  ];
  let tenantSelected = false;
  for (const pattern of preferredTenantPatterns) {
    const candidate = page.locator(".tenant-list button").filter({ hasText: pattern }).first();
    if ((await candidate.count()) === 0) {
      continue;
    }
    await expect(candidate).toBeVisible();
    await candidate.click();
    try {
      await expect(exportButton).toBeEnabled({ timeout: 3000 });
      tenantSelected = true;
      break;
    } catch {
      continue;
    }
  }
  if (!tenantSelected) {
    const fallbackCards = page.locator(".tenant-list button");
    const fallbackCount = await fallbackCards.count();
    for (let index = 0; index < fallbackCount; index += 1) {
      await fallbackCards.nth(index).click();
      try {
        await expect(exportButton).toBeEnabled({ timeout: 2000 });
        tenantSelected = true;
        break;
      } catch {
        continue;
      }
    }
  }

  expect(tenantSelected).toBeTruthy();
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeEnabled();

  const downloadPromise = page
    .waitForEvent("download", { timeout: 15000 })
    .catch(() => null);

  await exportButton.click();

  await expect(
    page.getByText(/Últimos exports portables|Latest portable exports/i)
  ).toBeVisible();

  await expect(
    page.getByText(/Import portable controlado|Controlled portable import/i)
  ).toBeVisible();
  const importButton = page.getByRole("button", {
    name: /Simular import portable|Run portable import dry_run/i,
  });
  await expect(importButton).toBeVisible();

  const download = await downloadPromise;
  expect(download).not.toBeNull();

  const suggestedFileName = download!.suggestedFilename();
  expect(suggestedFileName).toMatch(/\.zip$/i);

  const downloadedZipPath = testInfo.outputPath(suggestedFileName);
  await download!.saveAs(downloadedZipPath);

  const packageInput = page.locator('input[type="file"][accept*=".zip"]');
  await packageInput.setInputFiles(downloadedZipPath);
  await importButton.click();

  await expect(
    page.getByText(
      /Simulación de import ejecutada correctamente|Import dry run completed successfully/i
    )
  ).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByText(/Últimos imports portables|Latest portable imports/i)
  ).toBeVisible();
  await expect(page.getByText(suggestedFileName)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/dry_run/i).first()).toBeVisible();

  await packageInput.setInputFiles(downloadedZipPath);
  const dryRunCheckbox = page.getByRole("checkbox", {
    name: /Ejecutar como dry_run|Run as dry_run/i,
  });
  await dryRunCheckbox.uncheck();
  const applyButton = page.getByRole("button", {
    name: /Aplicar import portable|Apply portable import/i,
  });
  await expect(applyButton).toBeEnabled();
  await applyButton.click();

  await expect(
    page.getByText(
      /Import portable aplicado correctamente|Portable import applied successfully/i
    )
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/apply/i).first()).toBeVisible({ timeout: 15000 });
});
