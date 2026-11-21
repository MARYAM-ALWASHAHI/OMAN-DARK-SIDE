# Mobile-Only Specification and Engine Decision (v1.0)

Status: **decision document**. It records the final project decisions and what each one requires. It is not a claim that any of this is built.

---

## 1. Final decisions (from the project owner)

| Area | Decision |
|---|---|
| Platforms | **iPhone (iOS) and Android phones only.** No PC version. |
| Camera | **Third person only.** No first-person mode. |
| Mode | Single player |
| Languages | Arabic (Omani dialect) and English |
| Visual goal | The most realistic quality current high-end phones can sustain |
| World | Oman-inspired, starting with one detailed region (Nizwa-inspired interior) |
| Controls | Touch first. Keyboard/mouse only for testing inside the Unreal editor. |

---

## 2. Audit of what exists today

| Item | Where | State | Can it reach the target quality? |
|---|---|---|---|
| Unreal Engine 5 C++ project | repo root | Third-person character, run, crouch, jump, touch buttons, Android/iOS settings. **Never compiled.** | Yes. This is the foundation of the real game. |
| Web demo «حارة الرماد» | `website/demo/` | Playable in the browser. First person, procedural geometry and textures, procedural 3D audio. **Tested in automated browsers only.** | **No.** It is a story and sound prototype, not the game. |
| Website | `website/` | Landing page, characters, roadmap | Marketing only |

### Why the browser demo can't become the game
- **Assets:** it has no real 3D models, no skeletal animation, and no motion capture.
- **Rendering:** browsers can't use the phone's full GPU features (Metal/Vulkan features, hardware texture compression formats per device, native threading).
- **Memory:** browsers on iOS are more limited and less predictable than native apps.
- **Distribution:** it can't be installed from the App Store or Google Play as a native game.

**What carries over:** the story, mission structure, clue design, the horror-event timing, and the sound design ideas. These get rebuilt in Unreal.

---

## 3. Engine comparison: Unreal Engine 5 (mobile) vs Unity URP

| Criterion | Unreal Engine 5 (mobile renderer) | Unity 6 URP |
|---|---|---|
| Realistic humans | **MetaHuman**: realistic faces, hair, and facial rig; generates mobile LODs | Needs third-party tools or a custom pipeline |
| Realistic environments | **Megascans/Fab** library integrated; Landscape and foliage tools | Good, but more assembly needed |
| Mobile performance | Heavier baseline; needs careful tuning. Proven by large realistic mobile shooters built on Unreal. | Lighter baseline; very strong mobile track record |
| Build size | Larger | Smaller |
| iOS and Android | Both supported | Both supported |
| Existing project | **Already started (C++ code, config, plan)** | Would start from zero |
| Programming | C++ and Blueprints | C# |
| Licensing (check current terms) | Royalty after a revenue threshold | Per-seat subscription tiers |

### Recommendation: stay with Unreal Engine 5
1. **Realistic Omani characters are the biggest visual risk.** MetaHuman is the fastest realistic route available to a small team.
2. **The existing work is in Unreal.**
3. **Large realistic open-world mobile games prove the engine can do this**, provided the content is built for mobile from day one.

**Main trade-off:** more performance work. This is planned for in §5.

**Revisit if:** profiling on the minimum target phones can't hold 30 fps with the vertical slice content after optimisation. In that case, re-evaluate Unity URP before building more content.

---

## 4. Real Omani locations: how realism is actually achieved

Realistic open-world games get their "real place" feeling from real data plus large amounts of hand-made art. For this project:

| Layer | Source | Notes |
|---|---|---|
| Terrain shape | Copernicus DEM GLO-30 or SRTM elevation data, imported as a heightmap into Unreal Landscape | Check each dataset's licence and attribution rules |
| Roads and layout | OpenStreetMap | ODbL licence: attribution is required |
| Rocks, ground, plants | Megascans/Fab photoscanned assets | Choose arid-mountain and wadi materials |
| Omani buildings | A custom modular kit modelled from photo references (mud brick, carved doors, crenellations, aflaj) | Photograph only public places, with permission |
| Landmarks | Fictionalised versions (renamed, altered) | Avoids misrepresenting real sites and private property |
| Sound | Field recordings in Oman (wind, insects, souq, call of the doves) | Recorded with permission; no identifiable private conversations |

Rules:
- No restricted, military, or private locations.
- Supernatural events only happen in fictional places.

---

## 5. Mobile quality profiles (targets, to be measured)

| Profile | Devices (verify models) | Resolution | Target |
|---|---|---|---|
| Ultra | Recent iPhone Pro models | ~80–100% of native, dynamic | 30 fps locked |
| High | Recent flagship Android phones | ~70–85%, dynamic | 30 fps locked |
| Medium | Previous-generation flagships | ~60–70%, dynamic | 30 fps |

**"4K" note:** phone screens aren't 4K. The top iPhones are about 2796×1290. "Ultra" means native screen resolution with high-resolution (2K–4K) textures where memory allows.

**Techniques:**
- LODs, with HLOD for distant buildings
- Precomputed visibility and occlusion culling
- Texture streaming with ASTC compression
- Instanced foliage
- Baked lighting for static areas
- Mobile deferred shading
- Dynamic resolution
- Distance-limited shadows
- Reduced particles

**Thermal rule:** profile 20-minute sessions, not 2-minute ones.

---

## 6. Touch controls specification

| Zone | Control | State in the Unreal code |
|---|---|---|
| Left half | Virtual movement joystick | Engine virtual joystick configured; **untested** |
| Right half | Drag to look | Engine right stick configured. Free-drag look is **not built**. |
| Right edge | RUN (toggle), CROUCH (toggle), JUMP | **Written, untested** |
| Right edge | INTERACT, TORCH, INVESTIGATE | **Not built.** Comes with the interaction, inventory, and evidence systems (M3). |
| While driving | Steering, accelerate, brake, exit | **Not built** (M6) |
| Settings | Button layout, size, sensitivity, haptics | **Not built** (UI milestone) |

Buttons are added only together with the system they control. No placeholder buttons that do nothing.

---

## 7. Required first deliverable: status checklist

| Requirement | Status |
|---|---|
| One realistic Omani environment | Not started (needs the modular kit, Megascans, and terrain) |
| One realistic playable Omani character | Not started (needs MetaHuman or an artist, plus correct dishdasha and kumma) |
| Third-person camera | Code written, untested |
| Touch controls | Partially written, untested |
| Walking and running | Code written, untested |
| One drivable vehicle | Not started |
| Interactive NPCs | Not started |
| One complete investigation mission | Designed (see `01_Production_Blueprint.md`); prototyped in the web demo only |
| One abandoned building | Prototyped in the web demo only |
| One supernatural encounter | Prototyped in the web demo only |
| Arabic dialogue | Written as text in the web demo; no voice recording |
| Immersive audio | Prototyped in the web demo only |
| Save and load | Not started |
| Installable iOS or Android test build | **Not possible from this environment.** Needs the owner's PC, plus a Mac for iOS. |

---

## 8. What the project owner needs to provide

**Hardware and accounts**
- A Windows PC with Unreal Engine 5.4+ and Visual Studio 2022, which is required for every native build.
- For iPhone builds: a Mac with Xcode and an Apple Developer account.
- At least one test iPhone and one test Android phone.

**People**
- A 3D character artist for Omani clothing.
- An environment artist for the architecture kit.
- Native Omani voice actors and writers.
- A cultural reviewer.

**Fastest next step**
1. Open the project in Unreal.
2. Report any compile errors.
3. Build to an Android phone.

That proves the whole native pipeline before content work starts.
