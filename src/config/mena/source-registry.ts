import {
  MENA_SOURCE_HEALTH_POLICIES,
  type MenaSourceHealthPolicy,
} from './source-health';

export interface MenaSourceRegistryEntry extends MenaSourceHealthPolicy {
  feedKey: string;
  canonical: boolean;
}

export const MENA_SOURCE_REGISTRY: readonly MenaSourceRegistryEntry[] =
  MENA_SOURCE_HEALTH_POLICIES.map((policy) => ({
    ...policy,
    feedKey:
      policy.id === 'sanaa-center' || policy.id === 'yemen-online' || policy.id === 'un-yemen' || policy.id === 'ocha-yemen'
        ? 'yemen'
        : policy.id === 'arab-news' || policy.id === 'the-national'
          ? 'gulf'
          : policy.id === 'irna' || policy.id === 'mehr' || policy.id === 'bbc-persian'
            ? 'iran'
            : policy.id === 'jerusalem-post' || policy.id === 'ynetnews' || policy.id === 'wafa'
              ? 'israelPalestine'
              : policy.id === 'syria-direct' || policy.id === 'rudaw'
                ? 'levant'
                : 'redSea',
    canonical: policy.tier <= 2,
  }));

export function getMenaSourcePolicy(sourceName: string): MenaSourceHealthPolicy | null {
  const normalized = sourceName.trim().toLowerCase();
  return MENA_SOURCE_HEALTH_POLICIES.find(
    (policy) => policy.name.toLowerCase() === normalized || policy.id === normalized,
  ) ?? null;
}
