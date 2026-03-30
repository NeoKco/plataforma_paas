import { expect, test } from "@playwright/test";
import { loginPlatform } from "../support/auth";

test("platform admin can queue tenant schema auto-sync from provisioning", async ({
  page,
}) => {
  await loginPlatform(page);
  await page.goto("/provisioning");
  await expect(page).toHaveURL(/\/provisioning$/);
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  await page
    .getByRole("button", { name: /Auto-sync esquemas|Schema auto-sync/i })
    .click();

  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await expect(
    confirmDialog.getByRole("heading", {
      name: /Encolar auto-sync de esquema tenant|Queue tenant schema auto-sync/i,
    })
  ).toBeVisible();

  await confirmDialog
    .getByRole("button", { name: /Encolar auto-sync|Queue auto-sync/i })
    .click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Auto-sync de esquemas|Schema auto-sync/i })
      .first()
  ).toContainText(/sincronización de esquema|schema sync|active tenants|tenants activos/i);
});
