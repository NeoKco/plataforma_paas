import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";

async function ensureFinanceCatalogPage(
  page: Page,
  path: "/tenant-portal/finance/accounts" | "/tenant-portal/finance/categories",
  heading: RegExp
) {
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

function getSuccessAlert(page: Page) {
  return page.locator(".alert.alert-success").first();
}

function getCatalogRow(page: Page, name: string) {
  return page.locator("tbody tr").filter({ hasText: name }).first();
}

async function openFinanceCatalogForm(
  page: Page,
  triggerName: RegExp,
  dialogName: RegExp
) {
  await page.getByRole("button", { name: triggerName }).click();
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  return dialog.locator("form").first();
}

test("tenant portal finance manages accounts catalog with create, deactivate and delete", async ({
  page,
}) => {
  const accountName = `e2e-finance-account-${Date.now()}`;
  const accountCode = `E2E-ACC-${Date.now()}`;

  await ensureFinanceCatalogPage(page, "/tenant-portal/finance/accounts", /Cuentas|Accounts/);

  const form = page
    ;
  const accountForm = await openFinanceCatalogForm(
    page,
    /Nueva cuenta|New account/i,
    /Nueva cuenta|New account/i
  );

  await accountForm
    .locator(".app-form-field")
    .filter({ hasText: /Nombre|Name/i })
    .first()
    .locator("input.form-control")
    .fill(accountName);
  await accountForm
    .locator(".app-form-field")
    .filter({ hasText: /Código|Code/i })
    .first()
    .locator("input.form-control")
    .fill(accountCode);

  await accountForm.getByRole("button", { name: /Crear cuenta|Create account/i }).click();

  const accountRow = getCatalogRow(page, accountName);
  await expect(accountRow).toBeVisible();
  await expect(accountRow).toContainText(new RegExp(`${accountCode}|activa|active`, "i"));

  await accountRow.getByRole("button", { name: /Desactivar|Deactivate/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/cuenta|account/i);
  await expect(accountRow).toContainText(/inactiva|inactive/i);

  page.once("dialog", (dialog) => dialog.accept());
  await accountRow.getByRole("button", { name: /Eliminar|Delete/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/cuenta|account/i);
  await expect(getCatalogRow(page, accountName)).toHaveCount(0);
});

test("tenant portal finance manages categories catalog with create, deactivate and delete", async ({
  page,
}) => {
  const categoryName = `e2e-finance-category-${Date.now()}`;

  await ensureFinanceCatalogPage(
    page,
    "/tenant-portal/finance/categories",
    /Categorías|Categories/
  );

  const form = page
    ;
  const categoryForm = await openFinanceCatalogForm(
    page,
    /Nueva categoría|New category/i,
    /Nueva categoría|New category/i
  );

  await categoryForm
    .locator(".app-form-field")
    .filter({ hasText: /Nombre|Name/i })
    .first()
    .locator("input.form-control")
    .fill(categoryName);
  await categoryForm
    .locator(".app-form-field")
    .filter({ hasText: /Color|Color/i })
    .first()
    .locator("input.form-control")
    .fill("#7c3aed");
  await categoryForm
    .locator(".app-form-field")
    .filter({ hasText: /Nota|Note/i })
    .first()
    .locator("textarea.form-control")
    .fill("Categoría creada por smoke E2E");

  await categoryForm.getByRole("button", { name: /Crear categoría|Create category/i }).click();

  const categoryRow = getCatalogRow(page, categoryName);
  await expect(categoryRow).toBeVisible();
  await expect(categoryRow).toContainText(/egreso|expense/i);
  await expect(categoryRow).toContainText(/activa|active/i);

  await categoryRow.getByRole("button", { name: /Desactivar|Deactivate/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/categor[ií]a|category/i);
  await expect(categoryRow).toContainText(/inactiva|inactive/i);

  page.once("dialog", (dialog) => dialog.accept());
  await categoryRow.getByRole("button", { name: /Eliminar|Delete/i }).click();
  await expect(getSuccessAlert(page)).toContainText(/categor[ií]a|category/i);
  await expect(getCatalogRow(page, categoryName)).toHaveCount(0);
});
