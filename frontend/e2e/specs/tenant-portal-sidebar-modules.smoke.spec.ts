import { expect, test } from "../support/test";
import { seedTenantBillingSyncEvent } from "../support/backend-control";
import { loginTenant } from "../support/auth";
import { buildE2EText, buildFutureIso } from "../support/e2e-data";
import { e2eEnv } from "../support/env";

test("tenant portal sidebar follows effective enabled modules from tenant info", async ({
  page,
}) => {
  const tenantSlug = e2eEnv.tenant.slug;
  const uniqueSuffix = buildE2EText("tenant-sidebar-modules", "run");
  const futurePeriodEndsAtIso = buildFutureIso(3);
  const futureGraceUntilIso = buildFutureIso(7);

  try {
    const graceEvent = seedTenantBillingSyncEvent({
      tenantSlug,
      providerEventId: `evt_e2e_tenant_sidebar_grace_${uniqueSuffix}`,
      billingStatus: "past_due",
      billingStatusReason: `E2E sidebar grace ${uniqueSuffix}`,
      billingCurrentPeriodEndsAtIso: futurePeriodEndsAtIso,
      billingGraceUntilIso: futureGraceUntilIso,
      providerCustomerId: `cus_tenant_sidebar_${uniqueSuffix}`,
      providerSubscriptionId: `sub_tenant_sidebar_${uniqueSuffix}`,
    });

    expect(graceEvent.processingResult).toBe("applied");

    await loginTenant(page);

    const modulesCard = page
      .locator(".panel-card")
      .filter({
        has: page.getByRole("heading", {
          name: /Módulos habilitados|Enabled modules/i,
        }),
      })
      .first();

    await expect(
      page.getByRole("link", {
        name: /Resumen|Overview/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Usuarios|Users/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Core negocio|Business core/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /Mantenciones|Maintenance/i,
      })
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", {
        name: /Finanzas|Finance/i,
      })
    ).toHaveCount(0);

    await expect(modulesCard).toContainText(/Core/i);
    await expect(modulesCard).toContainText(/Users/i);
    await expect(modulesCard).not.toContainText(/Maintenance/i);
    await expect(modulesCard).not.toContainText(/Finance/i);
  } finally {
    seedTenantBillingSyncEvent({
      tenantSlug,
      providerEventId: `evt_e2e_tenant_sidebar_restore_${uniqueSuffix}`,
      billingStatus: "active",
      billingStatusReason: "E2E restore active tenant",
      billingCurrentPeriodEndsAtIso: futurePeriodEndsAtIso,
    });
  }
});
