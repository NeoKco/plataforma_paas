import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";

async function openTenantImportedPage(page: Page, path: string, heading: RegExp) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}($|[/?#])`));
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

function getCatalogRow(page: Page, text: string | RegExp) {
  return page.locator("tbody tr").filter({ hasText: text }).first();
}

test("tenant portal shows imported business core and maintenance data from ieris_app", async ({
  page,
}) => {
  await loginTenant(page);

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core/organizations",
    /Empresas y contrapartes|Organizations and counterparts/i
  );
  await expect(getCatalogRow(page, /Ieris Ltda/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/business-core/clients",
    /^Clientes$|^Clients$/i
  );
  await expect(getCatalogRow(page, /Cecilia Tabales/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance",
    /Resumen t[eé]cnico|Technical overview/i
  );
  await expect(page.getByText(/Últimas 5 mantenciones realizadas|Last 5 completed maintenance/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/installations",
    /Instalaciones|Installations/i
  );
  await expect(getCatalogRow(page, /heat pipe/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/history",
    /Historial t[eé]cnico|Technical history/i
  );
  await expect(getCatalogRow(page, /Mantenci[oó]n sst/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/calendar",
    /Agenda t[eé]cnica|Technical calendar/i
  );
  await expect(page.getByRole("button", { name: /Nueva mantenci[oó]n|New maintenance/i })).toBeVisible();
});
