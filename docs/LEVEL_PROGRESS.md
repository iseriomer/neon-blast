# Level / Evolution

External progression is **Level**. XP and perk selection inside a run are
**Evolution**. There is no Level selector. The current Level survives failure
and reload. A fresh attempt starts at Evolution 1 with zero perks and the
player's permanent upgrades. Interrupted attempts resume their saved build;
permanent bonuses are never applied twice to a resumed snapshot.

Winning the Level's main boss grants gold, advances the campaign, and opens
a victory screen with the completed Level, boss and awarded gold. Its next
Level button starts a fresh build; its hub button returns to the main hub.
The victory survives a reload without paying again. Minibosses keep
the existing post-boss Evolution/perk flow and never complete a Level. Losing
opens a separate defeat screen with Retry and Main Menu, retains the current
Level and grants no run gold or VIP gold bonus. Retry starts a fresh build on
the same Level. Revive and optional victory reward doubling remain available. The final
Level can be replayed with a fresh build.

## Discovery encyclopedia

The former archive tab now displays only discovered enemies, bosses (including
minibosses), and perks. Rendering an onscreen enemy/boss unlocks its record;
decrypting an actual offered perk card unlocks that perk even if not selected.
Pool initialization, offscreen spawning and random decrypt frames unlock nothing.
Boss support objects with custom drawings do not unlock the ordinary enemy type
they borrow. Entries include real game canvas thumbnails or existing perk icons,
localized behavior/effects, base enemy stats and the encountered boss HP.

`www/game/encyclopedia.js` persists discoveries separately under
`neonblast_encyclopedia_v1`. Images are optional when storage is full; discoveries
are retained. Selected perks in an existing valid saved run are also recognized.
Unknown enemies/bosses are not inferred from a player's score or current Level.
This layer observes rendering and never changes combat or grants rewards.

## Local defaults and remote tuning

Remote overrides for these values and other gameplay tuning are documented in
`docs/REMOTE_CONFIG.md`. `GameBalance` validates and freezes tuning for each run;
saved runs retain their balance snapshot. Local defaults still live below.

`www/game/level-config.js` contains `LEVELS`; ordering is campaign ordering.

```js
{
    mainBoss: 2,
    bossAtEvolution: 15,
    minibosses: [{ atEvolution: 9, id: 101, hpMultiplier: .9 }],
    difficultyCurve: [[1, .6], [15, 2.8]],
    bossHpMultiplier: .26,
    // goldReward: 300 // optional override
}
```

The final encounter occurs when XP would advance past `bossAtEvolution`.
Miniboss milestones use the same convention. Use different milestones for
each miniboss; all must precede the main boss.

Curve points are `[Evolution, difficulty]`, interpolated linearly. One curve
drives ordinary enemy HP, speed, spawn interval, and existing type gates.
It does not change XP thresholds, perk math, shooting spread, enemy behavior,
or existing boss attack patterns. Ordinary HP/spawn threshold jumps now use
this curve because every Level restarts Evolution.

Derived values are centralized in `LevelDirector`: spawn interval is
`max(240, 1100 / (1 + difficulty * .25))` ms; ordinary HP is
`baseHP + floor(difficulty * (1 + difficulty * .12))`. Existing speed scaling
remains `baseSpeed * (1 + difficulty * .05)`. Existing type gates remain,
except SUPERTANK unlocks at difficulty > 9 rather than unreachable Evolution
> 50. Change the curve first, then these common formulas if needed.

Boss HP is immutable original HP multiplied by `bossHpMultiplier`.
Miniboss HP defaults to original HP times `(1 + difficulty * .12)` unless its
entry overrides `hpMultiplier`. Repeated attempts do not compound HP.

Automatic completion gold is rounded from
`40 + bossAtEvolution * 12 + finalDifficulty * 15`.
An explicit `goldReward` replaces the calculation. Losses pay zero run gold,
including zero VIP run bonus, and offer no rewarded doubling. Existing VIP
bonuses apply to completed Levels only.

| Level | Main boss | Final Evolution | Miniboss Evolutions | Base gold |
|---|---|---:|---|---:|
| 1 | OMEGA CORE | 9 | 6 | 162 |
| 2 | NEXUS PRIME | 15 | 9 | 244 |
| 3 | THE SWARM | 16 | 6, 11 | 307 |
| 4 | CHRONOS | 18 | 7, 13 | 346 |
| 5 | VOID REAPER | 20 | 8, 15 | 385 |
| 6 | HELIX CITADEL (new) | 15 | 6, 11 | 333 |
| 7 | THE SINGULARITY | 23 | 8, 16 | 444 |
| 8 | GALAXY DEVOURER | 25 | 7, 15, 21 | 483 |
| 9 | NEURAL NEXUS | 27 | 9, 18, 23 | 522 |
| 10 | AURORA FORGE (new) | 30 | 8, 16, 24 | 580 |

THE OMEGA (old ID 3) is removed. OMEGA CORE (ID 1) remains.
New boss attacks are targetable enemies with visible advance warnings.
Neither requires movement. Helix uses alternating distances and optional
shield-support targets; Aurora alternates focused tank processions and
fans of weaker embers.

## Permanent upgrades and shared currency

`www/game/meta-progress.js` contains four independent, capped upgrade tracks.
They spend the existing cosmetic/IAP wallet. Each has 15 ranks. Prices are
`baseCost * 1.32^currentRank`, rounded.

| Track | Per rank | Maximum bonus | First price |
|---|---:|---:|---:|
| Base damage | +6% | +90% | 120 gold |
| Attack speed | +2.5% firing frequency | +37.5% | 150 gold |
| Critical chance | +1 percentage point | +15 points | 150 gold |
| Automation | +7% passive damage | +105% | 120 gold |

Attack frequency uses `fireRate / (1 + bonus)`, not a 37.5% cooldown reduction.
Automation applies to laser, orbital, electric aura, singularity and chain
lightning damage. It never grants passive perks for free. Base damage improves
projectiles and hits on special boss support targets. Upgrades apply to the
next fresh attempt; a saved build retains its snapshot until that attempt ends.

Meta purchases and boss completion use recoverable local write-ahead journals
for wallet + progress. Initialization finishes interrupted commits before
purchases become available. Existing cosmetic inventory, IAP entitlements and
native transaction history are preserved. Existing v1 run saves remain readable.
Old campaign indices migrate; the next fresh attempt resets perks. Currency
remains device-local; this does not add cloud sync or anti-cheat.

## Hub and validation

Hub tabs are Armory, Upgrades, Play, Ranking and Archive. Play contains the
current Level, daily reward, lucky spin and quests. Archive is informational,
never a Level selector. Settings contains the single six-language selector,
sound, music, volume, shake, joystick, privacy and native purchase restoration.
Visuals reuse the existing black background, square surfaces, thin separators,
white condensed headings and cyan/pink/gold accents.

`npm run test:levels` covers all ten unique main-boss boundaries, minibosses,
fresh builds, gold once, meta purchases, insufficient funds, saved-build and
boss resumption, journal recovery, four screen sizes and six languages.
Other suites cover ads/IAP, inventory previews, offline startup, menu geometry
and rewarded actions. Screenshots are in `artifacts/levels`.
Lifecycle tests do not establish encounter duration, retention or commercial
performance. Difficulty and costs are initial tuning values; human playtests
are needed with weak, active and passive builds.
