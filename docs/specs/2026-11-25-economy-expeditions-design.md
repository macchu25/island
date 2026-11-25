# CHEMIMON: kinh tế, khai thác, chợ, xưởng chế tạo (thiết kế)

Ngày: 2026-11-25 · Trạng thái: CHỜ ANH DUYỆT (đã qua builder check, 4 câu hỏi đã tự quyết, đánh dấu "quyết định của tôi")
Nền: `main` tại `fbfed8c` (đảo 3D, Phòng lai tạo có ảnh, nhiệm vụ). Tài liệu trước: `docs/specs/2026-11-20-chemimon-slice1-design.md`, `docs/specs/2026-11-20-island-and-models.md`.

---

## 1. Ý định

Thêm một nền kinh tế có ý nghĩa hóa học thật vào game:

- **Khai thác:** người chơi gửi quái đến các nơi ngoài đời có chất đó (mỏ sắt, hồ muối, tháp tách khí) để lấy quặng, khí, kim loại tự nhiên.
- **Tinh luyện:** quặng không phải kim loại sạch. Người chơi dùng Phòng lai tạo để tinh luyện (Fe₂O₃ + CO → Fe).
- **Chi phí phản ứng:** điều kiện khắc nghiệt (nhiệt cao, áp suất cao, khí trơ) tốn tiền. Đây là chỗ tiêu tiền chính.
- **Chợ:** người mua ở các gian hàng cần một chất cho một việc thật (tiệm bánh cần NaHCO₃ làm bột nở). Giao hàng thì nhận tiền.
- **Xưởng chế tạo:** ghép chất thành sản phẩm (chip từ Si, Au, Cu). Sản phẩm bán giá cao hơn.
- **Sau này:** mua phòng thí nghiệm mới (lò cao, buồng áp suất, buồng điện phân) để tạo chất đặc thù, hiếm hơn.

**Lý do (lời anh):** tiền dùng trước hết để trả cho môi trường và nhiệt độ lò phản ứng. Sau này, để có chất mới và hiếm hơn, người chơi mua phòng thí nghiệm hoặc môi trường.

## 2. Goals / Non-goals / Anti-goals

### Goals
1. Một đơn vị tiền: **Xu**. Mọi thay đổi số Xu đều ghi sổ, không bao giờ âm.
2. Lai tạo có phí theo điều kiện. Thử mà không có phản ứng thì không mất Xu.
3. Người chơi luôn kiếm lại được Xu, kể cả khi về 0 (không có ngõ cụt).
4. Người mới chỉ nhận 6 nguyên tố. 19 nguyên tố còn lại kiếm qua khai thác, tinh luyện, hoặc Máy chiết.
5. Chợ có đơn hàng gắn ứng dụng thật, và thu mua giá sàn bất kỳ lúc nào.
6. Xưởng chế tạo có công thức công khai, mở thêm bằng bản vẽ.
7. Mọi giá, phí, thời gian nằm trong dữ liệu nội dung, không nằm trong code, để chỉnh giá không cần sửa code.

### Non-goals (để sau)
- Thanh toán tiền thật. Mua bán giữa người chơi. Chợ chung cho mọi người chơi.
- Thiết kế chi tiết Lát 5 (phòng thí nghiệm mới). Ở đây chỉ có khung.
- Nguyên tố mới ngoài 25 hiện có (Ti, Ni, Sn, ...). Làm ở các đợt nội dung sau.
- Bản đồ thế giới 3D cho khai thác. Bản đầu là một bảng danh sách các nơi.

### Anti-goals (vi phạm là thất bại, dù code chạy đúng)
- Kết quả lai tạo có yếu tố ngẫu nhiên. Quy tắc này giữ nguyên, và mở rộng sang khai thác: sản lượng là tất định.
- Người chơi bị kẹt: hết Xu, không còn gì để bán, không còn cách kiếm.
- Câu ứng dụng ở chợ trở thành hướng dẫn thực hành. Chỉ nói chất dùng làm gì, không nói cách làm, không có lượng thật.
- Công thức chế tạo trình bày như phản ứng hóa học. Sản phẩm là luật game và phải hiện rõ là như vậy.
- AI tự bịa phản ứng hay câu ứng dụng rồi đưa vào game mà anh chưa duyệt.

## 3. Ràng buộc

- Giữ nguyên stack: Hono + Prisma 7 + PostgreSQL 16, React 19 + react-three-fiber, pnpm monorepo, nội dung YAML trong `packages/content`.
- Mọi thay đổi Xu và kho đồ của một người chơi chạy trong transaction có khóa người chơi (cơ chế khóa hiện có của lai tạo).
- Tài khoản cũ không mất gì.
- Công trình mới trên đảo dựng bằng Blender theo quy ước của `docs/specs/2026-11-20-island-and-models.md`.

## 4. Approaches (thứ tự xây)

| | A. Từng lát có thứ tự (ĐÃ CHỌN) | B. Làm một lần | C. Khai thác trước |
|---|---|---|---|
| Cách | 5 lát, mỗi lát chơi được từ DB tới giao diện | Cả 5 phần trong một nhánh | Khai thác + bộ 6 trước, Xu sau |
| Ưu | Anh chơi thử và chỉnh giá sau mỗi lát | Ra một lần | Có ngay cảm giác "đi mỏ" |
| Nhược | 5 lần duyệt | Lỗi kinh tế phát hiện muộn, khó tách | Phí đi và giấy phép vô nghĩa khi chưa có Xu, phải làm lại |

Anh chọn A (2026-11-25). Ràng buộc thứ tự: chỗ tiêu Xu và chỗ kiếm Xu ra cùng lát; bộ khởi đầu 6 ra cùng khai thác; chip cần Au nên Xưởng sau khai thác.

```
Lát 1  Ví Xu + phí điều kiện + thu mua giá sàn
Lát 2  Khai thác + bộ khởi đầu 6 nguyên tố + Codex nguyên tố "chưa biết"
Lát 3  Đơn hàng ở chợ
Lát 4  Xưởng chế tạo + bản vẽ
Lát 5  Phòng thí nghiệm mới (thiết kế riêng sau)
```

## 5. Quyết định chung

| Quyết định | Giá trị | Nguồn |
|---|---|---|
| Tên tiền | Xu, số nguyên ≥ 0 | đề xuất, anh không sửa |
| Xu ban đầu | 200 cho người mới. Tài khoản cũ cũng nhận 200 một lần | đề xuất của tôi |
| Thu phí lai tạo khi | chỉ khi phản ứng xảy ra (STARTED). NO_REACTION miễn phí | anh không sửa |
| Xúc tác | mua 1 lần, dùng mãi (Lát 5). Trước Lát 5 dùng miễn phí như hiện nay | đề xuất, anh không sửa |
| Sản lượng khai thác | tất định, không ngẫu nhiên | quyết định của tôi, theo anti-goal |
| Tài khoản cũ | giữ nguyên quái. Không thu lại 19 nguyên tố | đề xuất của tôi |
| Giá, phí, thời gian | nằm trong `packages/content/data/economy.yaml` (file mới) | quyết định của tôi |

## 6. Lát 1: Ví Xu, phí điều kiện, thu mua giá sàn

### Người chơi thấy
- Thanh trên cùng hiện số Xu.
- Trong Phòng lai tạo, mỗi nút điều kiện có giá (ví dụ "1000 °C · 40"). Cạnh nút Bắt đầu hiện tổng phí. Không đủ Xu thì nút bị khóa và nói thiếu bao nhiêu.
- Công trình mới **Chợ**. Bấm vào mở bảng "Thu mua": mỗi chất đang có, giá sàn, chọn số lượng, bấm Bán.

### Bảng giá điều kiện (giá khởi điểm, chỉnh được)

| Điều kiện | Miễn phí | Giá mỗi lần lai |
|---|---|---|
| Nhiệt độ | 25 °C | 200 °C: 5 · 450 °C: 15 · 1000 °C: 40 · 2500 °C: 120 · −78 °C: 20 |
| Áp suất | 1 atm | 10: 10 · 100: 40 · 200: 80 |
| Môi trường | không khí | nước: 2 · khí trơ: 10 |
| Kích hoạt | không | tia lửa: 3 · ánh sáng: 3 |
| Xúc tác | tất cả | (miễn phí tới Lát 5) |

Phí một lần lai = tổng giá các điều kiện đã chọn.

### Giá sàn thu mua (quyết định của tôi sau builder check)
- Mỗi chất có một giá sàn ghi thẳng trong `economy.yaml`. Không tính bằng công thức lúc chạy.
- Quy tắc soạn giá:
  - Chất Máy chiết cho được (16 nguyên tố): 1 đến 3 Xu. Thấp có chủ ý, vì Máy chiết miễn phí.
  - Chất khác: khoảng 50% **chi phí làm ra rẻ nhất** (phí đi mỏ + phí điều kiện của đường rẻ nhất). Ví dụ 2 Fe tốn ít nhất 50 Xu (mỏ sắt 10 + phản ứng 1000 °C 40), nên giá sàn Fe khoảng 12 Xu mỗi con.
- Giá sàn là đường thoát, không phải cách làm giàu: bán giá sàn luôn lỗ so với chi phí làm ra.
- Máy chiết cho 1 nguyên tố mỗi 60 giây. Bán lại giá sàn tối đa khoảng 60 đến 180 Xu mỗi giờ. Đủ để thoát kẹt, không đủ để bỏ qua chợ.
- Một test nội dung tính chi phí làm ra rẻ nhất của từng chất từ dữ liệu, và báo lỗi khi giá sàn vượt chi phí đó.

### Dữ liệu
- `users.coins` (int, ≥ 0, mặc định 0; migration đặt 200 cho mọi tài khoản hiện có).
- Bảng mới `coin_ledger`: `id`, `player_id`, `delta` (int, âm hoặc dương), `balance_after`, `reason` (`starter`, `breeding_fee`, `sell_floor`, ...), `ref_id` (id phiên lai, id đơn hàng, ...), `created_at`. Ràng buộc unique (`player_id`, `reason`, `ref_id`) để một sự kiện không ghi 2 lần.
- `breeding_sessions.fee` (int): phí đã thu, để hiển thị và đối soát.

### API
- `GET /api/me`: thêm `coins`.
- `POST /api/breeding`: thêm lỗi `409 INSUFFICIENT_COINS { needed, have }`. Thứ tự kiểm tra: chất có thật → đủ quái → còn ô → resolve → nếu NO_REACTION thì trả NO_REACTION (không thu) → nếu thiếu Xu thì INSUFFICIENT_COINS → trừ quái, trừ Xu, ghi sổ, tạo phiên.
- `GET /api/economy`: bảng giá điều kiện và giá sàn (client hiện giá, server vẫn tự tính lại).
- `POST /api/market/sell { chemicalId, count }` → `{ coins, inventory }`. Lỗi: `INSUFFICIENT_MONSTERS`.

### Nhiệm vụ thêm
"Bán món hàng đầu tiên", "Chạy một phản ứng ở 1000 °C".

### Đánh đổi đã chấp nhận
NO_REACTION miễn phí nghĩa là người chơi dò công thức không tốn Xu. Chỉ chạy thật mới tốn. Chấp nhận, vì khám phá là cái thú chính.

## 7. Lát 2: Khai thác, bộ khởi đầu 6 nguyên tố

### Người chơi thấy
- Công trình mới **Bến khai thác** ở mép đảo. Bấm vào mở bảng các nơi:

| Nơi | Mang về | Thời gian | Phí | Mở |
|---|---|---|---|---|
| Bãi cát | SiO₂ | 10 phút | 0 | sẵn |
| Hồ muối | NaCl | 10 phút | 0 | sẵn |
| Mỏ sắt | Fe₂O₃, Fe₃O₄ | 15 phút | 10 | sẵn |
| Mỏ đồng | CuO | 15 phút | 10 | sẵn |
| Tháp tách khí | N₂, O₂, Ar, Ne | 20 phút | 20 | giấy phép |
| Giếng khí tự nhiên | He | 20 phút | 20 | giấy phép |
| Sông đãi vàng | Au, Ag | 30 phút | 30 | giấy phép |
| Miệng núi lửa | S₈ | 30 phút | 30 | giấy phép |

(Thời gian, phí, giá giấy phép là số khởi điểm trong `economy.yaml`.)

- Chọn 1 quái để gửi đi. Quái đó tạm vắng: không hiện trên đảo, không dùng để lai, không bán được.
- Hết giờ, bấm Nhận. Quái về, kèm sản lượng.
- Tối đa 2 chuyến cùng lúc (riêng với 2 ô lai tạo).
- Quái cùng nhóm với nơi đến (khu trên đảo: kim loại đi mỏ kim loại) mang về nhiều hơn 50%, làm tròn xuống.
- Quái không bao giờ bị mất.
- Cu₂O (quặng cuprit) chưa có trong Mỏ đồng, vì game chưa có phản ứng tinh luyện nó. Phản ứng Cu₂O + C → Cu là ứng viên cho đợt nội dung sau, anh duyệt (quyết định của tôi).
- Trong Lát 2, các nơi có giấy phép (khí, vàng, núi lửa) lỗ Xu: He, Ne, Ar, Au, Ag, S₈ chưa là đầu vào của phản ứng nào. Giá trị của chúng ở Lát 2 là mở Codex và nhiệm vụ. Từ Lát 3 chúng có đơn hàng riêng (mục 8). Chấp nhận khoảng lỗ tạm này trong 1 lát (quyết định của tôi).

### Nguồn của 19 nguyên tố

| Nguồn | Nguyên tố |
|---|---|
| Khai thác trực tiếp | Ar, Ne (tháp tách khí), He (giếng khí), Au, Ag (đãi vàng), S₈ (núi lửa) |
| Khai thác quặng rồi tinh luyện bằng phản ứng đã có | Fe, Cu, Si |
| Máy chiết (chưa có đường hóa học trong game) | Mg, Al, K, Ca, Zn, Hg, Pb, F₂, I₂, P₄ |

Máy chiết cho: 6 nguyên tố khởi đầu và 10 nguyên tố ở dòng cuối (16 loại). Nó không cho 9 nguyên tố đã có nơi khai thác.

### Bộ khởi đầu
H₂, O₂, C, N₂, Na, Cl₂, mỗi loại 4 con, cộng 200 Xu. Đủ để làm nhiệm vụ "Tạo ra nước" ngay (miễn phí, 25 °C, tia lửa 3 Xu).

### Codex và khám phá (quyết định của tôi sau builder check)
- Mọi chất (nguyên tố và hợp chất) hiện "chưa biết" cho tới lần đầu người chơi có nó, từ bất kỳ nguồn nào: khởi đầu, khai thác, Máy chiết, lai tạo.
- `player_discoveries` thêm cột `source` (`starter` | `extractor` | `expedition` | `breeding`), ghi nguồn của lần đầu.
- **First Discovery giữ nguyên luật Slice 1:** chỉ hợp chất, chỉ khi tạo ra bằng lai tạo. Đào được NaCl không làm ai thành người khám phá đầu tiên của NaCl. Nguyên tố không có người khám phá đầu tiên.
- Nhiệm vụ "Khám phá N hợp chất" và "Hoàn thành Codex hợp chất" chỉ đếm hợp chất có `source = breeding`, để nhiệm vụ vẫn dẫn người chơi đi lai tạo.
- Migration: tài khoản cũ được ghi đã biết đủ 25 nguyên tố (`source = starter`); hợp chất đã có giữ `source = breeding`.

### Dữ liệu
- Nội dung `economy.yaml` → mục `places`: `id`, tên, `drops` [{chemicalId, count}], `durationS`, `fee`, `permitPrice` (0 = sẵn), `bonusHabitat`.
- Bảng mới `expeditions`: `id`, `player_id`, `place_id`, `monster_chemical_id`, `status` (running | collected), `started_at`, `ready_at`, `result` (json sản lượng đã tính lúc gửi), `collect_outcome` (json, để nhận lại 2 lần trả cùng kết quả).
- Bảng mới `player_permits`: `player_id`, `place_id`, `bought_at`.
- Quái đi vắng: trừ 1 khỏi `player_monsters` lúc gửi, cộng lại lúc nhận (giống cách lai tạo giữ quái).

### API
- `GET /api/expeditions` → các nơi (đã mở hay chưa) và các chuyến đang chạy.
- `POST /api/expeditions { placeId, chemicalId }` → chuyến mới. Lỗi: `SLOTS_FULL`, `INSUFFICIENT_MONSTERS`, `INSUFFICIENT_COINS`, `PLACE_LOCKED`.
- `POST /api/expeditions/:id/collect` → sản lượng. Gọi 2 lần trả cùng kết quả, chỉ cộng 1 lần.
- `POST /api/permits { placeId }` → mua giấy phép.

### Nhiệm vụ thêm
"Gửi quái đi khai thác lần đầu", "Tinh luyện sắt từ quặng" (có Fe từ phản ứng Fe₂O₃ hoặc Fe₃O₄).

## 8. Lát 3: Đơn hàng ở chợ

### Người chơi thấy
Trong Chợ, ngoài "Thu mua" có thêm "Đơn hàng": 4 gian, mỗi gian 1 đơn.

```
🧁 Tiệm bánh     cần 3 NaHCO₃  "bột nở giúp bánh xốp"     90 Xu  [Giao]
🍜 Quán ăn       cần 4 NaCl    "nêm món ăn"                40 Xu
🏭 Nhà máy thép  cần 2 Fe      "đúc dầm cầu"               70 Xu
🧪 Hồ bơi        cần 2 Cl₂     "khử trùng nước hồ bơi"     60 Xu
```

- Giao đủ thì nhận Xu, gian đó có đơn mới sau một khoảng chờ.
- Đơn chỉ đòi chất người chơi đã khám phá (hoặc sản phẩm đã có bản vẽ). Gian chưa có đơn nào hợp lệ hiện "Chưa có đơn. Khám phá thêm chất nhé."
- **Đơn hết hạn** sau 4 giờ (số khởi điểm). Hết hạn thì gian đổi đơn mới, không mất gì. Không có nút bỏ qua. Vậy một đơn khó không chặn gian đó mãi (quyết định của tôi).
- Các chất từ nơi có giấy phép có đơn riêng: He (tiệm bóng bay), Ne (biển hiệu đèn neon), Ar (xưởng bóng đèn), Au và Ag (tiệm kim hoàn), S₈ (nhà máy cao su).

### Giá đơn hàng (quyết định của tôi sau builder check)
- Thưởng mỗi đơn ghi thẳng trong `buyers.yaml`, không tính từ giá sàn.
- Test nội dung kiểm tra mỗi đơn: thưởng ≥ 1,5 lần chi phí làm ra rẻ nhất của hàng cần giao, và ≥ 2 lần tổng giá sàn. Đơn lỗ thì không qua được kiểm tra.

### Dữ liệu
- Nội dung `buyers.yaml`: gian hàng và kho đơn mẫu: `id`, gian, chất hoặc sản phẩm, số lượng, thưởng, câu ứng dụng (tiếng Việt), điều kiện hiện (ví dụ cần đã khám phá chất đó).
- Chọn đơn **tất định** theo (người chơi, gian, số lần đã giao, khung 4 giờ hiện tại), không dùng ngẫu nhiên thật. Cùng trạng thái thì cùng đơn. Dễ test, không lạm dụng tải lại trang để đổi đơn.
- Bảng mới `market_orders`: đơn đang mở và đơn đã giao của mỗi người chơi.

### Phụ thuộc nội dung
NaHCO₃ (baking soda) chưa có trong game. Cần một đợt nội dung: dữ liệu chất, quái dựng Blender, ảnh, và phản ứng tạo ra nó. Anh duyệt từng phản ứng và từng câu ứng dụng, giống cổng G1 ở Slice 1. Lát 3 chạy được với đơn từ các chất đã có; đơn NaHCO₃ bật khi đợt nội dung xong.

## 9. Lát 4: Xưởng chế tạo

### Người chơi thấy
- Công trình mới **Xưởng chế tạo**. Bấm vào thấy danh sách công thức đã mở và công thức đang khóa (mua bản vẽ để mở).
- Công thức ghi rõ là "công thức chế tạo", không viết dạng phương trình.
- Chọn công thức, bấm Chế tạo, chờ, nhận sản phẩm. Nguyên liệu bị dùng hết.
- Sản phẩm có ảnh, có trong kho, bán được ở Chợ (giá sàn và đơn hàng).

Ví dụ khởi điểm (anh duyệt danh sách cuối):

| Sản phẩm | Nguyên liệu | Ứng dụng |
|---|---|---|
| Chip | 2 Si, 1 Au, 1 Cu | thiết bị điện tử |
| Lon nhôm | 2 Al | đựng nước uống |
| Dây điện | 3 Cu | dẫn điện |
| Kính | 3 SiO₂, 1 Na₂O | cửa sổ |

### Dữ liệu
- Nội dung `products.yaml`: `id`, tên, công thức, thời gian, giá bản vẽ, giá sàn, câu ứng dụng, mã ảnh.
- Bảng mới `player_products` (kho sản phẩm), `player_blueprints`, `workshop_jobs` (như phiên lai tạo).
- Ảnh sản phẩm: dựng Blender, render bằng cùng quy trình ảnh quái.

## 10. Lát 5: Phòng thí nghiệm mới (khung, thiết kế chi tiết sau)

- Lò cao: mở 1000 °C và 2500 °C.
- Buồng áp suất: mở 100 và 200 atm.
- Phòng lạnh: mở −78 °C.
- Buồng điện phân: điều kiện mới, cho phản ứng tạo Al, Mg, K, Ca, ... (anh duyệt từng phản ứng). 10 nguyên tố đang lấy từ Máy chiết sẽ có đường hóa học.
- Xúc tác: mua 1 lần mỗi loại.

**Câu hỏi để mở tới Lát 5:** khi khóa 1000 °C sau lò cao, người chơi đang dùng 1000 °C từ Lát 1 có giữ quyền dùng không?

## 11. Công trình mới trên đảo

3 công trình: Chợ, Bến khai thác, Xưởng chế tạo. Mỗi cái một model Blender (≤ 8000 tam giác, ≤ 1 MB), đặt trong `layout.json`. Bến khai thác nằm ở mép đảo. Vị trí cụ thể do builder chọn, không chồng lên 7 khu và 3 công trình hiện có. Mỗi công trình làm cùng lát cần nó: Chợ ở Lát 1, Bến ở Lát 2, Xưởng ở Lát 4.

## 12. Kiểm thử (mỗi lát)

- Test API trên DB thật cho mọi luồng tiền: đủ Xu, thiếu Xu, NO_REACTION không thu, số dư không bao giờ âm, sổ khớp số dư.
- Hai yêu cầu giống hệt gửi cùng lúc: theo luật lai tạo hiện có. Cả hai thành công nếu đủ hàng và đủ Xu cho cả hai; cái sau bị từ chối nếu không đủ. Không dùng idempotency key phía client. Riêng nhận chuyến khai thác và giao đơn dùng id của chuyến hoặc đơn làm `ref_id`, nên nhận 2 lần chỉ cộng 1 lần (quyết định của tôi).
- Test tất định: cùng trạng thái cho cùng sản lượng khai thác và cùng đơn hàng.
- Test "không ngõ cụt": người chơi 0 Xu, kho trống vẫn có đường kiếm lại Xu.
- Test trình duyệt: một vòng đầy đủ của lát đó, chạy trên đảo thật.

## 13. Để builder tự quyết

- Bố cục giao diện các bảng mới, theo kiểu Phòng lai tạo hiện có.
- Vị trí công trình mới trên đảo.
- Giá sàn từng chất (theo quy tắc ở mục 6), miễn là nằm trong `economy.yaml`.
- Tên mã lỗi phụ, miễn là theo kiểu hiện có.

## 14. Cổng duyệt của anh

| Cổng | Khi nào | Anh duyệt gì |
|---|---|---|
| Sau mỗi lát | chơi thử trên link Tailscale | giá cả, cảm giác, ghép vào `main` |
| Nội dung Lát 2 | trước khi code Lát 2 | danh sách nơi và thứ mỗi nơi cho |
| Nội dung Lát 3 | trước khi bật đơn | từng câu ứng dụng; NaHCO₃ và phản ứng của nó |
| Nội dung Lát 4 | trước khi code Lát 4 | danh sách sản phẩm và công thức |
