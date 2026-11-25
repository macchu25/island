# CHEMIMON: island map and Blender models (build brief)

Approved by the user on 2026-11-20 ("làm đi"): replace the lab room with a fixed-layout 3D island, and
model the island, the buildings and all 45 monsters in Blender. Baby/chibi style from the concept sketch
in the user's ChatGPT chat. No backend change. A buildable island (player-placed habitats) is a later slice.

## 1. Decisions

- **Genre, not copy.** A habitat-island collecting game. All shapes, names and layout are original to CHEMIMON.
  Do not imitate the look of any existing game.
- **Blender, scripted.** Blender 4.5 LTS headless at `~/tools/blender-4.5.16-linux-x64/blender`. Every model is
  built by a Python recipe and exported to `.glb`. Recipes are the source; `.glb` files are build output that is
  committed so the game runs without Blender.
- **Fixed island.** One island, 7 habitats, 3 buildings. Every owned species stands in the habitat of its group.
- **Deviations from Slice 1 spec section 8 (recorded rulings):** no shared skeleton and no baked animation clips
  in this round (motion is procedural in the client); no meshopt compression (files are 70 to 130 KB already).
  The triangle and size budgets of section 8 still hold and are asserted by the export step.

## 2. Art direction (binding)

Baby monster: oversized head, tiny body, stubby limbs, large gentle eyes with two white highlights, tiny mouth,
pink cheeks, soft rounded shapes, pastel-leaning colours, minimal detail, friendly. No scary faces, no teeth,
no sharp menacing spikes (use rounded nubs), no elaborate wings, no text on the model.

Each monster must be recognisable **by silhouette alone**, and its shape must say something true about the
chemical: phase (gas floats, liquid is a drop, solid stands), a real property or a real use, and for compounds
a visible hint of the component elements (their colours, or the real molecule shape).

Reference pilots: `art/blender/monsters/h2.py`, `fe.py`, `h2o.py`. Look at their renders before you start.

## 3. Monster model contract

- Recipe: `art/blender/monsters/<chemicalId>.py`, defines `build()` which creates parts with `chemilib` helpers
  and returns `{'height': ..., 'hover': ...}`. `run.py` calls `chemilib.finish()` with that dict.
- Blender space: Z up, stands on Z = 0, **faces -Y**. `finish()` floors and scales the model.
- `height`: 1.0 for a normal monster. Allowed range 0.8 (small, squat) to 1.25 (tall accessory).
- `hover`: 0 for solids and liquids, 0.12 to 0.25 for gases and glowing orbs (air gap under the model).
- Body colour = the monster's `color` in `packages/content/data/monsters.yaml` (you may lighten or darken it
  slightly with `shade()`). Accessories may use other colours.
- Budget: <= 5000 triangles, <= 1 MB, plain Principled materials only, `metal` <= 0.6, no textures, at most
  8 materials per monster. Asserted on export; aim for under 3500 triangles.
- Do not edit `chemilib.py` or `run.py`. If you need a new helper, define it inside your recipe file.
- Build + preview: `~/tools/blender-4.5.16-linux-x64/blender -b -P art/blender/run.py -- --render <id> [<id>...]`
  writes `apps/web/public/assets/monsters/<id>.glb`, `art/renders/<id>.png` (beauty) and `<id>_sil.png`
  (black silhouette). **You must open each render with the Read tool and judge it by eye.** Code that runs is
  not the bar; a cute, readable monster is.

- Picker thumbnails: `blender -b -P art/blender/thumbs.py -- [<id> ...]` renders
  `apps/web/public/assets/monsters/thumbs/<id>.png` (256 px, transparent) from the shipped `.glb`. Re-run it after
  changing a model. The breeding room shows these pictures; a missing one falls back to a coloured disc.

### chemilib cheat sheet

`mat(hex, rough, metal, emit, alpha)`, `shade(hex, factor)`, `sphere(loc, r, mat, scale, rot)`,
`ico(loc, r, mat, subdiv, scale, rot, flat)`, `rbox(loc, size, mat, bevel, rot)`,
`cyl(loc, r, depth, mat, rot, r_top)`, `torus(loc, major, minor, mat, rot, scale)`,
`drop(loc, r, mat, tip, scale, rot)`, `capsule(a, b, r, mat)`,
`stick(x, z, r, mat, squash, scale, on=[...])` (glue a flat blob onto the front surface),
`face(z, dx, eye_r, eye, mouth, blush, on=[head])` (eyes `round|sleepy|happy|wide`, mouth `smile|o|flat|none`).
Materials can be passed as a hex string. Call `face()` after the head exists and pass `on=[head]`.

## 4. Trait table (one unique cue per monster)

The cue is the minimum. You may improve it, but keep it true to the chemistry and keep it baby-simple.

### Elements

| id | name, colour | shape and cue |
|---|---|---|
| h2 | Hydrollo #9AD8FF | DONE. Floating pale puff, cloud tufts, wisp tail. |
| he | Heliopop #FFE8A3 | Party-balloon body with a knot and a short string. Floats high. Aloof sleepy eyes. |
| c | Soota #3B3B44 | Rounded charcoal lump with a few soft facets, one small bright diamond gem on the forehead (graphite and diamond). |
| n2 | Nitrolo #7F9CF5 | Two equal blue puff lobes side by side joined by three thin links (triple bond), one face on the pair or on the front lobe. Calm sleepy eyes. Floats. |
| o2 | Oxybree #5EC8E5 | Cyan puff with two small soft breeze tufts at the sides and a tiny orange ember on its tail (oxygen feeds fire). Happy eyes. Floats. |
| f2 | Fluorspike #D7F26B | Pale yellow-green round imp covered in soft rounded nubs (baby spikes). Wide eager eyes. Floats. |
| ne | Neonimbus #FF5E7E | Glowing red-pink orb inside a bent glowing neon-tube ring (emissive). Floats. |
| na | Sodiburr #E8E3C9 | Soft squishy rounded cube with one corner sliced off showing a shiny silver cut face; a few fizz bubbles at its feet. |
| mg | Magflick #CFD6DD | Silvery body with a curled ribbon on its head (magnesium ribbon) ending in a bright white spark (emissive). |
| al | Alumbo #B8C4D0 | Light drink-can shaped body (cylinder) with a ring-pull tab on top. |
| si | Silicub #6E7F99 | Slate-blue chip: flat square body with thin gold circuit lines and short pin legs along two sides. |
| p4 | Phospip #F6F1D1 | Waxy pale body made of four balls in a tetrahedron (the P4 molecule), a small green glow on top (emissive). |
| s8 | Sulfurrow #F2D21B | Yellow crystal baby wearing a crown ring of eight small beads (the S8 ring). |
| cl2 | Chlorquill #9BE35A | Pale green two-lobed gas prankster wearing swim goggles on its forehead (pool chlorine). Floats. |
| ar | Argoso #B79CFF | Lavender light-bulb: glass bulb body with a screw base under it, lazy sleepy eyes. Floats low. |
| k | Kalibop #C9A7E8 | Soft lilac rounded block with a lilac flame tuft on its head (potassium burns violet). |
| ca | Calcimoo #F4EBDD | Chalky white gentle giant, wide body, a bone on its head like a bow, chunky "chalk boots". |
| fe | Ferrotump #8A8D91 | DONE. Iron golem, horseshoe magnet, rust patch. |
| cu | Cuprikin #D98C4A | Copper golem with a coiled wire antenna (it conducts) and one green patina spot. |
| zn | Zincabob #A9B7BE | Bluish-grey guard carrying a round shield in front of one arm, bucket helmet (zinc protects steel). |
| ag | Argentot #E3E6EA | Very smooth mirror-shiny round head, a four-point sparkle, one small dark tarnish spot. |
| i2 | Iodrift #5B2A86 | Dark violet rounded crystal base that turns into soft violet mist tufts on top (it sublimes). |
| au | Aurumble #FFC93C | Gold bar (trapezoid ingot) head, tiny crown, proud happy eyes. |
| hg | Mercuripple #C0C8D2 | Liquid-metal puddle blob with a few loose droplets beside it and a small glass cap on its head. |
| pb | Plumbudge #5F6670 | Squat heavy dome like a fishing weight with a ring on top, sleepy eyes. Height 0.8. |

### Compounds

| id | name, colour | shape and cue |
|---|---|---|
| h2o | Aquabun #2F8FEA | DONE. Water drop with two hydrogen buns at the bent-molecule angle. |
| co | Smolderwisp #8F9AA6 | Grey wisp, two lobes of unequal size (small charcoal C, larger cyan-grey O), half-closed sneaky eyes. Floats. |
| co2 | Fizzcarb #D6DEE6 | Three balls in a straight line (O=C=O): charcoal middle with the face, a pale cyan ball each side, fizz bubbles above. Floats. |
| cuo | Cupricoal #26221F | Black powdery lump with small copper-coloured feet and hands. |
| cu2o | Rubicup #B5332B | Red rounded cube crystal with two copper studs on top. |
| na2o | Natrolump #F1EEE4 | White lump with two small sodium-cube "ears" (cream cubes). |
| na2o2 | Peroxipip #F5E6A8 | Pale yellow body wearing a bow made of two joined cyan oxygen bubbles (the O-O bond). |
| k2o2 | Kaliperk #E9DDF5 | Lilac-white body, the same two-bubble bow, plus a small lilac flame tuft. |
| ko2 | Superkal #F2B33D | Orange-yellow hero: little cape and a clear bubble helmet (it releases oxygen in rebreathers). |
| fe3o4 | Lodestomp #1E1B1A | Black magnetic rock with iron filings standing up like soft hair (rounded bristles) and a small compass needle. |
| fe2o3 | Hemarust #9C3D1E | Rusty red-brown golem with a few flaking plates and one rusty nail on its head. |
| mgo | Blancmag #FAFAF5 | White powder-puff block, soft, with a faint spark above it. |
| mgoh2 | Milkymag #EAF4F4 | Milk-drop / milk-bottle body (milk of magnesia) with two small OH ears (cyan ball with a tiny pale ball). |
| naoh | Causticub #DCE8F0 | Slippery soap-bar body with a few bubbles (it makes soap). |
| al2o3 | Sapphirelle #2C5BC9 | Blue faceted sapphire gem body, brilliant-cut. |
| sio2 | Quartzle #E6E0F0 | Cluster of pale six-sided quartz points, the biggest one has the face. |
| sic | Moissy #3D7F6E | Dark teal hard crystal carrying a small grinding-wheel disc (it is an abrasive). |
| hcl | Hydrochirp #C7F0B0 | Pale green puff with one small pale-blue hydrogen ball attached, sour `flat` mouth. Floats. |
| nacl | Salinub #F7F7F7 | Clean white cube crystal with two or three smaller cubes stuck on it, salt-shaker cap on top. |
| nh3 | Ammobloom #B6E3D4 | Mint ball body standing on three small hydrogen balls like a tripod (trigonal pyramid). Floats low. |

## 5. Island contract

- Layout source of truth: `apps/web/src/island/layout.json` (three.js units, Y up, camera looks from +Z to -Z).
  Blender coordinates: `x_blender = x`, `y_blender = -z`, ground at `z_blender = 0`.
- Output files in `apps/web/public/assets/island/`:
  - `island.glb`: terrain and all habitat scenery, authored in world position (no normalisation). Grass is at
    height 0; the plot floor inside every habitat and building radius is flat at 0.025 (as built), and the client
    stands monsters on that floor. <= 60000 triangles, <= 3 MB.
  - `breeding.glb`, `extractor.glb`, `codex.glb`: one building each, origin at the centre of its base on the
    ground, facing +Z in three.js (-Y in Blender), fits inside its radius `r`. <= 8000 triangles, <= 1 MB each.
- The centre of each habitat plot stays clear of tall scenery: monsters stand there. Scenery goes on the rim.

## 6. Habitat mapping (client)

| habitat | members | rule |
|---|---|---|
| noble | he, ne, ar | element, family `noble-gas` |
| halogen | f2, cl2, i2 | element, family `halogen` |
| metal | na, mg, al, k, ca, fe, cu, zn, ag, au, hg, pb | element whose family has `metal` as a whole hyphen-separated word (`alkali-metal`, `transition-metal`; not `nonmetal`, not `metalloid`) |
| gas | h2, n2, o2 | other element with phase `gas` |
| crystal | c, si, p4, s8 | every other element |
| spring | h2o, co, co2, hcl, nh3 | compound whose phase is not `solid` |
| quarry | the 15 solid compounds | compound with phase `solid` |

Slots are computed in the client from the habitat centre and radius, so no owned species is ever hidden.
