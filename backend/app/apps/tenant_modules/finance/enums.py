from enum import StrEnum


class FinanceMovementType(StrEnum):
    INCOME = "income"
    EXPENSE = "expense"


class FinanceModuleSection(StrEnum):
    DASHBOARD = "dashboard"
    TRANSACTIONS = "transactions"
    ACCOUNTS = "accounts"
    CATEGORIES = "categories"
    LOANS = "loans"
    BUDGETS = "budgets"
    REPORTS = "reports"
    SETTINGS = "settings"
