import { expect, test, type Locator, type Page } from "@playwright/test";
import { loginPlatform, loginPlatformAs, logoutPlatform } from "../support/auth";

test("platform admin enforces visible role access for admin and support users", async ({
  page,
}) => {
  const uniqueSuffix = Date.now();
  const adminUser = {
    fullName: `E2E Platform Admin ${uniqueSuffix}`,
    email: `e2e-platform-admin-${uniqueSuffix}@platform.local`,
    password: `AdminRole${uniqueSuffix}!`,
  };
  const supportUser = {
    fullName: `E2E Platform Support ${uniqueSuffix}`,
    email: `e2e-platform-support-${uniqueSuffix}@platform.local`,
    password: `SupportRole${uniqueSuffix}!`,
  };

  await loginPlatform(page);
  await page.goto("/users");
  await expect(page).toHaveURL(/\/users$/);
  await expect(
    page.locator("h1.page-title").filter({
      hasText: /Usuarios de plataforma|Platform users/i,
    })
  ).toBeVisible();

  await createPlatformUser(page, adminUser.fullName, adminUser.email, "admin", adminUser.password);
  await logoutPlatform(page);

  await loginPlatformAs(page, adminUser.email, adminUser.password);
  await expect(page).toHaveURL(/\/activity$/);
  await expect(
    page.locator("h1.page-title").filter({
      hasText: /Actividad|Activity/i,
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Usuarios plataforma|Platform Users/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Actividad|Activity/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Tenants/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Histórico tenants|Tenant History/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Provisioning/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Facturación|Billing/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Configuración|Settings/i })).toHaveCount(0);

  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/activity$/);

  await page.goto("/users");
  await expect(page).toHaveURL(/\/users$/);

  const adminCreateForm = getCreatePlatformUserForm(page);
  const adminRoleOptions = await readSelectOptionValues(
    adminCreateForm.locator("select.form-select").first()
  );
  expect(adminRoleOptions).toEqual(["support"]);

  await createPlatformUser(
    page,
    supportUser.fullName,
    supportUser.email,
    "support",
    supportUser.password,
    adminCreateForm
  );
  await logoutPlatform(page);

  await loginPlatformAs(page, supportUser.email, supportUser.password);
  await expect(page).toHaveURL(/\/users$/);
  await expect(
    page.locator("h1.page-title").filter({
      hasText: /Usuarios de plataforma|Platform users/i,
    })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Usuarios plataforma|Platform Users/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Actividad|Activity/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Tenants/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Histórico tenants|Tenant History/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Provisioning/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Facturación|Billing/i })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Configuración|Settings/i })).toHaveCount(0);
  await expect(
    page.getByText(
      /Tu rol actual es de solo lectura para este bloque|Your current role is read-only for this block/i
    )
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Crear usuario|Create user/i })).toHaveCount(0);

  await page.goto("/activity");
  await expect(page).toHaveURL(/\/users$/);
  await expect(
    page.locator("h1.page-title").filter({
      hasText: /Usuarios de plataforma|Platform users/i,
    })
  ).toBeVisible();

  await logoutPlatform(page);

  await loginPlatform(page);
  await page.goto("/users");
  await deletePlatformUser(page, supportUser.email);
  await deletePlatformUser(page, adminUser.email);
});

function getCreatePlatformUserForm(page: Page): Locator {
  return page.locator("form").first();
}

async function createPlatformUser(
  page: Page,
  fullName: string,
  email: string,
  role: "admin" | "support",
  password: string,
  form: Locator = getCreatePlatformUserForm(page)
) {
  await form.getByPlaceholder(/Nombre completo|Full name/i).fill(fullName);
  await form.getByPlaceholder(/Correo de acceso|Access email/i).fill(email);
  await form.locator("select.form-select").first().selectOption(role);
  await form.getByPlaceholder(/Contraseña inicial|Initial password/i).fill(password);
  await form.getByRole("button", { name: /Crear usuario|Create user/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Alta de usuario de plataforma|Create platform user/i })
      .first()
  ).toContainText(/creado correctamente|created successfully/i);

  await selectPlatformUser(page, email);
}

async function deletePlatformUser(page: Page, email: string) {
  await selectPlatformUser(page, email);

  await page.getByRole("button", { name: /Eliminar usuario|Delete user/i }).click();
  const confirmDialog = page.getByRole("dialog");
  await expect(confirmDialog).toBeVisible();
  await confirmDialog.getByRole("button", { name: /Eliminar usuario|Delete user/i }).click();

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /Borrado de usuario de plataforma|Delete platform user/i })
      .first()
  ).toContainText(/eliminado correctamente|deleted successfully/i);

  const catalogPanel = page
    .locator(".panel-card")
    .filter({ hasText: /Catálogo de usuarios de plataforma|Platform users catalog/i })
    .first();
  await expect(
    catalogPanel.locator("button.tenant-list__item").filter({ hasText: email })
  ).toHaveCount(0);
}

async function selectPlatformUser(page: Page, email: string) {
  const catalogPanel = page
    .locator(".panel-card")
    .filter({ hasText: /Catálogo de usuarios de plataforma|Platform users catalog/i })
    .first();

  await catalogPanel.getByPlaceholder(/Buscar por nombre, correo o rol|Search by name, email or role/i).fill(email);

  const userButton = catalogPanel
    .locator("button.tenant-list__item")
    .filter({ hasText: email })
    .first();

  await expect(userButton).toBeVisible();
  await userButton.click();
}

async function readSelectOptionValues(select: Locator) {
  return select.locator("option").evaluateAll((options) =>
    options.map((option) => (option as HTMLOptionElement).value)
  );
}