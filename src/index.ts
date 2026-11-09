import { AnalyticsManager } from './manager';
import type {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsProperties,
  PropValue,
  StorageAdapter,
  VeloStoreLike,
} from './types';

// Re-export all types
export * from './types';
export * from './uuid';
export * from './storage';
export * from './platform';
export * from './payload';
export * from './network';
export * from './manager';

// Global singleton instance
const defaultAnalytics = new AnalyticsManager();

/**
 * Returns the default shared AnalyticsManager instance.
 */
export function get(): AnalyticsManager {
  return defaultAnalytics;
}

/**
 * Returns the default shared AnalyticsManager instance.
 */
export function analytics(): AnalyticsManager {
  return defaultAnalytics;
}

/**
 * Initializes analytics using Config, env, or Store.
 */
export function init(
  storeOrConfig?: StorageAdapter | VeloStoreLike | AnalyticsConfig,
  cfg?: AnalyticsConfig
): void {
  defaultAnalytics.init(storeOrConfig, cfg);
}

/** Alias for init */
export const analytics_init = init;

/**
 * Initializes directly without a store instance.
 */
export function initCustom(
  url = '',
  apiKey = '',
  playerId = '',
  appVersion = ''
): void {
  defaultAnalytics.initCustom(url, apiKey, playerId, appVersion);
}

/** Snake_case alias for initCustom */
export const init_custom = initCustom;

/**
 * Updates credentials on the shared analytics singleton.
 */
export function configure(serverUrl?: string, apiKey?: string): void {
  defaultAnalytics.configure(serverUrl, apiKey);
}

/**
 * Manual game loop timer tick.
 */
export function update(dt: number): void {
  defaultAnalytics.update(dt);
}

/** Alias for update */
export const analytics_update = update;

/**
 * Queues an event for batch ingestion.
 */
export function trackEvent(
  name: string,
  level = -1,
  properties: AnalyticsProperties = {}
): void {
  defaultAnalytics.trackEvent(name, level, properties);
}

/** Snake_case alias for trackEvent */
export const track_event = trackEvent;

/**
 * Records attempt start on a level.
 */
export function trackLevelStart(level: number): void {
  defaultAnalytics.trackLevelStart(level);
}

/** Snake_case alias for trackLevelStart */
export const track_level_start = trackLevelStart;

/**
 * Records successful completion of a level.
 */
export function trackLevelComplete(
  level: number,
  durationS: number,
  stars: number,
  score?: number
): void {
  defaultAnalytics.trackLevelComplete(level, durationS, stars, score);
}

/** Snake_case alias for trackLevelComplete */
export const track_level_complete = trackLevelComplete;

/**
 * Records failed attempt or timeout on a level.
 */
export function trackLevelFail(
  level: number,
  durationS: number,
  reason: string
): void {
  defaultAnalytics.trackLevelFail(level, durationS, reason);
}

/** Snake_case alias for trackLevelFail */
export const track_level_fail = trackLevelFail;

/**
 * Records in-app purchase transaction.
 */
export function trackPurchase(sku: string, priceUsd: number, level = -1): void {
  defaultAnalytics.trackPurchase(sku, priceUsd, level);
}

/** Snake_case alias for trackPurchase */
export const track_purchase = trackPurchase;

/**
 * Records advertisement impression.
 */
export function trackAdWatched(
  placement: string,
  adType: string,
  level = -1
): void {
  defaultAnalytics.trackAdWatched(placement, adType, level);
}

/** Snake_case alias for trackAdWatched */
export const track_ad_watched = trackAdWatched;

/**
 * Records tutorial progression.
 */
export function trackTutorialComplete(step: number): void {
  defaultAnalytics.trackTutorialComplete(step);
}

/** Snake_case alias for trackTutorialComplete */
export const track_tutorial_complete = trackTutorialComplete;

/**
 * Records install event.
 */
export function trackInstall(): void {
  defaultAnalytics.trackInstall();
}

/** Snake_case alias for trackInstall */
export const track_install = trackInstall;

/**
 * Records session start.
 */
export function trackSessionStart(): void {
  defaultAnalytics.trackSessionStart();
}

/** Snake_case alias for trackSessionStart */
export const track_session_start = trackSessionStart;

/**
 * Records session end with elapsed duration.
 */
export function trackSessionEnd(durationS: number): void {
  defaultAnalytics.trackSessionEnd(durationS);
}

/** Snake_case alias for trackSessionEnd */
export const track_session_end = trackSessionEnd;

/**
 * Flushes events immediately with keepalive flag.
 */
export function flushSync(): Promise<boolean> {
  return defaultAnalytics.flushSync();
}

/** Snake_case alias for flushSync */
export const flush_sync = flushSync;

/**
 * Triggers batch flush.
 */
export function triggerFlush(): Promise<boolean> {
  return defaultAnalytics.triggerFlush();
}

/** Snake_case alias for triggerFlush */
export const trigger_flush = triggerFlush;

/**
 * Handles suspension / pause.
 */
export function onPause(): void {
  defaultAnalytics.onPause();
}

/** Snake_case alias for onPause */
export const on_pause = onPause;

/**
 * Handles resume / foregrounding.
 */
export function onResume(): void {
  defaultAnalytics.onResume();
}

/** Snake_case alias for onResume */
export const on_resume = onResume;

/**
 * Handles app termination.
 */
export function onAppExit(): void {
  defaultAnalytics.onAppExit();
}

/** Snake_case alias for onAppExit */
export const on_app_exit = onAppExit;

export default defaultAnalytics;
