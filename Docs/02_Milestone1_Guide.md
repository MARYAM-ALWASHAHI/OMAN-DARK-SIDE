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
