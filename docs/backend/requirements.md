# Backend requirements for WattPrint

Written 2026-10-28 against OpenAPI 3.2.0, Expo SDK 58, FastAPI as the backend (see [data-fetching](../data-fetching.md)).
Contract draft: `docs/backend/openapi.yaml`. Related: [architecture](../architecture.md), [client-state](../client-state.md).

Nguồn yêu cầu là 24 ảnh tách từ video app Sense (`frames/01..24`), cộng chatbot đã định trong kế hoạch app. Tài liệu này là
**đề xuất** cho nhóm backend; khi backend chạy thật, `/openapi.json` do FastAPI sinh ra mới là hợp đồng cuối
(xem "Read the backend's openapi before writing the client" trong CLAUDE.md).

## 1. Phạm vi và giả định

- Sản phẩm: theo dõi điện năng cả nhà và từng thiết bị (phân tách tải kiểu NILM), dashboard, mục tiêu/cảnh báo, chatbot
  năng lượng. Ảnh Sense chỉ chứng minh phần giao diện; thuật toán nhận diện nằm ngoài tài liệu này (xem mục 6).
- Một người dùng có một hoặc nhiều `home`; mọi dữ liệu năng lượng nằm dưới `/homes/{homeId}` (opinion: tránh sau này phải
  đổi đường dẫn khi có nhà thứ hai).
- Công suất đơn vị W, năng lượng kWh, thời gian RFC 3339 UTC, mỗi home có múi giờ IANA. Tiền là `{amount, currency}` ISO 4217;
  mọi chi phí chỉ là ước tính, không phải hóa đơn (Sense nói rõ điều này ở màn Electricity Info, ảnh 24).
- Giá điện phải hỗ trợ bậc thang (opinion: bắt buộc với thị trường Việt Nam; Sense chỉ có giá phẳng + time-of-use, ảnh 24).
- Ngoài phạm vi API: Appearance (theme, chỉ ở client), Support/About nội dung tĩnh (chỉ cần `/meta/config`).

## 2. Màn hình Sense sang tính năng

| Ảnh   | Màn                                   | Cần từ backend                                                           | Nhóm        |
| ----- | ------------------------------------- | ------------------------------------------------------------------------ | ----------- |
| 01    | Now: "đã dùng $5.86 hôm nay", bubbles | chi phí hôm nay, câu so sánh, watt từng bubble, công suất hiện tại       | Now         |
| 02-05 | Now: timeline hôm nay                 | sự kiện bật/tắt, gộp ("on for 3 minutes", "on 2 times"), mở rộng gộp     | Now         |
| 06-08 | Chi tiết thiết bị (Stove)             | average W khi bật, cost/yr, usage theo ngày, power meter 24h, timeline   | Devices     |
| 09-10 | Dashboard                             | usage tháng này vs tháng trước, compare hàng xóm, banner, goals, labs    | Dashboard   |
| 11-13 | Meter (Min/Hour/Day/Week/Month)       | chuỗi công suất theo độ phân giải, đọc số tại con trỏ, live watt         | Meter       |
| 14-15 | Danh sách thiết bị                    | thiết bị theo phòng, trạng thái bật/tắt, watt hiện tại                   | Devices     |
| 16,19 | Chi tiết Fridge, Community names      | gợi ý tên + % người dùng khác, xác nhận tên ("Keep it"), tên tùy ý       | Devices     |
| 17-18 | Fridge: usage, power meter, timeline  | như 06-08, kèm "$2.39 / $334" (phần của thiết bị / cả nhà)               | Devices     |
| 20    | Device Settings > Manage              | show on timeline, alert on/off, custom alert, merge, report, delete      | Device alerts |
| 21    | Settings                              | Account, Security, Notifications, My Home, Electricity Info, Solar, ...  | Account     |
| 22    | Connected Devices                     | data sources, sensor sources, integrations (Hue, Alexa, plug, IFTTT)     | Sources     |
| 23    | My Home                               | postal code, loại nhà, diện tích, năm xây, số người, occupancy, basement | Homes       |
| 24    | Electricity Info                      | giá/kWh (cảnh báo đang dùng giá trung bình), chu kỳ, show cost, TOU      | Tariff      |

## 3. Nhóm tính năng và API

Ưu tiên: **P0** cần cho bản chạy được đầu tiên, **P1** cần trước khi phát hành, **P2** để sau. Tên endpoint là đường dẫn
dưới `servers[0].url` (`/v1`); chi tiết schema ở `docs/backend/openapi.yaml`.

### 3.1 Auth và tài khoản (P0) - tags Auth, Account

- `POST /auth/register|login|refresh|logout`, `POST /auth/password/forgot|change`.
- Access token ngắn hạn (Bearer JWT), refresh token xoay vòng, thu hồi khi logout. Client giữ refresh token trong SecureStore,
  access token trong bộ nhớ (xem backlog `2026-10-25-auth-session-store`).
- `GET|PATCH|DELETE /me`: hồ sơ, ngôn ngữ vi/en, xóa tài khoản (xóa bất đồng bộ, P1).
- `POST|DELETE /me/push-tokens`, `GET|PUT /me/notification-preferences` (P1).
- Rate limit đăng nhập (429 + `Retry-After`).

### 3.2 Nhà, phòng, hồ sơ nhà (P0) - tag Homes

- `GET|POST /homes`, `GET|PATCH /homes/{homeId}` (form My Home, ảnh 23: postal code, loại nhà, diện tích, năm xây, số người,
  occupancy, basement). Các trường này nuôi so sánh hàng xóm và gợi ý tên thiết bị.
- `GET|POST /homes/{homeId}/rooms`, `PATCH|DELETE .../rooms/{roomId}`. App hiện đã có khái niệm room
  (`src/features/devices/schemas.ts`).

### 3.3 Giá điện (P0) - tag Tariff

- `GET|PUT /homes/{homeId}/tariff`: `kind` = `average | flat | tiered`, `billingCycleStartDay`, `showCost`.
  Khi `kind=average`, response có `isEstimate=true` để app hiện cảnh báo "đang dùng giá trung bình" (ảnh 24).
- `GET|POST /homes/{homeId}/tariff/time-of-use`, `PUT|DELETE .../{periodId}`: khung giờ ghi đè giá (P1).
- Đổi tariff phải tính lại chi phí lịch sử trong kỳ hiện tại (opinion: tính lúc đọc, không ghi cứng vào bucket).

### 3.4 Nguồn dữ liệu, monitor, tích hợp (P1; claim monitor là P0 nếu có phần cứng) - tag Sources

- `GET /homes/{homeId}/data-sources`, `PATCH .../{sourceId}` bật/tắt (ảnh 22: Network listening, Solar, Dedicated Circuit
  Monitoring, Generator, ...).
- `GET|POST /homes/{homeId}/monitors`: danh sách và claim bằng serial + pairing code.
- `POST|DELETE /homes/{homeId}/integrations/{provider}/link`: bắt đầu OAuth với bên thứ ba (Hue, TP-Link, Ecobee); backend giữ
  token của nhà cung cấp, app không bao giờ thấy chúng.
- `POST /ingest/readings` cho phần cứng (`monitorKey`), không phải app gọi. Xem mục 6.

### 3.5 Now (P0) - tag Now

- `GET /homes/{homeId}/now`: chi phí + kWh hôm nay, `comparison` (`much-less..much-more`, so với cùng thứ trong vài tuần gần
  đây; client tự ghép câu cho đúng i18n), `currentWatts`, `bubbles[]` (thiết bị + `Always On` + `Other`).
- `GET /homes/{homeId}/power/live`: SSE `text/event-stream`, 1 sự kiện/giây, tối đa 15 phút rồi client nối lại bằng
  `Last-Event-ID` (React Native không có `EventSource`; client dùng `fetch` + parser riêng, xem backlog `chat-streaming`).
- `GET /homes/{homeId}/timeline?deviceId&from&to&cursor&limit`: sự kiện mới nhất trước. Server gộp các chuỗi sự kiện
  ("was on for 7 seconds, now off", "was on 2 times") thành một dòng có `children[]` để bấm mở rộng.

### 3.6 Meter (P0) - tag Meter

- `GET /homes/{homeId}/meter?resolution=minute|hour|day|week|month&from&to&channel&deviceId&maxPoints`.
  Server hạ mẫu (min/max mỗi bucket để không mất đỉnh, ảnh 11 có nhiều đỉnh nhọn); client không tự gộp mẫu thô.
- `channel=solar|net` dùng lại cùng endpoint cho Solar (P2).

### 3.7 Dashboard (P0 usage; còn lại P1/P2) - tag Dashboard

- `GET /homes/{homeId}/usage?period&anchor&deviceId&compareToPrevious`: bucket kWh + tiền, tổng, `previous` và
  `changePercent` ("dùng ít hơn 6% so với tháng trước", ảnh 10), `homeTotal` khi hỏi theo thiết bị.
  Một endpoint cho cả đường lũy kế của Dashboard lẫn biểu đồ cột của chi tiết thiết bị (P0).
- `GET /homes/{homeId}/compare`: phân vị so với nhà lân cận cùng postal code, 3 dải, `peerCount`, `windowDays`. Trả
  `available=false` + lý do khi ít nhà (opinion: yêu cầu tối thiểu 10 nhà để không lộ dữ liệu cá nhân; Sense hiển thị 35, ảnh 09) (P1).
- `GET /homes/{homeId}/insights`: banner theo mùa, mẹo, Watt Check, Labs (P1).
- `GET|POST /homes/{homeId}/goals`, `PUT|DELETE .../{goalId}`: giới hạn kWh hoặc tiền theo ngày/tuần/tháng/chu kỳ, có
  `progress`; vượt ngưỡng thì đẩy thông báo (P1).
- Watt Check (đo công suất một thiết bị theo hướng dẫn) và Labs chưa có endpoint: P2, cần spec riêng.

### 3.8 Thiết bị (P0) - tags Devices, Device alerts

- `GET|POST /homes/{homeId}/devices` (lọc `roomId`, `state`), có thiết bị tổng hợp `always-on` và `other` để bubbles và danh sách
  khớp nhau.
- `GET|PATCH|DELETE .../devices/{deviceId}`: chi tiết có `stats.averageWattsWhileOn`, `stats.yearlyCost`; PATCH đổi tên, phòng,
  loại, `showOnTimeline`, `alertOnTurnOn`, `alertOnTurnOff` (màn Manage, ảnh 20).
- `GET .../devices/{deviceId}/name-suggestions` (ảnh 16, 19: tên + % người dùng khác) và PATCH `name` + `nameConfirmed=true`
  cho nút "Keep it". Cần dữ liệu tổng hợp ẩn danh từ mọi người dùng (P1).
- `POST .../devices/{deviceId}/merge` (P1). `GET|POST .../custom-alerts`, `PUT|DELETE .../custom-alerts/{alertId}` (P1).
- `POST .../devices/{deviceId}/problem-reports` (P1): ghi nhãn sai để huấn luyện lại.
- Dùng lại `timeline` và `meter` với `deviceId` cho "Timeline" và "Power meter" trong chi tiết thiết bị, để không nhân bản API.

### 3.9 Thông báo (P1) - tag Notifications

- `GET /me/notifications`, `POST /me/notifications/{id}/read`. Đẩy push qua FCM (Android) / APNs; payload mang `target`
  (`deviceId` hoặc `goalId`) để mở đúng màn.
- Nguồn thông báo: bật/tắt thiết bị (cảnh báo cơ bản), custom alert, goal, insight.

### 3.10 Trợ lý chat (P1, đề xuất; không có trong ảnh Sense) - tag Assistant

- `GET|POST /homes/{homeId}/chat/conversations`, `GET .../{id}/messages`.
- `POST .../{id}/messages` trả SSE `text/event-stream` với 3 loại sự kiện `delta`, `done`, `error`; mô tả bằng `itemSchema` +
  `discriminator` của OpenAPI 3.2. Client hủy bằng cách đóng kết nối; server lưu phần trả lời dở.
- `clientMessageId` làm khóa idempotent khi client gửi lại sau lỗi mạng. Câu trả lời có thể kèm `cards` (thiết bị, khoảng usage).
- Câu hỏi phải được trả lời dựa trên dữ liệu của chính home đó (không lộ dữ liệu home khác).

### 3.11 Hệ thống (P0 `meta/config`) - tag Support

- `GET /meta/config` không cần token: `minAppVersion` (ép nâng cấp), feature flags, link hỗ trợ.

## 4. Thực thể chính

`User`, `Home`, `Room`, `Tariff` (+ `TimeOfUsePeriod`), `Monitor`, `DataSource`, `Device` (+ `DeviceDetail`, `NameSuggestion`,
`CustomAlert`), `TimelineEvent`, `RawSample`, bucket sử dụng (`UsageBucket`), `Goal`, `Insight`, `Notification`,
`Conversation`, `ChatMessage`. Quan hệ: User 1-n Home; Home 1-n Room/Device/Monitor/Goal; Device n-1 Room (có thể null).

Lưu ý lệch với app hiện tại (`src/features/devices/schemas.ts`, `src/features/energy/schemas.ts`):

- App dùng `on: boolean` và `ratedWatts`; hợp đồng dùng `state: on|off` và `currentWatts`. Giữ `ratedWatts` làm tùy chọn.
- `deviceTypeSchema` của app có 7 giá trị; hợp đồng mở rộng (dryer, stove, oven, toaster, ev, pump, other) theo bộ icon Sense.
  Client phải chịu được giá trị lạ (rơi về icon mặc định), vì backend sẽ thêm loại mới.
- App tính `topDevices` theo range `day|week|month`; hợp đồng thay bằng `usage` + `bubbles`. Bước nối là việc của client, không phải
  yêu cầu backend.

## 5. Quy ước chung

- **Lỗi**: RFC 9457 `application/problem+json` (`type`, `title`, `status`, `detail`, `errors[]`), khớp `ApiError` ở `src/lib/errors.ts`.
  5xx và lỗi mạng được client retry; 4xx thì không.
- **Phân trang**: con trỏ mờ (`cursor`, `limit` ≤ 100, `nextCursor`), không dùng offset cho timeline vì dữ liệu chèn liên tục.
- **Cache**: `ETag`/`If-None-Match` cho `devices`, `tariff`, `home`; `Cache-Control: no-store` cho `now` và `power/live`.
  (opinion: `usage` của kỳ đã đóng có thể cache dài, kỳ hiện tại chỉ vài phút).
- **Xác thực**: `Authorization: Bearer`. Mọi truy cập `/homes/{homeId}/...` kiểm tra quyền thành viên; trả 404 (không phải 403)
  cho home không thuộc người dùng để không lộ sự tồn tại.
- **Idempotency**: `clientMessageId` cho chat; `PUT` cho cấu hình; push token đăng ký lặp là no-op.
- **Thời gian**: tham số `from/to` là nửa mở `[from, to)`; bucket ngày/tuần/tháng cắt theo múi giờ của home, không phải UTC.
- **Quốc tế hóa**: backend trả dữ liệu và mã (`comparison`, `kind`), không trả câu tiếng Việt/Anh; app giữ chuỗi trong i18n.
  Ngoại lệ: tiêu đề `Insight` và nội dung thông báo do backend soạn theo `User.locale`.

## 6. Yêu cầu cho dữ liệu đo và phân tách tải

Phần này là điều kiện để mọi màn trên có số thật; ảnh Sense không cho biết cách làm (opinion, cần chốt với nhóm NILM).

- Nhận mẫu qua `POST /ingest/readings`: lô ≤ 3600 mẫu, chấp nhận đến muộn và sai thứ tự, khử trùng theo `(monitorId, at)`,
  trả `acceptedUntil` để monitor cắt bộ đệm. Xác thực bằng `X-Monitor-Key` riêng từng monitor.
- Lưu mẫu thô (chuỗi thời gian) và các bản tổng hợp sẵn theo phút/giờ/ngày; `meter` và `usage` đọc từ bản tổng hợp, không quét mẫu thô.
- Pipeline phát hiện sinh `TimelineEvent` và gán công suất cho `Device`; phần chưa gán vào `other`, tải nền vào `always-on`.
  Tổng các bubble bằng `currentWatts`.
- Phản hồi của người dùng (đổi tên, merge, xóa, báo lỗi) là nhãn huấn luyện; cần lưu lịch sử thay đổi để huấn luyện lại.
- Độ trễ mục tiêu (opinion, chưa đo): live power ≤ 2 s, sự kiện bật/tắt hiện trên timeline ≤ 30 s.

## 7. Phi chức năng

- Bảo mật: TLS; băm mật khẩu bằng Argon2id hoặc bcrypt; token nhà cung cấp tích hợp mã hóa khi lưu; xóa tài khoản xóa cả chuỗi thời gian.
- Riêng tư: so sánh hàng xóm và gợi ý tên chỉ dùng số liệu gộp, đủ ngưỡng số nhà (xem 3.7); không lộ vị trí chính xác (postal code là mức thô nhất cần).
- Quan sát: log có `request-id` trả lại qua header, metric độ trễ theo endpoint, cảnh báo khi monitor mất kết nối.
- Khả năng mở rộng: dữ liệu ghi nhiều, đọc theo khoảng thời gian; cần kho chuỗi thời gian hoặc phân vùng theo ngày (quyết định của nhóm backend).
- Tương thích: phiên bản hóa bằng tiền tố `/v1`; chỉ thêm trường tùy chọn trong cùng phiên bản; app cũ bị chặn bằng `minAppVersion`.

## 8. Việc chưa chốt (hỏi nhóm backend/sản phẩm)

1. Có phần cứng monitor riêng không, hay chỉ ổ cắm thông minh và công tơ điện tử? Quyết định `monitors`, `ingest` và độ chính xác phân tách.
2. Thị trường đầu tiên là Việt Nam? Nếu có, cần bảng giá bậc thang của EVN và đơn vị tiền VND (không có phần lẻ).
3. Đăng nhập chỉ email + mật khẩu hay thêm OAuth Google/Apple? Hiện hợp đồng chỉ có email + mật khẩu.
4. Chat dùng mô hình và nguồn dữ liệu nào, giới hạn lượt dùng mỗi ngày? Cần cho `429`.
5. Watt Check, Labs, Solar, Generator, 400A: làm ở phiên bản nào? Hiện chỉ có chỗ chờ (`channel=solar`, `DataSource`).
6. Có nhiều người dùng chung một home (chia sẻ gia đình) không? Hợp đồng hiện chưa có `members`.

## 9. Cách dùng OpenAPI 3.2 trong bản nháp

Đã dùng (verified: https://spec.openapis.org/oas/v3.2.0.html): `$self` làm base URI; `tags[].summary`, `parent`, `kind`
(nhóm màn hình, `Device alerts` nằm dưới `Devices`); `itemSchema` cho `text/event-stream` (live power, chat) cùng
`discriminator`; `summary` trong Response Object. Có sẵn nhưng chưa dùng: phương thức `query`, `in: querystring`,
`additionalOperations`, `mediaTypes` trong Components, `oauth2` device flow, `oauth2MetadataUrl`, `defaultMapping`.

Quyết định (opinion): không dùng phương thức HTTP `QUERY` cho truy vấn phức tạp, vì chưa kiểm chứng fetch của Hermes và
Starlette/FastAPI có chuyển được phương thức này; mọi truy vấn hiện là `GET` với tham số. Nếu sau này cần, ghi vào backlog.
FastAPI hiện sinh OpenAPI 3.1; phải kiểm tra phiên bản FastAPI/pydantic có phát ra 3.2 không trước khi hứa khớp từng từ
(unverified). Tệp `docs/backend/openapi.yaml` chỉ là hợp đồng mục tiêu để hai bên trao đổi.

Kiểm tra đã làm: YAML parse được, 42 đường dẫn, 64 thao tác, 49 schema, mọi `$ref` tồn tại, `operationId` không trùng, mọi
tag được khai báo, tham số đường dẫn đều có khai báo (kịch bản Node cục bộ, 2026-10-28). Chưa chạy bộ lint OpenAPI chính thức
(lệnh tải gói từ npm bị chặn trong phiên này), nên chưa chắc tuân thủ 3.2 từng chi tiết.

## Checklist

- [ ] Nhóm backend đọc mục 8 và trả lời 6 câu hỏi.
- [ ] Chốt danh sách P0 (mục 3) và gắn vào kế hoạch sprint.
- [ ] Backend phát `/openapi.json`; so với `docs/backend/openapi.yaml`, ghi lệch vào tài liệu này.
- [ ] Client sinh schema Zod theo `/openapi.json` thật, không theo bản nháp.
- [ ] Kiểm tra SSE bằng `fetch` trên Hermes bản release (backlog `chat-streaming`).

## Anti-patterns

- Để app tự gộp mẫu thô hoặc tự tính chi phí: sai lệch giữa máy và không đổi được giá sau này.
- Trả câu chữ đã dịch từ backend cho phần giao diện cố định: app đã có i18n en/vi.
- Dùng offset cho timeline hoặc danh sách thiết bị: trùng/mất dòng khi dữ liệu chèn vào.
- Trả 403 cho home của người khác: lộ sự tồn tại.
- Coi bản nháp là hợp đồng: `/openapi.json` thật của backend mới đúng.

## Sources

- 24 ảnh tách từ `ScreenRecording_10-24-2026 08-58-21_1.mp4` (Sense app), thư mục `WattPrint info/Sense video and images/frames`.
- OpenAPI Specification 3.2.0: https://spec.openapis.org/oas/v3.2.0.html (trang tóm tắt: https://swagger.io/specification/v3.2/).
- RFC 9457 Problem Details for HTTP APIs; RFC 8414 OAuth 2.0 Authorization Server Metadata.
- `docs/superpowers/backlog/2026-10-25-chat-streaming.md`, `docs/superpowers/backlog/2026-10-25-auth-session-store.md`.
