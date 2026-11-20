# CHEMIMON — Slice 1 Design (Web 3D, full stack)

Ngày: 2026-11-20 · Trạng thái: CHỜ DUYỆT LẦN CUỐI (đã trả lời câu hỏi mở)
Tài liệu gốc: `docs/reference/CHEMIMON_Project_Master_Plan.md` (12 Epic, 5 Phase), `docs/reference/chatgpt-conversation.txt`

---

## 1. Ý định

CHEMIMON là game sưu tập quái vật hóa học chạy trên web, đồ họa 3D.

- Mỗi nguyên tố và hợp chất là một quái chibi baby 3D, dựng bằng Blender.
- Người chơi đưa quái vào máy lai tạo, chọn điều kiện phản ứng, và nhận quái mới.
- Kết quả lấy từ phản ứng hóa học thật. Không có kết quả ngẫu nhiên.
- **Điểm khác biệt chính:** cùng một cặp chất, khác điều kiện (nhiệt độ, áp suất, xúc tác, tỷ lệ, môi trường) thì ra sản phẩm khác, khi hóa học thật có hướng phản ứng đó.

**Lý do làm:** anh chưa nói. Đã chốt: làm bản đầy đủ có backend và database, chạy trên web, 3D dựng bằng Blender.

**Tài liệu này cover Slice 1**, tương ứng Phase 1 (Prototype) và một phần Phase 2 trong Master Plan: một vòng chơi hoàn chỉnh chạy end-to-end. Các Phase sau chỉ được giữ chỗ trong data model.

## 2. Goals / Non-goals / Anti-goals

### Goals (Slice 1 xong khi tất cả đều đúng)
1. Người chơi đăng ký, đăng nhập, rồi nhận bộ quái nguyên tố khởi đầu.
2. Trong scene lab 3D, người chơi chọn 1 hoặc 2 loại quái, chọn số lượng (tỷ lệ) và điều kiện, rồi bấm lai tạo.
3. Server quyết định kết quả. Có đủ các trạng thái: 1 sản phẩm, nhiều sản phẩm, không phản ứng.
4. Có quái mới xuất hiện trong scene 3D, có animation discover.
5. Codex và bảng tuần hoàn hiện đúng trạng thái đã khám phá / chưa khám phá.
6. Server ghi First Discovery cho mỗi chất. Mỗi chất chỉ có đúng 1 người đầu tiên.
7. Dữ liệu nội dung: **25 nguyên tố, 20 hợp chất, 40 đến 60 phản ứng**. Trong đó **ít nhất 8 cặp đầu vào có từ 2 nhánh sản phẩm trở lên tùy điều kiện**.
8. Tiến trình lưu trên server. Đăng nhập trên máy khác vẫn thấy đúng trạng thái.

### Non-goals (để Phase sau)
- App mobile native, bản build PC.
- Bạn bè, thăm lab, trade, guild, chat.
- Giao diện bảng xếp hạng. Slice 1 chỉ ghi dữ liệu First Discovery.
- Nâng cấp công trình, kinh tế Coins / Energy, quest, achievement, thanh toán.
- Admin dashboard. Slice 1 sửa nội dung bằng file seed trong repo.
- Deploy lên production. Slice 1 chạy local bằng docker compose.

### Anti-goals (vi phạm là thất bại, dù code chạy đúng)
- Kết quả lai tạo có yếu tố ngẫu nhiên, hoặc do client quyết định.
- AI tự bịa phản ứng rồi dùng làm kết quả thật.
- Game trở thành hướng dẫn làm phản ứng ngoài đời. Không có bước thực hành, không có lượng hóa chất thật. Không đưa vào nội dung: chất nổ, chất độc chiến tranh, tiền chất ma túy.
- Các quái chỉ khác nhau bởi màu (cùng một mesh đổi màu).

## 3. Ràng buộc

- Một người phát triển cùng AI agent (giả định, cần anh xác nhận).
- Máy dev: WSL2, Node 22, pnpm 10, Docker 29, PostgreSQL client 18. Máy này chưa cài Blender.
- Phải chạy được trên Chrome desktop và Chrome Android tầm trung. Mục tiêu 60 fps trên desktop, ≥ 30 fps trên mobile, khi lab có ≤ 12 quái.

## 4. Approaches

| | A. Web 3D (CHỌN) | B. Godot 4 | C. Unity |
|---|---|---|---|
| Client | React + Three.js (react-three-fiber) | Godot 4, GDScript | Unity, C# |
| Blender → game | .glb | .glb (Godot import trực tiếp) | .fbx / .glb |
| Ưu | Chơi ngay trên trình duyệt, chỉ 1 ngôn ngữ TS | Có editor 3D, export native mobile | Mobile 3D mạnh nhất |
| Nhược | Không có editor scene, 3D chạy trong WebView mobile yếu | 2 ngôn ngữ, bản web nặng | Phí bản quyền, nặng so với game chibi |

**Anh đã chọn A** ("hiện muốn bản web"). B vẫn là hướng đi khi cần mobile native. Engine phản ứng chạy trên server, nên khi đổi client, backend vẫn dùng lại được.

## 5. Kiến trúc

```
┌──────────── Browser ────────────┐        ┌──────────── Server ─────────────┐
│ apps/web  (Vite + React)        │  REST  │ apps/api  (Hono, Node 22)       │
│  ├─ 3D: react-three-fiber/drei  │ ─────▶ │  ├─ auth (session cookie)       │
│  ├─ UI overlay: React+Tailwind  │  JSON  │  ├─ breeding service            │
│  ├─ server state: TanStack Query│ ◀───── │  │    └─ gọi chem-engine        │
│  └─ UI state: Zustand           │        │  └─ Prisma ─▶ PostgreSQL 16+    │
└─────────────────────────────────┘        └─────────────────────────────────┘
          ▲ .glb assets (static)                     ▲
          │                                          │
  assets/monsters/*.glb  ◀── Blender           packages/chem-engine (TS thuần,
                                               không I/O, unit test dày)
                                               packages/content (seed YAML +
                                               validator)
                                               packages/shared (zod schema API)
```

Monorepo pnpm workspaces:

```
chemimon/
  apps/web          client game
  apps/api          backend
  packages/shared   zod schema request/response, dùng chung web + api
  packages/chem-engine   resolver phản ứng, parser công thức, cân bằng nguyên tố
  packages/content  chemicals.yaml, reactions.yaml, monsters.yaml + validator
  assets/monsters   file .glb + placeholder
  docs/
  docker-compose.yml   postgres
```

Lựa chọn stack theo những gì anh đang dùng ở `ai-designer` (Hono, Prisma 7, zod 4, pnpm, vitest). Riêng database: chọn **PostgreSQL**, không dùng MySQL. Lý do: cột `jsonb` lưu điều kiện phản ứng gọn hơn, và có partial unique index. MySQL vẫn làm được, nếu anh muốn đồng bộ với dự án kia.

## 6. Luật game cốt lõi

### 6.1 Đơn vị và tỷ lệ
- **1 quái = 1 đơn vị chất.** Tỷ lệ phản ứng chính là số quái mỗi loại đưa vào.
  Ví dụ: 2 HYDRO + 1 OXY → 2 AQUA.
- Hệ số của phương trình xác định số quái sản phẩm. Nguyên tố được bảo toàn ở cấp phương trình.
- Mỗi lần lai: tối đa 2 loại đầu vào, mỗi loại 1 đến 4 quái. Slot B được để trống, dùng cho phản ứng phân hủy (ví dụ CaCO₃ nung nóng → CaO + CO₂).
- *[Quyết định của builder]* Quái nguyên tố là dạng bền ở điều kiện chuẩn: H₂, O₂, N₂, Cl₂, F₂, I₂, P₄, S₈. Các nguyên tố còn lại dùng nguyên tử (Fe, Na...). Phương trình viết theo dạng này.
- *[Quyết định của builder]* **Môi trường chỉ dùng để lọc rule, không cấp thêm chất phản ứng.** Ví dụ: Mg đốt trong "không khí" vẫn phải đưa quái OXY vào. Lý do: giữ đúng luật 1 quái = 1 đơn vị, và quái OXY / AQUA không bị thừa. Hệ quả: phản ứng cần 3 chất (ví dụ Fe + O₂ + H₂O tạo gỉ) không có trong Slice 1.
- *[Quyết định của builder]* Rule không ghi một trục điều kiện thì trục đó khớp mọi giá trị.

### 6.2 Quái đầu vào có bị tiêu thụ không
**ĐÃ CHỐT: bị tiêu thụ.** Lý do: khớp với bảo toàn chất.
- *[Quyết định của builder, chỉnh được]* Bộ khởi đầu: mỗi nguyên tố trong 25 nguyên tố có 4 quái.
- *[Quyết định của builder, chỉnh được]* **Element Extractor:** người chơi chọn 1 trong 25 nguyên tố khởi đầu và nhận 1 quái. Thời gian chờ là 60 giây mỗi lần nhận. Mỗi nguyên tố có tối đa 12 quái; khi đã đủ 12 thì Extractor không nhả thêm nguyên tố đó. Các giá trị này nằm trong file config, không viết cứng trong code.

### 6.3 Điều kiện người chơi chọn
| Trục | Giá trị trong Slice 1 |
|---|---|
| Nhiệt độ | 6 nấc: −78, 25, 200, 450, 1000, 2500 °C |
| Áp suất | 4 nấc: 1, 10, 100, 200 atm |
| Xúc tác | không có / Fe / Pt / V₂O₅ / MnO₂ (là vật phẩm, không bị tiêu thụ; Slice 1 cấp sẵn) |
| Môi trường | không khí / khí trơ / nước |
| Kích hoạt | không / tia lửa / ánh sáng |

Dùng các nấc cố định, không dùng thanh trượt liên tục. Lý do: luật phản ứng so khớp theo khoảng, và người chơi cần nhớ được công thức.

### 6.4 Resolver (tất định)
```
input: {species A, count a, species B?, count b?, conditions}
  1. lấy mọi rule có tập đầu vào = {A, B}  (không phân biệt thứ tự)
  2. lọc theo tỷ lệ  a/b  nằm trong khoảng rule cho phép
  3. lọc theo điều kiện: T ∈ [Tmin,Tmax], P ∈ [Pmin,Pmax],
     xúc tác ∈ yêu cầu, môi trường ∈ cho phép, kích hoạt khớp
  4a. 0 rule  → NO_REACTION (+ gợi ý mơ hồ: "thử đổi điều kiện")
  4b. ≥1 rule → chọn rule có priority cao nhất; hòa → rule cụ thể hơn
      (nhiều ràng buộc hơn); vẫn hòa → lỗi nội dung, validator chặn từ CI
  5. số quái sản phẩm = hệ số × (số lần phương trình "chạy" được với a, b)
     phần đầu vào dư được trả lại người chơi
output: {status, rule_id, products[{chemical, count}], consumed, returned}
```
Cùng đầu vào và cùng điều kiện thì luôn ra cùng kết quả. Không có RNG.

### 6.5 Thời gian
Server tính kết quả ngay lúc bấm Start, lưu lại, rồi trả `ready_at`. Slice 1 dùng thời gian ngắn: 10 đến 60 giây theo rule. Client hiện animation máy chạy. Khi đến giờ, người chơi bấm "Collect" để nhận quái.

### 6.6 Discovery
- `player_discoveries`: unique (player_id, chemical_id). Lần đầu một người chơi có chất X thì ghi 1 dòng.
- `first_discoveries`: PK (chemical_id). Insert trong cùng transaction với lần Collect, dùng `INSERT ... ON CONFLICT DO NOTHING`. Nếu insert 0 dòng thì người này không phải người đầu tiên. Không coi đó là lỗi. (Không bắt unique violation, vì trong Postgres lỗi này hủy cả transaction.)
- Quái khởi đầu và quái từ Extractor không tính là discovery. Chỉ chất tạo ra từ phản ứng mới được tính.
- *[Quyết định của builder]* **Codex có 3 trạng thái:** `unknown` (hiện "???" và gợi ý), `owned` (nguyên tố đã có trong kho), `discovered` (hợp chất đã tạo ra). Discovery và First Discovery **chỉ áp dụng cho hợp chất**. 25 nguyên tố khởi đầu luôn ở trạng thái `owned`, không ô nào kẹt "???" mãi.
- Codex hiện **display name** của người chơi, không bao giờ hiện email.

## 7. Nội dung hóa học

- Dữ liệu là file YAML trong `packages/content`, có version trong git.
- Mỗi rule phải có: phương trình, điều kiện dạng khoảng, priority, thời gian, `source` (trích dẫn: sách giáo khoa, Wikipedia, CRC), và `reviewed: true|false`.
- Validator chạy trong CI:
  - parse công thức; kiểm tra cân bằng nguyên tố từng phương trình
  - mọi chemical trong rule đều tồn tại; mọi chemical đều có monster
  - không có 2 rule hòa nhau ở bước 4b
  - đủ ≥ 8 cặp có ≥ 2 nhánh
  - mọi rule trong `content/` (bộ được seed) đều `reviewed: true`. Rule nháp nằm ở `content/drafts/`: không được seed và không chặn CI. Rule được chuyển sang `content/` sau khi duyệt.
  - **reachability:** mọi hợp chất trong bộ seed đều tạo được từ 25 nguyên tố khởi đầu, qua một chuỗi phản ứng có trong bộ.
  - không có chất nào trong danh sách cấm (bảng chất độc chiến tranh của OPCW, tiền chất DEA List I, chất nổ)
- **ĐÃ CHỐT:** AI soạn rule kèm nguồn trích dẫn vào `content/drafts/`. Anh duyệt từng rule. Rule đã duyệt được chuyển sang `content/` với `reviewed: true`. Plan có một bước xuất danh sách rule dạng dễ đọc để anh duyệt.
- Danh sách 25 nguyên tố khởi đầu (đề xuất): H, He, C, N, O, F, Ne, Na, Mg, Al, Si, P, S, Cl, Ar, K, Ca, Fe, Cu, Zn, Ag, I, Au, Hg, Pb.

## 8. Asset 3D

- Pipeline: Blender → glTF 2.0 `.glb`, nén meshopt, mỗi quái ≤ 5.000 tris, ≤ 1 texture 512 px, ≤ 1 MB.
- **1 bộ xương chung** cho thân chibi. Clip animation tên cố định: `idle`, `happy`, `sad`, `interact`, `discover`. Mỗi quái có mesh và phụ kiện riêng, nên có silhouette riêng.
- **Placeholder:** khi chưa có .glb, client tự dựng quái từ primitive. Code không phải chờ art. Để không vi phạm anti-goal "chỉ khác màu", **mỗi nhóm dùng một silhouette khác nhau**: khí = khối mây lơ lửng, kim loại = golem khối hộp, khí hiếm = quả cầu phát sáng, halogen = khối nhiều gai, á kim / tinh thể = khối bát diện, hợp chất = 2 khối ghép (theo nguyên tố thành phần). Mỗi quái có mắt, màu riêng và ký hiệu nổi.
- Scene Slice 1: 1 phòng lab (sàn, kệ habitat, máy lai tạo ở giữa), camera orbit có giới hạn góc.
- **ĐÃ CHỐT: placeholder trước.** Slice 1 được tính là xong khi chạy hoàn toàn bằng placeholder. Model thật là một track riêng, làm sau Slice 1. Client nạp `.glb` theo `asset_key` nếu có file, không có thì dùng placeholder. Nhờ vậy thay từng quái mà không phải sửa code.

## 9. Data model (PostgreSQL)

```
users             id, email (unique), display_name (unique), password_hash
                  (argon2id), created_at
extractor_state   player_id PK → users, last_claim_at   (nếu chốt 6.2)
sessions          id, user_id → users, expires_at
chemicals         id (vd "h2o"), formula, name, kind (element|compound),
                  atomic_number?, group?, period?, phase_at_25c, category[]
monsters          id, chemical_id → chemicals (unique), display_name,
                  rarity, asset_key, blurb
reactions         id, priority, duration_s, conditions jsonb, source, reviewed
reaction_inputs   reaction_id → reactions, chemical_id, coefficient
reaction_outputs  reaction_id → reactions, chemical_id, coefficient
player_monsters   player_id → users, chemical_id, count   PK(player,chemical)
breeding_sessions id, player_id, inputs jsonb, conditions jsonb, status
                  (running|ready|collected), result jsonb, reaction_id?,
                  started_at, ready_at
player_discoveries player_id, chemical_id, discovered_at  PK(player,chemical)
first_discoveries chemical_id PK, player_id, discovered_at
```

`player_monsters` lưu **số lượng**, không lưu từng cá thể. Lý do: Slice 1 chưa có level hay tên riêng cho từng quái. Master Plan đặt ra `monster_instance_id` cho Phase sau. Khi cần, sẽ tách bảng.

Bảng `chemicals`, `monsters` và `reactions` được seed từ `packages/content`. Server không sửa các bảng này lúc chạy.

## 10. API

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | /auth/register | {email, password} → set cookie; cấp bộ quái khởi đầu |
| POST | /auth/login | {email, password} → set cookie |
| POST | /auth/logout | |
| GET | /me | hồ sơ + inventory quái + slot đang chạy |
| GET | /catalog | chemicals + monsters (chỉ phần công khai, không lộ rule) |
| GET | /codex | trạng thái khám phá của người chơi + first discoverer từng chất |
| POST | /breeding | {inputs:[{chemical_id,count}], conditions} → {session_id, ready_at} hoặc NO_REACTION ngay |
| POST | /breeding/:id/collect | → {products, new_discoveries, first_discoveries} |
| POST | /extractor/claim | nhận quái nguyên tố miễn phí (nếu chốt 6.2) |

- Mọi request và response đều có zod schema trong `packages/shared`.
- `POST /breeding` trừ quái đầu vào ngay trong transaction. `collect` cộng sản phẩm và ghi discovery trong 1 transaction.
- `collect` gọi 2 lần sẽ trả cùng kết quả, không cộng quái 2 lần (dựa vào status).
- Slice 1 có 2 slot lai tạo chạy song song.

## 11. Màn hình

```
┌─────────────────────────────────────────────┐
│ [Lv1 · huy]                  [Codex] [Bảng] │  ← overlay React
│                                             │
│      kệ habitat 3D        máy lai tạo 3D    │  ← canvas R3F
│   (quái đang có)       ┌───────────────┐    │
│                        │ A [HYDRO ×2]  │    │
│                        │ B [OXY ×1]    │    │
│                        │ T 25°C  P 1atm│    │
│                        │ Xt —  MT khí  │    │
│                        │ Kích: tia lửa │    │
│                        │   [ START ]   │    │
│                        └───────────────┘    │
└─────────────────────────────────────────────┘
```
- Codex: lưới thẻ, chất chưa khám phá hiện "???" kèm gợi ý thành phần nguyên tố.
- Bảng tuần hoàn: 118 ô đúng vị trí. Slice 1 chỉ 25 ô có quái, các ô còn lại mờ.
- Chi tiết quái: viewer 3D xoay được, công thức, mô tả, người khám phá đầu tiên.

## 12. Kiểm thử

- `chem-engine`: unit test cho parser, cân bằng nguyên tố, resolver (mọi nhánh của bước 4), tính số lượng và phần dư.
- `content`: validator chạy như một test. Nội dung sai thì CI fail.
- `api`: integration test với Postgres thật trong docker. Gồm: register cấp quái, breeding trừ quái, collect idempotent, First Discovery khi 2 request chạy đồng thời (chỉ 1 người thắng).
- `web`: Playwright 1 luồng chính: đăng ký → lai H₂ + O₂ → nhận AQUA → Codex hiện AQUA.

## 13. Để builder tự quyết

Cấu trúc thư mục bên trong app, tên component, thư viện UI nhỏ, cách dựng placeholder cụ thể, ánh sáng và vật liệu scene, mã lỗi chi tiết, cấu hình lint và format.

## 14. Quyết định đã chốt (2026-11-20)
1. Quái đầu vào bị tiêu thụ (6.2).
2. AI soạn nội dung hóa học, anh duyệt (7).
3. Slice 1 dùng placeholder; model Blender làm thành track riêng sau đó (8).
4. Không đặt mốc thời gian. Làm nhanh nhất có thể bằng subagent chạy song song. Plan phải chia task theo ranh giới package để các subagent không sửa cùng một file.
5. Lý do làm game: chưa nêu, không chặn việc lên plan.
