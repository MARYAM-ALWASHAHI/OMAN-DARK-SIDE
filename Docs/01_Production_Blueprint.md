# OMAN: THE DARK SIDE — Vertical Slice Production Blueprint (v0.1)

Status: **planning document**. Nothing in this file is implemented unless the Milestone table says so.
Engine: Unreal Engine 5 (C++ core + Blueprint/data configuration). Platforms: Windows PC + Android phones + iPhone/iPad, developed together; every milestone is also checked on a phone and an iPad.

---

## 0. Region choice: Nizwa-inspired interior (Ad Dakhiliyah)

The slice is set in a **fictional town and wadi inspired by the Nizwa area**, not a reproduction of Nizwa itself.

Why this region works for the first prototype:
- **Compact and varied.** In a small footprint (about 2 × 2 km) it can show a town core, a market, palm groves on a falaj (irrigation channel), a mountain road, and an abandoned mud-brick quarter.
- **No ocean.** It avoids large water, ports, and boats, which are expensive systems for a first slice.
- **It fits the story.** Old abandoned quarters next to living towns are a real feature of the interior. They give a natural, respectful setting for a mystery without inventing a fantasy location.
- **It leads to later regions.** The road can later continue up toward the Jebel Akhdar plateau.
- **Mostly static geometry.** Mud-brick and stone architecture is modular: walls, towers, doors, and roofs can be reused heavily.

Why the other regions wait: Muscat needs dense traffic and a big city; Salalah needs wet vegetation and seasonal effects; the Sharqiya desert needs large dunes and sand rendering; Musandam needs sea and boats; Sohar needs industrial assets. All of these are better as later World Partition regions.

Fictional place names (all must be checked so they don't match a real village; see §10):
- Town: **Wadi Al-Sukoon** ("valley of stillness")
- Abandoned quarter: **Harat Al-Ramad**

---

## 1. Scope

**In scope (vertical slice)**
- One region of about 2 × 2 km on a single World Partition map
- One playable protagonist: walk, sprint, jump, first- and third-person cameras
- One drivable vehicle: a generic original 4x4 pickup
- 5 interactive NPCs plus 6–10 ambient placeholder NPCs
- 1 investigation mission, start to finish
- 1 abandoned location and 1 restrained supernatural event
- A basic day/night cycle and 2 weather states (clear, and dusty haze/overcast)
- Save/load of mission state and player position
- Minimal HUD: objective text, interaction prompt, evidence notebook
- English UI and subtitles; Arabic text placeholders

**Explicitly out of scope**
- Other regions, the full country map, and GPS route-finding
- Four-season simulation, rain or water accumulation, sandstorms
- Traffic AI, vehicle damage, more than one vehicle
- Character customization, combat, and weapons
  - The reference art shows a pistol; the slice has no combat.
- Full daily routines for NPCs (they stand or idle at fixed spots)
- Recorded Omani voice acting (text and subtitles only)
- Final evidence board with free-form theory linking (the slice has a simple version)
- Multiple endings and any multiplayer
- Mobile visual parity with PC: mobile uses simpler lighting, no Lumen

---

## 2. Level plan: Wadi Al-Sukoon (about 2 × 2 km)

```
            N
   [Mountain road] ──────────── (blocked: rockfall → future Jebel Akhdar link)
         │
   [Wadi crossing] ── dry wadi bed ── [Surveyor's parked car]  (clue site A)
         │
   [Harat Al-Ramad]  abandoned mud-brick quarter, upper slope   (mission climax)
         │  footpath along old falaj
   [Palm groves + falaj channel] ── [Falaj distribution point]  (clue site B)
         │
   [Town core]: fort tower (landmark), souq lane, mosque (exterior only),
                coffee shop, police post, 6–8 houses
         │
   [Main road] ── fuel station ── exit sign (edge of map)
```

- **Landmarks** (visible from most of the map, to guide navigation):
  - a round fort tower in town
  - a mountain ridge to the north
  - a mobile phone mast above the abandoned quarter
- **Roads:**
  - one asphalt main road
  - one graded gravel track up the wadi
  - footpaths through the groves
  - All are connected. The pickup can reach every area except the inside of the abandoned quarter (narrow lanes, on foot only).
- **Respect rule:** the mosque is exterior only and is never used for horror or combat.

---

## 3. Cast (original characters; final names to be checked with an Omani consultant)

| Character | Role | Notes |
|---|---|---|
| **Rashid** (mid-30s) | Protagonist | Insurance claims investigator from Muscat who grew up in Wadi Al-Sukoon. Wears a dishdasha with a kumma in town and practical clothes when exploring. Investigator rather than police, so the slice doesn't misrepresent the Royal Oman Police. |
| **Khalfan** (24) | Missing person | Junior land surveyor. Last seen three days ago. Never seen in person in the slice; known through his notebook and recordings. |
| **Maryam** (late 20s) | Supporting | Khalfan's older sister, a pharmacist. Calls Rashid in. Main source of emotional stakes. |
| **Sergeant Nasser** (40s) | Supporting | Local police. Cooperative but treats the case as a runaway. Uses a fictional uniform design, not ROP insignia. |
| **Abu Hilal** (70s) | Elder witness | Knows the history of Harat Al-Ramad. His account changes once you show him the notebook. |
| **Saif** (50s) | Shopkeeper | Runs a souq stall. Sold Khalfan batteries and water; holds the receipt clue. |

---

## 4. Investigation mission: "The Last Survey"

**Intro:** Maryam phones Rashid. Khalfan's car was found by the wadi, and the police think he has gone to the UAE for work. She doesn't believe it.

**Objectives**
1. Meet Maryam at the family house.
2. Inspect Khalfan's car at the wadi crossing.
3. Ask in town about Khalfan's last day. This means talking to Saif and to Sergeant Nasser.
4. Follow the falaj path to the distribution point.
5. Enter Harat Al-Ramad and find where Khalfan went.
6. Present the evidence to Abu Hilal. *(optional, unlocks extra dialogue)*
7. Return to Maryam with a conclusion.

**Clues (each one is an Evidence data asset)**

| ID | Clue | Where it is found | What it reveals |
|---|---|---|---|
| E1 | Survey tripod bag, legs missing | Car boot | He took the equipment and walked. |
| E2 | Receipt: torch batteries + water, 6:40 pm | Saif's stall | He planned to go out after dark. |
| E3 | Fresh footprints on the falaj wall | Clue site B | Points toward the abandoned quarter. |
| E4 | Survey notebook with coordinates, the last entry unfinished | Abandoned house, upper room | Location of the climax. |
| E5 | Voice-recorder clip | Next to E4 | Ambiguous final message. Also the hook for chapter 2. |

**NPC interaction:** branching dialogue with 2–3 choices. Options appear only when the player holds certain evidence, e.g. showing E2 to Sergeant Nasser makes him concede it's "unusual".

**Completion:** E1, E3, and E4 are collected, and the player has reported to Maryam. If E5 and the Abu Hilal option were also completed, Rashid's report includes an extra line. This is a small consequence, not a branching ending.

**Reward:** the case file is unlocked, and the road north opens (reserved for a later chapter).

---

## 5. Abandoned location and supernatural event

- **Location:** Harat Al-Ramad. Inside are a collapsed lane, three enterable houses (one of them two storeys), a dry well courtyard, and fallen roof beams.
- **The event, "The Count":**
  1. When Rashid picks up the notebook (E4), the ambient sound of wind and insects fades out over 4 seconds.
  2. A faint voice, matching the recorder voice, reads two survey numbers from another room.
  3. When the player reaches that room, it is empty. The only sign is the notebook page they just picked up, now turned to a different page.
  4. There is no monster, no chase, and no jump-scare sting. It plays once per save.
- **Respect rule:** the event stays ambiguous. It doesn't name or depict a specific folklore being (e.g. jinn) as fact. Any folklore reference waits for review with Omani consultants.

---

## 6. Minimum gameplay systems

| System | Slice version |
|---|---|
| Player controller | Walk, sprint, jump, look, FP/TP switch (**Milestone 1**) |
| Interaction | Line-trace + `IOTDInteractable` interface + on-screen prompt |
| Evidence | `UOTDEvidenceData` (Primary Data Asset) + evidence component on the player |
| Mission | `UOTDMissionData` data asset (objectives + conditions) + `UOTDMissionSubsystem` |
| Dialogue | Data-table dialogue nodes with optional evidence requirements |
| Vehicle | Chaos Vehicle pickup: enter/exit, headlights |
| Horror events | `AOTDHorrorEventTrigger` (one-shot, conditions, audio + actor-state changes) |
| World time | Directional light rotation + 2 weather presets |
| Save | `UOTDSaveGame` (mission state, evidence IDs, transform, one-shot event flags) |
| UI | UMG: objective, prompt, notebook list, dialogue box, pause menu |

---

## 7. Unreal project structure

```
Source/OmanDarkSide/
  Core/         OTDGameMode, OTDGameInstance, OTDSaveGame                      (M1: GameMode only)
  Player/       OTDCharacter, OTDPlayerController, OTDInteractionComponent     (M1: Character only)
  Interaction/  OTDInteractable (interface), OTDInteractableActor
  Investigation/OTDEvidenceData, OTDEvidenceComponent
  Missions/     OTDMissionData, OTDMissionSubsystem (GameInstanceSubsystem)
  Dialogue/     OTDDialogueTypes (FTableRowBase), OTDDialogueComponent
  Horror/       OTDHorrorEventTrigger
  World/        OTDTimeOfDayManager
Content/OTD/
  Maps/         L_WadiAlSukoon (World Partition), L_Greybox_Test
  Blueprints/   BP_OTDCharacter, BP_Pickup, BP_NPC_*
  Data/         Evidence/, Missions/, Dialogue/
  Input/        IA_*, IMC_Default
  UI/           WBP_HUD, WBP_Notebook, WBP_Dialogue
  Environment/  Architecture/MudBrick/, Props/, Vegetation/, Materials/
  Characters/   Rashid/, NPC/ (placeholder MetaHumans or mannequins)
  Audio/        Ambience/, Foley/, Horror/
```

Rule: C++ owns state and rules. Blueprints and data assets own content, which keeps tuning and missions out of code.

---

## 8. Asset list

**Can build now (in-engine, no external artists)**
- Greybox map with UE5 Landscape, splines for roads, and Modeling Mode blockouts
- Placeholder characters: UE mannequin, or MetaHuman Creator (which requires an Epic account; clothing accuracy is limited)
- Input, UI widgets, data assets, and the save system
- Lighting, the sky atmosphere and fog, and day/night
- Free CC0/Megascans/Fab textures and rocks (check each licence)
- The Chaos Vehicle template, as a placeholder pickup

**Needs external creation or sourcing**
- Accurate dishdasha, kumma, mussar, and women's clothing (3D garment artist + Omani reference review)
- Modular Omani mud-brick architecture kit: walls, wooden doors, crenellations, a falaj channel
- Fort tower hero asset
- Original pickup model (no real brand likeness)
- Facial animation and mocap for dialogue
- Omani Arabic voice recording (native speakers) and ambience recordings
- Final concept art (see `03_Visual_Reference_Prompts.md` — prompts only, no images generated)

---

## 9. Milestones and testing

| # | Milestone | Done when (test) | Status |
|---|---|---|---|
| **M1** | Project foundation + player controller | Project compiles; in PIE you can walk/sprint/jump/look and V toggles FP/TP | **Code written, NOT compiled/tested** |
| **M1b** | Phone + iPad controls and platform settings | Touch joysticks + buttons work on a real Android phone and iPad, landscape, safe zone respected | **Code written, NOT compiled/tested** |
| M2 | Greybox level L_WadiAlSukoon | All areas reachable on foot; landmarks readable from roads; 60 fps on dev PC | Not started |
| M3 | Interaction + evidence | Pick up E1–E5 placeholders; notebook lists them; no duplicates | Not started |
| M4 | Mission subsystem | Objectives update in order; mission completes; tested with console skip commands | Not started |
| M5 | Dialogue + NPCs | 5 NPCs, evidence-gated choices work; branch coverage checklist | Not started |
| M6 | Vehicle | Enter/exit pickup; drive full road loop without falling through | Not started |
| M7 | Horror event + audio | Event fires once, survives save/load without re-firing | Not started |
| M8 | Time/weather + save/load | Save mid-mission, reload, state identical | Not started |
| M9 | Art pass on slice | Replace greybox in 1 area with modular kit; perf budget held | Not started |
| M10 | Slice playtest | 3 external playthroughs, bug list, cultural review sign-off | Not started |

---

## 10. Risks, assumptions, and what must be verified

**Risks**
- **Character realism.** Accurate Omani clothing and faces need specialist artists, and MetaHuman clothing won't be accurate out of the box.
- **Scope creep.** The brief asks for AAA scale across 7 regions; this slice is deliberately small.
- **Cultural sensitivity** around police, religion, folklore, and real tribes or places.
- **Performance.** Lumen + Nanite on mid-range PCs; mobile will need a separate content path.

**Assumptions**
- UE 5.4 or newer.
- A single developer or small team.
- English UI first.

**To verify with Omani references or consultants**
- Correct names, wrapping, and occasions for the mussar vs. the kumma; the colours and tassel (furakha) of the dishdasha; women's regional dress in Ad Dakhiliyah
- Mud-brick construction details, door and window styles, and fort architecture
- How aflaj are managed and described (the aflaj are UNESCO-listed heritage)
- Police uniform depiction: use a clearly fictional design, and ask whether depicting ROP is permitted
- That the fictional place names don't match real villages or carry unintended meanings
- Personal names: avoid real tribal surnames without consent
- Folklore and beliefs: how to reference them respectfully, or whether to avoid them
- Dialogue in the Omani Arabic dialect, which needs native writers
