import path from "node:path";
import { expect, test } from "@playwright/test";
import { loginTenant } from "../support/auth";
import {
  createBasicExpenseTransaction,
  getAttachmentSuccessFeedback,
  getTransactionRowContainerByDescription,
  getTransactionRowByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

test("tenant portal finance can upload an attachment to a created transaction", async ({
  page,
}) => {
  const uniqueDescription = `e2e-attach-${Date.now()}`;
  const fixturePath = path.resolve(
    "/home/felipe/platform_paas/docs/assets/app-visual-manual/12a-tenant-finance-overview-form.png"
  );
  const fixtureName = `${path.parse(fixturePath).name}.webp`;

  await loginTenant(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, uniqueDescription);

  const detailPanel = page.getByRole("dialog", {
    name: /Detalle operacional|Operational detail/i,
  });
  await expect(detailPanel).toBeVisible();

  await detailPanel
    .getByPlaceholder(
      /boleta supermercado o factura proveedor|grocery receipt or supplier invoice/i
    )
    .fill("e2e attachment note");
  await detailPanel
    .locator("label.form-label", { hasText: /Subir archivo|Upload file/i })
    .locator("xpath=following-sibling::input[@type='file'][1]")
    .setInputFiles(fixturePath);

  await expect(getAttachmentSuccessFeedback(page)).toContainText(
    /Adjunto|Attachment/i
  );
  await expect(detailPanel.getByText(fixtureName).first()).toBeVisible();
});

test("tenant portal finance can void a created transaction", async ({ page }) => {
  const uniqueDescription = `e2e-void-${Date.now()}`;

  await loginTenant(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, uniqueDescription);

  const detailPanel = page.getByRole("dialog", {
    name: /Detalle operacional|Operational detail/i,
  });
  if ((await detailPanel.count()) > 0) {
    await detailPanel.getByRole("button", { name: /Cerrar detalle|Close detail/i }).click();
    await expect(detailPanel).toHaveCount(0);
  }

  const row = getTransactionRowContainerByDescription(page, uniqueDescription);

  const dialogHandler = async (dialog: Parameters<typeof page.on>[1] extends (arg: infer T) => any ? T : never) => {
    if (dialog.type() === "prompt") {
      await dialog.accept("e2e void reason");
      return;
    }
    await dialog.accept();
  };
  page.on("dialog", dialogHandler);
  try {
    await row.getByRole("button", { name: /Anular|Void/ }).click();
  } finally {
    page.off("dialog", dialogHandler);
  }

  await expect(
    page
      .locator(".tenant-action-feedback--success")
      .filter({ hasText: /anulada|void/i })
      .first()
  ).toContainText(/anulada|void/i);
  await expect(getTransactionRowByDescription(page, uniqueDescription)).toHaveCount(0);
});
