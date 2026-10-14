<div align="center">

# ☀️ HELIOS

**Scroll from the Milky Way to Pluto.**

A scroll-driven 3D voyage through the solar system. A cinematic WebGL film plays **under** the page as you scroll — start at a spiral Milky Way, dive to the Sun, then fly past every planet line-wise out to Pluto — while every word on top is **real HTML**: planet names, facts, and moon chips.

[![live demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square)](https://amanxdev0.github.io/helios/)
[![license](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![three.js](https://img.shields.io/badge/three.js-%5E0.160.0-black?style=flat-square)](https://threejs.org/)

[Live demo](https://amanxdev0.github.io/helios/) · [Report a bug](https://github.com/amanxdev0/helios/issues)

</div>

---

## The journey

| Scroll | Stop |
|---|---|
| 0% | **Milky Way** — 100,000 light-years of spiral, 100–400 billion stars |
| 10% | Inbound — falling toward one ordinary yellow dwarf |
| 20% | **Sol** — the Sun, 99.86% of the system's mass |
| 27–89% | **Mercury → Venus → Earth → Mars → Jupiter → Saturn → Uranus → Neptune → Pluto**, line-wise |
| 95% | The family portrait — the whole system in one frame |

Each planet stop shows its name, sharp facts, and its moons — Earth's Moon, Phobos & Deimos, the Galilean four, Titan & Enceladus, Triton, Charon and friends — with the major ones orbiting in 3D around you. Details: Saturn's rings, Uranus rolling on its side at 98°, procedurally painted planet textures (no image downloads).

## What's in the 3D scene

- **Spiral Milky Way** — 5,000+ additive points with a glowing core, plus a pulsing "you are here" marker
- **The Sun** — procedural churning texture, breathing glow, Parker Solar Probe on a tight fast orbit
- **Every planet** with canvas-painted textures, real axial tilts, and orbiting moons
- **Humanity's machines** — ISS, Hubble, Tiangong around Earth; Mangalyaan at Mars; Cassini at Saturn; Aditya-L1 and JWST holding their Lagrange points; Vikram lander on the Moon
- **Asteroid belt** with 700 tumbling instanced rocks and Ceres, the Kuiper belt, and the twin **Voyagers** going interstellar

## The technique

Built on the [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) interpolation engine:

1. **Fixed canvas, tall page** — the film is a `position: fixed` canvas; the page height *is* the timeline.
2. **Scroll is the playhead** — one number, 0 → 1, drives camera path, color grade, fog and visibility.
3. **Interpolation, not snapping** — scroll events arrive janky (~20 Hz); the render loop eases toward the target every frame with frame-rate-independent damping, so motion holds smooth.
4. **Real HTML on top** — chapters fade in/out by playhead range; a HUD names your current stop with a live FPS meter.

## Run it

No video files, no build step — just open it:

```bash
cd helios
python3 -m http.server 8000
# → http://localhost:8000
```

Or via **GitHub Pages** (already live).

## The Scroll Series

Part of Aman Singh's scroll-driven cinematic universe — real HTML floating over live 3D films, where scroll is the playhead:

- [SCROLLFILM](https://amanxdev0.github.io/scrollfilm-3d/) — the original cinematic WebGL film + full reverse-engineering breakdown
- [HELIOS](https://amanxdev0.github.io/helios/) — scroll from the Milky Way to Pluto
- [ABYSS](https://amanxdev0.github.io/abyss/) — descend through the five ocean zones to Challenger Deep
- [EVENT HORIZON](https://amanxdev0.github.io/event-horizon/) — dive into the heart of a black hole
- [RAMAYANA](https://amanxdev0.github.io/ramayana/) — a 3D flight through the Valmiki Ramayana

Built with the [scrollfilm engine](https://github.com/amanxdev0/scrollfilm) — make your own.

## License

MIT © Aman Singh
