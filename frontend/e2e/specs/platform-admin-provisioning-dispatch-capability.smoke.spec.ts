import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

test("platform admin can see the active provisioning dispatch capability", async ({
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
  await expect(
    capabilityCard.getByText(/Dispatch backend activo|Active dispatch backend/i)
  ).toBeVisible();

  const content = (await capabilityCard.textContent()) || "";
  expect(/broker|database/i.test(content)).toBeTruthy();

  if (/broker/i.test(content)) {
    await expect(capabilityCard).toContainText(/DLQ|guided requeue|requeue guiado/i);
  } else {
    await expect(capabilityCard).toContainText(/staging|broker/i);
  }
});
