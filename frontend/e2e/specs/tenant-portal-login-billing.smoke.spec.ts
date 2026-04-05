import { expect, test } from "../support/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginTenant } from "../support/auth";
import { e2eEnv } from "../support/env";

test("tenant portal reflects billing grace and blocks login when overdue billing expires", async ({ page }) => {
  const uniqueSuffix = Date.now();
  const tenantSlug = e2eEnv.tenant.slug;
  const futurePeriodEndsAtIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const futureGraceUntilIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const graceEvent = seedTenantBillingSyncEvent({
      tenantSlug,
      providerEventId: `evt_e2e_tenant_grace_${uniqueSuffix}`,
      billingStatus: "past_due",
      billingStatusReason: `E2E billing grace ${uniqueSuffix}`,
      billingCurrentPeriodEndsAtIso: futurePeriodEndsAtIso,
      billingGraceUntilIso: futureGraceUntilIso,
      providerCustomerId: `cus_tenant_grace_${uniqueSuffix}`,
      providerSubscriptionId: `sub_tenant_grace_${uniqueSuffix}`,
    });

    expect(graceEvent.processingResult).toBe("applied");

    await loginTenant(page);

    const postureCard = page
      .locator(".panel-card")
      .filter({ hasText: /Postura del tenant|Tenant posture/i })
      .first();

    await expect(postureCard).toContainText(/con deuda|past due/i);
    await expect(postureCard).toContainText(/sí|yes/i);

    await page.getByRole("button", { name: /Salir|Logout/i }).click();
    await expect(page).toHaveURL(/\/tenant-portal\/login/);

    const blockedEvent = seedTenantBillingSyncEvent({
      tenantSlug,
      providerEventId: `evt_e2e_tenant_overdue_${uniqueSuffix}`,
      billingStatus: "past_due",
      billingStatusReason: "invoice overdue",
      billingCurrentPeriodEndsAtIso: futurePeriodEndsAtIso,
    });

    expect(blockedEvent.processingResult).toBe("applied");

    const searchParams = new URLSearchParams({
      tenantSlug: e2eEnv.tenant.slug,
      email: e2eEnv.tenant.email,
    });

    await page.goto(`/tenant-portal/login?${searchParams.toString()}`);
    await expect(
      page.getByRole("heading", { name: /Portal Tenant|Tenant Portal/i })
    ).toBeVisible();

    await page.locator('input[autocomplete="current-password"]').fill(e2eEnv.tenant.password);
    await page.getByRole("button", { name: /Ingresar|Login/i }).click();

    await expect(page).toHaveURL(/\/tenant-portal\/login/);
    await expect(page.locator(".alert.alert-danger").first()).toContainText(
      /deuda vencida|overdue billing/i
    );
  } finally {
    seedTenantBillingSyncEvent({
      tenantSlug,
      providerEventId: `evt_e2e_tenant_restore_${uniqueSuffix}`,
      billingStatus: "active",
      billingStatusReason: "E2E restore active tenant",
      billingCurrentPeriodEndsAtIso: futurePeriodEndsAtIso,
    });
  }
});