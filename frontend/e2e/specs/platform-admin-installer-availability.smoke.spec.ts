import { expect, test } from "@playwright/test";

const installerExpected = process.env.E2E_EXPECT_INSTALLER === "1";

test.describe("platform admin installer availability", () => {
  test.skip(
    !installerExpected,
    "Enable with E2E_EXPECT_INSTALLER=1 against a staging environment reset to bootstrap mode."
  );

  test("shows the initial installer when the platform is not installed", async ({ page }) => {
    await page.goto("/install");

    await expect(
      page.getByRole("heading", { name: /Instalador inicial|Initial installer/i })
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /Instalar plataforma|Install platform/i })
    ).toBeVisible();
  });
});
