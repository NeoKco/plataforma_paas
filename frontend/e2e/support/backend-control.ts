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