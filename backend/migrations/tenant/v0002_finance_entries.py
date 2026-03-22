from app.apps.tenant_modules.finance.models.entry import FinanceEntry

MIGRATION_ID = "0002_finance_entries"
DESCRIPTION = "Create finance entries table"


def upgrade(connection) -> None:
    FinanceEntry.__table__.create(bind=connection, checkfirst=True)
