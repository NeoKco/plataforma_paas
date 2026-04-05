import { expect, test } from "../support/test";
import { loginTenant } from "../support/auth";
import {
  createBasicExpenseTransaction,
  getReconciliationSuccessFeedback,
  getTransactionRowContainerByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

test("tenant portal finance can reconcile a created transaction", async ({ page }) => {
  const uniqueDescription = `e2e-reconcile-${Date.now()}`;

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

  const dialogHandler = async (
    dialog: Parameters<typeof page.on>[1] extends (arg: infer T) => any ? T : never
  ) => {
    await dialog.accept();
  };
  page.on("dialog", dialogHandler);
  try {
    await row.getByRole("button", { name: /Conciliar|Reconcile/ }).click();
  } finally {
    page.off("dialog", dialogHandler);
  }

  await expect(getReconciliationSuccessFeedback(page)).toContainText(
    /Conciliaci[oó]n|Reconciliation/i
  );
  await expect(row.getByText(/conciliada|reconciled/i)).toBeVisible();
  await expect(
    row.getByRole("button", { name: /Desconciliar|Unreconcile/ })
  ).toBeVisible();
});
