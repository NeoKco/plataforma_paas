import { expect, test, type Page } from "../support/test";
import { loginTenant } from "../support/auth";

async function openTenantPage(page: Page, path: string, heading: RegExp) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(new RegExp(`${path.replace(/\//g, "\\/")}($|[/?#])`));
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

test("tenant portal maintenance uses backend-resolved finance defaults in overview and costing", async ({
  page,
}) => {
  await loginTenant(page);

  await openTenantPage(
    page,
    "/tenant-portal/maintenance",
    /Resumen t[eé]cnico|Technical overview/i
  );

  await expect(
    page.getByText(/Sincronización automática a finanzas|Automatic finance sync/i)
  ).toBeVisible();
  await expect(
    page.getByText(/Sugerencia efectiva desde backend|Effective backend suggestion/i).first()
  ).toBeVisible();

  await openTenantPage(
    page,
    "/tenant-portal/maintenance/work-orders",
    /Mantenciones abiertas|Open maintenance work/i
  );

  const workOrderRows = page.locator("tbody tr");
  await expect(workOrderRows.first()).toBeVisible();

  await page.getByRole("button", { name: /Costos|Costing/i }).first().click();
  const costingDialog = page.getByRole("dialog", {
    name: /Costos y cobro de mantención|Maintenance costing and billing/i,
  });
  await expect(costingDialog).toBeVisible();
  await expect(
    costingDialog.getByText(/Sugerencia efectiva desde backend|Effective backend suggestion/i)
  ).toBeVisible();
  await expect(
    costingDialog.getByText(
      /Sincronizar a finanzas|Sincronización manual opcional|Reintento o ajuste de sincronización|Sync to finance|Optional manual finance sync|Finance sync retry or adjustment/i
    ).first()
  ).toBeVisible();
  await expect(
    costingDialog.getByText(/Referencia OT|Work order reference/i)
  ).toBeVisible();
  await expect(
    costingDialog.getByText(/Glosa ingreso|Income description/i)
  ).toBeVisible();
  await expect(
    costingDialog.getByText(/Glosa egreso|Expense description/i)
  ).toBeVisible();
});
