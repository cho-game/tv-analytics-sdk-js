import { describe, expect, it, beforeEach } from 'bun:test';
import {
  AnalyticsManager,
  MemoryStorageAdapter,
  buildBatchJson,
  buildBatchPayload,
  type AnalyticsEvent,
} from '../src';

describe('TV Analytics SDK (JS / TS)', () => {
  describe('Serialization (buildBatchJson & buildBatchPayload)', () => {
    it('serializes events conforming to backend specification', () => {
      const events: AnalyticsEvent[] = [
        {
          player_id: 'p_test123',
          session_id: 's_test456',
          name: 'level_complete',
          level: 1,
          ts: '2026-10-26T08:00:00.000Z',
          platform: 'macos',
          app_version: '1.0.0',
          country: 'VN',
          properties: {
            duration_s: 45,
            stars: 3,
            score: 1500,
          },
        },
        {
          player_id: 'p_test123',
          session_id: 's_test456',
          name: 'level_fail',
          level: 2,
          ts: '2026-10-26T08:02:00.000Z',
          platform: 'macos',
          app_version: '1.0.0',
          properties: {
            duration_s: 30,
            reason: 'timeout',
          },
        },
      ];

      const rawJson = buildBatchJson(events);
      expect(rawJson).toContain('"events":');
      expect(rawJson).toContain('"name":"level_complete"');
      expect(rawJson).toContain('"player_id":"p_test123"');
      expect(rawJson).toContain('"level":1');
      expect(rawJson).toContain('"stars":3');
      expect(rawJson).toContain('"score":1500');
      expect(rawJson).toContain('"name":"level_fail"');
      expect(rawJson).toContain('"reason":"timeout"');

      const parsed = JSON.parse(rawJson);
      expect(parsed.events).toHaveLength(2);
      expect(parsed.events[0].player_id).toBe('p_test123');
      expect(parsed.events[0].name).toBe('level_complete');
      expect(parsed.events[0].country).toBe('VN');
      expect(parsed.events[1].country).toBeUndefined(); // omitted if empty
      expect(parsed.events[1].properties.reason).toBe('timeout');
    });

    it('omits level when negative or omitted', () => {
      const events: AnalyticsEvent[] = [
        {
          player_id: 'p_1',
          session_id: 's_1',
          name: 'install',
          level: -1,
          ts: '2026-10-26T08:00:00.000Z',
          platform: 'web',
          app_version: '1.0.0',
          properties: { first_open: true },
        },
      ];

      const payload = buildBatchPayload(events);
      expect(payload.events[0]?.level).toBeUndefined();
      expect(JSON.stringify(payload)).not.toContain('"level"');
    });
  });

  describe('AnalyticsManager Init & Queuing', () => {
    let storage: MemoryStorageAdapter;
    let manager: AnalyticsManager;

    beforeEach(() => {
      storage = new MemoryStorageAdapter();
      manager = new AnalyticsManager();
    });

    it('initializes with storage, generates p_ UUID and s_ UUID', () => {
      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
      });

      expect(manager.isInited).toBe(true);
      expect(manager.playerId.startsWith('p_')).toBe(true);
      expect(manager.sessionId.startsWith('s_')).toBe(true);
      expect(storage.getItem('analytics_player_id')).toBe(manager.playerId);

      // Verify install and session_start were queued on new install
      expect(manager.queue.length).toBeGreaterThanOrEqual(2);
      expect(manager.queue[0]?.name).toBe('install');
      expect(manager.queue[0]?.properties.first_open).toBe(true);
      expect(manager.queue[1]?.name).toBe('session_start');
    });

    it('reuses existing player_id from storage and skips install event', () => {
      storage.setItem('analytics_player_id', 'p_existing_user_999');

      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
      });

      expect(manager.playerId).toBe('p_existing_user_999');
      // Should queue session_start, but NOT install
      expect(manager.queue.length).toBe(1);
      expect(manager.queue[0]?.name).toBe('session_start');
    });

    it('tracks game events correctly (level_start, level_complete, level_fail)', () => {
      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
      });

      // Track level start
      manager.trackLevelStart(1);
      let lastEv = manager.queue[manager.queue.length - 1];
      expect(lastEv?.name).toBe('level_start');
      expect(lastEv?.level).toBe(1);

      // Track level complete
      manager.trackLevelComplete(1, 42, 3, 1200);
      lastEv = manager.queue[manager.queue.length - 1];
      expect(lastEv?.name).toBe('level_complete');
      expect(lastEv?.level).toBe(1);
      expect(lastEv?.properties.duration_s).toBe(42);
      expect(lastEv?.properties.stars).toBe(3);
      expect(lastEv?.properties.score).toBe(1200);

      // Track level fail
      manager.trackLevelFail(2, 35, 'timeout');
      lastEv = manager.queue[manager.queue.length - 1];
      expect(lastEv?.name).toBe('level_fail');
      expect(lastEv?.level).toBe(2);
      expect(lastEv?.properties.duration_s).toBe(35);
      expect(lastEv?.properties.reason).toBe('timeout');
    });

    it('tracks purchase, ad_watched, tutorial_complete, and custom events', () => {
      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
      });

      manager.trackPurchase('gold_pack_medium', 4.99, 5);
      let ev = manager.queue[manager.queue.length - 1];
      expect(ev?.name).toBe('purchase');
      expect(ev?.level).toBe(5);
      expect(ev?.properties.sku).toBe('gold_pack_medium');
      expect(ev?.properties.price_usd).toBe(4.99);

      manager.trackAdWatched('rewarded_revive', 'rewarded_video', 5);
      ev = manager.queue[manager.queue.length - 1];
      expect(ev?.name).toBe('ad_watched');
      expect(ev?.properties.placement).toBe('rewarded_revive');
      expect(ev?.properties.ad_type).toBe('rewarded_video');

      manager.trackTutorialComplete(3);
      ev = manager.queue[manager.queue.length - 1];
      expect(ev?.name).toBe('tutorial_complete');
      expect(ev?.properties.step).toBe(3);

      manager.trackEvent('custom_skin_equip', 5, { skin_id: 'dragon_blade', is_vip: true });
      ev = manager.queue[manager.queue.length - 1];
      expect(ev?.name).toBe('custom_skin_equip');
      expect(ev?.properties.skin_id).toBe('dragon_blade');
      expect(ev?.properties.is_vip).toBe(true);
    });

    it('supports snake_case aliases for exact compatibility with V SDK', () => {
      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
      });

      manager.track_level_start(10);
      manager.track_level_complete(10, 50, 2, 900);
      manager.track_level_fail(11, 20, 'boss_attack');
      manager.track_purchase('gem_box', 9.99, 10);
      manager.track_ad_watched('banner_main', 'banner', 10);
      manager.track_tutorial_complete(5);

      const names = manager.queue.slice(-6).map((e) => e.name);
      expect(names).toEqual([
        'level_start',
        'level_complete',
        'level_fail',
        'purchase',
        'ad_watched',
        'tutorial_complete',
      ]);
    });

    it('enforces max queue size by dropping oldest events', () => {
      manager.init({
        storage,
        maxQueueSize: 10,
        autoTimer: false,
        autoLifecycle: false,
      });

      // Clear initial events
      manager.queue = [];

      for (let i = 1; i <= 15; i++) {
        manager.trackEvent(`event_${i}`);
      }

      expect(manager.queue.length).toBe(10);
      expect(manager.queue[0]?.name).toBe('event_6');
      expect(manager.queue[manager.queue.length - 1]?.name).toBe('event_15');
    });

    it('supports update(dt) manual game loop flush trigger', async () => {
      let flushed = false;
      const mockFetch: typeof fetch = (async () => {
        flushed = true;
        return new Response('{}', { status: 200 });
      }) as unknown as typeof fetch;

      manager.init({
        storage,
        flushInterval: 2.0,
        autoTimer: false,
        autoLifecycle: false,
        fetch: mockFetch,
      });

      manager.trackEvent('game_event');
      expect(flushed).toBe(false);

      // Advance by 1 second
      manager.update(1.0);
      expect(flushed).toBe(false);

      // Advance by another 1.2 seconds -> triggers flush
      manager.update(1.2);
      // Give async microtask a cycle
      await new Promise((r) => setTimeout(r, 10));
      expect(flushed).toBe(true);
    });
  });

  describe('Network Delivery & Batch Flushing', () => {
    let storage: MemoryStorageAdapter;
    let manager: AnalyticsManager;

    beforeEach(() => {
      storage = new MemoryStorageAdapter();
      manager = new AnalyticsManager();
    });

    it('sends events via HTTP POST with correct headers and removes them from queue on 200', async () => {
      let sentUrl = '';
      let sentApiKey = '';
      let sentBody = '';

      const mockFetch: typeof fetch = (async (url: string, init?: RequestInit) => {
        sentUrl = url;
        sentApiKey = (init?.headers as Record<string, string>)?.['X-API-Key'] ?? '';
        sentBody = (init?.body as string) ?? '';
        return new Response('{"ok":true}', { status: 200 });
      }) as unknown as typeof fetch;

      manager.init({
        storage,
        serverUrl: 'https://test-analytics.example.com/api/events',
        apiKey: 'pk_secret_12345',
        autoTimer: false,
        autoLifecycle: false,
        fetch: mockFetch,
      });

      const queueCountBefore = manager.queue.length;
      expect(queueCountBefore).toBeGreaterThan(0);

      const ok = await manager.triggerFlush();
      expect(ok).toBe(true);
      expect(sentUrl).toBe('https://test-analytics.example.com/api/events');
      expect(sentApiKey).toBe('pk_secret_12345');

      const parsed = JSON.parse(sentBody);
      expect(parsed.events.length).toBe(queueCountBefore);
      // Queue should now be empty
      expect(manager.queue.length).toBe(0);
    });

    it('keeps events in queue on server error to retry later', async () => {
      const mockFetch: typeof fetch = (async () => {
        return new Response('Server Error', { status: 500 });
      }) as unknown as typeof fetch;

      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
        fetch: mockFetch,
      });

      const initialCount = manager.queue.length;
      const ok = await manager.triggerFlush();
      expect(ok).toBe(false);
      // Events should remain in queue
      expect(manager.queue.length).toBe(initialCount);
    });
  });

  describe('Lifecycle (Pause, Resume, Exit)', () => {
    it('creates session_end on onPause and generates new session_id on onResume', () => {
      const storage = new MemoryStorageAdapter();
      const manager = new AnalyticsManager();

      manager.init({
        storage,
        autoTimer: false,
        autoLifecycle: false,
      });

      const initialSessionId = manager.sessionId;
      expect(initialSessionId.startsWith('s_')).toBe(true);

      // Trigger pause
      manager.onPause();
      const lastEv = manager.queue[manager.queue.length - 1];
      expect(lastEv?.name).toBe('session_end');
      expect(typeof lastEv?.properties.duration_s).toBe('number');

      // Trigger resume
      manager.onResume();
      expect(manager.sessionId).not.toBe(initialSessionId);
      expect(manager.sessionId.startsWith('s_')).toBe(true);

      const resumeEv = manager.queue[manager.queue.length - 1];
      expect(resumeEv?.name).toBe('session_start');
    });
  });
});
