import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";
import { setTenantModuleLimit } from "../support/backend-control";
import { e2eEnv } from "../support/env";

async function ensureTenantUsersPage(page: Page) {
  await page.goto("/tenant-portal/users");
  await page.waitForLoadState("networkidle");

  if (/\/tenant-portal\/login($|[?#])/.test(page.url())) {
    await loginTenant(page);
    await page.goto("/tenant-portal/users");
    await page.waitForLoadState("networkidle");
  }

  await expect(page).toHaveURL(/\/tenant-portal\/users($|[?#])/);
  await expect(page.getByRole("heading", { name: /^(Usuarios|Users)$/i })).toBeVisible();
}

function getUserRow(page: Page, email: string) {
  return page.locator("tbody tr").filter({ hasText: email }).first();
}

function getActionFeedback(page: Page, type: "success" | "error") {
  return page.locator(`.tenant-action-feedback--${type}`).first();
}

test("tenant portal blocks extra admin creation and admin reactivation when admin quota is exhausted", async ({
  page,
}) => {
  const blockedAdminEmail = `admin-blocked-${Date.now()}@${e2eEnv.tenant.slug}.local`;
  const inactiveAdminEmail = `admin-inactive-${Date.now()}@${e2eEnv.tenant.slug}.local`;

  try {
    await ensureTenantUsersPage(page);

    const createUserForm = page.locator("form").first();

    await createUserForm
      .getByPlaceholder(/Ej: María Pérez|Example: Maria Perez/i)
      .fill("Admin inactivo E2E");
    await createUserForm
      .getByPlaceholder(/Ej: maria@empresa-demo.local|Example: maria@empresa-demo.local/i)
      .fill(inactiveAdminEmail);
    await createUserForm
      .getByPlaceholder(/Define una contraseña inicial|Define an initial password/i)
      .fill("TenantAdmin123!");
    await createUserForm.getByRole("combobox").nth(0).selectOption("admin");
    await createUserForm.getByRole("combobox").nth(1).selectOption("inactive");
    await createUserForm.getByRole("button", { name: /Crear usuario|Create user/i }).click();

    const inactiveAdminRow = getUserRow(page, inactiveAdminEmail);
    await expect(inactiveAdminRow).toBeVisible();
    await expect(inactiveAdminRow).toContainText(/admin/i);
    await expect(inactiveAdminRow).toContainText(/inactive|inactivo/i);

    const appliedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "core.users.admin",
      value: 1,
    });
    expect(appliedLimit.moduleLimits["core.users.admin"]).toBe(1);

    await page.reload();
    await page.waitForLoadState("networkidle");

    await createUserForm
      .getByPlaceholder(/Ej: María Pérez|Example: Maria Perez/i)
      .fill("Admin bloqueado E2E");
    await createUserForm
      .getByPlaceholder(/Ej: maria@empresa-demo.local|Example: maria@empresa-demo.local/i)
      .fill(blockedAdminEmail);
    await createUserForm
      .getByPlaceholder(/Define una contraseña inicial|Define an initial password/i)
      .fill("TenantAdmin123!");
    await createUserForm.getByRole("combobox").nth(0).selectOption("admin");
    await createUserForm.getByRole("combobox").nth(1).selectOption("active");
    await createUserForm.getByRole("button", { name: /Crear usuario|Create user/i }).click();

    await expect(getActionFeedback(page, "error")).toContainText(
      /No puedes crear otro administrador|You cannot create another admin/i
    );
    await expect(page.getByText(blockedAdminEmail, { exact: true })).toHaveCount(0);

    await expect(inactiveAdminRow).toBeVisible();

    await inactiveAdminRow.getByRole("button", { name: /Activar|Activate/i }).click();

    await expect(getActionFeedback(page, "error")).toContainText(
      /No puedes habilitar otro administrador|You cannot enable another admin/i
    );
    await expect(inactiveAdminRow).toContainText(/inactive|inactivo/i);
  } finally {
    const clearedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "core.users.admin",
      value: null,
    });
    expect(clearedLimit.moduleLimits["core.users.admin"]).toBeUndefined();
  }
});
