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

## Batch 3: the playable island in style C (HIGHEST PRIORITY, do this before Batch 2)

The user chose direction C, "Xưởng giả kim" (alchemist workshop), for the home island: the look of `art/gemini/concepts/island-style2.png`. The game will show your painting as the island itself, and place its real 3D monsters on top. So this time the LAYOUT MUST MATCH THE GAME EXACTLY. A beautiful island with things in the wrong place cannot be used.

### Read these files first (in this order)

1. `art/reference/island-guide-labeled.png`: the game's island from the exact game camera, with 13 numbered markers. Use it to understand what is where. Never pass this file to the image tool (the numbers would leak into the picture).
2. `art/reference/island-guide-clean.png`: the same view without markers. THIS is the image you pass to the image tool as the image to repaint / edit. Its colours are the old pastel style: ignore the colours, keep the geometry.
3. `art/gemini/concepts/island-style2.png`: the chosen look (your own Batch 1 picture). Pass it as the style reference.
4. `art/reference/monsters-sheet.png`: the game's monsters. They will stand inside the plots later. Do not draw them. Use the sheet only to judge scale and to keep the world friendly enough for them.

### What each number is, and what it becomes in style C

| # | In the guide | Becomes (style C) |
|---|---|---|
| 1 | Breeding lab, centre | A round glass conservatory with a brass-ribbed dome on a stone plinth |
| 2 | Element extractor, bottom left of centre | A brass and copper distillation apparatus with glass flasks and pipes |
| 3 | Library (Codex), bottom right of centre | A small timber-framed library with a slate roof and tall windows |
| 4 | Market, bottom centre | A timber market stall with a burgundy awning and shelves of bottles |
| 5 | Mining dock, on the LEFT shore | A wooden pier on stone footings with mooring posts, reaching into the sea |
| 6 | Workshop, top right | A timber workshop with a brick chimney and stacked lumber |
| 7 | Metal habitat, large dark circle, left | A forge yard: a round flat floor of dark iron-grey stone slabs, low stone wall around it, a small furnace at the edge |
| 8 | Mineral quarry habitat, largest circle, right | A round flat quarry floor of pale sandstone, low rock rim |
| 9 | Crystal habitat, small circle, upper left of centre | A round flat floor of dark slate with a ring of glowing teal crystals at the edge |
| 10 | Water spring habitat, small circle, upper right of centre | A round shallow steaming pool with a stone rim |
| 11 | Gas habitat, small circle, top centre | A round flat pale stone terrace with soft mist and small vents at the edge |
| 12 | Noble-gas habitat, small circle, top left | A round flat floor in front of a small stone-arched cave mouth, lit by coloured lanterns |
| 13 | Halogen habitat, small circle, right | A round flat floor inside a low open greenhouse frame of glass and timber (the roof must be open or absent so the floor is visible from above) |

### Hard rules for this batch

1. Same camera, same island outline, same position and same size for all 13 items as in `island-guide-clean.png`. Check by flipping between your result and the guide: nothing may move by more than a few pixels.
2. The 7 habitat floors (7 to 13) must stay OPEN, FLAT and EMPTY circles of the same size as in the guide: no objects, no trees, no walls inside the circle. Decoration goes on the rim and outside. The game places monsters on these floors.
3. Paths between the plots stay where they are (repaint them as mossy cobblestone).
4. Keep the sea around the island and a clear margin of water on all four sides, as in the guide. Sunset light as in the style reference, but keep the island well lit: no part darker than a mid tone, because monsters must stay readable.
5. Replace the pastel decorations with style C equivalents (pines, oaks, rocks, lanterns, crates, barrels). Remove the pink islet, the small clouds and the grandstand next to the quarry.
6. No monsters, no people, no animals, no text, no letters, no numbers, no signs with writing, no UI, no watermark.
7. Resolution: the largest the image tool offers at 16:9 (3840×2160 if available, otherwise 1920×1080). Say in `art/gemini/README.md` which one you got.

### Output files

| Path | Size | What |
|---|---|---|
| `art/gemini/island/island-c-a.png`, `art/gemini/island/island-c-b.png` | 16:9, largest available | Two variants of the repainted island |

### The prompt to use (word for word), with `island-guide-clean.png` as the image to edit and `island-style2.png` as the style reference

```
Repaint this isometric game island in the art style of the style reference image: an alchemist-workshop world at golden-hour sunset, stylized 3D render, polished indie game look. Keep the camera angle, the island outline, and the exact position and size of every building and every circular plot exactly as in the input image; do not move, add or remove any circle or building. Restyle only.
Buildings: the centre building becomes a round glass conservatory with a brass-ribbed dome on a stone plinth; the machine at lower left becomes a brass and copper distillation apparatus with glass flasks; the building at lower right becomes a small timber-framed library with a slate roof; the stall at the bottom becomes a timber market stall with a burgundy awning; the pier on the left shore becomes a wooden pier on stone footings; the building at the top right becomes a timber workshop with a brick chimney.
Circular plots: keep all seven circles the same size and keep their floors open, flat and empty. The large dark circle on the left becomes a forge yard floor of dark iron-grey stone slabs with a small furnace on its rim; the largest circle on the right becomes a pale sandstone quarry floor with a low rock rim; the small circle upper left of centre becomes a dark slate floor with glowing teal crystals on its rim; the small circle upper right of centre becomes a shallow steaming pool with a stone rim; the small circle at top centre becomes a pale stone terrace with soft mist at its rim; the small circle at top left becomes a floor in front of a small stone-arched cave mouth with coloured lanterns; the small circle on the right becomes a floor inside a low open-roofed greenhouse frame of glass and timber.
Paths become mossy cobblestone. Trees become pines and oaks. Add iron lanterns with warm light, rocks, crates and barrels outside the plots. Rocky shoreline, calm reflective sea with a margin of water on all sides. Remove the pink islet, the small clouds and the grandstand. Warm sunset light, but keep the whole island clearly lit. Palette: dark timber, slate roofs, brass #B8862B, parchment #EAD9B0, deep green #2F5D50, burgundy #7A2E2E.
No monsters, no people, no animals, no text, no letters, no numbers, no logos, no UI, no watermark.
```

### Self-check before you commit (write the answers in `art/gemini/README.md`)

- Is the dock on the LEFT shore? Are there exactly 6 buildings and exactly 7 circular plots?
- Overlay or compare with `island-guide-labeled.png`: does each numbered item sit where its number is?
- Are all 7 plot floors open, flat and empty, and about the same size as in the guide?
- Is there any text, number or creature in the picture? (There must be none.)
- If a check fails, regenerate or edit (say which edit prompt you used). Do not commit a failing picture without saying which check it fails.

## Batch 4: room backdrops in the sci-fi style (after Batch 3)

Decision by the user: the island is style C (alchemy), but every ROOM screen (market, workshop, lab, breeding room, library) stays in the sci-fi style of `art/gemini/market/backdrop-b.png`, which is accepted and already in the game.

Read first:
1. `art/gemini/market/backdrop-b.png`: the accepted room backdrop. Pass it to the image tool as the style reference for every picture in this batch.
2. `art/reference/room-market-style4.png`: a screenshot of the market room in the game, so you can see how UI panels cover the centre of a backdrop. Do not pass it to the image tool.

Rules: same as Batch 1 row #1. Front-on view at eye level, 1920×1080 (or larger at 16:9), night, same palette (dark slate `#1B2330`, deep sea `#0E1622`, neon cyan `#22E3F5`, small lime `#B6F23A` lights). THE CENTRE 60 % MUST BE CALM AND DARK. All objects stay in the outer 20 % on each side and the top 15 %. No text, numbers, logos, UI, people, creatures.

| # | Path | What stands at the left and right edges |
|---|---|---|
| 15 | `art/gemini/rooms/workshop.png` | A fabrication workshop: robotic arms, workbenches with tools, a conveyor, stacked metal stock, all with thin cyan edge lights |
| 16 | `art/gemini/rooms/labs.png` | An equipment hall: a tall furnace with a faint orange glow, a pressure vessel with gauges, a frosted cryo tank, an electrolysis cell with two rods in a glass tank |
| 17 | `art/gemini/rooms/breeding.png` | A reactor chamber: pipes, coolant tanks, control consoles with blank dark screens, cable trays overhead |
| 18 | `art/gemini/rooms/codex.png` | A data archive: tall shelves of softly glowing data slabs, a rolling ladder, blank holographic index plates |

Prompt template (replace the bracket with the row text):
```
Game background image, 16:9. A sci-fi interior seen front-on at eye level, in exactly the style, palette and lighting of the reference image: stylized 3D render, dark slate and deep blue surfaces, thin glowing cyan edge strips, small lime lights, restrained glow. [ROW TEXT] stand only at the far left and far right edges of the image. A dark floor with faint glowing grid lines recedes into the room. IMPORTANT: the centre 60 percent of the image must be calm, dark and almost empty, because game UI panels are drawn on top of it; keep all bright objects in the outer 20 percent on each side and the top 15 percent. No text, no letters, no numbers, no logos, no UI, no people, no characters, no watermark.
```

## Batch 2 is ON HOLD

The mining trip (ship, mining islands, one screen per mine) is being redesigned now that the island is style C. Do not generate Batch 2 until this file says so.

## Feedback (written by Claude Code after each batch)

### Batch 1 (reviewed 2026-11-26): accepted

- All 6 files: correct size, correct paths, no text or characters, prompts logged. Good work.
- User picked: island direction C (`concepts/island-style2.png`) and market backdrop `market/backdrop-b.png` (now in the game).
- `island-style4-a/b.png` and `island-style3.png` are kept as records; no further work on them.
- Note for next time: the branch was merged into `main` through a pull request. That is fine; keep doing it that way only after the user says so.
