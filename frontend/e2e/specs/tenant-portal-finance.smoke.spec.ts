import { expect, test } from "../support/test";
import { loginTenant } from "../support/auth";
import { buildE2EText } from "../support/e2e-data";
import {
  createBasicExpenseTransaction,
  getTransactionRowByDescription,
  openFinanceTransactionsPage,
} from "../support/finance";

test("tenant portal finance can create a basic transaction", async ({ page }) => {
  const uniqueDescription = buildE2EText("finance-movement", "e2e-mov");

  await loginTenant(page);
  await openFinanceTransactionsPage(page);
  await createBasicExpenseTransaction(page, uniqueDescription);
  await expect(getTransactionRowByDescription(page, uniqueDescription)).toBeVisible();
});
