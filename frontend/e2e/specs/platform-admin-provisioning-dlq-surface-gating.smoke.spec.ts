import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

test("platform admin sees the correct DLQ surface for the active dispatch backend", async ({
  page,
}) => {
  await loginPlatform(page);
  await page.goto("/provisioning");
  await expect(
    page.getByRole("heading", { name: "Provisioning", exact: true })
  ).toBeVisible();

  const capabilityCard = page.locator(".panel-card").filter({
    has: page.getByRole("heading", {
      name: /Capacidad activa de provisioning|Active provisioning capability/i,
    }),
  });
  await expect(capabilityCard).toBeVisible();

  const capabilityText = (await capabilityCard.textContent()) || "";
  const activeBackendMatch = capabilityText.match(
    /(?:Dispatch backend activo|Active dispatch backend)\s*(broker|database)/i
  );
  const activeBackend = activeBackendMatch?.[1]?.toLowerCase() || "";
  const isBroker = activeBackend === "broker";

  const dlqPanel = page.locator("#provisioning-dlq-panel .panel-card").first();
  await expect(dlqPanel).toBeVisible();
  await expect(
    dlqPanel.getByRole("heading", { name: /Operación DLQ|DLQ operations/i })
  ).toBeVisible();

  if (isBroker) {
    await expect(dlqPanel).toContainText(/Filtros DLQ|DLQ filters/i);
    await expect(dlqPanel).toContainText(/Reencolado en lote|Batch requeue/i);
    await expect(dlqPanel).toContainText(/Requeue guiado|Guided requeue/i);
  } else {
    await expect(dlqPanel).toContainText(/broker-only no activa|broker-only surface is not active/i);
    await expect(dlqPanel).toContainText(/staging|broker/i);
    await expect(
      dlqPanel.getByRole("button", {
        name: /Reencolar filas DLQ filtradas|Requeue filtered DLQ rows/i,
      })
    ).toHaveCount(0);
    await expect(
      page.locator(".panel-card.data-table-card").filter({
        has: page.getByRole("heading", { name: /Filas DLQ|DLQ rows/i }),
      })
    ).toHaveCount(0);
  }
});
