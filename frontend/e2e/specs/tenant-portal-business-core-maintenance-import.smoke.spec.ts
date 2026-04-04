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
    "/tenant-portal/business-core/work-groups",
    /Grupos de trabajo|Work groups/i
  );
  await expect(getCatalogRow(page, /lider|mantenciones|sst/i)).toBeVisible();
  await page.getByRole("link", { name: /Miembros|Members/i }).first().click();
  await expect(
    page.getByRole("heading", { name: /Miembros del grupo|Group members/i })
  ).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance",
    /Resumen t[eé]cnico|Technical overview/i
  );
  await expect(page.getByText(/Últimas 5 mantenciones realizadas|Last 5 completed maintenance/i)).toBeVisible();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/work-orders",
    /Ordenes de trabajo|Work orders|Órdenes de trabajo/i
  );
  await expect(getCatalogRow(page, /mantencion|visita/i)).toBeVisible();
  await page.getByRole("button", { name: /Nueva mantenci[oó]n|Nueva orden|New work order/i }).click();
  await expect(page.getByLabel(/Grupo responsable|Responsible group/i)).toBeVisible();
  await expect(page.getByLabel(/Técnico responsable|Assigned technician/i)).toBeVisible();
  await page.getByRole("button", { name: /Cancelar|Cancel/i }).click();

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/due-items",
    /Pendientes|Due maintenance/i
  );
  await page.getByRole("button", { name: /Nueva programación|New schedule/i }).click();
  await expect(page.getByRole("heading", { name: /Nueva programación|New schedule/i })).toBeVisible();
  await expect(page.getByLabel(/Cliente|Client/i)).toBeVisible();
  await expect(page.getByLabel(/Próxima mantención|Next due/i)).toBeVisible();
  await expect(page.getByLabel(/Duración estimada|Estimated duration/i)).toBeVisible();
  await page.getByRole("button", { name: /Cancelar|Cancel/i }).click();
  const dueRows = page.locator("tbody tr");
  if ((await dueRows.count()) > 0) {
    const firstDueRow = dueRows.first();
    await expect(firstDueRow.getByRole("link", { name: /Ver cliente|Open client/i })).toBeVisible();
    await expect(firstDueRow.getByRole("button", { name: /Contactar|Contact/i })).toBeVisible();
    await expect(firstDueRow.getByRole("button", { name: /Posponer|Postpone/i })).toBeVisible();
    await expect(firstDueRow.getByRole("button", { name: /Agendar|Schedule/i })).toBeVisible();
  }

  await openTenantImportedPage(
    page,
    "/tenant-portal/maintenance/installations",
    /Instalaciones|Installations/i
  );
  await expect(getCatalogRow(page, /heat pipe/i)).toBeVisible();
  await page.getByRole("button", { name: /Nuevo registro|New record/i }).click();
  await expect(page.getByLabel(/Dirección del cliente|Client address/i)).toBeVisible();
  await expect(page.getByLabel(/^Orden$|^Sort order$/i)).toHaveCount(0);
  await page.getByRole("button", { name: /Cancelar|Cancel/i }).click();

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
  await page.getByRole("button", { name: /Nueva mantenci[oó]n|New maintenance/i }).click();
  await expect(page.getByLabel(/Grupo responsable|Responsible group/i)).toBeVisible();
  await expect(page.getByLabel(/Técnico responsable|Assigned technician/i)).toBeVisible();
});
