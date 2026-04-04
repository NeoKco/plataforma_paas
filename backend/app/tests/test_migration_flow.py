import os
import unittest

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import StaticPool

from app.common.db.migration_runner import MigrationRunner
from migrations.tenant import v0003_finance_catalogs
from migrations.tenant import v0004_finance_seed_clp
from migrations.tenant import v0005_finance_transactions
from migrations.tenant import v0006_finance_budgets
from migrations.tenant import v0007_finance_loans
from migrations.tenant import v0008_finance_loan_installments
from migrations.tenant import v0009_finance_loan_installment_payment_split
from migrations.tenant import v0010_finance_loan_installment_reversal_reason
from migrations.tenant import v0011_finance_loan_source_account
from migrations.tenant import v0012_finance_transaction_voids
from migrations.tenant import v0013_finance_transaction_voids_repair
from migrations.tenant import v0014_finance_default_category_catalog
from migrations.tenant import v0015_business_core_base
from migrations.tenant import v0016_maintenance_base
from migrations.tenant import v0017_business_core_taxonomy
from migrations.tenant import v0018_business_core_site_commune
from migrations.tenant import v0019_core_user_timezones
from migrations.tenant import v0020_work_group_members_and_maintenance_assignments


class MigrationFlowTestCase(unittest.TestCase):
    def _build_engine(self):
        return create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    def test_control_migrations_create_expected_tables(self) -> None:
        engine = self._build_engine()
        runner = MigrationRunner(
            engine=engine,
            package_name="migrations.control",
            table_name="control_schema_migrations",
        )

        applied = runner.apply_pending()
        tables = set(inspect(engine).get_table_names())
        tenant_columns = {
            column["name"] for column in inspect(engine).get_columns("tenants")
        }

        self.assertEqual(
            applied,
            [
                "0001_initial",
                "0002_auth_tokens",
                "0003_auth_audit_events",
                "0004_tenant_maintenance_mode",
                "0005_provisioning_job_retries",
                "0006_tenant_maintenance_windows",
                "0007_tenant_maintenance_policy",
                "0008_provisioning_metric_snapshots",
                "0009_provisioning_worker_cycle_traces",
                "0010_provisioning_operational_alerts",
                "0011_provisioning_job_error_code",
                "0012_provisioning_operational_alert_error_code",
                "0013_tenant_rate_limit_overrides",
                "0014_tenant_status_reason",
                "0015_tenant_plan_code",
                "0016_tenant_billing_state",
                "0017_tenant_policy_change_events",
                "0018_tenant_billing_sync_events",
                "0019_tenant_billing_identity",
                "0020_billing_operational_alerts",
                "0021_tenant_module_limits",
                "0022_tenant_schema_tracking",
                "0023_tenant_db_credentials_tracking",
                "0024_tenant_retirement_archives",
            ],
        )
        self.assertIn("platform_installation", tables)
        self.assertIn("platform_users", tables)
        self.assertIn("tenants", tables)
        self.assertIn("maintenance_mode", tenant_columns)
        self.assertIn("maintenance_starts_at", tenant_columns)
        self.assertIn("maintenance_ends_at", tenant_columns)
        self.assertIn("maintenance_reason", tenant_columns)
        self.assertIn("maintenance_scopes", tenant_columns)
        self.assertIn("maintenance_access_mode", tenant_columns)
        self.assertIn("api_read_requests_per_minute", tenant_columns)
        self.assertIn("api_write_requests_per_minute", tenant_columns)
        self.assertIn("status_reason", tenant_columns)
        self.assertIn("plan_code", tenant_columns)
        self.assertIn("billing_status", tenant_columns)
        self.assertIn("billing_status_reason", tenant_columns)
        self.assertIn("billing_current_period_ends_at", tenant_columns)
        self.assertIn("billing_grace_until", tenant_columns)
        self.assertIn("tenant_policy_change_events", tables)
        self.assertIn("tenant_billing_sync_events", tables)
        self.assertIn("billing_operational_alerts", tables)
        self.assertIn("billing_provider", tenant_columns)
        self.assertIn("billing_provider_customer_id", tenant_columns)
        self.assertIn("billing_provider_subscription_id", tenant_columns)
        self.assertIn("module_limits_json", tenant_columns)
        self.assertIn("tenant_schema_version", tenant_columns)
        self.assertIn("tenant_schema_synced_at", tenant_columns)
        self.assertIn("tenant_db_credentials_rotated_at", tenant_columns)
        self.assertIn("provisioning_jobs", tables)
        provisioning_job_columns = {
            column["name"] for column in inspect(engine).get_columns("provisioning_jobs")
        }
        self.assertIn("attempts", provisioning_job_columns)
        self.assertIn("max_attempts", provisioning_job_columns)
        self.assertIn("last_attempt_at", provisioning_job_columns)
        self.assertIn("next_retry_at", provisioning_job_columns)
        self.assertIn("error_code", provisioning_job_columns)
        self.assertIn("auth_tokens", tables)
        self.assertIn("auth_audit_events", tables)
        self.assertIn("provisioning_job_metric_snapshots", tables)
        self.assertIn("provisioning_worker_cycle_traces", tables)
        self.assertIn("provisioning_operational_alerts", tables)
        alert_columns = {
            column["name"]
            for column in inspect(engine).get_columns("provisioning_operational_alerts")
        }
        self.assertIn("error_code", alert_columns)
        self.assertIn("control_schema_migrations", tables)

    def test_tenant_migrations_create_expected_tables(self) -> None:
        engine = self._build_engine()
        runner = MigrationRunner(
            engine=engine,
            package_name="migrations.tenant",
            table_name="tenant_schema_migrations",
        )

        applied = runner.apply_pending()
        tables = set(inspect(engine).get_table_names())

        self.assertEqual(
            applied,
            [
                "0001_core",
                "0002_finance_entries",
                "0003_finance_catalogs",
                "0004_finance_seed_clp",
                "0005_finance_transactions",
                "0006_finance_budgets",
                "0007_finance_loans",
                "0008_finance_loan_installments",
                "0009_finance_loan_installment_payment_split",
                "0010_finance_loan_installment_reversal_reason",
                "0011_finance_loan_source_account",
                "0012_finance_transaction_voids",
                "0013_finance_transaction_voids_repair",
                "0014_finance_default_category_catalog",
                "0015_business_core_base",
                "0016_maintenance_base",
                "0017_business_core_taxonomy",
                "0018_business_core_site_commune",
                "0019_core_user_timezones",
                "0020_work_group_members_and_maintenance_assignments",
            ],
        )
        self.assertIn("tenant_info", tables)
        self.assertIn("roles", tables)
        self.assertIn("users", tables)
        self.assertIn("finance_entries", tables)
        self.assertIn("finance_accounts", tables)
        self.assertIn("finance_categories", tables)
        self.assertIn("finance_beneficiaries", tables)
        self.assertIn("finance_people", tables)
        self.assertIn("finance_projects", tables)
        self.assertIn("finance_tags", tables)
        self.assertIn("finance_currencies", tables)
        self.assertIn("finance_exchange_rates", tables)
        self.assertIn("finance_settings", tables)
        self.assertIn("finance_activity_logs", tables)
        self.assertIn("finance_transactions", tables)
        self.assertIn("finance_transaction_tags", tables)
        self.assertIn("finance_transaction_attachments", tables)
        self.assertIn("finance_transaction_audit", tables)
        self.assertIn("finance_budgets", tables)
        self.assertIn("finance_loans", tables)
        self.assertIn("finance_loan_installments", tables)
        self.assertIn("business_organizations", tables)
        self.assertIn("business_clients", tables)
        self.assertIn("business_contacts", tables)
        self.assertIn("business_sites", tables)
        self.assertIn("business_function_profiles", tables)
        self.assertIn("business_work_groups", tables)
        self.assertIn("business_work_group_members", tables)
        self.assertIn("business_task_types", tables)
        self.assertIn("maintenance_equipment_types", tables)
        self.assertIn("maintenance_installations", tables)
        self.assertIn("maintenance_work_orders", tables)
        self.assertIn("maintenance_visits", tables)
        self.assertIn("maintenance_status_logs", tables)
        self.assertIn("tenant_schema_migrations", tables)
        installment_columns = {
            column["name"]
            for column in inspect(engine).get_columns("finance_loan_installments")
        }
        loan_columns = {
            column["name"] for column in inspect(engine).get_columns("finance_loans")
        }
        transaction_columns = {
            column["name"]
            for column in inspect(engine).get_columns("finance_transactions")
        }
        business_organization_columns = {
            column["name"]
            for column in inspect(engine).get_columns("business_organizations")
        }
        business_client_columns = {
            column["name"]
            for column in inspect(engine).get_columns("business_clients")
        }
        business_contact_columns = {
            column["name"]
            for column in inspect(engine).get_columns("business_contacts")
        }
        business_site_columns = {
            column["name"] for column in inspect(engine).get_columns("business_sites")
        }
        tenant_info_columns = {
            column["name"] for column in inspect(engine).get_columns("tenant_info")
        }
        tenant_user_columns = {
            column["name"] for column in inspect(engine).get_columns("users")
        }
        business_function_profile_columns = {
            column["name"]
            for column in inspect(engine).get_columns("business_function_profiles")
        }
        business_work_group_columns = {
            column["name"] for column in inspect(engine).get_columns("business_work_groups")
        }
        business_task_type_columns = {
            column["name"] for column in inspect(engine).get_columns("business_task_types")
        }
        maintenance_equipment_type_columns = {
            column["name"]
            for column in inspect(engine).get_columns("maintenance_equipment_types")
        }
        maintenance_installation_columns = {
            column["name"]
            for column in inspect(engine).get_columns("maintenance_installations")
        }
        maintenance_work_order_columns = {
            column["name"]
            for column in inspect(engine).get_columns("maintenance_work_orders")
        }
        maintenance_visit_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_visits")
        }
        maintenance_status_log_columns = {
            column["name"]
            for column in inspect(engine).get_columns("maintenance_status_logs")
        }
        self.assertIn("paid_principal_amount", installment_columns)
        self.assertIn("paid_interest_amount", installment_columns)
        self.assertIn("reversal_reason_code", installment_columns)
        self.assertIn("account_id", loan_columns)
        self.assertIn("is_voided", transaction_columns)
        self.assertIn("voided_at", transaction_columns)
        self.assertIn("void_reason", transaction_columns)
        self.assertIn("voided_by_user_id", transaction_columns)
        self.assertIn("organization_kind", business_organization_columns)
        self.assertIn("organization_id", business_client_columns)
        self.assertIn("full_name", business_contact_columns)
        self.assertIn("client_id", business_site_columns)
        self.assertIn("commune", business_site_columns)
        self.assertIn("timezone", tenant_info_columns)
        self.assertIn("timezone", tenant_user_columns)
        self.assertIn("code", business_function_profile_columns)
        self.assertIn("group_kind", business_work_group_columns)
        business_work_group_member_columns = {
            column["name"] for column in inspect(engine).get_columns("business_work_group_members")
        }
        self.assertIn("tenant_user_id", business_work_group_member_columns)
        self.assertIn("function_profile_id", business_work_group_member_columns)
        self.assertIn("color", business_task_type_columns)
        self.assertIn("name", maintenance_equipment_type_columns)
        self.assertIn("equipment_type_id", maintenance_installation_columns)
        self.assertIn("installation_id", maintenance_work_order_columns)
        self.assertIn("assigned_work_group_id", maintenance_work_order_columns)
        self.assertIn("visit_status", maintenance_visit_columns)
        self.assertIn("assigned_work_group_id", maintenance_visit_columns)
        self.assertIn("to_status", maintenance_status_log_columns)

        with engine.connect() as conn:
            currency_rows = conn.execute(
                text("SELECT code, is_base FROM finance_currencies ORDER BY id ASC")
            ).all()
            category_rows = conn.execute(
                text(
                    "SELECT name, category_type FROM finance_categories ORDER BY id ASC"
                )
            ).all()
            settings_rows = conn.execute(
                text("SELECT setting_key FROM finance_settings ORDER BY setting_key ASC")
            ).all()
        self.assertEqual(currency_rows[0][0], "USD")
        self.assertEqual(currency_rows[0][1], 1)
        self.assertIn(("CLP", 0), currency_rows)
        self.assertIn(("Ingreso General", "income"), category_rows)
        self.assertIn(("Sueldo", "income"), category_rows)
        self.assertIn(("Egreso General", "expense"), category_rows)
        self.assertIn(("Gastos menores", "expense"), category_rows)
        self.assertIn(("Transferencia interna", "transfer"), category_rows)
        self.assertEqual(
            [row[0] for row in settings_rows],
            ["account_types_catalog", "base_currency_code"],
        )

    def test_runner_is_idempotent(self) -> None:
        engine = self._build_engine()
        runner = MigrationRunner(
            engine=engine,
            package_name="migrations.tenant",
            table_name="tenant_schema_migrations",
        )

        runner.apply_pending()
        applied = runner.apply_pending()

        self.assertEqual(applied, [])
        self.assertEqual(
            runner.get_applied_versions(),
            [
                "0001_core",
                "0002_finance_entries",
                "0003_finance_catalogs",
                "0004_finance_seed_clp",
                "0005_finance_transactions",
                "0006_finance_budgets",
                "0007_finance_loans",
                "0008_finance_loan_installments",
                "0009_finance_loan_installment_payment_split",
                "0010_finance_loan_installment_reversal_reason",
                "0011_finance_loan_source_account",
                "0012_finance_transaction_voids",
                "0013_finance_transaction_voids_repair",
                "0014_finance_default_category_catalog",
                "0015_business_core_base",
                "0016_maintenance_base",
                "0017_business_core_taxonomy",
                "0018_business_core_site_commune",
                "0019_core_user_timezones",
                "0020_work_group_members_and_maintenance_assignments",
            ],
        )

    def test_finance_catalog_seed_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0003_finance_catalogs.upgrade(conn)
            v0004_finance_seed_clp.upgrade(conn)
            v0004_finance_seed_clp.upgrade(conn)
            v0014_finance_default_category_catalog.upgrade(conn)
            v0014_finance_default_category_catalog.upgrade(conn)

        with engine.connect() as conn:
            self.assertEqual(
                conn.execute(text("SELECT COUNT(*) FROM finance_currencies")).scalar_one(),
                2,
            )
            self.assertEqual(
                conn.execute(text("SELECT COUNT(*) FROM finance_categories")).scalar_one(),
                len(v0003_finance_catalogs.DEFAULT_FINANCE_CATEGORY_SEEDS),
            )
            self.assertEqual(
                conn.execute(text("SELECT COUNT(*) FROM finance_settings")).scalar_one(),
                2,
            )
            currency_codes = [
                row[0]
                for row in conn.execute(
                    text("SELECT code FROM finance_currencies ORDER BY sort_order ASC, id ASC")
                ).all()
            ]
            self.assertEqual(currency_codes, ["USD", "CLP"])

    def test_business_core_base_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0015_business_core_base.upgrade(conn)
            v0015_business_core_base.upgrade(conn)

        tables = set(inspect(engine).get_table_names())
        self.assertIn("business_organizations", tables)
        self.assertIn("business_clients", tables)
        self.assertIn("business_contacts", tables)
        self.assertIn("business_sites", tables)

    def test_work_group_members_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            MigrationRunner(
                engine=engine,
                package_name="migrations.tenant",
                table_name="tenant_schema_migrations",
            ).apply_pending()
            v0020_work_group_members_and_maintenance_assignments.upgrade(conn)
            v0020_work_group_members_and_maintenance_assignments.upgrade(conn)

        inspector = inspect(engine)
        self.assertIn("business_work_group_members", set(inspector.get_table_names()))
        work_order_columns = {
            column["name"] for column in inspector.get_columns("maintenance_work_orders")
        }
        visit_columns = {
            column["name"] for column in inspector.get_columns("maintenance_visits")
        }
        self.assertIn("assigned_work_group_id", work_order_columns)
        self.assertIn("assigned_work_group_id", visit_columns)

    def test_finance_transactions_migration_backfills_legacy_entries(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            MigrationRunner(
                engine=engine,
                package_name="migrations.tenant",
                table_name="tenant_schema_migrations",
            ).apply_pending()
            conn.execute(
                text(
                    """
                    INSERT INTO finance_entries (
                        movement_type,
                        concept,
                        amount,
                        category,
                        created_by_user_id
                    ) VALUES (
                        'income',
                        'Cobro migrado',
                        1500.0,
                        'billing',
                        7
                    )
                    """
                )
            )
            conn.execute(text("DELETE FROM finance_transactions"))
            v0005_finance_transactions.upgrade(conn)

        with engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT transaction_type, description, notes, source_type, source_id
                    FROM finance_transactions
                    ORDER BY id ASC
                    """
                )
            ).all()

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0][0], "income")
        self.assertEqual(rows[0][1], "Cobro migrado")
        self.assertEqual(rows[0][2], "billing")
        self.assertEqual(rows[0][3], "finance_entries_migration")
        self.assertEqual(rows[0][4], 1)

    def test_finance_budgets_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0006_finance_budgets.upgrade(conn)
            v0006_finance_budgets.upgrade(conn)

        self.assertIn("finance_budgets", set(inspect(engine).get_table_names()))

    def test_finance_loans_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0007_finance_loans.upgrade(conn)
            v0007_finance_loans.upgrade(conn)

        self.assertIn("finance_loans", set(inspect(engine).get_table_names()))

    def test_finance_loan_installments_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0007_finance_loans.upgrade(conn)
            v0008_finance_loan_installments.upgrade(conn)
            v0008_finance_loan_installments.upgrade(conn)

        loan_columns = {
            column["name"] for column in inspect(engine).get_columns("finance_loans")
        }
        self.assertIn("installments_count", loan_columns)
        self.assertIn("payment_frequency", loan_columns)
        self.assertIn("finance_loan_installments", set(inspect(engine).get_table_names()))

    def test_finance_loan_installment_payment_split_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0007_finance_loans.upgrade(conn)
            v0008_finance_loan_installments.upgrade(conn)
            v0009_finance_loan_installment_payment_split.upgrade(conn)
            v0009_finance_loan_installment_payment_split.upgrade(conn)

        installment_columns = {
            column["name"]
            for column in inspect(engine).get_columns("finance_loan_installments")
        }
        self.assertIn("paid_principal_amount", installment_columns)
        self.assertIn("paid_interest_amount", installment_columns)

    def test_finance_loan_installment_reversal_reason_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0007_finance_loans.upgrade(conn)
            v0008_finance_loan_installments.upgrade(conn)
            v0009_finance_loan_installment_payment_split.upgrade(conn)
            v0010_finance_loan_installment_reversal_reason.upgrade(conn)
            v0010_finance_loan_installment_reversal_reason.upgrade(conn)

        installment_columns = {
            column["name"]
            for column in inspect(engine).get_columns("finance_loan_installments")
        }
        self.assertIn("reversal_reason_code", installment_columns)

    def test_finance_loan_source_account_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0007_finance_loans.upgrade(conn)
            v0011_finance_loan_source_account.upgrade(conn)
            v0011_finance_loan_source_account.upgrade(conn)

        loan_columns = {
            column["name"] for column in inspect(engine).get_columns("finance_loans")
        }
        self.assertIn("account_id", loan_columns)

    def test_finance_transaction_void_migrations_add_missing_columns_idempotently(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0005_finance_transactions.upgrade(conn)
            v0012_finance_transaction_voids.upgrade(conn)
            v0012_finance_transaction_voids.upgrade(conn)
            v0013_finance_transaction_voids_repair.upgrade(conn)
            v0013_finance_transaction_voids_repair.upgrade(conn)
            v0014_finance_default_category_catalog.upgrade(conn)
            v0014_finance_default_category_catalog.upgrade(conn)

        transaction_columns = {
            column["name"]
            for column in inspect(engine).get_columns("finance_transactions")
        }
        self.assertIn("is_voided", transaction_columns)
        self.assertIn("voided_at", transaction_columns)
        self.assertIn("void_reason", transaction_columns)
        self.assertIn("voided_by_user_id", transaction_columns)

    def test_finance_default_category_catalog_migration_renames_legacy_base_rows(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.finance_categories.create(conn)
            conn.execute(
                v0003_finance_catalogs.finance_categories.insert(),
                [
                    {
                        "name": "General Income",
                        "category_type": "income",
                        "sort_order": 10,
                        "is_active": True,
                    },
                    {
                        "name": "General Expense",
                        "category_type": "expense",
                        "sort_order": 10,
                        "is_active": True,
                    },
                    {
                        "name": "Transfer",
                        "category_type": "transfer",
                        "sort_order": 20,
                        "is_active": True,
                    },
                ],
            )
            v0014_finance_default_category_catalog.upgrade(conn)
            v0014_finance_default_category_catalog.upgrade(conn)

        with engine.connect() as conn:
            category_rows = conn.execute(
                text("SELECT name, category_type FROM finance_categories ORDER BY sort_order ASC, id ASC")
            ).all()

        self.assertIn(("Ingreso General", "income"), category_rows)
        self.assertIn(("Egreso General", "expense"), category_rows)
        self.assertIn(("Transferencia interna", "transfer"), category_rows)
        self.assertNotIn(("General Income", "income"), category_rows)
        self.assertNotIn(("General Expense", "expense"), category_rows)
        self.assertNotIn(("Transfer", "transfer"), category_rows)


if __name__ == "__main__":
    unittest.main()
