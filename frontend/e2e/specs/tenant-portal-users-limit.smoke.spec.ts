import { expect, test, type Page } from "@playwright/test";
import { loginTenant } from "../support/auth";
import { setTenantModuleLimit } from "../support/backend-control";
import { e2eEnv } from "../support/env";

test("tenant portal shows active-user limit enforcement after tenant override", async ({
  page,
}) => {
  const blockedUserEmail = `operator-${Date.now()}@${e2eEnv.tenant.slug}.local`;

  const appliedLimit = setTenantModuleLimit({
    tenantSlug: e2eEnv.tenant.slug,
    moduleKey: "core.users.active",
    value: 1,
  });
  expect(appliedLimit.moduleLimits["core.users.active"]).toBe(1);

  try {
    await loginTenant(page);

    const usageRow = page
      .locator("tbody tr")
      .filter({ hasText: "core.users.active" })
      .first();
    await expect(usageRow).toBeVisible();
    await expect(usageRow).toContainText(/al límite|at limit/i);

    await page.goto("/tenant-portal/users");
    await expect(page).toHaveURL(/\/tenant-portal\/users$/);
    await expect(
      page.getByRole("heading", { name: /^(Usuarios|Users)$/i })
    ).toBeVisible();

    const createUserForm = page.locator("form").first();
    await createUserForm
      .getByPlaceholder(/Ej: María Pérez|Example: Maria Perez/i)
      .fill("Operador E2E");
    await createUserForm
      .getByPlaceholder(/Ej: maria@empresa-demo.local|Example: maria@empresa-demo.local/i)
      .fill(blockedUserEmail);
    await createUserForm
      .getByPlaceholder(/Define una contraseña inicial|Define an initial password/i)
      .fill("TenantUser123!");
    await createUserForm.getByRole("combobox").nth(0).selectOption("operator");
    await createUserForm
      .getByRole("button", { name: /Crear usuario|Create user/i })
      .click();

    await expect(page.locator(".tenant-action-feedback--error").first()).toContainText(
      /límite de usuarios activos|active user limit/i
    );
    await expect(page.getByText(blockedUserEmail, { exact: true })).toHaveCount(0);
  } finally {
    const clearedLimit = setTenantModuleLimit({
      tenantSlug: e2eEnv.tenant.slug,
      moduleKey: "core.users.active",
      value: null,
    });
    expect(clearedLimit.moduleLimits["core.users.active"]).toBeUndefined();
  }
});