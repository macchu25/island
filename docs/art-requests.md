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

## IMPORTANT: the image tool does not know this project

The image-generation tool only sees (a) the text prompt you give it and (b) the reference images you pass to it. It does not read the repository. So for every image:

1. Use the complete prompt from "Ready-to-use prompts" below, word for word. Do not shorten it and do not write your own.
2. Pass the reference images named in that prompt as image inputs (the tool's reference / input-image parameter). They are files in this repo under `art/reference/`.
3. Save or copy the result to the exact path in the table (the tool may write to its own output folder first: copy the file into the repo path).

Reference images (in this repo):

| File | What it is | Use it for |
|---|---|---|
| `art/reference/style4-ui.png` | The game UI in the chosen sci-fi style | Colour palette, glow level, panel shapes: the backdrop must sit behind UI like this |
| `art/reference/style4-scene-sketch.png` | A rough sketch of the world in the chosen style | Mood, lighting, architecture language (improve the detail, keep the mood) |
| `art/reference/monsters-sheet.png` | The 46 game monsters (real 3D assets) | Rendering style to match: soft, rounded, stylized 3D. Do NOT draw monsters unless a prompt asks |
| `art/reference/island-layout-current.png` | The current island (old pastel style) | LAYOUT ONLY: where plots and buildings are. Ignore its colours and style |

## Ready-to-use prompts (Batch 1)

**#1 `art/gemini/market/backdrop-a.png` and `-b.png`** (references: `style4-ui.png`, `style4-scene-sketch.png`)
```
Game background image, 1920x1080, 16:9. A sci-fi night market street seen front-on at eye level, stylized 3D render matching the mood and palette of the reference images. Dark market stall frames with glowing cyan edge strips stand only at the far left and far right edges of the image. A dark floor with faint glowing grid lines recedes to the horizon. Starry night sky, a distant neon city skyline across the sea at the horizon. IMPORTANT: the centre 60 percent of the image must be calm, dark and almost empty, because game UI panels are drawn on top of it; keep all bright objects in the outer 20 percent on each side and the top 15 percent. Palette: dark slate #1B2330, deep sea #0E1622, neon cyan #22E3F5, small lime #B6F23A lights, a tiny touch of magenta #F52E9C. Restrained glow, sleek, polished indie game look. No text, no letters, no numbers, no logos, no UI, no people, no characters, no watermark.
```

**#2 `art/gemini/concepts/island-style4-a.png` and `-b.png`** (references: `style4-scene-sketch.png`, `island-layout-current.png` for layout only, `monsters-sheet.png` for rendering style)
```
Game key art, 1920x1080, 16:9. Isometric 3/4 view from above of one whole small island at night with dark sea around it, stylized 3D render in the mood and palette of the sci-fi reference sketch. Use the layout reference only for where things are, not for its colours. On the island: a central breeding-lab dome with a glowing cyan ring, a market with a blank holographic sign, a library building, an element-extractor machine, a workshop, a mining dock with a pier on the left shore, and seven fenced habitat plots with different themes (metal yard, mineral quarry, crystal garden, water spring, floating gas-cloud platform, noble-gas cave, halogen greenhouse), all connected by softly glowing paths. Dark slate ground with faint emissive grid lines, glowing cyan edge strips on dark buildings, lime path lights, a distant neon skyline, starry sky. Palette: dark slate #1B2330, deep sea #0E1622, neon cyan #22E3F5, lime #B6F23A, a tiny touch of magenta #F52E9C. Rounded, readable shapes that match the soft stylized 3D look of the monster reference sheet. No monsters, no people, no text, no letters, no numbers, no logos, no watermark.
```

**#3 `art/gemini/concepts/island-style2.png`** (references: `island-layout-current.png` for layout only, `monsters-sheet.png` for rendering style)
```
Game key art, 1920x1080, 16:9. Isometric 3/4 view from above of one whole small island at golden-hour sunset with sea around it, stylized 3D render, an alchemist-workshop world. Use the layout reference only for where things are, not for its colours. On the island: a central breeding-lab hall with a copper dome, a market stall with a burgundy awning, a library, an element-extractor machine of brass and glass, a workshop with a chimney, a mining dock with a wooden pier on the left shore, and seven fenced habitat plots with different themes (metal yard, mineral quarry, crystal garden, water spring, gas-cloud platform, noble-gas cave, halogen greenhouse), connected by mossy cobblestone paths with iron lanterns. Dark timber, slate roofs, brass fittings, parchment-coloured walls, warm lantern light pools. Palette: brass #B8862B, parchment #EAD9B0, deep green #2F5D50, burgundy #7A2E2E, dark wood. Rounded, readable shapes that match the soft stylized 3D look of the monster reference sheet. No monsters, no people, no text, no letters, no numbers, no logos, no watermark.
```

**#4 `art/gemini/concepts/island-style3.png`** (references: `island-layout-current.png` for layout only, `monsters-sheet.png` for rendering style)
```
Game key art, 1920x1080, 16:9. Isometric 3/4 view from above of one whole small tropical island in bright midday sun with turquoise shallows around it, stylized 3D render, an expedition-camp world. Use the layout reference only for where things are, not for its colours. On the island: a central breeding-lab tent hall on a wooden deck, a market of canvas tents and supply crates, a library cabin, an element-extractor rig, a workshop shed, a mining dock with a plank pier on the left shore, and seven fenced habitat plots with different themes (metal yard, mineral quarry, crystal garden, water spring, gas-cloud platform, noble-gas cave, halogen greenhouse), connected by plank boardwalks, with rope fences, signal flags and palm trees. Firm midday shadows. Palette: jungle green #2E7D4F, ocean blue #1976A8, sandstone #D9B77E, canvas #E8DFC8, orange accent #E8632B. Rounded, readable shapes that match the soft stylized 3D look of the monster reference sheet. No monsters, no people, no text, no letters, no numbers, no logos, no watermark.
```

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
