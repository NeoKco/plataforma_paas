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
        self.assertIn("tenant_schema_migrations", tables)

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
        self.assertIn(("General Income", "income"), category_rows)
        self.assertIn(("General Expense", "expense"), category_rows)
        self.assertIn(("Transfer", "transfer"), category_rows)
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
            ],
        )

    def test_finance_catalog_seed_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0003_finance_catalogs.upgrade(conn)
            v0003_finance_catalogs.upgrade(conn)
            v0004_finance_seed_clp.upgrade(conn)
            v0004_finance_seed_clp.upgrade(conn)

        with engine.connect() as conn:
            self.assertEqual(
                conn.execute(text("SELECT COUNT(*) FROM finance_currencies")).scalar_one(),
                2,
            )
            self.assertEqual(
                conn.execute(text("SELECT COUNT(*) FROM finance_categories")).scalar_one(),
                3,
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


if __name__ == "__main__":
    unittest.main()
