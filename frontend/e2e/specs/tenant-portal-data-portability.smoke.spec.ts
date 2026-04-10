import { writeFile } from "node:fs/promises";
import { expect, test } from "../support/test";
import { loginTenant } from "../support/auth";

const TENANT_SESSION_STORAGE_KEY = "platform_paas.tenant_session";

async function readTenantAccessToken(page: Parameters<typeof test>[0]["page"]) {
  const rawSession = await page.evaluate(
    (storageKey) => window.sessionStorage.getItem(storageKey),
    TENANT_SESSION_STORAGE_KEY
  );
  if (!rawSession) {
    throw new Error("Tenant session storage is empty after login");
  }
  const parsed = JSON.parse(rawSession) as { accessToken?: string };
  if (!parsed.accessToken) {
    throw new Error("Tenant access token is missing in session storage");
  }
  return parsed.accessToken;
}

test("tenant portal admin can export functional data and simulate portable import", async ({
  page,
}, testInfo) => {
  await loginTenant(page);
  await page.goto("/tenant-portal");
  await expect(page).toHaveURL(/\/tenant-portal($|[#?])/);

  const accessToken = await readTenantAccessToken(page);
  const apiOrigin = new URL(page.url()).origin;

  await expect(
    page.getByRole("heading", { name: /Portabilidad tenant|Tenant portability/i })
  ).toBeVisible();

  const exportScopeSelect = page.getByLabel(
    /Modo de exportación portable|Portable export mode/i
  );
  await exportScopeSelect.selectOption("functional_data_only");

  const exportButton = page.getByRole("button", {
    name: /Exportar paquete portable|Export portable package/i,
  });
  await exportButton.click();

  let latestExportJob:
    | {
        id: number;
        status: string;
        export_scope: string;
      }
    | undefined;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const exportJobsResponse = await page.request.get(
      `${apiOrigin}/tenant/data-export-jobs`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    expect(exportJobsResponse.ok()).toBeTruthy();
    const exportJobsPayload = (await exportJobsResponse.json()) as {
      data: Array<{
        id: number;
        status: string;
        export_scope: string;
      }>;
    };
    latestExportJob = exportJobsPayload.data[0];
    if (latestExportJob?.status === "completed") {
      break;
    }
    await page.waitForTimeout(1000);
  }

  expect(latestExportJob?.status).toBe("completed");
  expect(latestExportJob?.export_scope).toBe("functional_data_only");

  const exportDownloadResponse = await page.request.get(
    `${apiOrigin}/tenant/data-export-jobs/${latestExportJob!.id}/download`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  expect(exportDownloadResponse.ok()).toBeTruthy();
  const contentDisposition =
    exportDownloadResponse.headers()["content-disposition"] || "";
  const fileNameMatch = contentDisposition.match(/filename="([^"]+)"/i);
  const suggestedFileName =
    fileNameMatch?.[1] || `tenant-export-job-${latestExportJob!.id}.zip`;
  const downloadedZipPath = testInfo.outputPath(suggestedFileName);
  await writeFile(downloadedZipPath, await exportDownloadResponse.body());

  const packageInput = page.locator('input[type="file"][accept*=".zip"]');
  await packageInput.setInputFiles(downloadedZipPath);

  const importButton = page.getByRole("button", {
    name: /Simular import portable|Run portable import dry_run/i,
  });
  await importButton.click();

  let latestImportJob:
    | {
        id: number;
        status: string;
        summary_json: string | null;
      }
    | undefined;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const importJobsResponse = await page.request.get(
      `${apiOrigin}/tenant/data-import-jobs`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    expect(importJobsResponse.ok()).toBeTruthy();
    const importJobsPayload = (await importJobsResponse.json()) as {
      data: Array<{
        id: number;
        status: string;
        summary_json: string | null;
      }>;
    };
    latestImportJob = importJobsPayload.data[0];
    if (latestImportJob?.status === "completed") {
      const summary = latestImportJob.summary_json
        ? JSON.parse(latestImportJob.summary_json)
        : null;
      if (
        summary?.mode === "dry_run" &&
        summary?.export_scope === "functional_data_only"
      ) {
        break;
      }
    }
    await page.waitForTimeout(1000);
  }

  expect(latestImportJob?.status).toBe("completed");
  const importSummary = JSON.parse(latestImportJob?.summary_json || "{}");
  expect(importSummary.mode).toBe("dry_run");
  expect(importSummary.export_scope).toBe("functional_data_only");
});
