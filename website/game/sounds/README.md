# Real sound recordings (optional)

The game synthesises all of its sounds. Real recordings placed here replace them automatically.

1. Put the audio files in this folder (`.mp3` or `.m4a`; mono is fine; 44.1 or 48 kHz).
2. List every file in `manifest.json`, for example:
   ```json
   { "files": ["wind.mp3", "night.mp3", "step_sand_1.mp3", "step_sand_2.mp3"] }
   ```

| File name | What to record | Length |
|---|---|---|
| `wind.mp3` | Night wind in an open area or between old walls. No traffic or voices. | 30–60 s, loops |
| `night.mp3` | Night insects in a palm grove or garden | 30–60 s, loops |
| `step_sand_1..4.mp3` | One footstep each on sand | under 0.5 s |
| `step_gravel_1..4.mp3` | One footstep each on gravel or dirt | under 0.5 s |
| `step_asphalt_1..4.mp3` | One footstep each on asphalt | under 0.5 s |
| `step_floor_1..4.mp3` | One footstep each on an indoor tiled or plaster floor | under 0.5 s |
| `engine.mp3` | Steady idle of a car or 4x4 engine | 5–10 s, loops |

Recording tips:
- A phone is enough. Hold it about 1 m from the ground for footsteps.
- Choose a quiet night.
- Trim silence at the start of each footstep file.
- Do not record people's private conversations, and only record on public land or with permission.
