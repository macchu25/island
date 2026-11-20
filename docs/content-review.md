# Danh sách duyệt nội dung phản ứng (CHEMIMON)

**Tổng quan:** 48 phản ứng chờ duyệt, 35 cặp chất đầu vào, 0 phản ứng đã duyệt. Cặp rẽ nhánh (cùng cặp chất, sản phẩm khác nhau tùy điều kiện): 9 (C + O₂; C + SiO₂; CO + Fe₂O₃; Cu + O₂; Fe + O₂; Fe₂O₃ + H₂; H₂O + Mg; K + O₂; Na + O₂).

Cách duyệt: gửi danh sách id được duyệt, rồi chạy `approve <id...>`. Tỷ lệ là số lượng chất thứ nhất / chất thứ hai, sắp theo id chất tăng dần.

## Al + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `al_o2_al2o3` | 4 Al + 3 O₂ → 2 Al₂O₃ | môi trường không khí hoặc khí trơ, tia lửa | — | [nguồn](https://melscience.com/en/articles/characteristics-aluminum-and-combustion-reaction-m) | chưa duyệt | Spark only (powder in a flame). |

## C + CO₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_co2_boudouard` | C + CO₂ → 2 CO | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Carbon_monoxide) | chưa duyệt |  |

## C + CuO

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_c_reduce` | 2 CuO + C → 2 Cu + CO₂ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt | Temperature window 450-1000 C is my choice (source gives no temperature). |

## C + H₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_h2o_water_gas` | C + H₂O → CO + H₂ | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Water_gas) | chưa duyệt |  |

## C + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_o2_co` | 2 C + O₂ → 2 CO | nhiệt độ ≥ 1000 °C | C/O₂ ≥ 2 | [nguồn](https://en.wikipedia.org/wiki/Carbon_monoxide) | chưa duyệt |  |
| `c_o2_co2` | C + O₂ → CO₂ | nhiệt độ ≥ 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Carbon) | chưa duyệt |  |

## C + SiO₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_sio2_si` | SiO₂ + 2 C → Si + 2 CO | nhiệt độ = 2500 °C | — | [nguồn](https://en.wikipedia.org/wiki/Silicon) | chưa duyệt | Industrial Si is made near 1900 C; 2500 C is the only grid step that fits. |
| `c_sio2_sic` | SiO₂ + 3 C → SiC + 2 CO | nhiệt độ = 2500 °C | C/SiO₂ ≥ 3 | [nguồn](https://en.wikipedia.org/wiki/Acheson_process) | chưa duyệt | Ratio split (c/sio2 >= 3 gives SiC) is inferred from the Silicon page note about excess carbon. |

## Cl₂ + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `h2_cl2_burn` | H₂ + Cl₂ → 2 HCl | tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Hydrogen_chloride) | chưa duyệt | Spark stands in for the HCl burner; the page gives no temperature. |
| `h2_cl2_light` | H₂ + Cl₂ → 2 HCl | ánh sáng | — | [nguồn](https://en.wikipedia.org/wiki/Hydrogen_chloride) | chưa duyệt |  |

## Cl₂ + Na

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na_cl2_nacl` | 2 Na + Cl₂ → 2 NaCl | nhiệt độ 200 đến 1000 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://chemed.chem.purdue.edu/genchem/demosheets/7.1.html) | chưa duyệt | Temperature window 200-1000 C is my choice; the source says hot sodium. |

## CO + CuO

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_co_reduce` | CuO + CO → Cu + CO₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt | Temperature window 200-450 C is my choice (source gives no temperature). |

## CO + Fe₂O₃

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `co_fe2o3_full` | Fe₂O₃ + 3 CO → 2 Fe + 3 CO₂ | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Blast_furnace) | chưa duyệt |  |
| `co_fe2o3_partial` | 3 Fe₂O₃ + CO → 2 Fe₃O₄ + CO₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Blast_furnace) | chưa duyệt |  |

## CO + Fe₃O₄

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `co_fe3o4_reduce` | Fe₃O₄ + 4 CO → 3 Fe + 4 CO₂ | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Direct_reduced_iron) | chưa duyệt | Equation is the sum of the stepwise reductions on the page, not stated as one line. |

## CO + H₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `co_h2o_shift` | CO + H₂O → CO₂ + H₂ | nhiệt độ = 450 °C, xúc tác Fe | — | [nguồn](https://en.wikipedia.org/wiki/Water-gas_shift_reaction) | chưa duyệt |  |

## CO + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `co_o2_hot` | 2 CO + O₂ → 2 CO₂ | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Carbon_monoxide) | chưa duyệt |  |
| `co_o2_spark` | 2 CO + O₂ → 2 CO₂ | tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Carbon_monoxide) | chưa duyệt |  |

## CO₂ + Mg

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `mg_co2_burn` | 2 Mg + CO₂ → 2 MgO + C | môi trường không khí hoặc khí trơ, tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt |  |

## Cu + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cu_o2_cu2o` | 4 Cu + O₂ → 2 Cu₂O | nhiệt độ = 1000 °C, môi trường không khí hoặc khí trơ | Cu/O₂ = 4 | [nguồn](https://en.wikipedia.org/wiki/Copper(I)_oxide) | chưa duyệt | Oxygen-limited only (cu/o2 = 4). 2Cu + O2 at 1000 C gives NO_REACTION on purpose (no CuO rule at 1000 C). 1000 C threshold from an RSC 2016 abstract (CuO to Cu2O at 850-1000 C); equilibrium in air is near 1030 C. |
| `cu_o2_cuo` | 2 Cu + O₂ → 2 CuO | nhiệt độ = 450 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt | Source says 300-800 C; 450 C is the only grid step inside it. |

## CuO

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_decompose` | 4 CuO → 2 Cu₂O + O₂ | nhiệt độ = 1000 °C, môi trường khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Chemical_looping_combustion) | chưa duyệt | Inert environment only: in air the released O2 would re-oxidise Cu2O. Temperature 850-1000 C from an RSC 2016 abstract (page not readable). |

## CuO + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_h2_reduce` | CuO + H₂ → Cu + H₂O | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt | Temperature window 200-450 C is my choice (source gives no temperature). |

## Fe + H₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe_h2o_steam` | 3 Fe + 4 H₂O → Fe₃O₄ + 4 H₂ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(II,III)_oxide) | chưa duyệt | Temperature window 450-1000 C is my choice (the page gives no temperature). |

## Fe + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe_o2_burn_fe3o4` | 3 Fe + 2 O₂ → Fe₃O₄ | môi trường không khí hoặc khí trơ, tia lửa | — | [nguồn](https://chemguide.co.uk/14to16/rs/burning.html) | chưa duyệt | Sources disagree: Chemguide says burning iron gives Fe3O4; some lecture demos write Fe2O3. |
| `fe_o2_fe2o3` | 4 Fe + 3 O₂ → 2 Fe₂O₃ | nhiệt độ 450 đến 1000 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Iron(III)_oxide) | chưa duyệt | Weakest iron source: the page only says Fe2O3 is a product of the oxidation of iron. Real scale at 450-1000 C is layered FeO/Fe3O4/Fe2O3. Window is my choice. |
| `fe_o2_hot_fe3o4` | 3 Fe + 2 O₂ → Fe₃O₄ | nhiệt độ = 2500 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Iron(III)_oxide) | chưa duyệt |  |

## Fe₂O₃ + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe2o3_h2_full` | Fe₂O₃ + 3 H₂ → 2 Fe + 3 H₂O | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Direct_reduced_iron) | chưa duyệt | Equation is the sum of the stepwise reductions on the page (800-1200 C). |
| `fe2o3_h2_partial` | 3 Fe₂O₃ + H₂ → 2 Fe₃O₄ + H₂O | nhiệt độ = 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(III)_oxide) | chưa duyệt |  |

## Fe₃O₄ + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe3o4_h2_reduce` | Fe₃O₄ + 4 H₂ → 3 Fe + 4 H₂O | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Direct_reduced_iron) | chưa duyệt | Equation is the sum of the stepwise reductions on the page (800-1200 C). |

## Fe₃O₄ + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe3o4_o2_fe2o3` | 4 Fe₃O₄ + O₂ → 6 Fe₂O₃ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(II,III)_oxide) | chưa duyệt | Temperature window 450-1000 C is my choice (the page says roasting in air). |

## H₂ + N₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `n2_h2_haber` | N₂ + 3 H₂ → 2 NH₃ | nhiệt độ = 450 °C, áp suất ≥ 100 atm, xúc tác Fe | — | [nguồn](https://en.wikipedia.org/wiki/Haber_process) | chưa duyệt |  |

## H₂ + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `h2_o2_hot` | 2 H₂ + O₂ → 2 H₂O | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Oxyhydrogen) | chưa duyệt |  |
| `h2_o2_spark` | 2 H₂ + O₂ → 2 H₂O | tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Oxyhydrogen) | chưa duyệt |  |

## H₂O + Mg

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `mg_h2o_cold` | Mg + 2 H₂O → Mg(OH)₂ + H₂ | nhiệt độ = 25 °C | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt | 25 C only, slow reaction in liquid water. |
| `mg_h2o_steam` | Mg + H₂O → MgO + H₂ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt | Starts at 450 C so it does not contradict Mg(OH)2 decomposing at 332 C; ignores pressure. |

## H₂O + Na

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na_h2o_naoh` | 2 Na + 2 H₂O → 2 NaOH + H₂ | nhiệt độ 25 đến 200 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_hydroxide) | chưa duyệt | Temperature window 25-200 C is my choice. |

## H₂O + Na₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na2o_h2o_naoh` | Na₂O + H₂O → 2 NaOH | nhiệt độ 25 đến 200 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_oxide) | chưa duyệt | Temperature window 25-200 C is my choice. |

## HCl + NaOH

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `hcl_naoh_neutralize` | NaOH + HCl → NaCl + H₂O | nhiệt độ 25 đến 200 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_hydroxide) | chưa duyệt | Temperature window 25-200 C is my choice. |

## K + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `k_o2_k2o2` | 2 K + O₂ → K₂O₂ | nhiệt độ 200 đến 450 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Potassium_oxide) | chưa duyệt | Weak source: the page says K + O2 affords K2O2 but gives no equation; real product is a K2O/K2O2/KO2 mix. Temperature window 200-450 C is my choice. |
| `k_o2_ko2` | K + O₂ → KO₂ | nhiệt độ 200 đến 450 °C, môi trường không khí hoặc khí trơ | K/O₂ ≤ 1 | [nguồn](https://en.wikipedia.org/wiki/Potassium_superoxide) | chưa duyệt | Temperature window 200-450 C is my choice (KO2 decomposes near 560 C). |

## Mg + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `mg_o2_mgo` | 2 Mg + O₂ → 2 MgO | môi trường không khí hoặc khí trơ, tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt | Spark only; the page gives no ignition temperature. |

## Mg(OH)₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `mgoh2_decompose` | Mg(OH)₂ → MgO + H₂O | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium_hydroxide) | chưa duyệt | 450-1000 C chosen above the 332 C decomposition point. |

## Na + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na_o2_na2o` | 4 Na + O₂ → 2 Na₂O | nhiệt độ 200 đến 450 °C, môi trường không khí hoặc khí trơ | Na/O₂ = 4 | [nguồn](https://en.wikipedia.org/wiki/Sodium_oxide) | chưa duyệt | Ratio split (na/o2 = 4 gives Na2O) follows stoichiometry, not a stated rule. Temperature window 200-450 C is my choice. |
| `na_o2_na2o2` | 2 Na + O₂ → Na₂O₂ | nhiệt độ 200 đến 450 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_peroxide) | chưa duyệt | Temperature window 200-450 C is my choice (no temperature on the page). The page shows the two-step route via Na2O; the direct 2Na + O2 -> Na2O2 equation is on the Sodium oxide page. |

## Na₂O + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na2o_o2_na2o2` | 2 Na₂O + O₂ → 2 Na₂O₂ | nhiệt độ 200 đến 450 °C, môi trường không khí hoặc khí trơ | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_peroxide) | chưa duyệt | Temperature window 200-450 C is my choice (no temperature on the page). |

## NH₃ + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `nh3_o2_burn` | 4 NH₃ + 3 O₂ → 2 N₂ + 6 H₂O | không có xúc tác, tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Ammonia) | chưa duyệt | Catalyst none only: with Pt the real product is NO, which needs 5 O2 per 4 NH3 (over the 4-per-input cap). |

## O₂ + Si

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `si_o2_sio2` | Si + O₂ → SiO₂ | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Silicon) | chưa duyệt |  |
