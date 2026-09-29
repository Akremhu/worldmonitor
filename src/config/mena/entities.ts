/**
 * Canonical MENA entity model.
 *
 * Aliases are retained because Arabic, Persian, Hebrew, Turkish, Kurdish and
 * English reporting may refer to the same entity differently.
 */

export type MenaEntityType =
  | 'person' | 'organization' | 'political_entity' | 'military_entity'
  | 'armed_group' | 'government' | 'company' | 'media'
  | 'infrastructure' | 'location' | 'vessel' | 'aircraft'
  | 'airport' | 'port' | 'energy_asset' | 'financial_entity' | 'other';

export interface MenaEntityName {
  value: string;
  language: string;
  script?: string;
  normalized?: string;
}

export interface MenaEntity {
  id: string;
  canonicalName: string;
  type: MenaEntityType;
  countryCodes: string[];
  names: MenaEntityName[];
  aliases: string[];
  description?: string;
  sourceIds: string[];
  confidence: 'unverified' | 'low' | 'medium' | 'high';
  firstSeenAt?: number;
  lastSeenAt?: number;
  eventIds: string[];
  relatedEntityIds: string[];
  metadata: Record<string, string | number | boolean | null>;
}

export type MenaRelationshipType =
  | 'actor_in' | 'located_in' | 'mentioned_in' | 'related_to'
  | 'operates' | 'owns' | 'allied_with' | 'opposed_to'
  | 'affects' | 'occurred_at' | 'reported_by';

export interface MenaEntityRelationship {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: MenaRelationshipType;
  sourceIds: string[];
  confidence: 'unverified' | 'low' | 'medium' | 'high';
  firstSeenAt: number;
  lastSeenAt: number;
}
