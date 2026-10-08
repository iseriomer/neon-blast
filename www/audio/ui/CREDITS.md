# Menu audio — organic edition

Current cues are edited from **Casino Audio 1.1**, by **Kenney** (CC0).
Source: https://kenney.nl/assets/casino-audio
Download: https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip
License: LICENSE-CASINO-AUDIO.txt, included verbatim. Retrieved October 8, 2026.

| Bundled cue | Original | Use |
| --- | --- | --- |
| press.wav | card-place-1.ogg | Button press / toggle |
| select.wav | chip-lay-1.ogg | Selection |
| open.wav | card-slide-1.ogg | Menu entrance |
| back.wav | card-slide-2.ogg | Back / warning |
| equip.wav | chips-stack-1.ogg | Equip confirmation |
| reward.wav | chips-stack-2.ogg | Reward confirmation |
| reveal.wav | card-fan-1.ogg | Crate / wheel entrance |
| tick.wav | card-place-2.ogg | Quiet wheel crossing |

Edits: onset trimming, 65–300 ms duration, softened 6 ms attack / 25 ms release,
120 Hz high-pass, 1.1–1.8 kHz low-pass, slowed source and consistent peak/RMS limits.
`scripts/build-menu-audio.cjs <extracted-pack-directory>` recreates the WAV files.
All cues ship locally and work offline. No synthesized confirmation beeps.

The menu mixer adds quiet cue-specific gains, a 2.4 kHz safety low-pass and at
most two voices. Success cues replace a simultaneous generic click; repeated
wheel ticks are limited to one every 240 ms. Opening the game and animated
menu text remain silent. Mute stops active menu sounds immediately.
Combat/perk audio and music tracks are unchanged.

Earlier UI Audio Ogg files remain as legacy source assets; the runtime now uses
the WAV cues above. Their original license is LICENSE-UI-AUDIO.txt.
LICENSE.txt records the earlier Interface Sounds pack.
