# Economy Lát 4 (workshop, blueprints, products) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new island building, the Xưởng chế tạo, turns chemicals into products by public crafting recipes; some recipes are free, the rest unlock by buying a blueprint. Products have pictures, sit in the player's stock, sell at a floor price in the Chợ and appear in market orders.

**Architecture:** Products live in a new content file `packages/content/data/products.yaml`. The API adds `player_blueprints`, `player_products` and `workshop_jobs` (same lifecycle as breeding sessions and expedition trips: consume at start, collect once, replayable collect). Market orders and floor selling gain a product item kind next to the chemical kind. Recipes are shown as game rules ("Công thức chế tạo: 2 Si, 1 Au, 1 Cu"), never as equations.

**Tech Stack:** as Lát 3.

**Spec:** `docs/specs/2026-11-25-economy-expeditions-design.md` §9, §11, §12, §2 anti-goals. The user asked (2026-11-26) to finish all slices and report once: the product list below is the controller's draft, shown to the user in the final report for approval (spec §14 gate for Lát 4). Branch `economy-slice4` stacked on `economy-slice3` (8205fed, not merged), worktree `.worktrees/econ4`.

## Global Constraints

- Products (exact; `durationS` seconds, `blueprintPrice` 0 = known from the start):

  | id | name | ingredients | durationS | blueprintPrice | floorPrice | line |
  |---|---|---|---|---|---|---|
  | can | Lon nhôm | al 2 | 120 | 0 | 5 | đựng nước ngọt |
  | wire | Cuộn dây điện | cu 3 | 300 | 0 | 4 | dẫn điện trong nhà |
  | extinguisher | Bình chữa cháy | co2 3 | 300 | 30 | 4 | dập lửa khi có cháy |  (changed in the final fix wave (R9, R10)) 
  | glass | Tấm kính | sio2 3, na2o 1 | 600 | 40 | 9 | làm cửa sổ |
  | roof | Tấm tôn | fe 2, zn 1 | 600 | 50 | 9 | lợp mái nhà |
  | steel | Thanh thép | fe 3, c 1 | 900 | 60 | 10 | dựng nhà và cầu |
  | ring | Nhẫn vàng | au 2 | 900 | 80 | 8 | làm trang sức |
  | solar | Tấm pin mặt trời | si 2, ag 1, al 1 | 1800 | 120 | 12 | biến ánh sáng thành điện |
  | chip | Chip điện tử | si 2, au 1, cu 1 | 1800 | 150 | 10 | bộ não của điện thoại và máy tính |

- Product rules (content check): every ingredient is a catalog chemical; `floorPrice ≥ sum(ingredient count × floor)` and `floorPrice ≤ ceil(1.5 × that sum)`; line 1..80 chars, no digits; ids unique and distinct from chemical ids.
- Product order templates (added to `buyers.yaml`; an order template has exactly one of `chemicalId` / `productId`):

  | id | stall | buyer | need | line | reward |
  |---|---|---|---|---|---|
  | shop-can | food | Cửa hàng tạp hóa | can 3 | bày bán nước ngọt đóng lon | 30 |
  | office-extinguisher | city | Tòa nhà văn phòng | extinguisher 2 | đặt ở hành lang để phòng cháy | 35 |  (changed in the final fix wave (R9, R10)) 
  | electrician-wire | city | Thợ điện | wire 2 | đi dây điện cho nhà mới | 20 |
  | greenhouse-glass | factory | Nhà kính trồng rau | glass 2 | lợp nhà kính trồng rau | 40 |
  | roofer-roof | factory | Thợ lợp mái | roof 2 | lợp mái nhà kho | 40 |
  | site-steel | factory | Công trường | steel 1 | dựng khung nhà cao tầng | 35 |
  | wedding-ring | tech | Tiệm áo cưới | ring 1 | làm quà cưới | 40 |  (changed in the final fix wave (R9, R10)) 
  | home-solar | tech | Nhà dân | solar 1 | lắp lên mái để có điện | 75 |
  | phone-chip | tech | Xưởng điện thoại | chip 1 | lắp vào điện thoại | 80 |

- Order rule for a product: cost = sum(ingredient count × cheapest chemical cost); `reward ≥ 1.5 × count × cost` and `reward ≥ 2 × count × floorPrice`. A product order is offered only after the player has collected at least one job of that product (the product counterpart of "discovered"; it implies the blueprint). So a fresh player's orders are unchanged from Lát 3. Existing chemical order rules unchanged.
- `WORKSHOP_SLOTS = 2` running jobs, separate from breeding and expedition slots. One job makes one product. `WORKSHOP_TIME_SCALE` env (default 1) scales `durationS`.
- Start-job check order: known product (`UNKNOWN_PRODUCT` 400) → blueprint owned (`BLUEPRINT_LOCKED` 409) → owns every ingredient (`INSUFFICIENT_MONSTERS` 409) → free slot (`SLOTS_FULL` 409) → remove ingredients, create job. No Xu fee. Collect before ready → `NOT_READY` 409; collect twice returns the same body and adds the product once.
- Blueprint purchase: `POST /api/workshop/blueprints { productId }`: unknown → `UNKNOWN_PRODUCT` 400; owned or price 0 → `BLUEPRINT_OWNED` 409; Xu short → `INSUFFICIENT_COINS` 409 `{ needed, have }`; else charge once. Ledger reason `blueprint`, `ref_id` = product id.
- Floor selling of products: `POST /api/market/sell` accepts `{ productId, count }` as an alternative to `{ chemicalId, count }` (exactly one); reason `sell_floor`. `INSUFFICIENT_PRODUCTS` 409 when short.
- Order delivery of a product order removes products (`INSUFFICIENT_PRODUCTS` 409 when short). `market_orders` gains `product_id` (nullable) and `chemical_id` becomes nullable, CHECK exactly one set.
- New quests: `craft-first` "Chế tạo sản phẩm đầu tiên" (right after `deliver-first`), `blueprint-first` "Mua bản vẽ đầu tiên" (right after `craft-first`). Progress: workshop jobs started; ledger rows with reason `blueprint`. 18 quests.
- Workshop building: label "Xưởng chế tạo", Blender model ≤ 8000 triangles, ≤ 1 MB, rules of `docs/specs/2026-11-20-island-and-models.md` §5; placed in `layout.json` without overlapping the 7 habitats and 5 buildings (builder picks; a candidate is `(x 0, z -6, r 2.2)`); clicking it opens the workshop.
- Product pictures: 9 Blender recipes rendered with the monster thumbnail pipeline to `apps/web/public/assets/products/thumbs/<id>.png`; the web falls back to a coloured tile with the name when a picture is missing.
- UI copy Vietnamese. A recipe line reads "Công thức chế tạo: 2 Si, 1 Au, 1 Cu" (formulas with subscripts), never an arrow or equation.
- No price, count, time or line literal in API or web code; all from content.
- Test DB `chemimon_test` is shared: one runner at a time. Do not touch `chemimon_dev` or `chemimon_dev3`. Never read .env files (a hook blocks any command containing ".env").
- Commands: `pnpm exec vitest run`, `pnpm typecheck`, `pnpm e2e`, `pnpm --filter @chemimon/content validate`, `pnpm --filter @chemimon/api db:generate` after a schema change. After building any model, run `node scripts/monster-manifest.mjs` and commit the manifests.

## Review Focus

1. Two concurrent collects of one job: one product added, same body twice → Task 4.
2. Starting a job with exactly the ingredients owned: inventory 0, market cannot sell them, breeding refuses them → Task 4.
3. Concurrent double blueprint purchase: one 200, one 409 `BLUEPRINT_OWNED`, Xu charged once → Task 4.
4. A product order is never offered before the player has collected one job of that product, even for the free `can` and `wire`; a fresh player's food stall still offers only `snack-n2` → Task 4.
5. An old open chemical order row survives the migration unchanged and can still be delivered → Task 4.

---

### Task 1: Shared contracts

**Files:** Modify `packages/shared/src/{config,orders,api,errors,index}.ts`; Create `packages/shared/src/products.ts`. Test `packages/shared/test/{products,orders,api}.test.ts`.

**Interfaces (produces):**
- `WORKSHOP_SLOTS = 2`.
- `ProductSchema = { id, name, ingredients: StackCount[] (≥1), durationS: int≥1, blueprintPrice: int≥0, floorPrice: int≥1, line: string 1..80, assetKey }`; `ProductsSchema = { products: Product[] }`; type `Product`.
- `OrderTemplateSchema`: `chemicalId` and `productId` both optional, refine exactly one. `MarketOrderViewSchema` same (exactly one of `chemicalId` / `productId`).
- `ProductStackSchema = { productId, count: int≥0 }`; `MeResponse` gains `products: ProductStack[]`.
- `SellRequestSchema`: exactly one of `chemicalId` / `productId`, plus `count`; `SellResponseSchema` gains optional `product: ProductStack` next to `inventory`.
- `DeliverResponseSchema`: `inventory` becomes optional, gains optional `product: ProductStack` (exactly one present).
- `WorkshopJobViewSchema = { id, productId, status: 'running'|'collected', startedAt, readyAt }`; `WorkshopResponseSchema = { products: (Product & { unlocked: boolean })[], jobs: WorkshopJobView[] }` (running only); `WorkshopStartRequestSchema = { productId }`; `WorkshopStartResponseSchema = { job: WorkshopJobView }`; `WorkshopCollectResponseSchema = { product: ProductStack }`; `BlueprintRequestSchema = { productId }`; `BlueprintResponseSchema = { productId, coins }`.
- `ERROR_CODES` gains `UNKNOWN_PRODUCT`, `BLUEPRINT_LOCKED`, `BLUEPRINT_OWNED`, `INSUFFICIENT_PRODUCTS`.

- [ ] **Step 1: Failing tests:** OrderTemplate with both or neither item id fails, with one passes; SellRequest same; ProductSchema rejects empty ingredients and floorPrice 0; MeResponse requires `products`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/shared` → FAIL.
- [ ] **Step 3: Implement.** Update every existing producer of `MeResponse` / `SellResponse` fixtures in tests so typecheck passes (`products: []`).
- [ ] **Step 4: Run** `pnpm exec vitest run packages/shared && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(shared): workshop, product and product-order contracts`.

### Task 2: Products content and checks

**Files:** Create `packages/content/data/products.yaml`, `packages/content/src/products.ts`; Modify `packages/content/data/buyers.yaml` (9 product templates), `src/buyers.ts`, `src/cli.ts`; `apps/api/src/boot.ts`, `app.ts` (`AppDeps.products`), `server.ts`, `main.ts`, API test helpers (fixture products: `can`, `wire`, `soap` built from fixture-catalog chemicals, plus product templates `shop-can`, `hotel-soap`). Test `packages/content/test/{products,buyers}.test.ts`, `apps/api/test/boot.test.ts`.

**Interfaces:** `loadProducts(opts?): Product[]`; `validateProducts(c: Catalog, e: Economy, p: Product[]): ValidationIssue[]` with codes `PRODUCT_UNKNOWN_CHEMICAL`, `PRODUCT_DUPLICATE`, `PRODUCT_FLOOR_RANGE`, `PRODUCT_LINE_DIGITS`; `validateBuyers(c, e, b, extractorIds, products)` gains `BUYER_UNKNOWN_PRODUCT`, `ORDER_ITEM_KIND` (both or neither id) and applies the product order rule.

- [ ] **Step 1: Failing tests:** real `products.yaml` has the 9 rows of the table verbatim; real content validates with 0 issues; `can` floorPrice 3 → `PRODUCT_FLOOR_RANGE` (below 2 × 2 = 4) and floorPrice 7 → `PRODUCT_FLOOR_RANGE` (above ceil(1.5 × 4) = 6); product id equal to a chemical id → `PRODUCT_DUPLICATE`; `phone-chip` reward 69 → `ORDER_UNDERPAID` (needs ≥ 1.5 × 46.46 = 69.7); buyers has 39 templates.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/content apps/api/test/boot.test.ts` → FAIL.
- [ ] **Step 3: Implement.** Boot refuses invalid products like invalid buyers.
- [ ] **Step 4: Run** the same plus `pnpm --filter @chemimon/content validate` → 0 issues.
- [ ] **Step 5: Commit** `feat(content): products.yaml (9 products) and product orders`.

### Task 3: Workshop building and product pictures (lane: art)

**Files:** Modify `art/blender/island.py` (`build_workshop`, registered like `build_market` / `build_dock`), `apps/web/src/island/layout.json` (`buildings.workshop`), `apps/web/src/island/layout.ts` (`BuildingId` adds `'workshop'`), footprint and layout tests; Create `art/blender/products/<id>.py` × 9 and a product thumbnail runner (extend `thumbs.py` with a `--products` mode or add `product_thumbs.py`), `apps/web/public/assets/island/workshop.glb`, `apps/web/public/assets/products/thumbs/<id>.png` × 9; regenerate manifests.

- [ ] **Step 1: Building.** A small workshop (anvil or gear sign, chimney), colours in the island style. ≤ 8000 triangles, ≤ 1 MB. Place it; the footprint tests must pass (no overlap with habitats or buildings, sign over land). Clicking it is wired in Task 5; here only the layout entry and model.
- [ ] **Step 2: Products.** One simple, readable object per product (can, wire coil, soap bar, glass pane, corrugated roof sheet, steel I-beam, gold ring, solar panel, chip), rendered 256 × 256 on a transparent background like the monster thumbnails. Open every PNG and look at it.
- [ ] **Step 3: Run** `pnpm exec vitest run --project @chemimon/web && pnpm typecheck` → PASS (do not run the API project or e2e).
- [ ] **Step 4: Commit** `feat(art): workshop building and 9 product pictures`.

### Task 4: Workshop API, product stock, product orders and sales

**Files:** Modify `apps/api/prisma/schema.prisma`; Create migration `<ts>_workshop` (`player_blueprints (player_id, product_id, bought_at)` PK both ids; `player_products (player_id, product_id, count int ≥ 0)` PK both ids; `workshop_jobs (id, player_id, product_id, status, started_at, ready_at, collected_at, collect_outcome jsonb)`; `market_orders.product_id` nullable, `chemical_id` nullable, CHECK exactly one); Create `apps/api/src/workshop/{routes,service}.ts`; Modify `market/routes.ts` (sell product), `market/orders.ts` (product templates, eligibility by blueprint, deliver products), `player/` me builder (`products`), `wallet/ledger.ts` (`blueprint`), `server.ts`, `main.ts` (`WORKSHOP_TIME_SCALE`), `quests/*`, `seedMain.ts` TRUNCATE list. Test `apps/api/test/{workshop,market,market-orders,quests}.test.ts`.

**Endpoints:** `GET /api/workshop`, `POST /api/workshop/blueprints`, `POST /api/workshop/jobs`, `POST /api/workshop/jobs/:id/collect`.

- [ ] **Step 1: Failing tests:**
  - fresh player: `can` and `wire` unlocked, `soap` locked; start `can` with 2 Al → job running, Al 0; second start with 0 Al → `INSUFFICIENT_MONSTERS`; 3rd running job → `SLOTS_FULL`.
  - collect before ready → `NOT_READY`; after → products can 1; collect again → same body, still 1; Review Focus 1 concurrent collects.
  - Review Focus 2: exact ingredients then `POST /api/market/sell` al → `INSUFFICIENT_MONSTERS`.
  - blueprint: buy soap → coins −30, ledger (`blueprint`, `soap`); again → `BLUEPRINT_OWNED`; price-0 `can` → `BLUEPRINT_OWNED`; short Xu → `INSUFFICIENT_COINS` with details; Review Focus 3 concurrent.
  - `BLUEPRINT_LOCKED` for `soap` before purchase; `UNKNOWN_PRODUCT` 400.
  - sell 1 can → +5 Xu; sell with 0 → `INSUFFICIENT_PRODUCTS`; body with both ids → 400.
  - orders: Review Focus 4 (`shop-can` not offered before the first collected `can` job, offered after it; `hotel-soap` not offered after buying the soap blueprint until a soap job is collected); deliver `shop-can` removes 3 cans and pays 30; short → `INSUFFICIENT_PRODUCTS`.
  - Review Focus 5: an open chemical order row created before the migration's columns change still delivers (create it, run the deliver).
  - `/api/me` lists products; quests `craft-first`, `blueprint-first`; 18 quests on the real catalog.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/api/test/workshop.test.ts apps/api/test/market-orders.test.ts apps/api/test/market.test.ts apps/api/test/quests.test.ts` → FAIL.
- [ ] **Step 3: Implement** following the expedition service (lockPlayer, `collect_outcome` replay, `deps.now()`, `deps.timeScale.workshop`).
- [ ] **Step 4: Run** `pnpm exec vitest run --project api && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(api): workshop jobs, blueprints, product stock, product orders and sales`.

### Task 5: Web: workshop panel, products in market and orders

**Files:** Create `apps/web/src/workshop/{WorkshopPanel,ProductCard,JobList,errors}.tsx|ts`, `apps/web/src/products/ProductThumb.tsx`; Modify `apps/web/src/state/ui.ts` (Panel `'workshop'`), `lab/LabScreen.tsx` (header button "Xưởng", running job list with "Nhận"), `island/Buildings.tsx` (workshop click opens it), `api/queries.ts` (`useWorkshop`, `useStartJob`, `useCollectJob`, `useBuyBlueprint`; sell and deliver handle products), `market/MarketPanel.tsx` (Thu mua lists owned products with floor price), `market/OrdersSection.tsx` (product orders show ProductThumb and name). Test `apps/web/test/{workshopPanel,ordersSection,marketPanel}.test.tsx`.

Copy: dialog "Xưởng chế tạo"; card: picture, name, "Công thức chế tạo: 2 Al" (formulas formatted with subscripts), "Thời gian: 2 phút", the line in quotes, "Giá sàn: 5 Xu"; unlocked → button "Chế tạo" (disabled with reason "Thiếu nguyên liệu" when short, "Hết chỗ" when 2 jobs run); locked → "Mua bản vẽ (30 Xu)". Job list: "Đang làm Lon nhôm, còn 1 phút" then "Nhận". After collect: "Nhận về: 1 Lon nhôm". Errors: `BLUEPRINT_LOCKED` "Chưa có bản vẽ.", `BLUEPRINT_OWNED` "Đã có bản vẽ này.", `INSUFFICIENT_MONSTERS` "Thiếu nguyên liệu.", `INSUFFICIENT_PRODUCTS` "Không đủ hàng.", `SLOTS_FULL` "Xưởng đang bận cả 2 chỗ.", `INSUFFICIENT_COINS` "Thiếu Xu: cần N, có M.", else "Có lỗi, thử lại.".

- [ ] **Step 1: Failing tests** (mocked queries) for each state and error above; a double click sends one request.
- [ ] **Step 2: Run** `pnpm exec vitest run apps/web/test/workshopPanel.test.tsx` → FAIL.
- [ ] **Step 3: Implement** in the style of the expedition panel.
- [ ] **Step 4: Run** `pnpm exec vitest run --project @chemimon/web && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** `feat(web): workshop panel; products in market and orders`.

### Task 6: End-to-end

**Files:** Modify `e2e/loop.spec.ts` (new test), `e2e/playwright.config.ts` (`WORKSHOP_TIME_SCALE: '0.002'`), `e2e/island.spec.ts` (workshop building click + screenshot `island-workshop.png`).

- [ ] **Step 1: Test** "craft a can": register; claim Al from the extractor twice (cooldown scale 0); open the workshop from the island; "Chế tạo" Lon nhôm; collect ("Nhận về: 1 Lon nhôm"); sell it in Chợ (+5 Xu); buy the soap blueprint (−30 Xu, header 175); `/api/quests` has `craft-first` and `blueprint-first` done. Screenshot `workshop.png`; open it and look at it.
- [ ] **Step 2: Run** `pnpm e2e` → all pass (8 tests).
- [ ] **Step 3: Commit** `test(e2e): workshop loop and building`.

**Lanes:** Task 1 → Task 2 on the main line; art (Task 3) forks after Task 1; web (Task 5) forks after Task 1; API (Task 4) forks after Task 2. Task 6 after all merge.
