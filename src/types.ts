/**
 * Custom property value supported in analytics events.
 */
export type PropValue = boolean | number | string;

/**
 * Custom properties map for events.
 */
export type AnalyticsProperties = Record<string, PropValue>;

/**
 * Individual analytics event representation.
 */
export interface AnalyticsEvent {
  player_id: string;
  session_id: string;
  name: string;
  ts: string;
  platform: string;
  app_version: string;
  country?: string;
  level?: number;
  properties: AnalyticsProperties;
}

/**
 * Raw wire payload for individual event sent in batch.
 */
export interface RawAnalyticsEventPayload {
  player_id: string;
  name: string;
  session_id?: string;
  ts?: string;
  platform?: string;
  app_version?: string;
  country?: string;
  level?: number;
  properties: Record<string, PropValue>;
}

/**
 * Root batch JSON structure.
 */
export interface BatchPayload {
  events: RawAnalyticsEventPayload[];
}

/**
 * Generic storage adapter interface for persisting player ID and settings.
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

/**
 * Compatibility interface for Velo-like Store objects.
 */
export interface VeloStoreLike {
  get_string?(key: string, fallback?: string): string;
  getString?(key: string, fallback?: string): string;
  set_string?(key: string, value: string): void;
  setString?(key: string, value: string): void;
  save?(): void;
}

/**
 * Configuration options for initializing AnalyticsManager.
 */
export interface AnalyticsConfig {
  /** Server endpoint URL (default: 'https://analytics.vinazon.vn/api/events') */
  serverUrl?: string;
  server_url?: string;

  /** Project API key for authentication via X-API-Key header */
  apiKey?: string;
  api_key?: string;

  /** Player identifier. If omitted, will be restored from storage or generated as p_<uuid> */
  playerId?: string;
  player_id?: string;

  /** Application version (default: '1.0.0') */
  appVersion?: string;
  app_version?: string;

  /** Platform string override (e.g. 'web', 'ios', 'android', 'desktop', 'macos', etc.) */
  platform?: string;

  /** Country code (ISO 3166-1 alpha-2, e.g. 'VN', 'US') */
  country?: string;

  /** Flush interval in seconds (default: 15.0) */
  flushInterval?: number;
  flush_interval?: number;

  /** Maximum events per batch flush (default: 50) */
  maxBatchSize?: number;
  max_batch_size?: number;

  /** Maximum queued events before oldest are dropped (default: 1000) */
  maxQueueSize?: number;
  max_queue_size?: number;

  /** Automatically run periodic flush timer in background (default: true) */
  autoTimer?: boolean;

  /** Automatically attach lifecycle listeners (pagehide, beforeunload, visibilitychange, process exit) (default: true) */
  autoLifecycle?: boolean;

  /** Storage adapter to persist player_id and config */
  storage?: StorageAdapter | VeloStoreLike;

  /** Custom fetch function (default: globalThis.fetch) */
  fetch?: typeof globalThis.fetch;
}
