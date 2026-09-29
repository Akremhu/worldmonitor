export const config = { runtime: 'edge' };

const MAX_LIMIT = 100;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getConvexSiteUrl() {
  return (
    process.env.CONVEX_SITE_URL ||
    process.env.CONVEX_URL ||
    ''
  ).replace(/\/$/, '');
}

function projectRecord(record) {
  const metadata = record?.metadata && typeof record.metadata === 'object'
    ? record.metadata
    : {};

  return {
    id: metadata.eventId || record.dedupeKey?.replace(/^mena:events:/, '') || record.id,
    timestamp: record.occurredAt,
    eventType: metadata.eventType || record.category || 'other',
    title: record.title,
    summary: record.summary,
    location: metadata.location,
    actorIds: Array.isArray(metadata.actorIds) ? metadata.actorIds : [],
    entityIds: Array.isArray(metadata.entityIds) ? metadata.entityIds : [],
    sourceIds: Array.isArray(metadata.sourceIds) ? metadata.sourceIds : [],
    sources: Array.isArray(metadata.sources) ? metadata.sources : [],
    language: metadata.language,
    confidence: metadata.confidence,
    status: metadata.status,
    relatedEventIds: Array.isArray(metadata.relatedEventIds) ? metadata.relatedEventIds : [],
    relatedStoryIds: Array.isArray(metadata.relatedStoryIds) ? metadata.relatedStoryIds : [],
    geometry: metadata.geometry,
    firstSeenAt: metadata.firstSeenAt,
    lastUpdatedAt: metadata.lastUpdatedAt,
    tags: Array.isArray(metadata.tags) ? metadata.tags : [],
    historicalRecordId: record.id,
    dedupeKey: record.dedupeKey,
    runId: record.runId,
    ingestedAt: record.ingestedAt,
  };
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const siteUrl = getConvexSiteUrl();
  const secret = process.env.CONVEX_SERVER_SHARED_SECRET || '';
  if (!siteUrl || !secret) {
    return json({ error: 'HISTORY_BACKEND_NOT_CONFIGURED' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'INVALID_JSON' }, 400);
  }

  const country = typeof body?.country === 'string' && body.country.trim()
    ? body.country.trim()
    : undefined;
  const from = finiteNumber(body?.from);
  const to = finiteNumber(body?.to);
  const requestedLimit = finiteNumber(body?.limit);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(requestedLimit ?? 50)));

  const upstream = await fetch(`${siteUrl}/api/internal-intel-timeline`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-convex-shared-secret': secret,
    },
    body: JSON.stringify({
      domain: 'mena',
      country,
      from,
      to,
      limit,
    }),
  });

  let payload;
  try {
    payload = await upstream.json();
  } catch {
    return json({ error: 'HISTORY_BACKEND_INVALID_RESPONSE' }, 502);
  }

  if (!upstream.ok) {
    return json({
      error: 'HISTORY_BACKEND_ERROR',
      detail: payload?.error || 'Historical query failed',
    }, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502);
  }

  return json({
    records: Array.isArray(payload?.records) ? payload.records.map(projectRecord) : [],
    partial: payload?.partial === true,
  });
}
