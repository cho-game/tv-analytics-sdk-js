import type {
  AnalyticsConfig,
  AnalyticsEvent,
  AnalyticsProperties,
  PropValue,
  StorageAdapter,
  VeloStoreLike,
} from './types';
import { generateUUID } from './uuid';
import { createDefaultStorage, wrapStore } from './storage';
import { detectPlatform } from './platform';
import { buildBatchJson } from './payload';
import { sendHttpPost } from './network';

export class AnalyticsManager {
  public serverUrl = 'https://analytics.vinazon.vn/api/events';
  public apiKey = 'YOUR_PROJECT_API_KEY';
  public playerId = '';
  public sessionId = '';
  public sessionStartTime = 0; // timestamp in ms
  public platform = '';
  public appVersion = '1.0.0';
  public country = '';
  public flushInterval = 15.0; // seconds
  public maxBatchSize = 50;
  public maxQueueSize = 1000;
  public flushTimer = 0; // for manual update(dt)
  public queue: AnalyticsEvent[] = [];
  public isSending = false;
  public isInited = false;
  public hasExited = false;

  private storage: StorageAdapter = createDefaultStorage();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private autoTimer = true;
  private autoLifecycle = true;
  private fetchFn?: typeof globalThis.fetch;
  private lifecycleCleanups: Array<() => void> = [];

  /**
   * Initializes the manager with configuration, persistent player_id, and fires install/session_start.
   * Can accept either (config: AnalyticsConfig) or (store: VeloStoreLike | StorageAdapter, config?: AnalyticsConfig).
   */
  public init(
    storeOrConfig?: StorageAdapter | VeloStoreLike | AnalyticsConfig,
    maybeConfig?: AnalyticsConfig
  ): void {
    if (this.isInited) {
      return;
    }

    let cfg: AnalyticsConfig = {};
    if (storeOrConfig) {
      if (
        'getItem' in storeOrConfig ||
        'get_string' in storeOrConfig ||
        'getString' in storeOrConfig
      ) {
        this.storage = wrapStore(storeOrConfig as StorageAdapter | VeloStoreLike);
        cfg = maybeConfig || {};
      } else {
        cfg = storeOrConfig as AnalyticsConfig;
        if (cfg.storage) {
          this.storage = wrapStore(cfg.storage);
        }
      }
    }

    // 1. Determine Server URL
    let url = cfg.serverUrl || cfg.server_url || '';
    if (!url && typeof process !== 'undefined' && process.env) {
      url = process.env.ANALYTICS_SERVER_URL || '';
    }
    if (!url) {
      url = this.storage.getItem('analytics_server_url') || '';
    }
    if (!url) {
      url = 'https://analytics.vinazon.vn/api/events';
    }

    // 2. Determine API Key
    let key = cfg.apiKey || cfg.api_key || '';
    if (!key && typeof process !== 'undefined' && process.env) {
      key = process.env.ANALYTICS_API_KEY || '';
    }
    if (!key) {
      key = this.storage.getItem('analytics_api_key') || '';
    }
    if (!key) {
      key = 'YOUR_PROJECT_API_KEY';
    }

    // Cache to storage for future runs
    if (url && this.storage.getItem('analytics_server_url') !== url) {
      this.storage.setItem('analytics_server_url', url);
    }
    if (key && key !== 'YOUR_PROJECT_API_KEY' && this.storage.getItem('analytics_api_key') !== key) {
      this.storage.setItem('analytics_api_key', key);
    }

    // 3. Platform & App Version
    this.platform = cfg.platform || detectPlatform();
    this.appVersion = cfg.appVersion || cfg.app_version || '1.0.0';
    this.country = cfg.country || '';

    // Batching options
    if (typeof (cfg.flushInterval ?? cfg.flush_interval) === 'number') {
      this.flushInterval = (cfg.flushInterval ?? cfg.flush_interval)!;
    }
    if (typeof (cfg.maxBatchSize ?? cfg.max_batch_size) === 'number') {
      this.maxBatchSize = (cfg.maxBatchSize ?? cfg.max_batch_size)!;
    }
    if (typeof (cfg.maxQueueSize ?? cfg.max_queue_size) === 'number') {
      this.maxQueueSize = (cfg.maxQueueSize ?? cfg.max_queue_size)!;
    }
    if (typeof cfg.autoTimer === 'boolean') {
      this.autoTimer = cfg.autoTimer;
    }
    if (typeof cfg.autoLifecycle === 'boolean') {
      this.autoLifecycle = cfg.autoLifecycle;
    }
    if (cfg.fetch) {
      this.fetchFn = cfg.fetch;
    }

    // 4. Persistent Player ID
    let pid = cfg.playerId || cfg.player_id || this.storage.getItem('analytics_player_id') || '';
    let isNew = false;
    if (!pid) {
      pid = 'p_' + generateUUID();
      this.storage.setItem('analytics_player_id', pid);
      isNew = true;
    }

    // 5. Session ID and start time
    const sid = 's_' + generateUUID();
    const now = Date.now();

    this.serverUrl = url;
    this.apiKey = key;
    this.playerId = pid;
    this.sessionId = sid;
    this.sessionStartTime = now;
    this.isInited = true;

    // Attach lifecycle listeners
    if (this.autoLifecycle) {
      this.attachLifecycleListeners();
    }

    // Start auto-flush timer
    if (this.autoTimer && this.flushInterval > 0) {
      this.startTimer();
    }

    // 6. Track initial install if first open
    if (isNew) {
      this.trackInstall();
    }

    // 7. Track session start
    this.trackSessionStart();
  }

  /**
   * Initializes without requiring a store or config object.
   */
  public initCustom(
    url = '',
    apiKey = '',
    playerId = '',
    appVersion = ''
  ): void {
    if (this.isInited) {
      return;
    }

    const sid = 's_' + generateUUID();
    const pid = playerId ? playerId : 'p_' + generateUUID();
    const ver = appVersion ? appVersion : '1.0.0';

    this.serverUrl = url ? url : 'https://analytics.vinazon.vn/api/events';
    this.apiKey = apiKey ? apiKey : 'YOUR_PROJECT_API_KEY';
    this.platform = detectPlatform();
    this.appVersion = ver;
    this.playerId = pid;
    this.sessionId = sid;
    this.sessionStartTime = Date.now();
    this.isInited = true;

    if (this.autoLifecycle) {
      this.attachLifecycleListeners();
    }

    if (this.autoTimer && this.flushInterval > 0) {
      this.startTimer();
    }

    this.trackSessionStart();
  }

  /**
   * Ensures the manager is initialized.
   */
  public ensureInited(
    storeOrConfig?: StorageAdapter | VeloStoreLike | AnalyticsConfig,
    maybeConfig?: AnalyticsConfig
  ): void {
    if (!this.isInited) {
      this.init(storeOrConfig, maybeConfig);
    }
  }

  /**
   * Updates server credentials.
   */
  public configure(serverUrl?: string, apiKey?: string): void {
    if (serverUrl) {
      this.serverUrl = serverUrl;
    }
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  /**
   * Manual game-loop update tick (in seconds).
   */
  public update(dt: number): void {
    if (!this.isInited) {
      return;
    }
    this.flushTimer += dt;
    if (this.flushTimer >= this.flushInterval) {
      this.flushTimer = 0;
      void this.triggerFlush();
    }
  }

  /**
   * Queues an analytics event for batch ingestion.
   */
  public trackEvent(
    name: string,
    level = -1,
    properties: AnalyticsProperties = {}
  ): void {
    if (!this.isInited) {
      return;
    }

    const ev: AnalyticsEvent = {
      player_id: this.playerId,
      session_id: this.sessionId,
      name,
      ts: new Date().toISOString(),
      platform: this.platform,
      app_version: this.appVersion,
      country: this.country,
      level,
      properties: { ...properties },
    };

    this.queue.push(ev);

    // Evict oldest if exceeding max queue
    if (this.queue.length > this.maxQueueSize) {
      this.queue.splice(0, this.queue.length - this.maxQueueSize);
    }

    // Flush if batch size reached
    if (this.queue.length >= this.maxBatchSize) {
      void this.triggerFlush();
    }
  }

  /**
   * Records first launch / install on this client.
   */
  public trackInstall(): void {
    this.trackEvent('install', -1, { first_open: true });
  }

  /**
   * Records session launch.
   */
  public trackSessionStart(): void {
    this.trackEvent('session_start', -1, {});
  }

  /**
   * Records session completion with elapsed duration.
   */
  public trackSessionEnd(durationS: number): void {
    this.trackEvent('session_end', -1, {
      duration_s: Math.max(0, Math.floor(durationS)),
    });
  }

  /**
   * Records attempt start on a level.
   */
  public trackLevelStart(level: number): void {
    this.trackEvent('level_start', level, {});
  }

  /**
   * Records successful completion of a level.
   */
  public trackLevelComplete(
    level: number,
    durationS: number,
    stars: number,
    score?: number
  ): void {
    const props: AnalyticsProperties = {
      duration_s: Math.max(0, Math.floor(durationS)),
      stars,
    };
    if (typeof score === 'number' && score > 0) {
      props.score = score;
    }
    this.trackEvent('level_complete', level, props);
  }

  /**
   * Records failed attempt or timeout on a level.
   */
  public trackLevelFail(
    level: number,
    durationS: number,
    reason: string
  ): void {
    this.trackEvent('level_fail', level, {
      duration_s: Math.max(0, Math.floor(durationS)),
      reason,
    });
  }

  /**
   * Records an in-app purchase transaction.
   */
  public trackPurchase(sku: string, priceUsd: number, level = -1): void {
    this.trackEvent('purchase', level, {
      sku,
      price_usd: priceUsd,
    });
  }

  /**
   * Records an advertisement impression.
   */
  public trackAdWatched(
    placement: string,
    adType: string,
    level = -1
  ): void {
    this.trackEvent('ad_watched', level, {
      placement,
      ad_type: adType,
    });
  }

  /**
   * Records tutorial progression.
   */
  public trackTutorialComplete(step: number): void {
    this.trackEvent('tutorial_complete', -1, { step });
  }

  /**
   * Asynchronously triggers a batch flush of queued events.
   */
  public async triggerFlush(keepalive = false): Promise<boolean> {
    if (this.isSending || this.queue.length === 0) {
      return false;
    }

    this.isSending = true;
    const count = Math.min(this.queue.length, this.maxBatchSize);
    const batch = this.queue.slice(0, count);
    const url = this.serverUrl;
    const key = this.apiKey;
    const payload = buildBatchJson(batch);

    try {
      const ok = await sendHttpPost({
        url,
        apiKey: key,
        body: payload,
        keepalive,
        fetchFn: this.fetchFn,
      });

      if (this.hasExited && !ok) {
        this.isSending = false;
        return false;
      }

      if (ok) {
        this.queue.splice(0, count);
      } else {
        if (typeof console !== 'undefined') {
          console.error(
            `[Analytics] Flush failed, ${count} events will retry on next interval`
          );
        }
      }
      this.isSending = false;
      return ok;
    } catch (err) {
      this.isSending = false;
      if (typeof console !== 'undefined') {
        console.error('[Analytics] Flush error:', err);
      }
      return false;
    }
  }

  /**
   * Flushes queued events with keepalive flag enabled.
   */
  public async flushSync(): Promise<boolean> {
    return this.triggerFlush(true);
  }

  /**
   * Alias for triggerFlush.
   */
  public async flush(): Promise<boolean> {
    return this.triggerFlush(false);
  }

  /**
   * Handles game suspension / backgrounding:
   * Records session duration and triggers a flush.
   */
  public onPause(): void {
    if (!this.isInited) {
      return;
    }
    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    this.trackSessionEnd(duration);
    void this.flushSync();
  }

  /**
   * Handles game foregrounding / resume:
   * Generates a new session ID and records session_start.
   */
  public onResume(): void {
    if (!this.isInited) {
      return;
    }
    this.sessionId = 's_' + generateUUID();
    this.sessionStartTime = Date.now();
    this.trackSessionStart();
  }

  /**
   * Handles app termination:
   * Records session_end and triggers synchronous keepalive flush.
   */
  public onAppExit(): void {
    if (!this.isInited || this.hasExited) {
      return;
    }
    this.hasExited = true;
    this.stopTimer();

    const duration = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    this.trackSessionEnd(duration);
    void this.flushSync();
  }

  /**
   * Starts background interval timer for periodic flushing.
   */
  private startTimer(): void {
    this.stopTimer();
    const intervalMs = Math.max(1000, Math.floor(this.flushInterval * 1000));
    this.timerId = setInterval(() => {
      void this.triggerFlush();
    }, intervalMs);
    // Don't keep Node process alive just for the flush timer
    if (
      this.timerId &&
      typeof this.timerId === 'object' &&
      'unref' in this.timerId &&
      typeof (this.timerId as { unref: () => void }).unref === 'function'
    ) {
      (this.timerId as { unref: () => void }).unref();
    }
  }

  /**
   * Stops background flush timer.
   */
  private stopTimer(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Attaches browser/node lifecycle event listeners.
   */
  private attachLifecycleListeners(): void {
    // Browser environment
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const handleVisibilityChange = (): void => {
        if (document.visibilityState === 'hidden') {
          this.onPause();
        } else if (document.visibilityState === 'visible') {
          this.onResume();
        }
      };

      const handleBeforeUnload = (): void => {
        this.onAppExit();
      };

      const handlePageHide = (): void => {
        this.onPause();
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);

      this.lifecycleCleanups.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handlePageHide);
      });
    }

    // Node / Bun process environment
    if (typeof process !== 'undefined' && typeof process.on === 'function') {
      const handleExit = (): void => {
        this.onAppExit();
      };

      process.on('beforeExit', handleExit);
      process.on('exit', handleExit);

      this.lifecycleCleanups.push(() => {
        process.off('beforeExit', handleExit);
        process.off('exit', handleExit);
      });
    }
  }

  /**
   * Resets internal state (useful for unit testing).
   */
  public reset(): void {
    this.stopTimer();
    for (const cleanup of this.lifecycleCleanups) {
      try {
        cleanup();
      } catch {
        // ignore
      }
    }
    this.lifecycleCleanups = [];
    this.queue = [];
    this.isSending = false;
    this.isInited = false;
    this.hasExited = false;
    this.playerId = '';
    this.sessionId = '';
    this.sessionStartTime = 0;
    this.flushTimer = 0;
  }

  // --- Snake_case aliases for exact parity with the V SDK ---
  public init_custom = this.initCustom;
  public track_event = this.trackEvent;
  public track_install = this.trackInstall;
  public track_session_start = this.trackSessionStart;
  public track_session_end = this.trackSessionEnd;
  public track_level_start = this.trackLevelStart;
  public track_level_complete = this.trackLevelComplete;
  public track_level_fail = this.trackLevelFail;
  public track_purchase = this.trackPurchase;
  public track_ad_watched = this.trackAdWatched;
  public track_tutorial_complete = this.trackTutorialComplete;
  public trigger_flush = this.triggerFlush;
  public flush_sync = this.flushSync;
  public on_pause = this.onPause;
  public on_resume = this.onResume;
  public on_app_exit = this.onAppExit;
}
