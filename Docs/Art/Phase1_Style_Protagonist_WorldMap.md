# OMAN: THE DARK SIDE — Art Phase 1
Style guide · Main protagonist sheet · World map of Oman

These are prompts for AI image tools (Midjourney v7 or Flux). They are **concept references**, not game assets. Each prompt makes **one** image.

---

## How to use (beginner)
1. **Pick a tool:** Midjourney gives the most cinematic realism; Flux (in Leonardo, Krea or Freepik) follows details more exactly.
2. **Copy one prompt at a time.** Replace `[CHARACTER BIBLE]` and `[OUTFIT A]` with the text blocks below.
3. **Generate four options,** pick the best, then upscale it or use "Vary (Subtle)".
4. **Keep Rashid consistent:** save the face you like and attach it as a reference to every later image (`--oref` in Midjourney v7, `--cref` in v6, "Character Reference" in Flux tools).
5. **Never ask the AI to write text.** Generate images without labels, then add Arabic and English text in Canva or Figma.
6. **Check every image** against the cultural checklist at the end before keeping it.

---

## Style guide
| Element | Direction |
|---|---|
| Rendering | Photorealistic, Unreal Engine 5 look, realistic PBR materials, volumetric fog |
| Camera | Gameplay: third person, character seen from behind, slightly off-centre. Concepts: 35–50 mm lens, eye level |
| Light | Golden hour, blue hour, moonlit night; warm lamps against cool shadows |
| Palette | Sand, ochre, mud-brick brown, dusk blue, deep teal sea, white dishdasha; muted red accent |
| Mood | Beautiful by day; quietly wrong at night |
| UI | Dark translucent panels, thin lines, sand-gold accents, Arabic right-to-left first |
| Avoid | Low poly, primitive mountains, cartoon faces, "Arabian Nights" clichés, oversaturation, gore, text in images |

**Style block** (add to the end of every prompt):
```
photorealistic AAA video game render, Unreal Engine 5 quality, physically based materials, natural lighting, volumetric atmosphere, high detail, realistic proportions, cinematic color grading, sharp focus
```
**Avoid list** (Midjourney):
```
--no text, letters, watermark, logo, cartoon, anime, low poly, plastic skin, distorted hands, fantasy armor, turban styles from other countries
```

---

## Main protagonist: Rashid

**[CHARACTER BIBLE]**
```
Rashid, Omani man, 34 years old, medium-brown skin with natural texture and fine pores, short neat black beard, short dark hair, calm tired observant dark-brown eyes, slight lines at the eyes, lean athletic build, 178 cm, natural human proportions
```
**[OUTFIT A] (town look)**
```
wearing an ankle-length collarless white Omani dishdasha with a short tassel (furakha) at the neckline, an embroidered white-and-beige Omani kumma cap, simple brown leather sandals, a plain steel wristwatch, a small dark leather crossbody bag for evidence
```
**[OUTFIT B] (night investigation look, optional)**
```
wearing dark practical cargo trousers, a plain dark charcoal jacket over a grey shirt, a muted brown-patterned Omani mussar wrapped on the head, sturdy dusty boots, a small backpack, a flashlight clipped to the strap
```

### 1. Front view (2:3)
```
Character reference sheet, FRONT VIEW, full body, standing in a relaxed neutral pose, arms at his sides, facing the camera directly. [CHARACTER BIBLE] [OUTFIT A]. Plain neutral mid-grey studio background, soft even studio lighting with a subtle rim light, feet fully visible, no props on the ground. photorealistic AAA video game render, Unreal Engine 5 quality, physically based materials, high detail, realistic proportions, sharp focus --ar 2:3 --style raw --no text, letters, watermark, cartoon, low poly, distorted hands
```
### 2. Side view (2:3) — attach image 1 as a reference
```
Character reference sheet, SIDE PROFILE VIEW (left side), full body, standing straight, same man as the reference image. [CHARACTER BIBLE] [OUTFIT A]. Shows the silhouette of the dishdasha falling to the ankles, the kumma profile, the crossbody bag strap. Plain neutral mid-grey studio background, soft even lighting, feet visible. photorealistic AAA video game render, Unreal Engine 5 quality, high detail, realistic proportions --ar 2:3 --style raw --no text, watermark, cartoon, low poly
```
### 3. Back view (2:3) — the gameplay angle
```
Character reference sheet, BACK VIEW, full body, standing, seen directly from behind, same man as the reference image. [CHARACTER BIBLE] [OUTFIT A]. Show the back of the kumma, the dishdasha folds across the shoulders and the hem at the ankles, the crossbody bag strap crossing the back. Plain neutral mid-grey studio background, soft even lighting. photorealistic AAA video game render, Unreal Engine 5 quality, high detail --ar 2:3 --style raw --no text, watermark, cartoon, low poly
```
### 4. Expressions (16:9)
```
Character expression sheet, same Omani man as the reference image, head and shoulders, four separate head shots in a clean row on a neutral grey background: neutral, worried, suspicious narrowed eyes, relieved slight smile. [CHARACTER BIBLE], wearing the embroidered Omani kumma. Realistic skin, natural asymmetry, consistent face in all four. photorealistic, soft studio lighting --ar 16:9 --style raw --no text, labels, cartoon
```
Put images 1–3 side by side in Canva and add the labels yourself.

---

## World map of Oman

Geography to respect, checked against a real map:
- **Musandam:** a separate northern peninsula, cut off by UAE territory.
- **Al Hajar mountains:** arc from the north toward Sur, with **Jebel Akhdar** in the centre.
- **Coast:** the Al Batinah coastal plain runs along the Gulf of Oman; Sohar is on it, and Muscat is further southeast.
- **Interior:** Nizwa sits inland; Sharqiya (Wahiba) Sands is in the east.
- **South:** Salalah lies on the Arabian Sea, with the green Dhofar mountains behind it.

### 5. Map, day, no labels (16:9)
```
Elevated isometric 3D game world map of a geographically inspired Sultanate of Oman, viewed from a high oblique angle like a premium open-world game map. Realistic terrain elevation: the rugged Al Hajar mountain arc in the north running toward the east coast, a green-topped high plateau in the central Hajar, the separate fjord-cut Musandam peninsula in the far north, a narrow coastal plain along the Gulf of Oman with small cities, a vast gravel interior, an orange dune sea in the east, and green misty mountains above a southern coastal city on the Arabian Sea. Deep wadis cutting through the mountains, a thin network of highways and gravel roads, tiny glowing towns and villages, date palm oases, a realistic ocean with depth gradient and white surf at the coast, soft clouds drifting over the mountains, warm golden-hour light from the west. Small subtle glowing location pins and a few faint mysterious red markers in remote areas. Tabletop diorama realism, photorealistic terrain textures, highly detailed. photorealistic AAA video game render, Unreal Engine 5 quality, volumetric atmosphere, sharp focus --ar 16:9 --style raw --no text, letters, labels, watermark, flat map, low poly, cartoon, fantasy castles
```
### 6. Map, night (16:9) — attach image 5 as a reference
```
Same isometric 3D Oman game world map as the reference image, at night under a full moon: cool blue moonlight on the mountains, warm city lights along the coast, dark empty desert interior, low fog in the wadis, a few faint red glowing markers at remote abandoned villages, subtle and eerie, not fantasy. photorealistic, Unreal Engine 5 quality --ar 16:9 --style raw --no text, labels, watermark, cartoon, low poly
```
**Labels to add yourself:**
- مسندم Musandam
- صحار Sohar
- مسقط Muscat
- نزوى Nizwa
- الجبل الأخضر Jebel Akhdar
- رمال الشرقية Sharqiya Sands
- صلالة Salalah

---

## Cultural checklist
- [ ] **Dishdasha:** collarless, ankle-length, with a single tassel at the neck. No Saudi or Emirati style collar.
- [ ] **Kumma:** a round embroidered cap, not a ghutra or agal.
- [ ] **Mussar:** a wrapped patterned turban; styles vary by region.
- [ ] **Khanjar:** formal scenes only.
- [ ] **Women's dress:** verify regional styles with an Omani reviewer.
- [ ] **No real logos or real police insignia.**
