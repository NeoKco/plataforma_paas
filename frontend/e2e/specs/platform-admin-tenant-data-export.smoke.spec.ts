import { writeFile } from "node:fs/promises";
import { expect, test } from "../support/test";
import { loginPlatform } from "../support/auth";

const PLATFORM_SESSION_STORAGE_KEY = "platform_paas.platform_session";

async function readPlatformAccessToken(page: Parameters<typeof test>[0]["page"]) {
  const rawSession = await page.evaluate(
    (storageKey) => window.sessionStorage.getItem(storageKey),
    PLATFORM_SESSION_STORAGE_KEY
  );
  if (!rawSession) {
    throw new Error("Platform session storage is empty after login");
  }
  const parsed = JSON.parse(rawSession) as { accessToken?: string };
  if (!parsed.accessToken) {
    throw new Error("Platform access token is missing in session storage");
  }
  return parsed.accessToken;
}

test("platform admin can export and import portable tenant CSV packages from tenants", async ({
  page,
}, testInfo) => {
  await loginPlatform(page);
  await page.goto("/tenants");
  await expect(page).toHaveURL(/\/tenants$/);

  const accessToken = await readPlatformAccessToken(page);
  const apiOrigin = new URL(page.url()).origin;
  const preferredTenantPatterns = [
    "condominio-demo",
    "empresa-bootstrap",
    "empresa-demo",
  ];
  const tenantListResponse = await page.request.get(`${apiOrigin}/platform/tenants/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  expect(tenantListResponse.ok()).toBeTruthy();
  const tenantListPayload = (await tenantListResponse.json()) as {
    data: Array<{
      id: number;
      slug: string;
      db_configured: boolean;
      status: string;
    }>;
  };
  const selectedTenant = preferredTenantPatterns
    .map((slug) =>
      tenantListPayload.data.find(
        (tenant) =>
          tenant.slug === slug &&
          tenant.db_configured &&
          tenant.status !== "archived"
      )
    )
    .find(Boolean);
  expect(selectedTenant).toBeTruthy();

  const tenantCard = page
    .locator(".tenant-list button")
    .filter({ hasText: new RegExp(selectedTenant!.slug, "i") })
    .first();
  await expect(tenantCard).toBeVisible();
  await tenantCard.click();

  const exportButton = page.getByRole("button", {
    name: /Exportar CSV portable|Export portable CSV/i,
  });
  await expect(exportButton).toBeVisible();
  await expect(exportButton).toBeEnabled();
  await expect(
    page.getByText(/Import portable controlado|Controlled portable import/i)
  ).toBeVisible();

  await exportButton.click();

  let latestExportJob:
    | {
        id: number;
        status: string;
      }
    | undefined;
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const exportJobsResponse = await page.request.get(
      `${apiOrigin}/platform/tenants/${selectedTenant!.id}/data-export-jobs`,
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
      }>;
    };
    latestExportJob = exportJobsPayload.data[0];
    if (latestExportJob?.status === "completed") {
      break;
    }
    await page.waitForTimeout(1000);
  }
  expect(latestExportJob?.status).toBe("completed");

  const exportDownloadResponse = await page.request.get(
    `${apiOrigin}/platform/tenants/${selectedTenant!.id}/data-export-jobs/${latestExportJob!.id}/download`,
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
    fileNameMatch?.[1] ||
    `${selectedTenant!.slug}-portable-export-job-${latestExportJob!.id}.zip`;
  expect(suggestedFileName).toMatch(/\.zip$/i);
  const downloadedZipPath = testInfo.outputPath(suggestedFileName);
  await testInfo.attach("portable-export-zip", {
    body: await exportDownloadResponse.body(),
    contentType: "application/zip",
  });
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
      `${apiOrigin}/platform/tenants/${selectedTenant!.id}/data-import-jobs`,
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
        summary?.source_file_name === suggestedFileName
      ) {
        break;
      }
    }
    await page.waitForTimeout(1000);
  }
  expect(latestImportJob?.status).toBe("completed");
  expect(latestImportJob?.summary_json).toBeTruthy();
  const dryRunSummary = JSON.parse(latestImportJob!.summary_json || "{}");
  expect(dryRunSummary.mode).toBe("dry_run");
  expect(dryRunSummary.source_file_name).toBe(suggestedFileName);
  await expect(
    page.getByText(/Últimos imports portables|Latest portable imports/i)
  ).toBeVisible();
  await expect(page.getByText(suggestedFileName)).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/dry_run/i).first()).toBeVisible();

  await packageInput.setInputFiles(downloadedZipPath);
  const dryRunCheckbox = page.getByRole("checkbox", {
    name: /Ejecutar como dry_run|Run as dry_run/i,
  });
  await dryRunCheckbox.uncheck();
  const applyButton = page.getByRole("button", {
    name: /Aplicar import portable|Apply portable import/i,
  });
  await expect(applyButton).toBeEnabled();
  await applyButton.click();

  for (let attempt = 0; attempt < 15; attempt += 1) {
    const importJobsResponse = await page.request.get(
      `${apiOrigin}/platform/tenants/${selectedTenant!.id}/data-import-jobs`,
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
        summary?.mode === "apply" &&
        summary?.source_file_name === suggestedFileName
      ) {
        break;
      }
    }
    await page.waitForTimeout(1000);
  }
  expect(latestImportJob?.status).toBe("completed");
  expect(latestImportJob?.summary_json).toBeTruthy();
  const applySummary = JSON.parse(latestImportJob!.summary_json || "{}");
  expect(applySummary.mode).toBe("apply");
  expect(applySummary.source_file_name).toBe(suggestedFileName);
  await expect(page.getByText(/apply/i).first()).toBeVisible({ timeout: 15000 });
});
