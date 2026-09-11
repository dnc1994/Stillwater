# Stillwater

A first-person duck exploration game built in Three.js, served as a static website.

Run locally with `python3 -m http.server 5187 --directory dist` and open http://localhost:5187.

Controls: WASD / arrows to paddle and turn, drag to look, Space to quack, P for auto-paddle, M for the map, H to hide the interface. Touch controls are included. Settings offer morning/golden-hour lighting, reduced rendering resolution, camera bob, and a return to open water.

The lake has four wooded islands, lily beds, reeds, a boathouse, a stone passage, other ducks, five discoverable places, reflected water, gentle momentum and synthesized ambient audio. Progress lasts for the current session.

Rendering uses procedural game geometry and materials; this is a real-time naturalistic scene, not a photographic environment scan. WebGL and hardware acceleration are required.

Third-party assets: Three.js r170 (MIT; license in dist/vendor/LICENSE.txt), water normals and grass texture from the Three.js examples. DM Sans and Playfair Display are loaded from Google Fonts with system-font fallbacks.
