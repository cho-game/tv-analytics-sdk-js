import type { AnalyticsEvent, BatchPayload, RawAnalyticsEventPayload } from './types';

/**
 * Builds the batch JSON object payload conforming to TV Analytics server specifications.
 */
export function buildBatchPayload(events: AnalyticsEvent[]): BatchPayload {
  const evList: RawAnalyticsEventPayload[] = events.map((e) => {
    const item: RawAnalyticsEventPayload = {
      player_id: e.player_id,
      name: e.name,
      properties: { ...e.properties },
    };

    if (e.session_id) {
      item.session_id = e.session_id;
    }
    if (e.ts) {
      item.ts = e.ts;
    }
    if (e.platform) {
      item.platform = e.platform;
    }
    if (e.app_version) {
      item.app_version = e.app_version;
    }
    if (e.country) {
      item.country = e.country;
    }
    if (typeof e.level === 'number' && e.level >= 0) {
      item.level = e.level;
    }

    return item;
  });

  return { events: evList };
}

/**
 * Serializes batch events to a JSON string.
 */
export function buildBatchJson(events: AnalyticsEvent[]): string {
  return JSON.stringify(buildBatchPayload(events));
}

/** Snake_case alias matching the V SDK */
export const build_batch_json = buildBatchJson;
