from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    func,
    select,
)

MIGRATION_ID = "0005_finance_transactions"
DESCRIPTION = "Create finance transactions core tables and backfill legacy entries"

metadata = MetaData()

finance_currencies = Table(
    "finance_currencies",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(10), nullable=False, unique=True, index=True),
    Column("is_base", Boolean, nullable=False, server_default="0", index=True),
)

finance_entries = Table(
    "finance_entries",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("movement_type", String(20), nullable=False),
    Column("concept", String(200), nullable=False),
    Column("amount", Float, nullable=False),
    Column("category", String(100), nullable=True),
    Column("created_by_user_id", Integer, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_transactions = Table(
    "finance_transactions",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("transaction_type", String(20), nullable=False),
    Column("account_id", Integer, ForeignKey("finance_accounts.id"), nullable=True),
    Column("target_account_id", Integer, ForeignKey("finance_accounts.id"), nullable=True),
    Column("category_id", Integer, ForeignKey("finance_categories.id"), nullable=True),
    Column("beneficiary_id", Integer, ForeignKey("finance_beneficiaries.id"), nullable=True),
    Column("person_id", Integer, ForeignKey("finance_people.id"), nullable=True),
    Column("project_id", Integer, ForeignKey("finance_projects.id"), nullable=True),
    Column("currency_id", Integer, ForeignKey("finance_currencies.id"), nullable=False),
    Column("loan_id", Integer, nullable=True),
    Column("amount", Float, nullable=False),
    Column("amount_in_base_currency", Float, nullable=True),
    Column("exchange_rate", Float, nullable=True),
    Column("discount_amount", Float, nullable=False, server_default="0"),
    Column("amortization_months", Integer, nullable=True),
    Column("transaction_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("alternative_date", Date, nullable=True),
    Column("description", String(255), nullable=False),
    Column("notes", Text, nullable=True),
    Column("is_favorite", Boolean, nullable=False, server_default="0"),
    Column("favorite_flag", Boolean, nullable=False, server_default="0"),
    Column("is_reconciled", Boolean, nullable=False, server_default="0"),
    Column("reconciled_at", DateTime(timezone=True), nullable=True),
    Column("is_template_origin", Boolean, nullable=False, server_default="0"),
    Column("planner_id", Integer, nullable=True),
    Column("template_id", Integer, nullable=True),
    Column("source_type", String(60), nullable=True),
    Column("source_id", Integer, nullable=True),
    Column("created_by_user_id", Integer, nullable=True),
    Column("updated_by_user_id", Integer, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("amount > 0", name="chk_finance_transactions_amount_positive"),
    CheckConstraint(
        "(transaction_type != 'transfer' AND target_account_id IS NULL) OR "
        "(transaction_type = 'transfer' AND target_account_id IS NOT NULL)",
        name="chk_finance_transactions_target_account_rule",
    ),
    CheckConstraint(
        "(transaction_type != 'transfer') OR (account_id IS NULL OR target_account_id IS NULL OR account_id != target_account_id)",
        name="chk_finance_transactions_transfer_accounts_different",
    ),
)

finance_transaction_tags = Table(
    "finance_transaction_tags",
    metadata,
    Column("transaction_id", Integer, ForeignKey("finance_transactions.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("finance_tags.id"), primary_key=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_transaction_attachments = Table(
    "finance_transaction_attachments",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("transaction_id", Integer, ForeignKey("finance_transactions.id"), nullable=False),
    Column("file_name", String(255), nullable=False),
    Column("storage_key", String(255), nullable=False),
    Column("content_type", String(120), nullable=True),
    Column("file_size", Integer, nullable=False, server_default="0"),
    Column("notes", Text, nullable=True),
    Column("uploaded_by_user_id", Integer, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

finance_transaction_audit = Table(
    "finance_transaction_audit",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("transaction_id", Integer, ForeignKey("finance_transactions.id"), nullable=False),
    Column("event_type", String(60), nullable=False),
    Column("actor_user_id", Integer, nullable=True),
    Column("summary", String(255), nullable=False),
    Column("payload_json", Text, nullable=True),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now()),
)

Index("idx_finance_transactions_type", finance_transactions.c.transaction_type)
Index("idx_finance_transactions_account", finance_transactions.c.account_id)
Index("idx_finance_transactions_target_account", finance_transactions.c.target_account_id)
Index("idx_finance_transactions_category", finance_transactions.c.category_id)
Index("idx_finance_transactions_beneficiary", finance_transactions.c.beneficiary_id)
Index("idx_finance_transactions_person", finance_transactions.c.person_id)
Index("idx_finance_transactions_project", finance_transactions.c.project_id)
Index("idx_finance_transactions_loan", finance_transactions.c.loan_id)
Index("idx_finance_transactions_reconciled", finance_transactions.c.is_reconciled)
Index("idx_finance_transactions_transaction_at", finance_transactions.c.transaction_at)
Index("idx_finance_transaction_tags_tag", finance_transaction_tags.c.tag_id)
Index("idx_finance_transaction_attachments_transaction", finance_transaction_attachments.c.transaction_id)
Index("idx_finance_transaction_audit_transaction", finance_transaction_audit.c.transaction_id)
Index("idx_finance_transaction_audit_event_type", finance_transaction_audit.c.event_type)


def upgrade(connection) -> None:
    metadata.create_all(bind=connection, checkfirst=True)
    _backfill_legacy_entries(connection)


def _backfill_legacy_entries(connection) -> None:
    base_currency_id = _resolve_base_currency_id(connection)
    if base_currency_id is None:
        return

    legacy_entries = connection.execute(
        select(
            finance_entries.c.id,
            finance_entries.c.movement_type,
            finance_entries.c.concept,
            finance_entries.c.amount,
            finance_entries.c.category,
            finance_entries.c.created_by_user_id,
            finance_entries.c.created_at,
        )
    ).all()

    for entry in legacy_entries:
        existing = connection.execute(
            select(finance_transactions.c.id).where(
                finance_transactions.c.source_type == "finance_entries_migration",
                finance_transactions.c.source_id == entry.id,
            )
        ).first()
        if existing:
            continue

        connection.execute(
            finance_transactions.insert().values(
                transaction_type=entry.movement_type,
                account_id=None,
                target_account_id=None,
                category_id=None,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=base_currency_id,
                loan_id=None,
                amount=entry.amount,
                amount_in_base_currency=entry.amount,
                exchange_rate=1,
                discount_amount=0,
                amortization_months=None,
                transaction_at=entry.created_at,
                alternative_date=None,
                description=entry.concept,
                notes=entry.category,
                is_favorite=False,
                favorite_flag=False,
                is_reconciled=False,
                reconciled_at=None,
                is_template_origin=False,
                planner_id=None,
                template_id=None,
                source_type="finance_entries_migration",
                source_id=entry.id,
                created_by_user_id=entry.created_by_user_id,
                updated_by_user_id=entry.created_by_user_id,
                created_at=entry.created_at,
                updated_at=entry.created_at,
            )
        )


def _resolve_base_currency_id(connection) -> int | None:
    base = connection.execute(
        select(finance_currencies.c.id)
        .where(finance_currencies.c.is_base.is_(True))
        .limit(1)
    ).first()
    if base:
        return base[0]

    fallback = connection.execute(
        select(finance_currencies.c.id).order_by(finance_currencies.c.id.asc()).limit(1)
    ).first()
    if fallback:
        return fallback[0]

    return None
