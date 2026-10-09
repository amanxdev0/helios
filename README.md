# HELIOS — scroll from the Milky Way to Pluto

A scroll-driven 3D voyage through the solar system. A cinematic WebGL film plays **under** the page as you scroll — start at a spiral Milky Way, dive to the Sun, then fly past every planet line-wise out to Pluto — while every word on top is **real HTML**: planet names, facts, and moon chips.

No video files. No build step. Just open it.

**Live:** https://amanxdev0.github.io/helios/

## The journey

| Scroll | Stop |
|---|---|
| 0% | **Milky Way** — 100,000 light-years of spiral, 100–400 billion stars |
| 10% | Inbound — falling toward one ordinary yellow dwarf |
| 20% | **Sol** — the Sun, 99.86% of the system's mass |
| 27–89% | **Mercury → Venus → Earth → Mars → Jupiter → Saturn → Uranus → Neptune → Pluto**, line-wise |
| 95% | The family portrait — the whole system in one frame |

Each planet stop shows its name, sharp facts, and its moons — Earth's Moon, Phobos & Deimos, the Galilean four, Titan & Enceladus, Triton, Charon and friends — with the major ones orbiting in 3D around you. Details: Saturn's rings, Uranus rolling on its side at 98°, procedurally painted planet textures (no image downloads).

## The technique

Built on the [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) interpolation engine:

1. **Fixed canvas, tall page** — the film is a `position: fixed` canvas; the page height *is* the timeline.
2. **Scroll is the playhead** — one number, 0 → 1, drives camera path, color grade, fog and visibility.
3. **Interpolation, not snapping** — scroll events arrive janky (~20 Hz); the render loop eases toward the target every frame with frame-rate-independent damping, so motion holds smooth.
4. **Real HTML on top** — chapters fade in/out by playhead range; a HUD names your current stop with a live FPS meter.

## Run it

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Deploy to **GitHub Pages**: repo Settings → Pages → Deploy from branch → `main`.

## Files

| File | What |
|---|---|
| `index.html` | Structure: fixed canvas, HUD, 14 chapters (galaxy → Pluto → finale) |
| `css/style.css` | Dark cinematic theme, sticky chapters, moon chips, responsive |
| `js/voyage.js` | Three.js voyage: galaxy, Sun, 9 planets, 20+ orbiting moons, camera journey, interpolation engine, FPS meter, adaptive quality |

## Facts

Planet and moon facts follow NASA's solar system data. Moon counts ("95 known" etc.) change as new moons are confirmed — the named major moons are the stable part.

## License

MIT — steal the loop, it's the point.
