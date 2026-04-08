import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

type FailedProvisioningJobSeed = {
  tenantSlug: string;
  jobType?: string;
  errorCode?: string;
  errorMessage?: string;
  maxAttempts?: number;
};

type SeededProvisioningJob = {
  jobId: number;
  tenantId: number;
  tenantSlug: string;
  jobType: string;
  status: string;
  errorCode: string;
  errorMessage: string;
};

type ProvisioningDispatchInfo = {
  backendName: string;
  brokerUrl: string;
  redisUrl: string;
};

type TenantModuleLimitMutation = {
  tenantSlug: string;
  moduleKey: string;
  value: number | null;
};

type TenantPlanMutation = {
  tenantSlug: string;
  planCode: string | null;
};

type SeedTenantUserInput = {
  tenantSlug: string;
  fullName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  createdAtIso?: string;
};

type SeededTenantUser = {
  id: number;
  email: string;
  role: string;
  isActive: boolean;
};

type TenantUserUsageSnapshot = {
  tenantSlug: string;
  totalUsers: number;
  activeUsers: number;
  monthlyUsers: number;
  adminUsers: number;
  managerUsers: number;
  operatorUsers: number;
};

type TenantFinanceUsageSnapshot = {
  tenantSlug: string;
  totalEntries: number;
  monthlyEntries: number;
  monthlyIncomeEntries: number;
  monthlyExpenseEntries: number;
};

type SeedTenantBillingSyncEventInput = {
  tenantSlug: string;
  provider?: string;
  providerEventId: string;
  eventType?: string;
  billingStatus?: string;
  billingStatusReason?: string;
  billingCurrentPeriodEndsAtIso?: string;
  billingGraceUntilIso?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
};

type SeededTenantBillingSyncEvent = {
  tenantId: number;
  tenantSlug: string;
  billingStatus: string | null;
  billingStatusReason: string | null;
  wasDuplicate: boolean;
  processingResult: string;
  syncEventId: number;
};

type TenantPlanMutationResult = {
  tenantSlug: string;
  tenantId: number;
  tenantPlanCode: string | null;
  tenantPlanEnabledModules: string[] | null;
};

function getRepoRoot() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirPath = path.dirname(currentFilePath);
  return path.resolve(currentDirPath, "../../..");
}

function getBackendPythonExecutable() {
  const repoRoot = getRepoRoot();
  return (
    process.env.E2E_BACKEND_PYTHON?.trim() ||
    path.join(repoRoot, "platform_paas_venv", "bin", "python")
  );
}

function runBackendPython(script: string, args: string[]) {
  const repoRoot = getRepoRoot();
  return execFileSync(getBackendPythonExecutable(), ["-c", script, ...args], {
    cwd: path.join(repoRoot, "backend"),
    env: {
      ...process.env,
      PYTHONPATH: path.join(repoRoot, "backend"),
    },
    encoding: "utf-8",
  }).trim();
}

export function seedFailedProvisioningJob({
  tenantSlug,
  jobType = "sync_tenant_schema",
  errorCode = "e2e_retry_failed_job",
  errorMessage = "E2E synthetic failed provisioning job",
  maxAttempts = 3,
}: FailedProvisioningJobSeed): SeededProvisioningJob {
  const script = `
import json
import sys
from datetime import datetime, timezone

from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.models.provisioning_job import ProvisioningJob

tenant_slug = sys.argv[1]
job_type = sys.argv[2]
error_code = sys.argv[3]
error_message = sys.argv[4]
max_attempts = int(sys.argv[5])

db = ControlSessionLocal()
try:
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    job = ProvisioningJob(
        tenant_id=tenant.id,
        job_type=job_type,
        status="failed",
        attempts=max_attempts,
        max_attempts=max_attempts,
        error_code=error_code,
        error_message=error_message,
        last_attempt_at=datetime.now(timezone.utc),
        next_retry_at=None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    print(json.dumps({
        "jobId": job.id,
        "tenantId": tenant.id,
        "tenantSlug": tenant.slug,
        "jobType": job.job_type,
        "status": job.status,
        "errorCode": job.error_code,
        "errorMessage": job.error_message,
    }))
finally:
    db.close()
`;

  const output = runBackendPython(script, [
    tenantSlug,
    jobType,
    errorCode,
    errorMessage,
    String(maxAttempts),
  ]);

  return JSON.parse(output) as SeededProvisioningJob;
}

export function getProvisioningDispatchInfo(): ProvisioningDispatchInfo {
  const script = `
import json

from app.common.config.settings import settings

print(json.dumps({
    "backendName": settings.PROVISIONING_DISPATCH_BACKEND,
    "brokerUrl": settings.PROVISIONING_BROKER_URL,
    "redisUrl": settings.REDIS_URL,
}))
`;

  const output = runBackendPython(script, []);
  return JSON.parse(output) as ProvisioningDispatchInfo;
}

export function seedProvisioningDeadLetterJob({
  tenantSlug,
  jobType = "sync_tenant_schema",
  errorCode = "e2e_dlq_failed_job",
  errorMessage = "E2E synthetic DLQ provisioning job",
  maxAttempts = 3,
}: FailedProvisioningJobSeed): SeededProvisioningJob {
  const script = `
import json
import sys
from datetime import datetime, timezone

from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.provisioning.services.provisioning_dispatch_service import ProvisioningDispatchService

tenant_slug = sys.argv[1]
job_type = sys.argv[2]
error_code = sys.argv[3]
error_message = sys.argv[4]
max_attempts = int(sys.argv[5])

if settings.PROVISIONING_DISPATCH_BACKEND != "broker":
    raise SystemExit("Provisioning dispatch backend is not broker")

db = ControlSessionLocal()
try:
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    job = ProvisioningJob(
        tenant_id=tenant.id,
        job_type=job_type,
        status="failed",
        attempts=max_attempts,
        max_attempts=max_attempts,
        error_code=error_code,
        error_message=error_message,
        last_attempt_at=datetime.now(timezone.utc),
        next_retry_at=None,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    ProvisioningDispatchService().finalize_job(job=job)

    print(json.dumps({
        "jobId": job.id,
        "tenantId": tenant.id,
        "tenantSlug": tenant.slug,
        "jobType": job.job_type,
        "status": job.status,
        "errorCode": job.error_code,
        "errorMessage": job.error_message,
    }))
finally:
    db.close()
`;

  const output = runBackendPython(script, [
    tenantSlug,
    jobType,
    errorCode,
    errorMessage,
    String(maxAttempts),
  ]);

  return JSON.parse(output) as SeededProvisioningJob;
}

export function setTenantModuleLimit({
  tenantSlug,
  moduleKey,
  value,
}: TenantModuleLimitMutation) {
  const script = `
import json
import sys

from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.models.tenant import Tenant
from app.apps.platform_control.services.tenant_service import TenantService

tenant_slug = sys.argv[1]
module_key = sys.argv[2]
raw_value = sys.argv[3]
value = None if raw_value == "__NONE__" else int(raw_value)

db = ControlSessionLocal()
service = TenantService()
try:
    tenant = db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    current_limits = service.get_tenant_module_limits(tenant) or {}
    next_limits = dict(current_limits)
    if value is None:
        next_limits.pop(module_key, None)
    else:
        next_limits[module_key] = value

    updated = service.set_module_limits(
        db=db,
        tenant_id=tenant.id,
        module_limits=next_limits,
    )

    print(json.dumps({
        "tenantSlug": updated.slug,
        "moduleLimits": service.get_tenant_module_limits(updated) or {},
    }))
finally:
    db.close()
`;

  const output = runBackendPython(script, [
    tenantSlug,
    moduleKey,
    value === null ? "__NONE__" : String(value),
  ]);

  return JSON.parse(output) as {
    tenantSlug: string;
    moduleLimits: Record<string, number>;
  };
}

export function setTenantPlan({
  tenantSlug,
  planCode,
}: TenantPlanMutation): TenantPlanMutationResult {
  const script = `
import json
import sys

from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_service import TenantService

tenant_slug = sys.argv[1]
plan_code = None if sys.argv[2] == "__NONE__" else sys.argv[2]

db = ControlSessionLocal()
service = TenantService()
repository = TenantRepository()
try:
    tenant = repository.get_by_slug(db, tenant_slug)
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    updated = service.set_plan(
        db=db,
        tenant_id=tenant.id,
        plan_code=plan_code,
    )

    print(json.dumps({
        "tenantSlug": updated.slug,
        "tenantId": updated.id,
        "tenantPlanCode": updated.plan_code,
        "tenantPlanEnabledModules": service.tenant_plan_policy_service.get_enabled_modules(updated.plan_code),
    }))
finally:
    db.close()
`;

  const output = runBackendPython(script, [
    tenantSlug,
    planCode?.trim() || "__NONE__",
  ]);

  return JSON.parse(output) as TenantPlanMutationResult;
}

export function seedTenantUser({
  tenantSlug,
  fullName,
  email,
  password,
  role,
  isActive,
  createdAtIso,
}: SeedTenantUserInput): SeededTenantUser {
  const script = `
import json
import sys
from datetime import datetime, timezone

from app.common.db.control_database import ControlSessionLocal
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService
from app.common.security.password_service import hash_password

tenant_slug = sys.argv[1]
full_name = sys.argv[2]
email = sys.argv[3]
password = sys.argv[4]
role = sys.argv[5]
is_active = sys.argv[6] == "true"
created_at_raw = sys.argv[7]
created_at = None if created_at_raw == "__NONE__" else datetime.fromisoformat(created_at_raw)
if created_at is not None and created_at.tzinfo is None:
  created_at = created_at.replace(tzinfo=timezone.utc)

control_db = ControlSessionLocal()
tenant_connection = TenantConnectionService()
tenant_db = None

try:
    tenant = tenant_connection.get_tenant_by_slug(control_db, tenant_slug)
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    tenant_session_factory = tenant_connection.get_tenant_session(tenant)
    tenant_db = tenant_session_factory()

    user = tenant_db.query(User).filter(User.email == email).first()
    if user is None:
        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            is_active=is_active,
        )
        tenant_db.add(user)
    else:
        user.full_name = full_name
        user.password_hash = hash_password(password)
        user.role = role
        user.is_active = is_active

    if created_at is not None:
      user.created_at = created_at

    tenant_db.commit()
    tenant_db.refresh(user)

    print(json.dumps({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "isActive": user.is_active,
    }))
finally:
    if tenant_db is not None:
        tenant_db.close()
    control_db.close()
`;

  const output = runBackendPython(script, [
    tenantSlug,
    fullName,
    email,
    password,
    role,
    isActive ? "true" : "false",
    createdAtIso?.trim() || "__NONE__",
  ]);

  return JSON.parse(output) as SeededTenantUser;
}

export function getTenantUserUsageSnapshot(tenantSlug: string): TenantUserUsageSnapshot {
  const script = `
import json
import sys
from datetime import datetime, timezone

from app.common.db.control_database import ControlSessionLocal
from app.apps.tenant_modules.core.repositories.user_repository import UserRepository
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService

tenant_slug = sys.argv[1]

control_db = ControlSessionLocal()
tenant_connection = TenantConnectionService()
tenant_db = None
repository = UserRepository()

try:
    tenant = tenant_connection.get_tenant_by_slug(control_db, tenant_slug)
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    tenant_session_factory = tenant_connection.get_tenant_session(tenant)
    tenant_db = tenant_session_factory()

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    print(json.dumps({
        "tenantSlug": tenant_slug,
        "totalUsers": repository.count_all(tenant_db),
        "activeUsers": repository.count_active(tenant_db),
        "monthlyUsers": repository.count_created_since(tenant_db, month_start),
        "adminUsers": repository.count_by_role(tenant_db, "admin"),
        "managerUsers": repository.count_by_role(tenant_db, "manager"),
        "operatorUsers": repository.count_by_role(tenant_db, "operator"),
    }))
finally:
    if tenant_db is not None:
        tenant_db.close()
    control_db.close()
`;

  const output = runBackendPython(script, [tenantSlug]);
  return JSON.parse(output) as TenantUserUsageSnapshot;
}

export function getTenantFinanceUsageSnapshot(tenantSlug: string) {
  const script = `
import json
import sys

from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.models.tenant import Tenant
from app.apps.tenant_modules.finance.services.finance_service import FinanceService
from app.apps.tenant_modules.core.services.tenant_connection_service import TenantConnectionService

tenant_slug = sys.argv[1]

control_db = ControlSessionLocal()
service = FinanceService()
connection_service = TenantConnectionService()
tenant_db = None
try:
    tenant = control_db.query(Tenant).filter(Tenant.slug == tenant_slug).first()
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")
    if not tenant.db_name or not tenant.db_user or not tenant.db_host or not tenant.db_port:
        raise SystemExit(f"Tenant DB not configured: {tenant_slug}")

    tenant_db = connection_service.get_tenant_session(tenant)()

    print(json.dumps({
        "tenantSlug": tenant.slug,
        "totalEntries": service.transaction_repository.count_all(tenant_db),
        "monthlyEntries": service.transaction_repository.count_created_since(
            tenant_db,
            service._get_current_month_start(),
        ),
        "monthlyIncomeEntries": service.transaction_repository.count_created_since_by_type(
            tenant_db,
            service._get_current_month_start(),
            "income",
        ),
        "monthlyExpenseEntries": service.transaction_repository.count_created_since_by_type(
            tenant_db,
            service._get_current_month_start(),
            "expense",
        ),
    }))
finally:
    if tenant_db is not None:
        tenant_db.close()
    control_db.close()
`;

  const output = runBackendPython(script, [tenantSlug]);
  return JSON.parse(output) as TenantFinanceUsageSnapshot;
}

export function seedTenantBillingSyncEvent({
  tenantSlug,
  provider = "stripe",
  providerEventId,
  eventType = "invoice.payment_failed",
  billingStatus = "past_due",
  billingStatusReason = "E2E billing sync event",
  billingCurrentPeriodEndsAtIso,
  billingGraceUntilIso,
  providerCustomerId,
  providerSubscriptionId,
}: SeedTenantBillingSyncEventInput): SeededTenantBillingSyncEvent {
  const script = `
import json
import sys
from datetime import datetime, timezone

from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_billing_sync_service import TenantBillingSyncService

tenant_slug = sys.argv[1]
provider = sys.argv[2]
provider_event_id = sys.argv[3]
event_type = sys.argv[4]
billing_status = None if sys.argv[5] == "__NONE__" else sys.argv[5]
billing_status_reason = None if sys.argv[6] == "__NONE__" else sys.argv[6]
billing_current_period_ends_at_raw = sys.argv[7]
billing_grace_until_raw = sys.argv[8]
provider_customer_id = None if sys.argv[9] == "__NONE__" else sys.argv[9]
provider_subscription_id = None if sys.argv[10] == "__NONE__" else sys.argv[10]

def parse_datetime(raw_value):
    if raw_value == "__NONE__":
        return None
    parsed = datetime.fromisoformat(raw_value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed

db = ControlSessionLocal()
try:
    tenant = TenantRepository().get_by_slug(db, tenant_slug)
    if tenant is None:
        raise SystemExit(f"Tenant not found: {tenant_slug}")

    result = TenantBillingSyncService().apply_sync_event(
        db=db,
        tenant_id=tenant.id,
        provider=provider,
        provider_event_id=provider_event_id,
        event_type=event_type,
        billing_status=billing_status,
        billing_status_reason=billing_status_reason,
        billing_current_period_ends_at=parse_datetime(billing_current_period_ends_at_raw),
        billing_grace_until=parse_datetime(billing_grace_until_raw),
        provider_customer_id=provider_customer_id,
        provider_subscription_id=provider_subscription_id,
        raw_payload={"source": "e2e-backend-control"},
        actor_context={"sub": "e2e-backend-control", "email": "admin@platform.local"},
    )

    print(json.dumps({
        "tenantId": result.tenant.id,
        "tenantSlug": result.tenant.slug,
        "billingStatus": result.tenant.billing_status,
        "billingStatusReason": result.tenant.billing_status_reason,
        "wasDuplicate": result.was_duplicate,
        "processingResult": result.sync_event.processing_result,
        "syncEventId": result.sync_event.id,
    }))
finally:
    db.close()
`;

  const output = runBackendPython(script, [
    tenantSlug,
    provider,
    providerEventId,
    eventType,
    billingStatus || "__NONE__",
    billingStatusReason || "__NONE__",
    billingCurrentPeriodEndsAtIso?.trim() || "__NONE__",
    billingGraceUntilIso?.trim() || "__NONE__",
    providerCustomerId?.trim() || "__NONE__",
    providerSubscriptionId?.trim() || "__NONE__",
  ]);

  return JSON.parse(output) as SeededTenantBillingSyncEvent;
}
