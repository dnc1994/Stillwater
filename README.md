# 止水 Stillwater

Be a duck. Drift through one slow day on a river in Jiangnan.

The camera rides on your back, a hand's width above the water, the way it does in those videos where someone straps a camera to a real duck and lets it swim through a village. White walls and black tiles slide past, a stone bridge closes into a full circle with its own reflection, and nothing needs doing.

Built with Three.js and plain JavaScript modules. It is a static site: no build step, no backend, and no image, audio or model files beyond one water normal map. Everything else you see and hear is generated in the browser.

## What there is to do

It can still be played as a slow drift. But the duck now has three proper verbs, and the river is full of reasons to use them.

- **Fly.** Hold `Shift` to run flapping across the water and lift off. Keep flapping to climb, let go to glide, push forward to dive, and touch the water to land in a skid of spray. You can thread the stone arches, skim the rooftops, and see the fields from above. Your two companions take off with you; ducklings come flapping after once you land.
- **Dive.** `E` puts your head under for eight seconds. Paddle about down there: eat river snails off the bed, lunge with `Shift` to catch a fish, and look for eight small things people have dropped in the river over the years. A glint on the surface marks each one.
- **Beg and scramble.** People on the bank throw bread, and sooner if you quack at them. Your companions want it as much as you do.
- **Find six lost ducklings.** You hear them before you see them, and your head turns towards the sound. Quack and they fall into line.
- **Collect seals.** Thirteen small feats, each stamped in red in the journal: three arches in one flight, a long landing skid, an echo under a bridge, a clean sweep of the bread.
- **Keep a journal.** Twenty-two things to come across, each with a line of text. Journal, seals and finds are saved in the browser.
- **Drift, take photos, watch the day turn.** `F` lets the current carry you; `C` takes a duck-cam photo; a day runs dawn to lantern-lit night in about fifteen minutes, with the odd drizzle, and `T` skips ahead.

The river is one closed loop through six stretches: the old town, a bank of willow and peach blossom, a lotus pond with a pavilion, a bamboo creek, an open reed marsh, and rice and rapeseed fields. A narrow back creek cuts from the town to the pond.

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` or arrows | Paddle and turn. In the air: `W` dives, `S` slows, `A` `D` bank |
| Hold `Shift` | Run across the water and take off; flap while flying; lunge while underwater |
| `E` | Dive, or come back up |
| `Space` | Quack |
| Drag | Look around |
| `F` | Drift with the current |
| `C` | Photo |
| `T` | Skip to the next part of the day |
| `J` or `Tab` | Journal, seals and finds |
| `M` | Mute |
| `H` | Hide the interface |

On a phone there is a thumb stick and four buttons (hold the fly button to flap). The interface is in Chinese or English; the button in the corner switches.

## Run it

```sh
git clone https://github.com/dnc1994/Stillwater.git
cd Stillwater
python3 -m http.server 5187 --directory dist
```

Open <http://localhost:5187>. It has to be served over HTTP because it uses JavaScript modules. Any modern browser with WebGL 2 works.

A different countryside: add a name after `#`, for example `http://localhost:5187/#wuzhen`. The same name always gives the same river.

## How it is put together

```text
dist/
  index.html      Page and interface markup
  style.css       Interface styling
  src/
    main.js       Input, paddling, flight, diving, the camera on the duck's back, the frame loop
    world.js      The river loop, banks, terrain and where everything stands (no three.js)
    scenery.js    Puts the land, town, props and plants together
    town.js       Houses, shopfronts, bridges, quays, the covered walk, pavilion and pagoda
    plants.js     Trees, bamboo, reeds, lotus, crops and floating petals, built from leaf cards
    tex.js        Every texture, painted on canvases at start-up: plaster, tile, stone, wood, lattice, leaves, feathers
    post.js       The lens: low mist, light shafts, bloom, tone and colour, vignette, grain
    sky.js        Day cycle, light, mist, sky dome, far hills, rain state
    water.js      Planar reflection, ripples, expanding rings, clear shallows
    duck.js       Ducks, ducklings, egrets, frogs, fish
    life.js       Companions, ducklings, wildlife, bread, riverbed finds, the boatman, rain, fireflies
    audio.js      All sound, synthesised with Web Audio
    build.js      Helpers for building models from coloured, textured primitives
    text.js       Every string, in Chinese and English
  assets/         One water normal map
  vendor/         Three.js r170 and its Water helper
tests/
  world.test.mjs  Checks on the generated world
```

A few notes for anyone changing it:

- `world.js` describes the land as a signed distance to the bank, stored on a 2 m grid. Collision, terrain height, the shoreline tint in the water shader, and every placement decision read from that one grid.
- There are still no image or model files. Surfaces are canvas textures painted in `tex.js`; foliage is cards cut from one painted sheet, lit softly and swayed in the vertex shader.
- The frame is drawn into a floating-point target and finished in `post.js`. Mist is computed from depth and thins with height, so it lies on the water and clears by the rooftops.
- Scenery is merged or instanced, about 125 draw calls and two million triangles a frame across the main, reflection and shadow passes. `water.js` leaves small things out of the reflection and, on slower machines, refreshes it every other frame.
- Quality steps down on its own when frames run slow: first resolution, then shadows and the whole lens pass.
- A flying duck is kept above the ground, roofs and bridge decks by `clearance()` in `main.js`; trees are not obstacles.
- The game has only been checked in headless Chrome with software rendering. Frame rate and the feel of the flight controls on real hardware have not been measured.

### Checks

```sh
node tests/world.test.mjs
```

These confirm, for several seeds, that the river is one navigable loop, that nothing meant to float is on land and nothing meant to stand is in the water, and that the map has no leaks at its edges. Anything visual still needs a look in a browser.

## Deploy

Serve `dist/` from any static host; there is nothing to build.

## Credits

- Three.js r170 and its Water helper, MIT licensed. See `dist/vendor/LICENSE.txt`.
- The water normal map comes from the Three.js examples.
