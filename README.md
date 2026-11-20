# 🛺 Rikshaw Rush — Karachi

A 3D endless runner in the browser. You drive a decorated Karachi auto-rickshaw through **Burns Road, Sea View, Kemari Harbour, Shahrah-e-Faisal and Mazar-e-Quaid**. Dodge traffic, cows and baraats, jump speed breakers and open manholes, carry passengers, race Chotu Ustad, and collect K-A-R-A-C-H-I.

**Made in Pakistan 🇵🇰 — Developer: [Muhammad Talha Khan](https://muhammadtalhakhan2003.github.io/PortFolio_Talha/)**

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the build locally
```

Requires Node 20+.

## Login (Clerk)

Create `.env.local` in the project root:

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

The key is the **publishable** key from the Clerk dashboard. It is meant for the browser, so it is safe to ship. When a player signs in, their progress (coins, upgrades, skins, high score) syncs to their Clerk account, so they can carry on from another device. Without a key the game runs in guest mode.

For deployment (Vercel, Netlify, etc.), add the same variable in the host's environment settings. Also add your production domain under **Clerk → Domains**.

## Install as an app (PWA)

The game installs to the home screen or desktop and works offline.
- **Chrome / Edge / Android:** use the "Install Rikshaw Rush" card on the menu.
- **iPhone / iPad:** open the game in Safari, tap Share ⬆️, then "Add to Home Screen".

## Using your own Blender models

Every model in the game is generated in code, so no asset files are needed. Any of them can be swapped for your own Blender model:

1. In Blender, model the object at real scale (**1 unit = 1 metre**). A rickshaw is about 1.5 m wide, 3 m long and 2.1 m tall.
2. Point the front of the vehicle toward **+Y in Blender** (the glTF exporter maps Blender +Y to −Z, the game's forward). Put the origin on the ground, at the centre of the model.
3. **File → Export → glTF 2.0**. Choose **glTF Binary (.glb)** and tick **+Y Up** and **Apply Modifiers**.
4. Save the file as `public/models/rickshaw.glb`. The supported names are `rickshaw`, `car`, `van`, `truck`, `bus`, `bike`, `cow`, `camel`, `baraat`, `pothole`, `barrier`, `ramp`.
5. Add the name to `public/models/models.json`:
   ```json
   { "models": ["rickshaw"] }
   ```
6. Reload the page. The browser console prints `[models] loaded custom rickshaw.glb`. Collision boxes are sized automatically from the model's bounds.

Keep each model to roughly 5–20k triangles and use a few simple materials so the game stays smooth on phones.

## Controls

| Action | Keyboard | Touch |
|---|---|---|
| Change lane | ← → / A D | swipe left / right |
| Jump (360° trick in the air) | ↑ W Space | swipe up |
| Brake / slam down | ↓ S | swipe down |
| Nitro | Shift / N / E | double-tap or ⚡ |
| Horn (clears the car ahead) | H | tap or 📯 |
| Headstart / Shield start | B / V | buttons at run start |
| Next radio station | R | 📻 chip |
| Pause / Mute | P Esc / M | ❚❚ |

## Features

- **5 Karachi districts** with gates between them, plus a choice of start location.
- **Day/night cycle**, rain, dust storms, lightning, bloom, animated sea water, clouds and a distant skyline.
- **Realistic roads:** speed breakers, open manholes, broken patches, potholes, puddles, asphalt patches and cracks.
- **Karachi life:** paan cabins and paan stains, wall posters and chalking, baraats, camels at Clifton, cranes and ships at Kemari.
- **Gameplay:** combos and fever mode, near misses, ramps and air tricks, nitro smashing, horn that clears the way, passenger missions, the rival racer Chotu Ustad, K-A-R-A-C-H-I letters, and power-ups (magnet, shield, 2x coins, nitro, Meetha Paan).
- **Progression:** garage (upgrades, paint, horns, animated trails, boosts), daily Lucky Spin, daily challenges, achievements, top runs, and continue-for-coins.
- **Audio:** a synthesised two-stroke engine with gears, rattle and backfire. Rikshaw Radio has Dhol FM, Qawwali Night and a Lo-fi station, or **your own songs** stored only in your browser.
- **Dialogue** is all in Karachi's own zubaan.
- **Platform:** Clerk login with cloud save, installable PWA with offline play, and layouts for phone, tablet and desktop.

## Tech

Three.js (WebGL) · custom GLSL (curved world, sky) · Web Audio API · Vite · Clerk · IndexedDB · Service Worker. No frameworks and no asset files.

```
src/
  main.js           app shell, states, camera, loop, garage/spin/radio screens
  config.js         districts, upgrades, skins, dialogue, posters, spin table
  core/             save, audio engine, radio, auth (Clerk), input, UI, challenges
  render/           curved-world shader, procedural textures, materials, sky, weather, particles, bloom, glTF loader
  models/           rickshaw, vehicles, people, buildings, landmarks, props
  game/             world streamer, player, rival AI, coins, run (spawner + rules)
```
