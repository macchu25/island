# CHEMIMON — Project Master Plan

> **Tagline:** Discover · Breed · Collect  
> **Thể loại:** Monster Collection · Breeding · Laboratory Simulation · Casual Strategy  
> **Định hướng:** Game sưu tập quái vật lấy cảm hứng từ các nguyên tố và hợp chất hóa học. Người chơi thu thập nguyên tố, kết hợp chúng theo các phản ứng hóa học hợp lý để khám phá hợp chất mới, bổ sung vào bộ sưu tập và cạnh tranh với người chơi khác.

---

## 1. Tầm nhìn sản phẩm

CHEMIMON là game nơi mỗi nguyên tố hoặc hợp chất hóa học được biến thành một monster có ngoại hình, tính cách và đặc điểm riêng. Người chơi bắt đầu với một số nguyên tố cơ bản, sau đó sử dụng phòng thí nghiệm để kết hợp các chất, khám phá sản phẩm mới và hoàn thiện bộ sưu tập.

### 1.1 Core Gameplay Loop

**Collect → Select → Breed → Discover → Register → Reward → Collect tiếp**

1. Thu thập monster nguyên tố.
2. Chọn các monster/chất đầu vào.
3. Thiết lập tỷ lệ và điều kiện phản ứng.
4. Chạy quá trình lai tạo trong phòng thí nghiệm.
5. Nhận kết quả: sản phẩm mới, nhiều sản phẩm hoặc không có phản ứng.
6. Ghi nhận chất mới vào Codex và bộ sưu tập.
7. Nhận thưởng, mở khóa nội dung và tiếp tục khám phá.

### 1.2 Điểm khác biệt

- Monster đại diện cho các nguyên tố và hợp chất hóa học.
- Lai tạo dựa trên dữ liệu phản ứng hóa học đã được xác thực, không phải công thức ghép tùy ý.
- Một cặp chất có thể cho kết quả khác nhau khi điều kiện hoặc tỷ lệ thay đổi, nếu hóa học thực tế hỗ trợ các hướng phản ứng đó.
- Có Periodic Table, Chemical Codex và hệ thống sưu tập.
- Có cơ chế First Discovery ghi nhận người đầu tiên khám phá một chất.
- Có bảng xếp hạng khám phá, bộ sưu tập và sự kiện nghiên cứu.

### 1.3 Nguyên tắc thiết kế khoa học

- Phân biệt dữ liệu khoa học với quy tắc game.
- Rarity là độ hiếm trong gameplay, không đồng nghĩa với độ hiếm ngoài tự nhiên, độc tính hay mức độ nguy hiểm.
- Không phải mọi chất đều ổn định hoặc có thể tồn tại lâu dài. Những chất không ổn định có thể được thể hiện dưới dạng mục Codex đặc biệt, kèm ghi chú khoa học.
- Không biến game thành hướng dẫn thực hành phản ứng nguy hiểm. Các điều kiện hóa học chỉ được mô phỏng ở mức gameplay an toàn.
- Chemistry Engine phải dựa trên dữ liệu phản ứng đã kiểm chứng. AI có thể giải thích hoặc gợi ý, nhưng không được tự tạo ra kết quả hóa học có thẩm quyền.

---

## 2. Cấu trúc quản lý dự án

Nên quản lý theo mô hình:

**Project → Epic → Feature → User Story → Task → Subtask**

| Cấp độ | Ví dụ | Ý nghĩa |
|---|---|---|
| Project | CHEMIMON | Toàn bộ sản phẩm game |
| Epic | Breeding System | Một hệ thống chức năng lớn |
| Feature | Reaction Conditions | Một nhóm tính năng |
| User Story | Select temperature | Nhu cầu của người chơi/người dùng |
| Task | Build temperature selector API | Công việc triển khai |
| Subtask | Validate input range | Công việc nhỏ hơn |
| Bug | Incorrect reaction result | Lỗi cần xử lý |

### 2.1 Trường quản lý nên có

- **Priority:** P0, P1, P2, P3.
- **Status:** Backlog, Ready, In Progress, Review, Testing, Done.
- **Assignee:** Người phụ trách.
- **Estimate:** Story Points hoặc giờ công.
- **Sprint:** Đợt triển khai.
- **Acceptance Criteria:** Điều kiện nghiệm thu.
- **Dependencies:** Các Epic/Feature/Task phụ thuộc.

### 2.2 Định nghĩa ưu tiên

| Priority | Ý nghĩa |
|---|---|
| P0 | Bắt buộc để có MVP hoặc ảnh hưởng trực tiếp đến core gameplay |
| P1 | Quan trọng để hoàn thiện trải nghiệm và tiến trình |
| P2 | Mở rộng tương tác, cạnh tranh và nội dung |
| P3 | Cải tiến hoặc tiện ích có thể triển khai sau |

---

# 3. Danh sách 12 Epic

## EPIC 01 — Game Foundation & Core Architecture

**Priority:** P0  
**Category:** Technical Foundation

### Mục tiêu

Xây dựng nền tảng kỹ thuật để các hệ thống game khác có thể phát triển, tích hợp và mở rộng.

### Features và Tasks

#### Feature 01.1 — Project Setup
- Khởi tạo project và repository.
- Thiết lập cấu trúc thư mục.
- Thiết lập môi trường Development, Staging và Production.
- Thiết lập quy trình build và deployment.
- Thiết lập quy tắc coding convention và branching.

#### Feature 01.2 — Backend Architecture
- Thiết kế backend API.
- Thiết lập database.
- Thiết lập authentication và authorization.
- Thiết kế cấu trúc response/error thống nhất.
- Thiết lập logging và monitoring cơ bản.

#### Feature 01.3 — Player Account
- Đăng ký tài khoản.
- Đăng nhập và đăng xuất.
- Quản lý hồ sơ người chơi.
- Quản lý phiên đăng nhập.
- Khôi phục tài khoản theo phương thức được hỗ trợ.

#### Feature 01.4 — Game State
- Lưu cấp độ người chơi.
- Lưu tài nguyên.
- Lưu tiến trình mở khóa.
- Lưu trạng thái phòng thí nghiệm.
- Lưu trạng thái nhiệm vụ và thành tựu.

#### Feature 01.5 — Save & Sync System
- Lưu trạng thái game phía server.
- Tải trạng thái game khi đăng nhập.
- Đồng bộ thay đổi quan trọng.
- Xử lý trường hợp mất kết nối.
- Tránh ghi đè dữ liệu cũ bằng dữ liệu lỗi thời.

#### Feature 01.6 — Security
- Validate dữ liệu đầu vào ở server.
- Kiểm tra quyền sở hữu monster và vật phẩm.
- Không tin kết quả gameplay do client tự gửi lên.
- Giới hạn request và chống spam.
- Ghi log các hành động quan trọng.

### Definition of Done

Người chơi có thể đăng ký, đăng nhập, tạo hồ sơ, lưu tiến trình và tải lại trạng thái game một cách nhất quán.

---

## EPIC 02 — Monster System

**Priority:** P0  
**Category:** Game Core

### Mục tiêu

Xây dựng hệ thống dữ liệu, hiển thị và quản lý monster. Mỗi chất hóa học có một định danh hóa học và có thể được ánh xạ tới một thiết kế monster.

### Features và Tasks

#### Feature 02.1 — Monster Database
- Định nghĩa dữ liệu 118 nguyên tố.
- Định nghĩa dữ liệu các hợp chất được hỗ trợ.
- Lưu tên, ký hiệu, công thức và phân loại.
- Lưu trạng thái vật chất và các đặc tính liên quan.
- Liên kết dữ liệu chất với monster design.

#### Feature 02.2 — Monster Identity
- Tạo `monster_id`.
- Lưu tên monster.
- Lưu công thức hóa học.
- Lưu nhóm hoặc loại chất.
- Lưu mô tả và câu chuyện nhân vật.
- Lưu thông tin Codex liên quan.

#### Feature 02.3 — Monster Model
- Thiết kế concept art.
- Thiết kế silhouette riêng cho từng monster.
- Thiết kế model 2D/3D theo art direction đã thống nhất.
- Chuẩn hóa scale, pivot và naming.
- Tối ưu asset cho nền tảng mục tiêu.

#### Feature 02.4 — Monster Animation
- Idle.
- Happy.
- Sad.
- Interaction.
- Discovery reaction.
- Các animation chiến đấu nếu game có combat.

#### Feature 02.5 — Monster Attributes
- Thuộc tính nguyên tố/hợp chất.
- Trạng thái vật chất.
- Màu sắc và hình thái đặc trưng.
- Đặc tính vật lý/hóa học có liên quan.
- Thông tin độc tính, ăn mòn hoặc phóng xạ dưới dạng cảnh báo/lore an toàn khi phù hợp.

#### Feature 02.6 — Monster Rarity
- Common.
- Uncommon.
- Rare.
- Epic.
- Legendary.
- Mythic.

Rarity là thuộc tính gameplay, không phải phân loại khoa học.

#### Feature 02.7 — Monster Evolution
- Xác định monster nào có thể tiến hóa.
- Điều kiện tiến hóa.
- Thiết kế hình thái sau tiến hóa.
- Animation tiến hóa.
- Lưu lịch sử tiến hóa.

#### Feature 02.8 — Monster Instance
- Tạo instance khi người chơi nhận monster.
- Quản lý chủ sở hữu.
- Quản lý cấp độ và trạng thái cá thể.
- Quản lý vật phẩm/trang bị nếu có.
- Quản lý giao dịch hoặc chuyển quyền sở hữu nếu sau này có trading.

### Data Model cần phân biệt

- `chemical_id`: định danh của chất hóa học.
- `monster_id`: định danh thiết kế monster đại diện cho chất.
- `monster_instance_id`: một cá thể monster thuộc sở hữu của một người chơi.

Một chất có một định nghĩa dữ liệu dùng chung, nhưng có thể có nhiều monster instance thuộc nhiều người chơi.

### Definition of Done

Game có thể tạo, hiển thị, lưu và quản lý monster cùng các cá thể monster thuộc sở hữu của từng người chơi.

---

## EPIC 03 — Periodic Table & Collection

**Priority:** P0  
**Category:** Collection & Discovery

### Mục tiêu

Tạo bảng tuần hoàn tương tác và hệ thống bộ sưu tập để người chơi theo dõi nguyên tố, hợp chất đã khám phá và chưa khám phá.

### Features và Tasks

#### Feature 03.1 — Periodic Table UI
- Hiển thị 118 nguyên tố.
- Đặt nguyên tố đúng vị trí trong bảng tuần hoàn.
- Hiển thị số hiệu nguyên tử.
- Hiển thị ký hiệu hóa học.
- Phân biệt các nhóm nguyên tố bằng màu sắc.
- Hỗ trợ trạng thái đã khám phá/chưa khám phá.

#### Feature 03.2 — Element Detail
- Hiển thị tên nguyên tố.
- Hiển thị số hiệu nguyên tử.
- Hiển thị ký hiệu và khối lượng nguyên tử tương đối khi phù hợp.
- Hiển thị trạng thái vật chất ở điều kiện tham chiếu.
- Hiển thị nhóm và chu kỳ.
- Hiển thị monster tương ứng.
- Hiển thị mô tả khoa học dễ hiểu.

#### Feature 03.3 — Monster Collection
- Danh sách monster sở hữu.
- Chi tiết monster.
- Lọc theo loại chất.
- Lọc theo rarity.
- Sắp xếp theo thời gian nhận, tên hoặc nhóm.
- Hiển thị số lượng monster đang sở hữu.

#### Feature 03.4 — Discovery Codex
- Danh sách các chất đã khám phá.
- Danh sách các chất chưa khám phá.
- Công thức hóa học.
- Phân loại nguyên tố/hợp chất.
- Trạng thái và đặc điểm cơ bản.
- Thông tin phản ứng khám phá.
- Người khám phá đầu tiên và thời gian khám phá nếu có.

#### Feature 03.5 — Collection Progress
- Tính tiến độ bộ sưu tập.
- Tính tiến độ theo nhóm nguyên tố.
- Tính tiến độ theo trạng thái vật chất.
- Tính tiến độ theo họ chất.
- Hiển thị phần trăm hoàn thành.

#### Feature 03.6 — Category Filter
- Kim loại.
- Phi kim.
- Á kim.
- Khí hiếm.
- Halogen.
- Họ nguyên tố và nhóm hóa học khác theo phân loại đã chọn.

#### Feature 03.7 — Undiscovered Items
- Hiển thị mục chưa khám phá.
- Ẩn thông tin cần giữ bí mật nếu thiết kế game yêu cầu.
- Hiển thị gợi ý khám phá ở mức phù hợp.
- Không tiết lộ kết quả chưa được khám phá nếu đó là một phần của gameplay.

#### Feature 03.8 — Collection Rewards
- Thưởng khi hoàn thành nhóm sưu tập.
- Badge.
- Lab decoration.
- Cosmetic.
- Research Points hoặc phần thưởng gameplay phù hợp.

### Definition of Done

Người chơi xem được bảng tuần hoàn, monster collection và Codex; trạng thái sở hữu và khám phá được cập nhật chính xác.

---

## EPIC 04 — Chemistry & Reaction Engine

**Priority:** P0  
**Risk:** Technical Risk cao  
**Category:** Core Simulation

### Mục tiêu

Xây dựng hệ thống xác định phản ứng hóa học dựa trên dữ liệu được kiểm chứng. Đây là lõi khoa học của CHEMIMON.

### Features và Tasks

#### Feature 04.1 — Chemical Database
- Lưu nguyên tố.
- Lưu phân tử và hợp chất.
- Lưu công thức hóa học.
- Lưu thành phần nguyên tố.
- Lưu trạng thái vật chất.
- Lưu cấu trúc hoặc thông tin phân tử khi cần.
- Lưu các thông tin khoa học tham chiếu.

#### Feature 04.2 — Reaction Database
- Lưu phản ứng đã được xác thực.
- Lưu chất đầu vào.
- Lưu chất đầu ra.
- Lưu hệ số phản ứng.
- Lưu điều kiện phản ứng ở mức cần thiết.
- Lưu nguồn tham khảo và trạng thái kiểm duyệt.
- Quản lý phiên bản dữ liệu phản ứng.

#### Feature 04.3 — Chemical Formula Parser
- Phân tích ký hiệu nguyên tố.
- Phân tích chỉ số trong công thức.
- Xử lý dấu ngoặc trong công thức khi hỗ trợ.
- Chuyển công thức thành cấu trúc thành phần nguyên tố.
- Báo lỗi với công thức không hợp lệ.

#### Feature 04.4 — Stoichiometry
- Xử lý hệ số phản ứng.
- Kiểm tra tỷ lệ mol.
- Kiểm tra cân bằng nguyên tố.
- Xử lý lượng chất đầu vào.
- Xử lý chất giới hạn nếu gameplay cần mô phỏng.

#### Feature 04.5 — Condition Validator
- Kiểm tra điều kiện nhiệt độ.
- Kiểm tra điều kiện áp suất.
- Kiểm tra chất xúc tác.
- Kiểm tra môi trường phản ứng.
- Kiểm tra các điều kiện đặc thù được lưu trong reaction database.

#### Feature 04.6 — Product Resolver
- Tìm phản ứng phù hợp với đầu vào.
- Xét tỷ lệ và điều kiện.
- Trả về sản phẩm hợp lệ.
- Hỗ trợ nhiều sản phẩm.
- Hỗ trợ nhiều hướng phản ứng khi có dữ liệu đáng tin cậy.

#### Feature 04.7 — Reaction Validation
- Kiểm tra các nguyên tố được bảo toàn.
- Kiểm tra cân bằng phương trình.
- Kiểm tra chất đầu vào và đầu ra.
- Không chấp nhận phản ứng chưa được kiểm chứng.
- Ghi nhận nguồn và trạng thái xác thực.

#### Feature 04.8 — Multiple Products
- Trả về nhiều sản phẩm.
- Xử lý hệ số từng sản phẩm.
- Cập nhật collection cho các sản phẩm mới phù hợp.
- Hiển thị kết quả cho người chơi.

#### Feature 04.9 — No Reaction
- Xử lý trường hợp không có phản ứng phù hợp.
- Trả về trạng thái rõ ràng.
- Không tự tạo sản phẩm.
- Có thể cung cấp giải thích ở mức gameplay.

#### Feature 04.10 — Reaction Explanation
- Giải thích phản ứng bằng ngôn ngữ dễ hiểu.
- Hiển thị phương trình cân bằng.
- Giải thích vai trò của điều kiện khi dữ liệu hỗ trợ.
- Hiển thị ghi chú khoa học và cảnh báo phù hợp.

### Ví dụ dữ liệu

```json
{
  "chemical_id": "chem_h2o",
  "formula": "H2O",
  "name": "Water",
  "type": "compound",
  "phase": "liquid",
  "elements": {
    "H": 2,
    "O": 1
  },
  "monster_id": "monster_aqua",
  "rarity": "common"
}
```

Ví dụ reaction record:

```json
{
  "reaction_id": "rxn_001",
  "inputs": [
    {
      "chemical_id": "chem_h2",
      "coefficient": 2
    },
    {
      "chemical_id": "chem_o2",
      "coefficient": 1
    }
  ],
  "outputs": [
    {
      "chemical_id": "chem_h2o",
      "coefficient": 2
    }
  ],
  "conditions": {
    "activation": "spark"
  },
  "verification_status": "reviewed"
}
```

Đây là ví dụ cấu trúc dữ liệu, không phải hướng dẫn thực hiện phản ứng ngoài đời.

### Definition of Done

Reaction Engine nhận đầu vào, xác thực dữ liệu và điều kiện, sau đó trả về kết quả từ reaction database. Không tự bịa sản phẩm hóa học.

---

## EPIC 05 — Breeding System

**Priority:** P0  
**Category:** Core Gameplay

### Mục tiêu

Biến Chemistry Engine thành trải nghiệm lai tạo trực quan cho người chơi.

### Features và Tasks

#### Feature 05.1 — Breeding Slots
- Quản lý số slot lai tạo.
- Kiểm tra slot đang trống/bận.
- Mở khóa slot bổ sung nếu game có progression.
- Quản lý trạng thái phiên lai tạo.

#### Feature 05.2 — Monster Selection
- Hiển thị danh sách monster người chơi sở hữu.
- Chọn monster A.
- Chọn monster B.
- Kiểm tra quyền sở hữu.
- Kiểm tra chất đầu vào có phù hợp với reaction engine hay không.

#### Feature 05.3 — Ratio Selection
- Chọn tỷ lệ đầu vào.
- Hiển thị hệ số phù hợp khi game hỗ trợ.
- Validate tỷ lệ.
- Giải thích tỷ lệ trong giao diện.

#### Feature 05.4 — Condition Selection
- Chọn nhiệt độ theo phạm vi gameplay hợp lệ.
- Chọn áp suất theo phạm vi gameplay hợp lệ.
- Chọn chất xúc tác nếu có.
- Chọn môi trường phản ứng nếu có.
- Chỉ hiển thị các điều kiện có ý nghĩa với phản ứng tương ứng.

#### Feature 05.5 — Breeding Process
- Bắt đầu phiên lai tạo.
- Hiển thị trạng thái đang xử lý.
- Hiển thị animation trong phòng thí nghiệm.
- Xử lý thời gian gameplay nếu có.
- Xử lý trường hợp người chơi thoát game hoặc mất kết nối.

#### Feature 05.6 — Result Generation
- Gọi Chemistry Engine.
- Nhận kết quả phản ứng.
- Xử lý một sản phẩm.
- Xử lý nhiều sản phẩm.
- Xử lý không có phản ứng.
- Xử lý lỗi hệ thống.

#### Feature 05.7 — Discovery Animation
- Animation khi phát hiện chất mới.
- Hiển thị monster mới.
- Hiển thị công thức hóa học.
- Hiển thị thông tin khám phá.
- Hiển thị hiệu ứng First Discovery nếu đạt điều kiện.

#### Feature 05.8 — Breeding History
- Lưu lịch sử lai tạo.
- Lưu đầu vào.
- Lưu điều kiện.
- Lưu kết quả.
- Lưu thời gian.
- Hiển thị lịch sử cho người chơi.

#### Feature 05.9 — Discovery Registration
- Kiểm tra chất đã được khám phá bởi người chơi hay chưa.
- Ghi nhận discovery mới.
- Cập nhật Codex.
- Cập nhật collection.
- Cập nhật thành tựu và bảng xếp hạng phù hợp.

### User Story mẫu

**CHEM-51 — Monster Selection**

As a player, I want to select two owned monsters so that I can use them as inputs for a breeding session.

Acceptance Criteria:
1. Chỉ hiển thị monster thuộc sở hữu của người chơi.
2. Không cho chọn monster đã bị khóa hoặc không thể sử dụng.
3. Kiểm tra quyền sở hữu lại ở server.
4. Lưu lựa chọn hợp lệ vào phiên lai tạo.
5. Hiển thị lỗi rõ ràng nếu dữ liệu không hợp lệ.

**CHEM-62 — Call Reaction Engine**

As a player, I want to submit selected monsters and reaction conditions so that the game can determine the chemical reaction result.

Acceptance Criteria:
1. Chỉ nhận đầu vào hợp lệ.
2. Kiểm tra công thức và tỷ lệ.
3. Kiểm tra điều kiện phản ứng.
4. Chỉ trả về sản phẩm đã được xác thực.
5. Không tạo sản phẩm nếu phản ứng không hợp lệ.
6. Client không được tự quyết định kết quả phản ứng.

### Definition of Done

Người chơi có thể chọn monster, thiết lập điều kiện, chạy lai tạo và nhận kết quả do Chemistry Engine xác định.

---

## EPIC 06 — Laboratory & Buildings

**Priority:** P1  
**Category:** Environment & Progression

### Mục tiêu

Xây dựng không gian phòng thí nghiệm và các công trình hỗ trợ gameplay.

### Features và Tasks

#### Feature 06.1 — Laboratory Environment
- Thiết kế môi trường phòng thí nghiệm.
- Thiết kế camera và góc nhìn.
- Thiết kế khu vực tương tác.
- Thiết kế hiệu ứng môi trường.

#### Feature 06.2 — Breeding Lab
- Khu vực lai tạo.
- Hiển thị slot lai tạo.
- Tương tác với phiên lai tạo.
- Nâng cấp chức năng nếu có.

#### Feature 06.3 — Incubator
- Khu vực nuôi/ấp nếu game có cơ chế này.
- Quản lý trạng thái.
- Hiển thị tiến trình.
- Tương tác với monster.

#### Feature 06.4 — Research Center
- Khu vực nghiên cứu.
- Mở khóa nội dung.
- Hỗ trợ hệ thống research.
- Hiển thị tiến trình nghiên cứu.

#### Feature 06.5 — Storage Center
- Quản lý sức chứa.
- Hiển thị monster và vật phẩm.
- Nâng cấp sức chứa.
- Cảnh báo khi đầy kho.

#### Feature 06.6 — Building Upgrade
- Cấp độ công trình.
- Điều kiện nâng cấp.
- Chi phí nâng cấp.
- Thời gian nâng cấp nếu có.
- Hiệu ứng sau nâng cấp.

#### Feature 06.7 — Building Interaction
- Tương tác với công trình.
- Mở giao diện chức năng.
- Hiển thị trạng thái.
- Hiển thị thông báo.

#### Feature 06.8 — Lab Decoration
- Trang trí phòng thí nghiệm.
- Mở khóa vật phẩm trang trí.
- Trang bị/tháo trang trí.
- Lưu bố cục.

### Definition of Done

Người chơi có một phòng thí nghiệm có thể tương tác, sử dụng và nâng cấp các công trình cơ bản.

---

## EPIC 07 — Progression & Economy

**Priority:** P1  
**Category:** Game Economy

### Mục tiêu

Xây dựng tiến trình phát triển và nền kinh tế trong game.

### Features và Tasks

#### Feature 07.1 — Player Level
- XP.
- Cấp độ người chơi.
- Điều kiện lên cấp.
- Phần thưởng lên cấp.

#### Feature 07.2 — Experience System
- Nhận XP từ hoạt động.
- Cập nhật XP.
- Tính cấp độ.
- Hiển thị tiến trình.

#### Feature 07.3 — Currency System
- Coins.
- Research Points.
- Energy.
- Quản lý số dư.
- Ghi lịch sử giao dịch tài nguyên.

#### Feature 07.4 — Resource Generation
- Nhận tài nguyên từ công trình.
- Thu thập tài nguyên.
- Giới hạn lưu trữ.
- Cân bằng tốc độ tạo tài nguyên.

#### Feature 07.5 — Upgrade Cost
- Chi phí nâng cấp.
- Kiểm tra tài nguyên.
- Trừ tài nguyên ở server.
- Cập nhật trạng thái công trình.

#### Feature 07.6 — Unlock System
- Mở khóa monster.
- Mở khóa công trình.
- Mở khóa tính năng.
- Mở khóa nội dung theo cấp độ hoặc nhiệm vụ.

#### Feature 07.7 — Daily Rewards
- Phần thưởng đăng nhập.
- Chuỗi ngày đăng nhập nếu có.
- Nhận thưởng.
- Chống nhận thưởng trùng.

#### Feature 07.8 — Inventory
- Danh sách vật phẩm.
- Số lượng vật phẩm.
- Sử dụng vật phẩm.
- Giới hạn kho.
- Lịch sử thay đổi.

#### Feature 07.9 — Premium Economy
- Cosmetic.
- Lab decoration.
- Premium pass.
- Tiện ích lưu trữ hoặc tiện ích trải nghiệm.
- Quản lý giao dịch.
- Không bán độc quyền quyền khám phá khoa học.

### Definition of Done

Người chơi có tiến trình rõ ràng, có thể nhận và sử dụng tài nguyên, nâng cấp công trình và mở khóa nội dung.

---

## EPIC 08 — Quest & Achievement

**Priority:** P1  
**Category:** Engagement

### Mục tiêu

Tạo mục tiêu ngắn hạn và dài hạn để duy trì động lực chơi.

### Features và Tasks

#### Feature 08.1 — Tutorial Quest
- Hướng dẫn người chơi mới.
- Hướng dẫn chọn monster.
- Hướng dẫn lai tạo.
- Hướng dẫn Codex.
- Hướng dẫn nhận thưởng.

#### Feature 08.2 — Daily Quest
- Danh sách nhiệm vụ hàng ngày.
- Theo dõi tiến độ.
- Nhận thưởng.
- Làm mới nhiệm vụ theo chu kỳ.

#### Feature 08.3 — Weekly Quest
- Nhiệm vụ hàng tuần.
- Theo dõi tiến độ.
- Phần thưởng tuần.
- Làm mới theo chu kỳ.

#### Feature 08.4 — Collection Achievement
- Thành tựu thu thập nguyên tố.
- Thành tựu thu thập hợp chất.
- Thành tựu hoàn thành nhóm.
- Thành tựu hoàn thành bộ sưu tập.

#### Feature 08.5 — Discovery Achievement
- Số lượng chất khám phá.
- Khám phá nhóm chất.
- First Discovery.
- Khám phá theo sự kiện.

#### Feature 08.6 — Breeding Achievement
- Số phiên lai tạo.
- Số phản ứng thành công.
- Khám phá sản phẩm mới.
- Khám phá nhiều sản phẩm trong một phản ứng nếu phù hợp.

#### Feature 08.7 — Reward Claim
- Nhận thưởng.
- Chống nhận thưởng trùng.
- Cập nhật tài nguyên.
- Lưu lịch sử.

#### Feature 08.8 — Achievement Showcase
- Danh sách thành tựu.
- Thành tựu nổi bật.
- Hiển thị trên hồ sơ.
- Badge và phần thưởng trang trí.

### Definition of Done

Người chơi có nhiệm vụ hàng ngày/hàng tuần và thành tựu được cập nhật dựa trên hành động thực tế trong game.

---

## EPIC 09 — UI/UX & Game Experience

**Priority:** P0  
**Category:** User Experience

### Mục tiêu

Xây dựng giao diện nhất quán, dễ hiểu và phù hợp với phong cách baby/chibi của CHEMIMON.

### Art Direction

- Phong cách chibi baby.
- Đầu to, thân nhỏ.
- Mắt tròn, biểu cảm thân thiện.
- Hình khối đơn giản, dễ nhận diện.
- Mỗi monster có silhouette riêng.
- Mỗi nguyên tố có màu sắc và đặc điểm riêng.
- Không chỉ thay màu trên cùng một mẫu monster.
- Giữ đặc tính hóa học trong thiết kế nhưng không làm monster quá đáng sợ hoặc quá phức tạp.

### Features và Tasks

#### Feature 09.1 — Main Menu
- Màn hình chính.
- Điều hướng tới các khu vực.
- Hiển thị cấp độ và tài nguyên.
- Hiển thị thông báo.

#### Feature 09.2 — Laboratory UI
- Giao diện phòng thí nghiệm.
- Điều hướng công trình.
- Hiển thị trạng thái công trình.
- Hiển thị hoạt động đang diễn ra.

#### Feature 09.3 — Monster Detail UI
- Hình ảnh/model monster.
- Tên và công thức.
- Đặc điểm.
- Rarity.
- Trạng thái sở hữu.
- Nút tương tác phù hợp.

#### Feature 09.4 — Collection UI
- Danh sách monster.
- Bộ lọc.
- Tìm kiếm.
- Trạng thái đã/chưa sở hữu.

#### Feature 09.5 — Breeding UI
- Chọn nguyên liệu.
- Chọn tỷ lệ.
- Chọn điều kiện.
- Bắt đầu lai tạo.
- Hiển thị tiến trình và kết quả.

#### Feature 09.6 — Periodic Table UI
- Bảng tuần hoàn tương tác.
- Hiển thị trạng thái khám phá.
- Xem chi tiết nguyên tố.
- Điều hướng tới monster tương ứng.

#### Feature 09.7 — Notification System
- Thông báo khám phá.
- Thông báo hoàn thành nhiệm vụ.
- Thông báo nhận thưởng.
- Thông báo sự kiện.
- Cài đặt thông báo.

#### Feature 09.8 — Tutorial UX
- Hướng dẫn theo ngữ cảnh.
- Tooltip.
- Highlight khu vực tương tác.
- Bỏ qua hoặc xem lại hướng dẫn khi phù hợp.

#### Feature 09.9 — Responsive Layout
- Tương thích kích thước màn hình mục tiêu.
- Hỗ trợ thao tác chuột và cảm ứng theo nền tảng.
- Kiểm tra các tỷ lệ màn hình phổ biến.

#### Feature 09.10 — Audio & VFX
- Nhạc nền.
- Âm thanh tương tác.
- Âm thanh khám phá.
- Hiệu ứng lai tạo.
- Hiệu ứng nhận thưởng.

### Definition of Done

Các màn hình chính có thể sử dụng được, nhất quán về giao diện và hỗ trợ hoàn chỉnh core gameplay loop.

---

## EPIC 10 — Multiplayer & Social

**Priority:** P2  
**Category:** Social

### Mục tiêu

Cho phép người chơi kết nối và tương tác với nhau.

### Features và Tasks

#### Feature 10.1 — Friend System
- Tìm người chơi.
- Gửi lời mời kết bạn.
- Chấp nhận/từ chối.
- Hủy kết bạn.
- Danh sách bạn bè.

#### Feature 10.2 — Player Profile
- Tên người chơi.
- Cấp độ.
- Thành tựu.
- Bộ sưu tập nổi bật.
- Thông tin khám phá.

#### Feature 10.3 — Lab Visit
- Xem phòng thí nghiệm của người khác.
- Xem cách bố trí.
- Xem monster trưng bày.
- Kiểm soát quyền riêng tư.

#### Feature 10.4 — Monster Trading
- Gửi yêu cầu trao đổi.
- Chọn monster.
- Xác nhận giao dịch.
- Chuyển quyền sở hữu.
- Ghi lịch sử giao dịch.
- Chống giao dịch trùng hoặc gian lận.

Lưu ý: Trading không được tính là một lần khám phá mới.

#### Feature 10.5 — Research Guild
- Tạo nhóm nghiên cứu.
- Tham gia nhóm.
- Vai trò thành viên.
- Mục tiêu nghiên cứu chung.
- Phần thưởng nhóm.

#### Feature 10.6 — Discovery Feed
- Hiển thị khám phá mới.
- Hiển thị First Discovery.
- Hiển thị hoạt động bạn bè.
- Bộ lọc nội dung.

#### Feature 10.7 — Social Interaction
- Like hoặc reaction.
- Trưng bày thành tựu.
- Tương tác với phòng thí nghiệm.

#### Feature 10.8 — Chat
- Chat bạn bè hoặc nhóm nếu thực sự cần.
- Kiểm soát nội dung.
- Báo cáo và chặn người dùng.
- Quy tắc an toàn cộng đồng.

### Definition of Done

Người chơi có thể kết bạn, xem hồ sơ, thăm lab và sử dụng các tính năng xã hội được phát hành.

---

## EPIC 11 — Leaderboard & Discovery Competition

**Priority:** P2  
**Category:** Competition

### Mục tiêu

Tạo cạnh tranh dựa trên năng lực khám phá và hoàn thiện bộ sưu tập.

### Features và Tasks

#### Feature 11.1 — Global Leaderboard
- Bảng xếp hạng toàn cầu.
- Trang chi tiết thứ hạng.
- Phân trang.
- Cập nhật dữ liệu.

#### Feature 11.2 — Total Discovery Ranking
- Xếp hạng theo số chất duy nhất đã khám phá.
- Không tính lặp cùng một chất nhiều lần.
- Đồng bộ số liệu với discovery records.

#### Feature 11.3 — First Discoverer
- Ghi nhận người đầu tiên khám phá.
- Ghi timestamp từ server.
- Ghi reaction route và điều kiện ở mức phù hợp.
- Xử lý đồng thời khi nhiều người khám phá gần như cùng lúc.
- Bảo đảm chỉ có một bản ghi First Discovery chính thức cho mỗi chất theo luật game.

#### Feature 11.4 — Rare Collection Ranking
- Xếp hạng theo tiêu chí rarity gameplay.
- Quy định rõ cách tính điểm.
- Chống tính trùng instance nếu không chủ đích.

#### Feature 11.5 — Weekly Competition
- Sự kiện khám phá hàng tuần.
- Mục tiêu theo chủ đề.
- Bảng xếp hạng sự kiện.
- Phần thưởng theo kết quả.

#### Feature 11.6 — Discovery Timestamp
- Lưu thời gian server.
- Lưu người chơi.
- Lưu chất được khám phá.
- Lưu nguồn khám phá.
- Lưu dữ liệu phục vụ kiểm tra gian lận.

#### Feature 11.7 — Anti-cheat
- Xác thực mọi kết quả ở server.
- Chống request giả.
- Chống lặp request.
- Chống multi-account abuse theo chính sách.
- Ghi log hành động bất thường.

#### Feature 11.8 — Ranking Reset
- Chu kỳ mùa giải.
- Chụp snapshot bảng xếp hạng.
- Lưu lịch sử mùa.
- Phát thưởng mùa.

### Definition of Done

Bảng xếp hạng phản ánh dữ liệu server đáng tin cậy và không tính các lần nhận/trade lặp thành khám phá mới.

---

## EPIC 12 — Admin, Analytics & Live Operations

**Priority:** P1  
**Category:** Operations

### Mục tiêu

Cung cấp công cụ quản trị dữ liệu game, người chơi, sự kiện và vận hành sản phẩm.

### Features và Tasks

#### Feature 12.1 — Admin Dashboard
- Dashboard tổng quan.
- Thống kê người chơi.
- Thống kê hoạt động.
- Thống kê khám phá.

#### Feature 12.2 — Chemical Management
- Tạo/sửa dữ liệu hóa học.
- Quản lý trạng thái kiểm duyệt.
- Quản lý nguồn tham khảo.
- Quản lý phiên bản.

#### Feature 12.3 — Reaction Management
- Tạo/sửa phản ứng.
- Kiểm tra cân bằng.
- Quản lý điều kiện.
- Review và publish dữ liệu.

#### Feature 12.4 — Monster Management
- Quản lý thông tin monster.
- Quản lý asset.
- Quản lý rarity gameplay.
- Quản lý animation và phiên bản.

#### Feature 12.5 — Player Management
- Tìm kiếm người chơi.
- Xem hồ sơ.
- Xem lịch sử hoạt động cần thiết.
- Xử lý báo cáo hoặc vi phạm theo quyền hạn.

#### Feature 12.6 — Game Configuration
- Điều chỉnh thông số.
- Cấu hình sự kiện.
- Cấu hình phần thưởng.
- Cấu hình thời gian và chu kỳ.

#### Feature 12.7 — Analytics
- Theo dõi onboarding.
- Theo dõi retention.
- Theo dõi số phiên lai tạo.
- Theo dõi tỷ lệ khám phá.
- Theo dõi tiến trình người chơi.
- Theo dõi cân bằng kinh tế.

#### Feature 12.8 — Error Monitoring
- Theo dõi lỗi client.
- Theo dõi lỗi backend.
- Theo dõi lỗi reaction engine.
- Cảnh báo hệ thống.

#### Feature 12.9 — Event Management
- Tạo sự kiện.
- Cấu hình thời gian.
- Cấu hình mục tiêu.
- Cấu hình phần thưởng.
- Kết thúc và tổng kết sự kiện.

#### Feature 12.10 — Database Backup
- Sao lưu định kỳ.
- Kiểm tra khả năng khôi phục.
- Quản lý retention.
- Theo dõi trạng thái backup.

### Definition of Done

Đội vận hành có thể quản lý dữ liệu, sự kiện, theo dõi hoạt động và xử lý các vấn đề cơ bản mà không phải sửa dữ liệu trực tiếp bằng tay.

---

# 4. Roadmap triển khai

Không nên phát triển đồng thời cả 12 Epic. Nên chia thành các Phase có mục tiêu và đầu ra cụ thể.

## Phase 1 — Prototype

**Mục tiêu:** Chứng minh vòng lặp gameplay cốt lõi hoạt động.

Epic trọng tâm:
- EPIC 01 — Game Foundation.
- EPIC 02 — Monster System.
- EPIC 04 — Chemistry Engine bản đầu.
- EPIC 05 — Breeding System bản đầu.
- EPIC 09 — UI/UX cơ bản.

Deliverables:
- Đăng nhập hoặc hồ sơ local phục vụ prototype.
- Có danh sách monster ban đầu.
- Chọn được hai monster.
- Chạy được một số phản ứng đã xác thực.
- Nhận được kết quả.
- Hiển thị monster sản phẩm.
- Lưu được tiến trình cơ bản.

## Phase 2 — Core Game

**Mục tiêu:** Biến prototype thành game có tiến trình và bộ sưu tập.

Epic trọng tâm:
- EPIC 03 — Periodic Table & Collection.
- EPIC 06 — Laboratory & Buildings.
- EPIC 07 — Progression & Economy.
- EPIC 08 — Quest & Achievement.

Deliverables:
- Bảng tuần hoàn.
- Codex.
- Collection.
- Phòng thí nghiệm.
- Công trình cơ bản.
- Cấp độ và tài nguyên.
- Nhiệm vụ và thành tựu.

## Phase 3 — Content Expansion

**Mục tiêu:** Mở rộng nội dung và chiều sâu khám phá.

Công việc:
- Mở rộng roster nguyên tố hướng tới đủ 118 nguyên tố.
- Mở rộng dữ liệu hợp chất.
- Mở rộng reaction database.
- Thêm monster và animation.
- Thêm collection categories.
- Cân bằng chi phí, thời gian và phần thưởng.
- Kiểm thử dữ liệu hóa học.

Deliverables:
- Nội dung đủ phong phú cho vòng lặp chơi dài hơn.
- Dữ liệu phản ứng được kiểm duyệt.
- Bộ sưu tập và tiến trình có mục tiêu dài hạn.

## Phase 4 — Multiplayer

**Mục tiêu:** Thêm cạnh tranh và tương tác giữa người chơi.

Epic trọng tâm:
- EPIC 10 — Multiplayer & Social.
- EPIC 11 — Leaderboard & Discovery Competition.

Deliverables:
- Hồ sơ người chơi.
- Bạn bè.
- Thăm lab.
- Discovery Feed.
- First Discovery.
- Leaderboard.
- Sự kiện khám phá.

## Phase 5 — Launch & Live Operations

**Mục tiêu:** Chuẩn bị phát hành và vận hành lâu dài.

Epic trọng tâm:
- EPIC 12 — Admin, Analytics & Live Operations.
- Kiểm thử bảo mật.
- Tối ưu hiệu suất.
- Kiểm thử tương thích nền tảng.
- Theo dõi dữ liệu người chơi.
- Quy trình cập nhật nội dung.
- Vận hành sự kiện.

Deliverables:
- Bản phát hành ổn định.
- Công cụ quản trị.
- Theo dõi lỗi và analytics.
- Quy trình backup và khôi phục.
- Kế hoạch cập nhật sau phát hành.

---

# 5. Quy mô MVP đề xuất

Không nên cố làm đủ 118 nguyên tố và hàng trăm hợp chất ngay trong phiên bản đầu tiên.

| Hạng mục | Quy mô MVP đề xuất |
|---|---:|
| Element monsters | 20–30 |
| Compound monsters | 15–20 |
| Reaction rules | 40–60 |
| Laboratory environment | 1 |
| Breeding slots | 2 |
| Buildings | 3 |
| Collection categories | 5 |
| Quests | 15 |
| Achievements | 15 |
| Leaderboard | 1 bảng cơ bản |
| Multiplayer | Chưa cần trading |

### Mục tiêu nghiệm thu MVP

Người chơi có thể:
1. Vào game.
2. Nhận monster ban đầu.
3. Xem collection.
4. Chọn nguyên liệu.
5. Thiết lập điều kiện phản ứng phù hợp.
6. Chạy lai tạo.
7. Nhận một hoặc nhiều kết quả hợp lệ.
8. Khám phá chất mới.
9. Đăng ký vào Codex.
10. Nhận thưởng và tiếp tục chơi.

**MVP thành công khi core gameplay loop hoạt động ổn định và đủ thú vị, không phải khi có số lượng monster lớn nhất.**

---

# 6. Gợi ý hệ thống kỹ thuật

Đây là hướng kỹ thuật tham khảo, cần chốt lại sau khi xác định nền tảng và quy mô đội phát triển.

| Thành phần | Công nghệ gợi ý | Vai trò |
|---|---|---|
| Game Client | Godot 4 | Gameplay và giao diện game |
| 3D Assets | Blender | Model và animation |
| Backend | Golang | API và game logic |
| Database | MongoDB | Dữ liệu người chơi, monster, game state |
| Cache / Queue | Redis | Cache, leaderboard và job |
| Realtime | WebSocket | Thông báo và cập nhật realtime |
| Infrastructure | Docker + VPS/Cloud | Triển khai và vận hành |

### Nguyên tắc kiến trúc

- Chemistry Engine nên là module độc lập với game client.
- Game client chỉ gửi yêu cầu và hiển thị kết quả.
- Backend xác thực quyền sở hữu và điều kiện.
- Reaction Engine lấy kết quả từ dữ liệu phản ứng đã kiểm chứng.
- First Discovery phải được xử lý ở server.
- Dữ liệu hóa học cần có version và trạng thái review.
- Không để client tự quyết định sản phẩm hoặc tự cộng tài nguyên.

### Các collection/entity dữ liệu tham khảo

- `users`
- `player_profiles`
- `chemicals`
- `reactions`
- `monsters`
- `monster_instances`
- `player_collections`
- `discoveries`
- `laboratories`
- `breeding_sessions`
- `achievements`
- `leaderboard_snapshots`

---

# 7. Ví dụ cấu trúc Jira chi tiết cho Breeding System

## Epic: CHEM-EPIC-05 — Breeding System

**Description:** Cho phép người chơi kết hợp các monster/chất đầu vào và điều kiện phù hợp để khám phá sản phẩm hóa học mới.

### Story 05.1 — Monster Selection

Tasks:
- CHEM-52: API lấy danh sách monster sở hữu.
- CHEM-53: UI chọn monster A.
- CHEM-54: UI chọn monster B.
- CHEM-55: Validate quyền sở hữu.

### Story 05.2 — Reaction Conditions

Tasks:
- CHEM-57: UI chọn nhiệt độ.
- CHEM-58: UI chọn áp suất.
- CHEM-59: UI chọn chất xúc tác.
- CHEM-60: Validate điều kiện phản ứng.

### Story 05.3 — Breeding Result

Tasks:
- CHEM-62: Gọi Reaction Engine.
- CHEM-63: Xử lý kết quả thành công.
- CHEM-64: Xử lý nhiều sản phẩm.
- CHEM-65: Xử lý không phản ứng.
- CHEM-66: Lưu lịch sử lai tạo.

### Quy tắc nghiệm thu chung

- Task phải có mô tả đầu vào và đầu ra.
- Story phải có Acceptance Criteria.
- API phải có validation phía server.
- UI phải có trạng thái loading, success và error phù hợp.
- Các hành động thay đổi dữ liệu phải được kiểm thử.
- Không đánh dấu Done nếu chưa có kiểm thử tương ứng.

---

# 8. Quy trình bắt đầu dự án

Trước khi tạo hàng trăm ticket, nên hoàn thành các tài liệu nền tảng theo thứ tự:

## 8.1 Game Design Document (GDD)

Chốt:
- Tầm nhìn sản phẩm.
- Đối tượng người chơi.
- Core gameplay loop.
- Cách thu thập monster.
- Cách lai tạo.
- Cách khám phá và sưu tập.
- Tiến trình người chơi.
- Kinh tế game.
- Multiplayer và cạnh tranh.
- Quy tắc rarity và reward.

## 8.2 Technical Design Document (TDD)

Chốt:
- Nền tảng phát hành.
- Game engine.
- Backend.
- Database.
- Kiến trúc Chemistry Engine.
- API contract.
- Data model.
- Authentication.
- Save/sync.
- Security.
- Deployment và monitoring.

## 8.3 Art Bible

Chốt:
- Phong cách baby/chibi.
- Tỷ lệ đầu/thân.
- Mắt và biểu cảm.
- Bảng màu.
- Quy chuẩn silhouette.
- Quy chuẩn model.
- Quy chuẩn animation.
- Quy chuẩn icon và UI.
- Cách thể hiện tính chất hóa học bằng hình ảnh.

## 8.4 Product Backlog

- Chuyển 12 Epic thành Feature.
- Chuyển Feature thành User Story.
- Chia Story thành Task và Subtask.
- Gắn Priority.
- Gắn Acceptance Criteria.
- Xác định dependency.
- Ước lượng effort.

## 8.5 Sprint Planning

- Chọn các task đã Ready.
- Kiểm tra dependency.
- Ước lượng khối lượng.
- Giao người phụ trách.
- Xác định mục tiêu sprint.
- Review và nghiệm thu cuối sprint.

---

# 9. Những quyết định cần chốt trước khi triển khai backlog đầy đủ

Các lựa chọn sau ảnh hưởng trực tiếp tới kiến trúc, effort và thứ tự phát triển.

## 9.1 Nền tảng game

- Web game / PWA.
- Mobile Android / iOS.
- PC game.
- Cross-platform (Web + Mobile + PC).

## 9.2 Quy mô đội phát triển

- Một người phát triển.
- Nhóm 2–4 người.
- Nhóm 5–10 người.

## 9.3 Game Engine

- Godot.
- Unity.
- Next.js / WebGL / Three.js.
- Chưa quyết định.

## 9.4 Phạm vi kế hoạch

- MVP trước, mở rộng sau.
- Lập kế hoạch toàn bộ game từ đầu.

---

# 10. Nguyên tắc quản lý dự án

1. Không phát triển đủ 12 Epic cùng lúc.
2. Ưu tiên core gameplay loop trước các tính năng xã hội.
3. Không tạo monster hợp chất hàng loạt trước khi có Chemistry Engine đáng tin cậy.
4. Không để UI/client tự quyết định kết quả phản ứng.
5. Dữ liệu hóa học cần nguồn tham khảo và quy trình review.
6. Rarity trong game phải tách biệt với mức độ hiếm ngoài đời.
7. First Discovery phải được ghi nhận ở server.
8. Trading không được tính là discovery.
9. Asset cần theo một Art Bible thống nhất.
10. Mỗi Story cần Acceptance Criteria trước khi đưa vào sprint.
11. MVP phải có thể chơi được từ đầu đến cuối theo core loop.
12. Chỉ mở rộng nội dung khi hệ thống nền tảng đã đủ ổn định.

---

## Kết luận

CHEMIMON nên được phát triển theo thứ tự:

**Foundation → Monster → Chemistry Engine → Breeding → Collection → Progression → Social → Competition → Live Operations.**

Trọng tâm đầu tiên là chứng minh được một trải nghiệm hoàn chỉnh: người chơi sở hữu hai monster, kết hợp chúng theo dữ liệu hóa học hợp lệ, khám phá một chất mới và lưu được kết quả vào bộ sưu tập.

Sau khi vòng lặp này hoạt động ổn định, mới mở rộng lên 118 nguyên tố, nhiều hợp chất, bảng xếp hạng và multiplayer.
