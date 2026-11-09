# TV Analytics SDK for JavaScript & TypeScript

SDK phân tích và theo dõi sự kiện (Analytics Client SDK) đa nền tảng dành cho game và ứng dụng web / server viết bằng **TypeScript** và **JavaScript**, quản lý bằng **Bun**.

Hỗ trợ native:

- **Web Browsers**: Tự động sử dụng `fetch` với cờ `keepalive: true` và `localStorage` để lưu `player_id`. Tự động lắng nghe `visibilitychange`, `pagehide`, `beforeunload` để gửi sự kiện ngay cả khi đóng tab / ẩn ứng dụng.
- **Game Engines (Phaser, PixiJS, Babylon.js, Three.js, Cocos Creator, Canvas HTML5)**: Hỗ trợ cả cơ chế tự động theo chu kỳ (background interval) hoặc cập nhật theo frame loop của game engine qua `analytics.update(dt)`.
- **Node.js & Bun Server**: Hỗ trợ môi trường server-side, tự động đọc biến môi trường và hook vào `process.on('exit')` / `process.on('beforeExit')`.
- **Hỗ trợ song song cả 2 phong cách gọi**: `camelCase` (chuẩn JS/TS) và `snake_case` (100% tương thích mã nguồn bản [V SDK](https://github.com/cho-game/tv-analytics-sdk)).

---

## 1. Cài đặt

### Sử dụng Bun (Khuyến nghị)

```bash
bun add tv-analytics-sdk-js
```

Hoặc cài trực tiếp từ Git repository:

```bash
bun add github:cho-game/tv-analytics-sdk-js
```

### Sử dụng npm / pnpm / yarn

```bash
npm install tv-analytics-sdk-js
# hoặc
pnpm add tv-analytics-sdk-js
# hoặc
yarn add tv-analytics-sdk-js
```

---

## 2. Cấu hình

SDK tìm kiếm `serverUrl` và `apiKey` theo thứ tự ưu tiên:

1. Tham số `AnalyticsConfig` truyền trực tiếp vào `init(config)` hoặc `initCustom(url, key, ...)`
2. Biến môi trường (`ANALYTICS_SERVER_URL`, `ANALYTICS_API_KEY`)
3. Giá trị đã lưu trong Storage (`'analytics_server_url'`, `'analytics_api_key'`)
4. Giá trị mặc định (`https://analytics.vinazon.vn/api/events`, `'YOUR_PROJECT_API_KEY'`)

### Các tùy chọn cấu hình (`AnalyticsConfig`):

```ts
interface AnalyticsConfig {
  serverUrl?: string; // Endpoint máy chủ (hoặc server_url)
  apiKey?: string; // API key dự án (hoặc api_key)
  playerId?: string; // ID người chơi (nếu để trống sẽ tự sinh p_<uuid> và lưu vào storage)
  appVersion?: string; // Phiên bản ứng dụng (mặc định: '1.0.0')
  platform?: string; // Ghi đè platform (mặc định tự động nhận diện: 'web', 'android', 'ios', 'macos', v.v.)
  country?: string; // Mã quốc gia (VD: 'VN', 'US')
  flushInterval?: number; // Chu kỳ tự động gửi sự kiện (giây, mặc định: 15.0)
  maxBatchSize?: number; // Số sự kiện tối đa mỗi đợt gửi (mặc định: 50)
  maxQueueSize?: number; // Giới hạn hàng đợi trước khi bỏ sự kiện cũ nhất (mặc định: 1000)
  autoTimer?: boolean; // Tự động chạy timer định kỳ (mặc định: true)
  autoLifecycle?: boolean; // Tự động lắng nghe sự kiện visibilitychange/beforeunload (mặc định: true)
  storage?: StorageAdapter; // Custom storage (mặc định: localStorage hoặc Memory)
}
```

---

## 3. Cách sử dụng

### 3.1 Khởi tạo nhanh

```ts
import analytics, { init } from "tv-analytics-sdk-js";

// Khởi tạo với config
init({
  serverUrl: "https://analytics.vinazon.vn/api/events",
  apiKey: "pk_your_project_api_key_here",
  appVersion: "1.0.0",
});
```

Hoặc gọi hàm tùy biến ngắn gọn (không cần object):

```ts
import { initCustom } from "tv-analytics-sdk-js";

initCustom(
  "https://analytics.vinazon.vn/api/events",
  "pk_your_project_api_key_here",
  "player_123", // hoặc để trống '' để tự động sinh p_<uuid>
  "1.0.0",
);
```

### 3.2 Tích hợp vào Game Loop (Phaser / Pixi / Babylon / Canvas)

Nếu bạn muốn kiểm soát chu kỳ flush theo frame loop của game (tương tự như trong engine Velo):

```ts
import analytics, { init, update } from "tv-analytics-sdk-js";

// Tắt autoTimer để update thủ công theo game tick
init({
  apiKey: "pk_your_api_key",
  autoTimer: false,
});

// Trong game loop update (dt tính bằng giây)
function gameLoop(dt: number) {
  // logic game...
  update(dt);
}
```

### 3.3 Theo dõi các sự kiện Game

```ts
import {
  trackLevelStart,
  trackLevelComplete,
  trackLevelFail,
  trackPurchase,
  trackAdWatched,
  trackTutorialComplete,
  trackEvent,
} from "tv-analytics-sdk-js";

// 1. Màn chơi (Level)
trackLevelStart(1);
trackLevelComplete(1, durationS, stars, score);
trackLevelFail(1, durationS, "timeout");

// 2. Giao dịch mua vật phẩm (IAP)
trackPurchase("gold_pack_medium", 1.99, currentLevel);

// 3. Quảng cáo (Ads)
trackAdWatched("rewarded_double_gold", "rewarded_video", currentLevel);

// 4. Hoàn thành hướng dẫn tân thủ (Tutorial)
trackTutorialComplete(1);

// 5. Sự kiện tùy biến (Custom Event)
trackEvent("shop_buy", currentLevel, {
  item_id: "dynamite",
  price_gold: 200,
  success: true,
});
```

### 3.4 Vòng đời ứng dụng (Pause / Resume / Exit)

Mặc định SDK đã tự động đăng ký các trình lắng nghe browser (`visibilitychange`, `pagehide`, `beforeunload`) và Node (`beforeExit`, `exit`). Bạn cũng có thể kích hoạt thủ công khi cần:

```ts
import { onPause, onResume, onAppExit, flushSync } from "tv-analytics-sdk-js";

// Khi game bị tạm dừng hoặc chuyển tab
onPause();

// Khi game tiếp tục hoạt động trở lại
onResume();

// Khi thoát ứng dụng
onAppExit();

// Hoặc gửi ngay lập tức toàn bộ sự kiện đang chờ
await flushSync();
```

---

## 4. API Reference

Hỗ trợ đồng thời cả cú pháp **camelCase** và **snake_case**:

| Hàm camelCase                                        | Hàm snake_case (V SDK alias)             | Mô tả                                              |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
| `init(config)`                                       | `init(store, config)` / `analytics_init` | Khởi tạo SDK với cấu hình tùy chọn hoặc Store      |
| `initCustom(url, key, pid, ver)`                     | `init_custom`                            | Khởi tạo trực tiếp không cần config object         |
| `configure(url, key)`                                | `configure`                              | Cập nhật URL server và API key                     |
| `update(dt)`                                         | `analytics_update`                       | Cập nhật timer và tự động flush batch theo chu kỳ  |
| `trackLevelStart(level)`                             | `track_level_start`                      | Bắt đầu màn chơi                                   |
| `trackLevelComplete(level, duration, stars, score?)` | `track_level_complete`                   | Hoàn thành màn chơi                                |
| `trackLevelFail(level, duration, reason)`            | `track_level_fail`                       | Thất bại màn chơi                                  |
| `trackPurchase(sku, priceUsd, level?)`               | `track_purchase`                         | Mua vật phẩm                                       |
| `trackAdWatched(placement, adType, level?)`          | `track_ad_watched`                       | Xem quảng cáo                                      |
| `trackTutorialComplete(step)`                        | `track_tutorial_complete`                | Hoàn thành bước hướng dẫn                          |
| `trackEvent(name, level?, props?)`                   | `track_event`                            | Bắn sự kiện tùy biến với properties map            |
| `trackInstall()`                                     | `track_install`                          | Ghi nhận lượt mở ứng dụng đầu tiên (`first_open`)  |
| `trackSessionStart()`                                | `track_session_start`                    | Bắt đầu phiên làm việc                             |
| `trackSessionEnd(duration)`                          | `track_session_end`                      | Kết thúc phiên làm việc kèm thời gian              |
| `triggerFlush()` / `flush()`                         | `trigger_flush`                          | Gửi một batch sự kiện bất đồng bộ                  |
| `flushSync()`                                        | `flush_sync`                             | Gửi khẩn cấp toàn bộ sự kiện với `keepalive: true` |
| `onPause()`                                          | `on_pause`                               | Tạm dừng phiên, ghi nhận thời gian và flush        |
| `onResume()`                                         | `on_resume`                              | Khởi tạo session_id mới và ghi nhận session_start  |
| `onAppExit()`                                        | `on_app_exit`                            | Kết thúc phiên và flush khẩn cấp trước khi đóng    |
| `get()` / `analytics()`                              | `get()`                                  | Trả về singleton `AnalyticsManager`                |

---

## 5. Lập trình Hướng Đối Tượng (OOP / Multi-instance)

Nếu cần quản lý nhiều instance độc lập (ví dụ gửi tới nhiều server khác nhau hoặc phục vụ testing):

```ts
import { AnalyticsManager, MemoryStorageAdapter } from "tv-analytics-sdk-js";

const customAnalytics = new AnalyticsManager();
customAnalytics.init({
  serverUrl: "https://custom-analytics.example.com/api/events",
  apiKey: "pk_custom_key",
  storage: new MemoryStorageAdapter(),
  autoTimer: false,
});

customAnalytics.trackLevelStart(1);
await customAnalytics.triggerFlush();
```

---

## 6. Phát triển & Kiểm thử

Dự án sử dụng [Bun](https://bun.sh) để quản lý package, chạy unit test và build bundle:

```bash
# Cài đặt dependencies
bun install

# Chạy kiểm thử (Unit tests)
bun test

# Kiểm tra kiểu dữ liệu TypeScript
bun run typecheck

# Build bundle ESM, CommonJS và TypeScript definitions (.d.ts)
bun run build
```

---

## License

MIT License.
