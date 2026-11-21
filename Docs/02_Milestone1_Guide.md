# Milestone 1 — Project Foundation + Player Controller

**Status: source code written but never compiled or run.** It was written in an environment without Unreal Engine, so it is not verified until you complete the test steps below.

## What M1 contains
- `OmanDarkSide.uproject`: C++ project with the Enhanced Input plugin enabled
- `Config/`: sets `AOTDGameMode` as the global default game mode and Enhanced Input as the input system
- `AOTDGameMode`: spawns `AOTDCharacter`
- `AOTDCharacter`, which provides:
  - WASD to move, mouse to look, Space to jump, hold Left Shift to sprint (300 → 600 cm/s)
  - **V** to toggle between first person and third person
  - In first person the body follows the camera's direction; in third person it faces the direction of movement
  - A placeholder cylinder body that is hidden from your own view in first person
  - Runtime default input: if no Input Action assets are assigned, it builds its own key mapping, so the prototype needs no editor-made assets
  - On-screen messages showing camera mode and sprint state, for testing

## How to test
1. On a Windows PC, install UE 5.4+ and Visual Studio 2022 with "Game development with C++".
2. Clone this repo, right-click `OmanDarkSide.uproject`, and choose **Generate Visual Studio project files**.
   - If you use a different UE version: right-click the file, choose **Switch Unreal Engine version**, and pick yours.
3. Open the `.uproject` file and click **Yes** when asked to rebuild modules. If the build fails, open the `.sln` file and build `OmanDarkSideEditor` / `Development Editor` to see the errors.
4. Create a test map:
   - **File → New Level → Basic** (it has a floor, light, and sky).
   - Save it as `Content/OTD/Maps/L_Greybox_Test`.
   - Add a few cubes and a ramp to test movement.
5. Press **Play (PIE)** and check each of the following:
   - [ ] You spawn as a grey cylinder seen from behind the shoulder.
   - [ ] WASD moves relative to the camera, and the mouse looks around (mouse up = look up).
   - [ ] Holding Shift is visibly faster, and "Sprint: ON/OFF" appears on screen.
   - [ ] Space jumps.
   - [ ] V switches to first person: the cylinder disappears from view and the camera sits at eye height. Pressing V again returns to third person.
   - [ ] Output Log shows `LogOTD: ... building runtime keyboard/mouse defaults`.
6. Optional, data-driven tuning:
   - Create a Blueprint child of `OTDCharacter` (`BP_OTDCharacter`) and change WalkSpeed, SprintSpeed, and camera values there.
   - To use it, set it as the Default Pawn on a Blueprint child of `OTDGameMode`.

## What is incomplete
- No real character mesh or animations (placeholder cylinder).
- No gamepad mapping (PC keyboard and mouse only).
- No stamina, crouch, or interaction. Those come in later milestones.
- No level or greybox is included: `.umap` files are binary and must be made in the editor (Milestone 2).

## Assumptions and possible compile issues to watch for
- Targets UE 5.4. `BuildSettingsVersion.Latest` and `EngineIncludeOrderVersion.Latest` require UE 5.1+.
- Uses `UInputAction::ValueType` and `UInputMappingContext::MapKey` at runtime. These are public in current UE5 versions.
  - If your version reports them as protected or deprecated, create the IA_*/IMC_Default assets in the editor and assign them to `BP_OTDCharacter` instead. The code then skips the runtime defaults.
- Uses the engine asset `/Engine/BasicShapes/Cylinder`.

---

## M1b: Phone and iPad support (the project is now mobile only)
**Status: code and config written but never compiled, packaged, or run on a device.**

### What was added
- **Movement and look on touch:** the engine's built-in virtual joysticks (left stick moves, right stick looks), enabled in `Config/DefaultInput.ini`.
- **Touch buttons** on the right edge of the screen: `1ST/3RD` (camera), `RUN/WALK` (a toggle, not a hold), and `JUMP` (`Source/OmanDarkSide/UI/SOTDTouchControls.*`).
  - They are built in C++ Slate, so no editor assets are needed.
  - They sit inside a safe zone, which keeps them clear of notches and rounded corners.
- **Gamepad support:** left stick, right stick, A/Cross = jump, Y/Triangle = camera, left-stick click = sprint. This also works with Bluetooth controllers on iPad and iPhone.
- **Android settings:** landscape only, arm64, Vulkan.
- **iOS settings:** iPhone and iPad, landscape only, Metal.
- The package/bundle ID `com.omandarkside.prototype` is a **placeholder**. Change it to your own.
- **Mobile-only project settings:** the target hardware is set to Mobile at Maximum quality. The renderer settings are mobile deferred shading, HDR, TAA and mobile ambient occlusion, and the PC-only Lumen and virtual-shadow settings were removed. Keyboard and mouse remain only so you can test in the editor.

### Testing on PC first (quickest)
1. Editor Preferences → Level Editor → Play → enable **Use Mouse for Touch**.
2. Project Settings → Input → enable **Always Show Touch Interface** (temporarily).
3. In `BP_OTDCharacter` (or in C++), enable `bForceTouchControls`.
4. Play → **Mobile Preview ES3.1 (PIE)**. You should see the two joysticks and the three buttons, and they should work with the mouse.
5. Turn the settings from steps 1–3 back off afterwards.

### Testing on Android
1. Install Android Studio and the SDK/NDK versions your UE version needs (see Epic's "Setting Up Android SDK and NDK" page for your version).
2. Turn on Developer Mode and USB debugging on the phone, then connect it by cable.
3. In UE: Platforms → Android → choose the device → **Launch**, or **Package Project** to get an APK.

### Testing on iPhone and iPad
- **Requires a Mac** with Xcode and an Apple Developer account for code signing. It can't be built from Windows alone; remote building from Windows to a Mac also needs a Mac.
- Set your Bundle ID and signing team in Project Settings → iOS, then use Platforms → iOS → Launch or Package.

### Device checklist
- [ ] The game opens in landscape and fills the screen on both phone and iPad
- [ ] The left joystick moves the character and the right one turns the camera (stick up = look up)
- [ ] The three buttons respond and aren't cut off by the notch
- [ ] RUN switches to WALK and the speed changes
- [ ] 1ST hides the body and 3RD brings it back
- [ ] Frame rate is acceptable. Enable the `stat fps` console command for a development build.

### Known risks and incomplete parts
- Lumen GI and Virtual Shadow Maps are PC-only. Mobile uses the separate mobile renderer, so it **will look different from PC**. Visuals and performance on actual devices haven't been verified.
- The engine's built-in virtual joysticks are a legacy system. They should work with Enhanced Input through the gamepad keys, but this hasn't been tested. The plan is to replace them with a custom UMG joystick in the UI milestone.
- Button text is English only. Arabic touch buttons need an Arabic font, which comes later in the UI milestone.
- There are no separate device profiles or quality settings for weak phones yet.
