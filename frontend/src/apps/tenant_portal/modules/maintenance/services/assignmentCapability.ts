import type { TenantBusinessTaskType } from "../../business_core/services/taskTypesService";

const ALLOWED_PROFILES_PATTERN = /(?:^|\n)\s*(?:profiles|compat_profiles)\s*:\s*([^\n]+)/i;

export function normalizeCapabilityToken(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseTaskTypeAllowedProfileNames(description: string | null | undefined): string[] {
  if (!description) {
    return [];
  }
  const match = description.match(ALLOWED_PROFILES_PATTERN);
  if (!match?.[1]) {
    return [];
  }
  return match[1]
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stripTaskTypeAllowedProfilesMetadata(
  description: string | null | undefined
): string | null {
  if (!description) {
    return null;
  }
  const sanitized = description
    .split("\n")
    .filter((line) => !/^\s*(?:profiles|compat_profiles)\s*:/i.test(line))
    .join("\n")
    .trim();
  return sanitized || null;
}

export function buildTaskTypeDescriptionWithAllowedProfiles(
  description: string | null | undefined,
  allowedProfileNames: string[]
): string | null {
  void allowedProfileNames;
  return stripTaskTypeAllowedProfilesMetadata(description);
}

export function getTaskTypeAllowedProfileNames(taskType: TenantBusinessTaskType | null | undefined): string[] {
  if (taskType?.compatible_function_profile_names?.length) {
    return taskType.compatible_function_profile_names;
  }
  return parseTaskTypeAllowedProfileNames(taskType?.description);
}

export function isTaskTypeMembershipCompatible(
  taskType: TenantBusinessTaskType | null | undefined,
  functionProfileName: string | null | undefined
): boolean {
  const allowedProfileNames = getTaskTypeAllowedProfileNames(taskType);
  if (!taskType) {
    return true;
  }
  if (!functionProfileName) {
    return false;
  }
  if (allowedProfileNames.length === 0) {
    return true;
  }
  const normalizedProfileName = normalizeCapabilityToken(functionProfileName);
  return allowedProfileNames.some(
    (item) => normalizeCapabilityToken(item) === normalizedProfileName
  );
}