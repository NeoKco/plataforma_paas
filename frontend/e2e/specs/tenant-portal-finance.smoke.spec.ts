import { expect, test } from "@playwright/test";
import { loginTenant } from "../support/auth";
import {
  createBasicExpenseTransaction,
  getTransactionRowByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

test("tenant portal finance can create a basic transaction", async ({ page }) => {
  const uniqueDescription = `e2e-mov-${Date.now()}`;

  await loginTenant(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, uniqueDescription);
  await expect(getTransactionRowByDescription(page, uniqueDescription)).toBeVisible();
});
