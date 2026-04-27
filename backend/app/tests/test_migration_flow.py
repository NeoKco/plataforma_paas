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
from migrations.tenant import v0021_maintenance_schedules_and_due_items
from migrations.tenant import v0022_maintenance_costing_and_finance_sync
from migrations.tenant import v0023_maintenance_cost_lines
from migrations.tenant import v0024_maintenance_finance_sync_policy
from migrations.tenant import v0025_maintenance_schedule_estimate_defaults
from migrations.tenant import v0026_maintenance_cost_templates
from migrations.tenant import v0027_maintenance_schedule_template_links
from migrations.tenant import v0028_maintenance_field_reports
from migrations.tenant import v0034_maintenance_actual_template_trace
from migrations.tenant import v0035_maintenance_visit_type
from migrations.tenant import v0036_maintenance_visit_result
from migrations.tenant import v0038_maintenance_work_order_task_type
from migrations.tenant import v0039_social_community_groups
from migrations.tenant import v0040_crm_base
from migrations.tenant import v0041_crm_expansion
from migrations.tenant import v0042_taskops_base
from migrations.tenant import v0043_techdocs_base
from migrations.tenant import v0044_chat_base
from migrations.tenant import v0045_crm_product_ingestion
from migrations.tenant import v0046_crm_product_ingestion_runs
from migrations.tenant import v0047_products_sources_and_connectors
from migrations.tenant import v0048_products_connector_automation
from migrations.tenant import v0049_products_live_refresh
from migrations.tenant import v0050_products_connector_scheduler_and_provider_profiles
from migrations.tenant import v0051_products_connector_runtime_profiles
from migrations.tenant import v0052_products_catalog_images


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
                "0025_tenant_bootstrap_admin",
                "0026_tenant_data_transfer_jobs",
                "0027_tenant_module_subscription_model",
                "0028_tenant_runtime_secret_campaigns",
                "0029_auth_audit_observability_fields",
                "0030_contract_tables_postgres_identity_fix",
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
        self.assertIn("bootstrap_admin_full_name", tenant_columns)
        self.assertIn("bootstrap_admin_email", tenant_columns)
        self.assertIn("bootstrap_admin_password_hash", tenant_columns)
        self.assertIn("tenant_data_transfer_jobs", tables)
        self.assertIn("tenant_data_transfer_artifacts", tables)
        self.assertIn("tenant_base_plan_catalog", tables)
        self.assertIn("tenant_module_catalog", tables)
        self.assertIn("tenant_module_price_catalog", tables)
        self.assertIn("tenant_subscriptions", tables)
        self.assertIn("tenant_subscription_items", tables)
        self.assertIn("tenant_runtime_secret_campaigns", tables)
        self.assertIn("tenant_runtime_secret_campaign_items", tables)
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
        auth_audit_columns = {
            column["name"] for column in inspect(engine).get_columns("auth_audit_events")
        }
        self.assertIn("request_id", auth_audit_columns)
        self.assertIn("request_path", auth_audit_columns)
        self.assertIn("request_method", auth_audit_columns)
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
                "0021_maintenance_schedules_and_due_items",
                "0022_maintenance_costing_and_finance_sync",
                "0023_maintenance_cost_lines",
                "0024_maintenance_finance_sync_policy",
                "0025_maintenance_schedule_estimate_defaults",
                "0026_maintenance_cost_templates",
                "0027_maintenance_schedule_template_links",
                "0028_maintenance_field_reports",
                "0029_business_task_type_function_profiles",
                "0030_business_core_merge_audits",
                "0032_business_core_assets",
                "0033_business_organization_addresses",
                "0034_maintenance_actual_template_trace",
                "0035_maintenance_visit_type",
                "0036_maintenance_visit_result",
                "0037_maintenance_cost_line_expense_flag",
                "0038_maintenance_work_order_task_type",
                "0039_social_community_groups",
                "0040_crm_base",
                "0041_crm_expansion",
                "0042_taskops_base",
                "0043_techdocs_base",
                "0044_chat_base",
                "0045_crm_product_ingestion",
                "0046_crm_product_ingestion_runs",
                "0047_products_sources_and_connectors",
                "0048_products_connector_automation",
                "0049_products_live_refresh",
                "0050_products_connector_scheduler_and_provider_profiles",
                "0051_products_connector_runtime_profiles",
                "0052_products_catalog_images",
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
        self.assertIn("social_community_groups", tables)
        self.assertIn("products_connectors", tables)
        self.assertIn("products_product_images", tables)
        self.assertIn("products_product_sources", tables)
        self.assertIn("products_price_history", tables)
        self.assertIn("products_refresh_runs", tables)
        self.assertIn("products_refresh_run_items", tables)
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
        self.assertIn("maintenance_schedules", tables)
        self.assertIn("maintenance_due_items", tables)
        self.assertIn("maintenance_cost_estimates", tables)
        self.assertIn("maintenance_cost_actuals", tables)
        self.assertIn("maintenance_cost_lines", tables)
        self.assertIn("crm_products", tables)
        self.assertIn("crm_product_characteristics", tables)
        self.assertIn("crm_opportunities", tables)
        self.assertIn("crm_opportunity_contacts", tables)
        self.assertIn("crm_opportunity_notes", tables)
        self.assertIn("crm_opportunity_activities", tables)
        self.assertIn("crm_opportunity_attachments", tables)
        self.assertIn("crm_opportunity_stage_events", tables)
        self.assertIn("crm_quotes", tables)
        self.assertIn("crm_quote_sections", tables)
        self.assertIn("crm_quote_lines", tables)
        self.assertIn("crm_quote_templates", tables)
        self.assertIn("crm_quote_template_sections", tables)
        self.assertIn("crm_quote_template_items", tables)
        self.assertIn("taskops_tasks", tables)
        self.assertIn("taskops_task_comments", tables)
        self.assertIn("taskops_task_attachments", tables)
        self.assertIn("taskops_task_status_events", tables)
        self.assertIn("techdocs_dossiers", tables)
        self.assertIn("techdocs_sections", tables)
        self.assertIn("techdocs_measurements", tables)
        self.assertIn("techdocs_evidences", tables)
        self.assertIn("techdocs_audit_events", tables)
        self.assertIn("chat_conversations", tables)
        self.assertIn("crm_product_ingestion_drafts", tables)
        self.assertIn("crm_product_ingestion_characteristics", tables)
        self.assertIn("crm_product_ingestion_runs", tables)
        self.assertIn("crm_product_ingestion_run_items", tables)
        self.assertIn("chat_conversation_participants", tables)
        self.assertIn("chat_messages", tables)
        maintenance_cost_line_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_cost_lines")
        }
        self.assertIn("include_in_expense", maintenance_cost_line_columns)
        self.assertIn("maintenance_schedule_cost_lines", tables)
        self.assertIn("maintenance_cost_templates", tables)
        maintenance_cost_actual_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_cost_actuals")
        }
        self.assertIn("applied_cost_template_id", maintenance_cost_actual_columns)
        self.assertIn("applied_cost_template_name_snapshot", maintenance_cost_actual_columns)
        self.assertIn("maintenance_cost_template_lines", tables)
        self.assertIn("maintenance_work_order_checklist_items", tables)
        self.assertIn("maintenance_work_order_evidences", tables)
        self.assertIn("maintenance_visits", tables)
        maintenance_visit_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_visits")
        }
        self.assertIn("visit_type", maintenance_visit_columns)
        self.assertIn("visit_result", maintenance_visit_columns)
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
        social_community_group_columns = {
            column["name"]
            for column in inspect(engine).get_columns("social_community_groups")
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
        maintenance_schedule_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_schedules")
        }
        maintenance_due_item_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_due_items")
        }
        maintenance_schedule_cost_line_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_schedule_cost_lines")
        }
        maintenance_cost_template_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_cost_templates")
        }
        maintenance_cost_template_line_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_cost_template_lines")
        }
        maintenance_work_order_checklist_columns = {
            column["name"]
            for column in inspect(engine).get_columns("maintenance_work_order_checklist_items")
        }
        maintenance_work_order_evidence_columns = {
            column["name"]
            for column in inspect(engine).get_columns("maintenance_work_order_evidences")
        }
        maintenance_cost_estimate_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_cost_estimates")
        }
        maintenance_cost_actual_columns = {
            column["name"] for column in inspect(engine).get_columns("maintenance_cost_actuals")
        }
        crm_product_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_products")
        }
        crm_product_characteristic_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_product_characteristics")
        }
        crm_opportunity_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_opportunities")
        }
        crm_opportunity_contact_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_opportunity_contacts")
        }
        crm_opportunity_note_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_opportunity_notes")
        }
        crm_opportunity_activity_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_opportunity_activities")
        }
        crm_opportunity_attachment_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_opportunity_attachments")
        }
        crm_opportunity_stage_event_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_opportunity_stage_events")
        }
        crm_quote_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_quotes")
        }
        crm_quote_section_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_quote_sections")
        }
        crm_quote_line_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_quote_lines")
        }
        crm_quote_template_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_quote_templates")
        }
        crm_quote_template_section_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_quote_template_sections")
        }
        crm_quote_template_item_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_quote_template_items")
        }
        techdocs_dossier_columns = {
            column["name"] for column in inspect(engine).get_columns("techdocs_dossiers")
        }
        techdocs_section_columns = {
            column["name"] for column in inspect(engine).get_columns("techdocs_sections")
        }
        techdocs_measurement_columns = {
            column["name"] for column in inspect(engine).get_columns("techdocs_measurements")
        }
        techdocs_evidence_columns = {
            column["name"] for column in inspect(engine).get_columns("techdocs_evidences")
        }
        techdocs_audit_columns = {
            column["name"] for column in inspect(engine).get_columns("techdocs_audit_events")
        }
        chat_conversation_columns = {
            column["name"] for column in inspect(engine).get_columns("chat_conversations")
        }
        crm_ingestion_draft_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_product_ingestion_drafts")
        }
        crm_ingestion_characteristic_columns = {
            column["name"] for column in inspect(engine).get_columns("crm_product_ingestion_characteristics")
        }
        chat_participant_columns = {
            column["name"] for column in inspect(engine).get_columns("chat_conversation_participants")
        }
        chat_message_columns = {
            column["name"] for column in inspect(engine).get_columns("chat_messages")
        }
        product_connector_columns = {
            column["name"] for column in inspect(engine).get_columns("products_connectors")
        }
        product_source_columns = {
            column["name"] for column in inspect(engine).get_columns("products_product_sources")
        }
        product_refresh_run_columns = {
            column["name"] for column in inspect(engine).get_columns("products_refresh_runs")
        }
        product_refresh_item_columns = {
            column["name"] for column in inspect(engine).get_columns("products_refresh_run_items")
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
        self.assertIn("social_community_group_id", business_client_columns)
        self.assertIn("name", social_community_group_columns)
        self.assertIn("commune", social_community_group_columns)
        self.assertIn("sector", social_community_group_columns)
        self.assertIn("zone", social_community_group_columns)
        self.assertIn("territorial_classification", social_community_group_columns)
        self.assertIn("full_name", business_contact_columns)
        self.assertIn("client_id", business_site_columns)
        self.assertIn("commune", business_site_columns)
        self.assertIn("timezone", tenant_info_columns)
        self.assertIn("maintenance_finance_sync_mode", tenant_info_columns)
        self.assertIn("maintenance_finance_income_account_id", tenant_info_columns)
        self.assertIn("maintenance_finance_currency_id", tenant_info_columns)
        self.assertIn("sku", crm_product_columns)
        self.assertIn("unit_price", crm_product_columns)
        self.assertIn("product_id", crm_product_characteristic_columns)
        self.assertIn("label", crm_product_characteristic_columns)
        self.assertIn("client_id", crm_opportunity_columns)
        self.assertIn("stage", crm_opportunity_columns)
        self.assertIn("closed_at", crm_opportunity_columns)
        self.assertIn("close_reason", crm_opportunity_columns)
        self.assertIn("full_name", crm_opportunity_contact_columns)
        self.assertIn("note", crm_opportunity_note_columns)
        self.assertIn("activity_type", crm_opportunity_activity_columns)
        self.assertIn("file_name", crm_opportunity_attachment_columns)
        self.assertIn("event_type", crm_opportunity_stage_event_columns)
        self.assertIn("opportunity_id", crm_quote_columns)
        self.assertIn("total_amount", crm_quote_columns)
        self.assertIn("template_id", crm_quote_columns)
        self.assertIn("quote_id", crm_quote_section_columns)
        self.assertIn("quote_id", crm_quote_line_columns)
        self.assertIn("product_id", crm_quote_line_columns)
        self.assertIn("section_id", crm_quote_line_columns)
        self.assertIn("name", crm_quote_template_columns)
        self.assertIn("template_id", crm_quote_template_section_columns)
        self.assertIn("section_id", crm_quote_template_item_columns)
        self.assertIn("dossier_type", techdocs_dossier_columns)
        self.assertIn("installation_id", techdocs_dossier_columns)
        self.assertIn("task_id", techdocs_dossier_columns)
        self.assertIn("section_kind", techdocs_section_columns)
        self.assertIn("expected_range", techdocs_measurement_columns)
        self.assertIn("storage_key", techdocs_evidence_columns)
        self.assertIn("event_type", techdocs_audit_columns)
        self.assertIn("conversation_kind", chat_conversation_columns)
        self.assertIn("context_type", chat_conversation_columns)
        self.assertIn("capture_status", crm_ingestion_draft_columns)
        self.assertIn("published_product_id", crm_ingestion_draft_columns)
        self.assertIn("source_url", crm_ingestion_draft_columns)
        self.assertIn("draft_id", crm_ingestion_characteristic_columns)
        self.assertIn("label", crm_ingestion_characteristic_columns)
        self.assertIn("user_id", chat_participant_columns)
        self.assertIn("last_read_message_id", chat_participant_columns)
        self.assertIn("sender_user_id", chat_message_columns)
        self.assertIn("message_kind", chat_message_columns)
        self.assertIn("sync_mode", product_connector_columns)
        self.assertIn("fetch_strategy", product_connector_columns)
        self.assertIn("run_ai_enrichment", product_connector_columns)
        self.assertIn("provider_key", product_connector_columns)
        self.assertIn("schedule_enabled", product_connector_columns)
        self.assertIn("schedule_scope", product_connector_columns)
        self.assertIn("schedule_frequency", product_connector_columns)
        self.assertIn("schedule_batch_limit", product_connector_columns)
        self.assertIn("next_scheduled_run_at", product_connector_columns)
        self.assertIn("last_scheduled_run_at", product_connector_columns)
        self.assertIn("last_schedule_status", product_connector_columns)
        self.assertIn("last_schedule_summary", product_connector_columns)
        self.assertIn("provider_profile", product_connector_columns)
        self.assertIn("auth_mode", product_connector_columns)
        self.assertIn("auth_reference", product_connector_columns)
        self.assertIn("request_timeout_seconds", product_connector_columns)
        self.assertIn("retry_limit", product_connector_columns)
        self.assertIn("retry_backoff_seconds", product_connector_columns)
        self.assertIn("last_validation_at", product_connector_columns)
        self.assertIn("last_validation_status", product_connector_columns)
        self.assertIn("last_validation_summary", product_connector_columns)
        self.assertIn("last_sync_summary", product_connector_columns)
        self.assertIn("sync_status", product_source_columns)
        self.assertIn("last_sync_attempt_at", product_source_columns)
        self.assertIn("last_sync_error", product_source_columns)
        self.assertIn("refresh_mode", product_source_columns)
        self.assertIn("refresh_merge_policy", product_source_columns)
        self.assertIn("refresh_prompt", product_source_columns)
        self.assertIn("next_refresh_at", product_source_columns)
        self.assertIn("last_refresh_success_at", product_source_columns)
        self.assertIn("scope", product_refresh_run_columns)
        self.assertIn("prefer_ai", product_refresh_run_columns)
        self.assertIn("merge_policy", product_refresh_item_columns)
        self.assertIn("used_ai_enrichment", product_refresh_item_columns)
        self.assertIn("detected_changes_json", product_refresh_item_columns)
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
        self.assertIn("task_type_id", maintenance_work_order_columns)
        self.assertIn("schedule_id", maintenance_work_order_columns)
        self.assertIn("due_item_id", maintenance_work_order_columns)
        self.assertIn("billing_mode", maintenance_work_order_columns)
        self.assertIn("next_due_at", maintenance_schedule_columns)
        self.assertIn("billing_mode", maintenance_schedule_columns)
        self.assertIn("estimate_target_margin_percent", maintenance_schedule_columns)
        self.assertIn("estimate_notes", maintenance_schedule_columns)
        self.assertIn("cost_template_id", maintenance_schedule_columns)
        self.assertIn("item_key", maintenance_work_order_checklist_columns)
        self.assertIn("is_completed", maintenance_work_order_checklist_columns)
        self.assertIn("storage_key", maintenance_work_order_evidence_columns)
        self.assertIn("file_size", maintenance_work_order_evidence_columns)
        self.assertIn("due_status", maintenance_due_item_columns)
        self.assertIn("work_order_id", maintenance_due_item_columns)
        self.assertIn("line_type", maintenance_schedule_cost_line_columns)
        self.assertIn("sort_order", maintenance_schedule_cost_line_columns)
        self.assertIn("name", maintenance_cost_template_columns)
        self.assertIn("estimate_target_margin_percent", maintenance_cost_template_columns)
        self.assertIn("template_id", maintenance_cost_template_line_columns)
        self.assertIn("line_type", maintenance_cost_template_line_columns)
        self.assertIn("total_estimated_cost", maintenance_cost_estimate_columns)
        self.assertIn("suggested_price", maintenance_cost_estimate_columns)
        self.assertIn("total_actual_cost", maintenance_cost_actual_columns)
        self.assertIn("actual_price_charged", maintenance_cost_actual_columns)
        self.assertIn("income_transaction_id", maintenance_cost_actual_columns)
        self.assertIn("expense_transaction_id", maintenance_cost_actual_columns)
        self.assertIn("finance_synced_at", maintenance_cost_actual_columns)
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
                "0021_maintenance_schedules_and_due_items",
                "0022_maintenance_costing_and_finance_sync",
                "0023_maintenance_cost_lines",
                "0024_maintenance_finance_sync_policy",
                "0025_maintenance_schedule_estimate_defaults",
                "0026_maintenance_cost_templates",
                "0027_maintenance_schedule_template_links",
                "0028_maintenance_field_reports",
                "0029_business_task_type_function_profiles",
                "0030_business_core_merge_audits",
                "0032_business_core_assets",
                "0033_business_organization_addresses",
                "0034_maintenance_actual_template_trace",
                "0035_maintenance_visit_type",
                "0036_maintenance_visit_result",
                "0037_maintenance_cost_line_expense_flag",
                "0038_maintenance_work_order_task_type",
                "0039_social_community_groups",
                "0040_crm_base",
                "0041_crm_expansion",
                "0042_taskops_base",
                "0043_techdocs_base",
                "0044_chat_base",
                "0045_crm_product_ingestion",
                "0046_crm_product_ingestion_runs",
                "0047_products_sources_and_connectors",
                "0048_products_connector_automation",
                "0049_products_live_refresh",
                "0050_products_connector_scheduler_and_provider_profiles",
                "0051_products_connector_runtime_profiles",
                "0052_products_catalog_images",
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

    def test_social_community_groups_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            MigrationRunner(
                engine=engine,
                package_name="migrations.tenant",
                table_name="tenant_schema_migrations",
            ).apply_pending()
            v0039_social_community_groups.upgrade(conn)
            v0039_social_community_groups.upgrade(conn)

        inspector = inspect(engine)
        self.assertIn("social_community_groups", set(inspector.get_table_names()))
        business_client_columns = {
            column["name"] for column in inspector.get_columns("business_clients")
        }
        self.assertIn("social_community_group_id", business_client_columns)

    def test_crm_base_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            MigrationRunner(
                engine=engine,
                package_name="migrations.tenant",
                table_name="tenant_schema_migrations",
            ).apply_pending()
            v0040_crm_base.upgrade(conn)
            v0040_crm_base.upgrade(conn)

        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        self.assertIn("crm_products", tables)
        self.assertIn("crm_opportunities", tables)
        self.assertIn("crm_quotes", tables)
        self.assertIn("crm_quote_lines", tables)

    def test_techdocs_base_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            MigrationRunner(
                engine=engine,
                package_name="migrations.tenant",
                table_name="tenant_schema_migrations",
            ).apply_pending()
            v0043_techdocs_base.upgrade(conn)
            v0043_techdocs_base.upgrade(conn)

        tables = set(inspect(engine).get_table_names())
        self.assertIn("techdocs_dossiers", tables)
        self.assertIn("techdocs_sections", tables)
        self.assertIn("techdocs_measurements", tables)
        self.assertIn("techdocs_evidences", tables)
        self.assertIn("techdocs_audit_events", tables)

    def test_chat_base_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0015_business_core_base.upgrade(conn)
            v0016_maintenance_base.upgrade(conn)
            v0040_crm_base.upgrade(conn)
            v0042_taskops_base.upgrade(conn)
            v0044_chat_base.upgrade(conn)
            v0044_chat_base.upgrade(conn)

        tables = set(inspect(engine).get_table_names())
        self.assertIn("chat_conversations", tables)
        self.assertIn("chat_conversation_participants", tables)
        self.assertIn("chat_messages", tables)

    def test_crm_product_ingestion_migration_is_idempotent(self) -> None:
        engine = self._build_engine()

        with engine.begin() as conn:
            v0001 = __import__("migrations.tenant.v0001_core", fromlist=["upgrade"])
            v0002 = __import__("migrations.tenant.v0002_finance_entries", fromlist=["upgrade"])
            v0001.upgrade(conn)
            v0002.upgrade(conn)
            v0003_finance_catalogs.upgrade(conn)
            v0004_finance_seed_clp.upgrade(conn)
            v0005_finance_transactions.upgrade(conn)
            v0006_finance_budgets.upgrade(conn)
            v0007_finance_loans.upgrade(conn)
            v0008_finance_loan_installments.upgrade(conn)
            v0009_finance_loan_installment_payment_split.upgrade(conn)
            v0010_finance_loan_installment_reversal_reason.upgrade(conn)
            v0011_finance_loan_source_account.upgrade(conn)
            v0012_finance_transaction_voids.upgrade(conn)
            v0013_finance_transaction_voids_repair.upgrade(conn)
            v0014_finance_default_category_catalog.upgrade(conn)
            v0015_business_core_base.upgrade(conn)
            v0016_maintenance_base.upgrade(conn)
            v0017_business_core_taxonomy.upgrade(conn)
            v0018_business_core_site_commune.upgrade(conn)
            v0019_core_user_timezones.upgrade(conn)
            v0020_work_group_members_and_maintenance_assignments.upgrade(conn)
            v0021_maintenance_schedules_and_due_items.upgrade(conn)
            v0022_maintenance_costing_and_finance_sync.upgrade(conn)
            v0023_maintenance_cost_lines.upgrade(conn)
            v0024_maintenance_finance_sync_policy.upgrade(conn)
            v0025_maintenance_schedule_estimate_defaults.upgrade(conn)
            v0026_maintenance_cost_templates.upgrade(conn)
            v0027_maintenance_schedule_template_links.upgrade(conn)
            v0028_maintenance_field_reports.upgrade(conn)
            __import__("migrations.tenant.v0029_business_task_type_function_profiles", fromlist=["upgrade"]).upgrade(conn)
            __import__("migrations.tenant.v0030_business_core_merge_audits", fromlist=["upgrade"]).upgrade(conn)
            __import__("migrations.tenant.v0032_business_core_assets", fromlist=["upgrade"]).upgrade(conn)
            __import__("migrations.tenant.v0033_business_organization_addresses", fromlist=["upgrade"]).upgrade(conn)
            v0034_maintenance_actual_template_trace.upgrade(conn)
            v0035_maintenance_visit_type.upgrade(conn)
            v0036_maintenance_visit_result.upgrade(conn)
            __import__("migrations.tenant.v0037_maintenance_cost_line_expense_flag", fromlist=["upgrade"]).upgrade(conn)
            v0038_maintenance_work_order_task_type.upgrade(conn)
            v0039_social_community_groups.upgrade(conn)
            v0040_crm_base.upgrade(conn)
            v0041_crm_expansion.upgrade(conn)
            v0042_taskops_base.upgrade(conn)
            v0043_techdocs_base.upgrade(conn)
            v0044_chat_base.upgrade(conn)
            v0045_crm_product_ingestion.upgrade(conn)
            v0045_crm_product_ingestion.upgrade(conn)
            v0046_crm_product_ingestion_runs.upgrade(conn)
            v0046_crm_product_ingestion_runs.upgrade(conn)

        tables = set(inspect(engine).get_table_names())
        self.assertIn("crm_product_ingestion_drafts", tables)
        self.assertIn("crm_product_ingestion_characteristics", tables)
        self.assertIn("crm_product_ingestion_runs", tables)
        self.assertIn("crm_product_ingestion_run_items", tables)


if __name__ == "__main__":
    unittest.main()
