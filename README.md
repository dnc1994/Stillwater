# Stillwater

A first-person duck exploration game built in Three.js, served as a static website.

Run locally with `python3 -m http.server 5187 --directory dist` and open http://localhost:5187.

Controls: WASD / arrows to paddle and turn, drag to look, Space to quack, P for auto-paddle, M for the map, H to hide the interface. Touch controls are included. Settings offer morning/golden-hour lighting, reduced rendering resolution, camera bob, and a return to open water.

The world is an endless seeded archipelago. There is no outer shoreline, world-radius collision, wraparound, or final discovery count. Paddle in any direction to stream new islands, lily beds, reeds, boathouses, stone passages, and wildlife. The map stays centered on the duck and shows nearby places; discovered places remain marked for the session.

Settings → Generate a new world changes the seed. A bookmarked seed recreates the same geography, including regions revisited after they unload. Return to starting point brings the duck back to the origin.

`dist/world.js` generates independently keyed 160 m regions. `WorldStreamer` retains a moving 5×5 window, builds incoming regions incrementally, and disposes outgoing geometry and instance buffers. A bounded 128-entry layout cache prevents growth with travel. World coordinates are retained for navigation, while a floating render origin keeps GPU coordinates small. The water, sky, lighting and particles follow the duck.

Run `node tests/world.test.mjs` for seed repeatability, distant/negative-coordinate channels, safe landmarks, 1,000 streaming transitions, backtracking and cache limits. Run `node tests/scenery.test.mjs` for real Three.js chunk geometry, finite bounds and resource disposal.

Rendering uses procedural game geometry and materials; this is a real-time naturalistic scene, not a photographic environment scan. WebGL and hardware acceleration are required.

Third-party assets: Three.js r170 (MIT; license in dist/vendor/LICENSE.txt), water normals and grass texture from the Three.js examples. DM Sans and Playfair Display are loaded from Google Fonts with system-font fallbacks.
