import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import type { TenantBusinessClient } from "../services/clientsService";
import type { TenantBusinessOrganization } from "../services/organizationsService";
import type { TenantSocialCommunityGroup } from "../services/socialCommunityGroupsService";

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function getSocialCommunityGroupByClient(
  client: TenantBusinessClient | null | undefined,
  groupsById: Map<number, TenantSocialCommunityGroup>
): TenantSocialCommunityGroup | null {
  if (!client?.social_community_group_id) {
    return null;
  }
  return groupsById.get(client.social_community_group_id) ?? null;
}

export function getClientSocialCommunityName(
  client: TenantBusinessClient | null | undefined,
  organization: TenantBusinessOrganization | null | undefined,
  groupsById: Map<number, TenantSocialCommunityGroup>,
  options: { fallbackToLegacyLegalName?: boolean } = {}
): string | null {
  const group = getSocialCommunityGroupByClient(client, groupsById);
  const groupName = normalizeNullable(stripLegacyVisibleText(group?.name));
  if (groupName) {
    return groupName;
  }
  if (options.fallbackToLegacyLegalName === false) {
    return null;
  }
  return normalizeNullable(stripLegacyVisibleText(organization?.legal_name));
}
