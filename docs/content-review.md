# Danh sách duyệt nội dung phản ứng (CHEMIMON)

**Tổng quan:** 48 phản ứng chờ duyệt, 35 cặp chất đầu vào, 0 phản ứng đã duyệt. Cặp rẽ nhánh (cùng cặp chất, sản phẩm khác nhau tùy điều kiện): 9 (C + O₂; C + SiO₂; CO + Fe₂O₃; Cu + O₂; Fe + O₂; Fe₂O₃ + H₂; H₂O + Mg; K + O₂; Na + O₂).

Cách duyệt: gửi danh sách id được duyệt, rồi chạy `approve <id...>`. Tỷ lệ là số lượng chất thứ nhất / chất thứ hai, sắp theo id chất tăng dần.

## Al + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `al_o2_al2o3` | 4 Al + 3 O₂ → 2 Al₂O₃ | tia lửa | — | [nguồn](https://chemguide.co.uk/14to16/rs/burning.html) | chưa duyệt |  |

## C + CO₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_co2_boudouard` | C + CO₂ → 2 CO | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Carbon_monoxide) | chưa duyệt |  |

## C + CuO

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_c_reduce` | 2 CuO + C → 2 Cu + CO₂ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt |  |

## C + H₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_h2o_water_gas` | C + H₂O → CO + H₂ | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Water_gas) | chưa duyệt |  |

## C + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_o2_co` | 2 C + O₂ → 2 CO | nhiệt độ ≥ 450 °C | C/O₂ ≥ 2 | [nguồn](https://en.wikipedia.org/wiki/Carbon_monoxide) | chưa duyệt |  |
| `c_o2_co2` | C + O₂ → CO₂ | nhiệt độ ≥ 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Carbon) | chưa duyệt |  |

## C + SiO₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `c_sio2_si` | SiO₂ + 2 C → Si + 2 CO | nhiệt độ = 2500 °C | — | [nguồn](https://en.wikipedia.org/wiki/Silicon) | chưa duyệt |  |
| `c_sio2_sic` | SiO₂ + 3 C → SiC + 2 CO | nhiệt độ = 2500 °C | C/SiO₂ ≥ 3 | [nguồn](https://en.wikipedia.org/wiki/Acheson_process) | chưa duyệt |  |

## Cl₂ + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `h2_cl2_burn` | H₂ + Cl₂ → 2 HCl | tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Hydrogen_chloride) | chưa duyệt |  |
| `h2_cl2_light` | H₂ + Cl₂ → 2 HCl | ánh sáng | — | [nguồn](https://en.wikipedia.org/wiki/Hydrogen_chloride) | chưa duyệt |  |

## Cl₂ + Na

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na_cl2_nacl` | 2 Na + Cl₂ → 2 NaCl | nhiệt độ 200 đến 1000 °C | — | [nguồn](https://chemed.chem.purdue.edu/genchem/demosheets/7.1.html) | chưa duyệt |  |

## CO + CuO

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_co_reduce` | CuO + CO → Cu + CO₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt |  |

## CO + Fe₂O₃

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `co_fe2o3_full` | Fe₂O₃ + 3 CO → 2 Fe + 3 CO₂ | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Blast_furnace) | chưa duyệt |  |
| `co_fe2o3_partial` | 3 Fe₂O₃ + CO → 2 Fe₃O₄ + CO₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Blast_furnace) | chưa duyệt |  |

## CO + Fe₃O₄

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `co_fe3o4_reduce` | Fe₃O₄ + 4 CO → 3 Fe + 4 CO₂ | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Direct_reduced_iron) | chưa duyệt |  |

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
| `mg_co2_burn` | 2 Mg + CO₂ → 2 MgO + C | tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt |  |

## Cu + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cu_o2_cu2o` | 4 Cu + O₂ → 2 Cu₂O | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(I)_oxide) | chưa duyệt |  |
| `cu_o2_cuo` | 2 Cu + O₂ → 2 CuO | nhiệt độ = 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt |  |

## CuO

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_decompose` | 4 CuO → 2 Cu₂O + O₂ | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Chemical_looping_combustion) | chưa duyệt |  |

## CuO + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `cuo_h2_reduce` | CuO + H₂ → Cu + H₂O | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Copper(II)_oxide) | chưa duyệt |  |

## Fe + H₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe_h2o_steam` | 3 Fe + 4 H₂O → Fe₃O₄ + 4 H₂ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(II,III)_oxide) | chưa duyệt |  |

## Fe + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe_o2_burn_fe3o4` | 3 Fe + 2 O₂ → Fe₃O₄ | tia lửa | — | [nguồn](https://chemguide.co.uk/14to16/rs/burning.html) | chưa duyệt |  |
| `fe_o2_fe2o3` | 4 Fe + 3 O₂ → 2 Fe₂O₃ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(III)_oxide) | chưa duyệt |  |
| `fe_o2_hot_fe3o4` | 3 Fe + 2 O₂ → Fe₃O₄ | nhiệt độ = 2500 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(III)_oxide) | chưa duyệt |  |

## Fe₂O₃ + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe2o3_h2_full` | Fe₂O₃ + 3 H₂ → 2 Fe + 3 H₂O | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Direct_reduced_iron) | chưa duyệt |  |
| `fe2o3_h2_partial` | 3 Fe₂O₃ + H₂ → 2 Fe₃O₄ + H₂O | nhiệt độ = 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(III)_oxide) | chưa duyệt |  |

## Fe₃O₄ + H₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe3o4_h2_reduce` | Fe₃O₄ + 4 H₂ → 3 Fe + 4 H₂O | nhiệt độ = 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Direct_reduced_iron) | chưa duyệt |  |

## Fe₃O₄ + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `fe3o4_o2_fe2o3` | 4 Fe₃O₄ + O₂ → 6 Fe₂O₃ | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Iron(II,III)_oxide) | chưa duyệt |  |

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
| `mg_h2o_cold` | Mg + 2 H₂O → Mg(OH)₂ + H₂ | nhiệt độ = 25 °C | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt |  |
| `mg_h2o_steam` | Mg + H₂O → MgO + H₂ | nhiệt độ 200 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt |  |

## H₂O + Na

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na_h2o_naoh` | 2 Na + 2 H₂O → 2 NaOH + H₂ | nhiệt độ 25 đến 200 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_hydroxide) | chưa duyệt |  |

## H₂O + Na₂O

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na2o_h2o_naoh` | Na₂O + H₂O → 2 NaOH | nhiệt độ 25 đến 200 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_oxide) | chưa duyệt |  |

## HCl + NaOH

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `hcl_naoh_neutralize` | NaOH + HCl → NaCl + H₂O | nhiệt độ 25 đến 200 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_hydroxide) | chưa duyệt |  |

## K + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `k_o2_k2o2` | 2 K + O₂ → K₂O₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Potassium_oxide) | chưa duyệt |  |
| `k_o2_ko2` | K + O₂ → KO₂ | nhiệt độ 200 đến 450 °C | K/O₂ ≤ 1 | [nguồn](https://en.wikipedia.org/wiki/Potassium_superoxide) | chưa duyệt |  |

## Mg + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `mg_o2_mgo` | 2 Mg + O₂ → 2 MgO | tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium) | chưa duyệt |  |

## Mg(OH)₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `mgoh2_decompose` | Mg(OH)₂ → MgO + H₂O | nhiệt độ 450 đến 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Magnesium_hydroxide) | chưa duyệt |  |

## Na + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na_o2_na2o` | 4 Na + O₂ → 2 Na₂O | nhiệt độ 200 đến 450 °C | Na/O₂ = 4 | [nguồn](https://en.wikipedia.org/wiki/Sodium_oxide) | chưa duyệt |  |
| `na_o2_na2o2` | 2 Na + O₂ → Na₂O₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_oxide) | chưa duyệt |  |

## Na₂O + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `na2o_o2_na2o2` | 2 Na₂O + O₂ → 2 Na₂O₂ | nhiệt độ 200 đến 450 °C | — | [nguồn](https://en.wikipedia.org/wiki/Sodium_peroxide) | chưa duyệt |  |

## NH₃ + O₂

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `nh3_o2_burn` | 4 NH₃ + 3 O₂ → 2 N₂ + 6 H₂O | không có xúc tác, tia lửa | — | [nguồn](https://en.wikipedia.org/wiki/Ammonia) | chưa duyệt |  |

## O₂ + Si

| id | phương trình | điều kiện | tỷ lệ | nguồn | trạng thái | Ghi chú |
|---|---|---|---|---|---|---|
| `si_o2_sio2` | Si + O₂ → SiO₂ | nhiệt độ ≥ 1000 °C | — | [nguồn](https://en.wikipedia.org/wiki/Silicon) | chưa duyệt |  |
