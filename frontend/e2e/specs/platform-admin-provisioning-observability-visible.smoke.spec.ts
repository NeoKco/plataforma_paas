import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

test("platform admin can review the visible provisioning observability surface on a published environment", async ({
  page,
}) => {
  await loginPlatform(page);
  await page.goto("/provisioning");
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const observabilityCard = page.locator(".panel-card").filter({
    has: page.getByRole("heading", {
      name: /Observabilidad visible|Visible observability/i,
    }),
  });

  await expect(observabilityCard).toBeVisible();
  await expect(
    observabilityCard.getByRole("button", {
      name: /Recargar observabilidad|Reload observability/i,
    })
  ).toBeVisible();

  await observabilityCard
    .getByRole("button", {
      name: /Recargar observabilidad|Reload observability/i,
    })
    .click();

  await expect(
    page.getByRole("heading", {
      name: /Snapshots recientes por tenant|Recent tenant snapshots/i,
    })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /Alertas activas|Active alerts/i,
    })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", {
      name: /Historial de alertas operativas|Operational alert history/i,
    })
  ).toBeVisible();
});
