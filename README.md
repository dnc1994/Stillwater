# Stillwater

A quiet exploration game from a duck’s point of view. Paddle through an endless countryside of winding creeks, lotus ponds, old bridges, waterside villages, and abandoned barges. There’s no destination to reach—just another bend in the river.

Built with Three.js and vanilla JavaScript. The game runs entirely in the browser and ships as a static site, with no build step or backend.

## Features

- **Endless, seeded exploration.** Connected waterways lead through six landscapes: canal villages, lotus backwaters, old freight reaches, bamboo creeks, rice-paddy country, and reed marshes.
- **A view from the water.** Ride 42 cm above the surface on the duck’s back, or switch to an unobstructed 23 cm waterline view.
- **A living countryside.** Discover stone arches, timber crossings, fishing skiffs, flooded paddies, whitewashed houses, and sheltered aquatic gardens.
- **Gentle movement and atmosphere.** Drift, paddle, or cruise automatically, with subtle camera motion, rippling reflections, a trailing wake, and morning or golden-hour light.
- **A map and discovery journal.** See nearby waterways and keep track of quiet places found during your session.
- **Desktop and touch controls.** Adjust rendering quality and disable camera bob for comfort.

The visual style uses procedural geometry and naturalistic materials; it is not a photogrammetry-based environment.

## Run locally

You need Python 3 and a modern browser with WebGL and hardware acceleration enabled.

```sh
git clone https://github.com/dnc1994/Stillwater.git
cd Stillwater
python3 -m http.server 5187 --directory dist
```

Open [localhost:5187](http://localhost:5187). No package installation is required. Serve the files over HTTP rather than opening `index.html` directly, because the game uses JavaScript modules.

## Controls

| Input | Action |
| --- | --- |
| W / ↑ | Paddle forward |
| S / ↓ | Paddle backward |
| A / ← and D / → | Turn |
| Drag on the scene | Look around |
| Space | Quack |
| P | Toggle automatic paddling |
| M | Open or close the map |
| H | Toggle the main interface |

On small screens, use the on-screen paddling and quack buttons. Settings include viewpoint, lighting, rendering quality, camera bob, and a return to the starting point.

## World seeds

Each world is generated from the `seed` in its URL:

```text
http://localhost:5187/?seed=jiangnan
```

Bookmark or share the URL to revisit the same geography. Enter a seed or choose **Generate a new world** in Settings to explore somewhere else. Discoveries and your current position are session-only; a seed recreates the landscape, not a saved playthrough.

## Development

Edit the files in `dist/` and reload the browser. Despite its name, this directory contains the maintained game source as well as the assets served to players.

```text
dist/
  index.html          Page structure and controls
  style.css           Interface styling
  game.js             Game loop, input, camera, lighting, audio, and map
  world.js            Seeded terrain, waterways, collisions, and chunk streaming
  scenery.js          Vegetation, buildings, bridges, boats, and scenery batches
  duck.js             Duck model and feather materials
  water-surface.js    Water geometry, ripple shading, and wake
  assets/             Bundled textures
  vendor/             Three.js and its sky/water helpers
tests/
  world.test.mjs      Procedural generation and navigation checks
  scenery.test.mjs    Geometry and resource lifecycle checks
```

The world streams a moving 5×5 window of 160-metre chunks. Adjacent chunks share a continuous terrain field, while bounded caches and disposal of unloaded GPU resources keep exploration from accumulating the entire world in memory. Instanced scenery reduces draw calls, and a floating render origin preserves local coordinate precision as you travel.

### Run checks

With a current Node.js release installed:

```sh
node tests/world.test.mjs
node tests/scenery.test.mjs
```

The checks cover repeatable seeds, connected waterways, reachable backwaters, shared terrain edges, distant coordinates, chunk streaming, cache limits, finite geometry, and resource disposal. Camera, lighting, and water changes also need a visual browser check.

## Deploy

Serve the contents of `dist/` with any static web host. No server functions, environment variables, or build dependencies are required.

For **Cloudflare Pages**, connect this GitHub repository and use:

| Setting | Value |
| --- | --- |
| Production branch | `master` |
| Framework preset | None |
| Build command | `exit 0` |
| Build output directory | `dist` |
| Root directory | Repository root (leave blank) |

Enable automatic production deployments to publish future pushes to `master`. These are Pages settings; Cloudflare Workers uses a separate deployment setup.

The local `.openai/` folder contains hosting metadata from the original development environment. It is ignored by Git and is not required to run or deploy the game.

## Credits

- **Three.js r170**, including the Sky and Water helpers: MIT licensed. See [the bundled license](dist/vendor/LICENSE.txt).
- **Grass and water-normal textures:** sourced from the Three.js examples.
- **Duck feather texture:** AI-generated for this project.
- **DM Sans and Playfair Display:** loaded from Google Fonts, with system-font fallbacks.

Game code and textures are served locally by the host; Google Fonts is the only external presentation asset request.
