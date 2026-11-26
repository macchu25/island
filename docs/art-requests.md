# Art requests for the image-generation agent (Antigravity / Gemini)

Phiếu yêu cầu ảnh. Người đọc: tác nhân tạo ảnh trong Antigravity. Người viết: Claude Code (làm code và gắn ảnh vào game).

## Rules for the image agent

1. Work on a branch named `art-gemini`. Do not change any code, test, config or existing asset.
2. Only ADD files under `art/gemini/`, at the exact paths listed below. PNG, sRGB, no alpha unless the row says "transparent".
3. No text, letters, numbers, logos, UI elements or watermarks inside any image. No people. No monsters or characters unless the row asks for them (the game's 46 monsters are real 3D assets and are composited by the game).
4. Keep one consistent rendering style across a batch: stylized 3D render, clean shapes, soft global illumination, the look of a polished indie game. Not pastel, not pink, not candy-like, not childish.
5. After generating, append one row per file to `art/gemini/README.md`: path, the exact prompt used, model name, date. If a prompt was changed, write the changed prompt.
6. Generate 2 variants when a row says "×2" (suffix `-a`, `-b`). Otherwise one file.
7. Commit with message `art: gemini batch <n>` and push the branch. Do not merge it.

Claude Code will then: review each image, crop and compress to WebP, wire it into the game, and write feedback in the "Feedback" section at the bottom of this file.

## Shared style: direction 4 "Khoa học viễn tưởng" (sci-fi island at night)

- Palette: dark slate `#1B2330`, deep sea `#0E1622`, neon cyan `#22E3F5` (edge strips, signs, paths), lime `#B6F23A` (small lights, currency), a tiny touch of magenta `#F52E9C`.
- Mood: night, starry sky, glowing edge strips on dark buildings, holographic signs (blank, no text), emissive grid lines on the ground, a distant neon city skyline across the sea, calm and sleek. Readable silhouettes, restrained glow, no lens-flare overload.

## Batch 1 (needed first)

| # | Path | Size | What |
|---|---|---|---|
| 1 | `art/gemini/market/backdrop.png` ×2 | 1920×1080 | Backdrop of the market room, seen front-on at eye level. A sci-fi night market street: dark stall frames with cyan edge strips at the far left and far right edges, a glowing grid floor receding to the horizon, starry sky, distant neon skyline. THE CENTRE 60 % OF THE IMAGE MUST BE CALM AND DARK (UI panels are drawn on top of it): no bright objects, no detail there. Brightest elements stay in the outer 20 % on each side and the top 15 %. |
| 2 | `art/gemini/concepts/island-style4.png` ×2 | 1920×1080 | Key art of the whole home island in direction 4, isometric 3/4 view from above, whole island visible with sea around it. Contents: a central breeding lab dome, a market, a library, an element extractor machine, a workshop, a mining dock with a pier at the left shore, and 7 fenced habitat plots of different themes (metal yard, mineral quarry, crystal garden, water spring, gas clouds platform, noble-gas cave, halogen greenhouse) connected by paths. Night, direction 4 palette. |
| 3 | `art/gemini/concepts/island-style2.png` | 1920×1080 | Same island content as #2 but in an "alchemist workshop" direction for comparison: golden-hour sunset, dark timber, slate roofs, brass, parchment, lantern glow, mossy cobbles. Palette brass `#B8862B`, parchment `#EAD9B0`, deep green `#2F5D50`, burgundy `#7A2E2E`. |
| 4 | `art/gemini/concepts/island-style3.png` | 1920×1080 | Same island content as #2 but in an "expedition camp" direction: bright midday, canvas tents, wooden scaffolds, crates, signal flags, jungle green `#2E7D4F`, ocean blue `#1976A8`, sandstone `#D9B77E`, orange accent `#E8632B`. |

## Batch 2 (mining trip; after batch 1 is reviewed)

The player clicks the mining dock, a ship carries them to a separate group of mining islands, and each mine has its own screen. All in direction 4.

| # | Path | Size | What |
|---|---|---|---|
| 5 | `art/gemini/mining/ship.png` | 1024×1024, transparent | A small sleek cargo hover-ship / boat with cyan edge lights, 3/4 view, no background. |
| 6 | `art/gemini/mining/archipelago.png` | 1920×1080 | Isometric 3/4 view of a night sea with 8 small islands spaced apart, each clearly different: a sand beach, a salt lake, an iron mine with red rock, a copper mine with green-blue rock, an air-separation tower, a natural-gas well, a river with gold panning, a volcano with sulfur vents. Thin glowing dotted shipping lanes between them. |
| 7 | `art/gemini/mining/sand.png` | 1920×1080 | Backdrop of the sand-beach mine, front-on, calm dark centre 60 % as in #1: dunes, a small dredger, piles of white quartz sand, night. |
| 8 | `art/gemini/mining/salt.png` | 1920×1080 | Salt lake: shallow evaporation ponds, white salt mounds, a rake machine. Calm dark centre. |
| 9 | `art/gemini/mining/iron.png` | 1920×1080 | Iron mine: red-brown rock walls, ore carts on rails, a conveyor. Calm dark centre. |
| 10 | `art/gemini/mining/copper.png` | 1920×1080 | Copper mine: dark rock with teal-green veins, a drill rig. Calm dark centre. |
| 11 | `art/gemini/mining/air.png` | 1920×1080 | Air-separation tower: tall cryogenic columns, frosted pipes, storage spheres. Calm dark centre. |
| 12 | `art/gemini/mining/well.png` | 1920×1080 | Natural-gas well: a wellhead with valves, a small flare-free gas tank farm. Calm dark centre. |
| 13 | `art/gemini/mining/gold.png` | 1920×1080 | River gold panning: a shallow stream, sluice boxes, gold flecks glinting. Calm dark centre. |
| 14 | `art/gemini/mining/volcano.png` | 1920×1080 | Volcano crater rim: yellow sulfur deposits, faint steam vents, dim red glow far below. Calm dark centre. |

## Feedback (written by Claude Code after each batch)

(empty)
