import {
  test as base,
  expect,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

export { expect };
export type { Locator, Page, TestInfo };

export const test = base;

async function buildErrorContext(page: Page, testInfo: TestInfo): Promise<string> {
  const lines: string[] = [
    `# Error context`,
    "",
    `- title: ${testInfo.title}`,
    `- file: ${testInfo.file}`,
    `- project: ${testInfo.project.name}`,
    `- retry: ${testInfo.retry}`,
    `- status: ${testInfo.status}`,
    `- expectedStatus: ${testInfo.expectedStatus}`,
    "",
  ];

  try {
    lines.push(`- url: ${page.url() || "unavailable"}`);
  } catch {
    lines.push(`- url: unavailable`);
  }

  try {
    lines.push(`- pageClosed: ${page.isClosed()}`);
  } catch {
    lines.push(`- pageClosed: unknown`);
  }

  try {
    const title = await page.title();
    lines.push(`- pageTitle: ${title || "(empty)"}`);
  } catch {
    lines.push(`- pageTitle: unavailable`);
  }

  try {
    const visibleHeadings = await page
      .locator('h1, h2, h3, [role="heading"]')
      .filter({ hasText: /\S/ })
      .evaluateAll((elements) =>
        elements
          .map((element) => element.textContent?.trim() ?? "")
          .filter(Boolean)
          .slice(0, 12)
      );
    lines.push(`- visibleHeadings: ${visibleHeadings.join(" | ") || "none"}`);
  } catch {
    lines.push(`- visibleHeadings: unavailable`);
  }

  try {
    const dialogs = await page.locator('[role="dialog"]').evaluateAll((elements) =>
      elements
        .map((element) => {
          const label =
            element.getAttribute("aria-label") ??
            element.querySelector("h1, h2, h3, [role='heading']")?.textContent ??
            "";
          return label.trim();
        })
        .filter(Boolean)
        .slice(0, 8)
    );
    lines.push(`- openDialogs: ${dialogs.join(" | ") || "none"}`);
  } catch {
    lines.push(`- openDialogs: unavailable`);
  }

  lines.push("", "## Storage state", "");
  try {
    const storageState = await page.context().storageState();
    lines.push("```json");
    lines.push(JSON.stringify(storageState, null, 2));
    lines.push("```");
  } catch {
    lines.push("Storage state unavailable.");
  }

  return lines.join("\n");
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) {
    return;
  }

  const body = await buildErrorContext(page, testInfo);
  await testInfo.attach("error-context", {
    body,
    contentType: "text/markdown",
  });
});
