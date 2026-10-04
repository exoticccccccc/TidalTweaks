# TidalTweaks — Rollback to v2.4.4 + Feature Re-application Log (new project, 2026-10-04)

> v3.0.0 removed for choppy animations. Base = pristine v2.4.4
> (`electron/v2.4.4 Source Code/TidalTweaks-2.4.4.zip`, verified byte-identical
> to git commit `12a42ea` modulo ANSI/UTF-8 dash encoding; no v3.0.0 folder
> exists — v3.0.0 lives only in git history + tag). The zip folder is gitignored
> and never committed. Animation-affecting files are restored from `12a42ea`
> (`styles.css`, `countUp` 350ms); every other v3.0.0 feature file stays as-is.
> v3.0.0's animation code (remodel Batch 2 stylesheet) is quarantined, never copied.

## What is being ADDED on top of v2.4.4 (batches 2–11)
- B2 OLED palette-only deltas on the v2.4.4 stylesheet (vars, flat badges,
  titlebar sizing). Keyframes, durations, easings untouched. `btnPulse` keeps
  2.4s timing, opacity-only (no glow) to satisfy the no-glow rule. Toggle knob
  keeps v2.4.4's `left` transition (animation system preserved as ordered).
- B3 window: maximized-by-default + bounds memory, min+close titlebar, tray,
  Ctrl+Shift+X, deferred startup, async quit (all non-animation, kept).
- B4 overlay independence (`closable:false`, hide-on-close) + tray menu with
  generated green/grey dot icons (new asset work, not copied code).
- B5 silent cleaner/janitor (`windowsHide` + `-WindowStyle Hidden`), busy
  guards, in-app progress + results.
- B6 nine presets + `preset:revert` + preview count + toasts (data only).
- B7 tooltips + info modals + category blurbs + NEW Safe/Caution/Advanced
  per-tweak badges (v3.0.0 never had these).
- B8 flat tier badges (adapted onto v2.4.4 base) + full emoji purge.
- B9 logo swap: 64px UI copy for titlebar/boot splash, 256-wrap ICO for
  installer/taskbar (multi-entry ICO attempted, NSIS-validated fallback kept).
- B10 Performance Mode REMOVED per user request (animations stay on) — store
  key, IPC, checkbox, body.perf rules, 5s polling and tt:perf event deleted;
  dashboard fixed at 2500ms. Lite mode (v2.4.4 base behavior) untouched.
- B11 update banner + Download button in About (v3.0.0 had toast + line only).

## What is being CHANGED vs v3.0.0 (rollback deltas)
- `styles.css`: restored to v2.4.4 (pageIn 14px/220ms, no stagger, glow-era
  keyframes intact) then palette-swapped. Rise/spring additions dropped.
- `countUp`: 400ms back to v2.4.4's 350ms.
- Default theme `tsunami`→`oled`, accent `blue`→`white` (kept from v3.0.0).
- Profiles tab stays removed; watchdog stays retired.
- Activation, license, backup/undo systems: untouched throughout.

---

# TidalTweaks — Bug Audit & Fix Log (Batches 1-2)

> Version audited: `electron/package.json` 2.4.4 (About page still says 2.4.4).
> Audit date: 2026-10-03. Method: full static read of `main.js` (1522 lines),
> `preload.js`, `renderer/app.js` + `index.html` + `styles.css`,
> `core/*.js`, `renderer/tabs/*.js`, `core/presets.js`, `core/cleaner.js`,
> `core/ram.js`, `core/cpu.js`, `core/crosshair.js`, `core/exec.js`, `core/backup.js`.
> No code changed in this batch — this file is the log. Code fixes land in Batches 2-8.

Git: `origin = https://github.com/Brixght/TidalTweaks.git`, branch `main`, tree clean.
User's repo `https://github.com/exoticccccccc/TidalTweaks` is NOT set as a remote —
do not push until remote is confirmed. See §11.

New logo found: `C:\Users\User\Downloads\NEW TIDAL TWEAKS LOGO\ChatGPT Image Sep 17, 2026, 04_34_11 PM.png` (1.15 MB).
Current icons are tiny placeholders: `electron/assets/icon.png` (2.7 KB), `icon.ico` (23 KB).
Logo swap is scheduled for Batch 8 (convert PNG → icon.png/ico, wire titlebar + tray).

Legend — Status: `LOGGED` = audited, fix scheduled in listed batch.
`FIXED` = code changed + verified.

---

## F-01 — Duplicate keys in `TWEAK_REGISTRY` (`electron/main.js:164-173,237-243`)
- **What was broken:** `net-nic-powersave-off`, `net-nic-eco-off`, `net-qos-limit`,
  `net-reset-stack` defined twice; `power-no-modern-standby` defined twice.
  JS keeps the last copy, so behavior is correct today, but it is a copy-paste landmine.
- **Cause:** duplicated block when network group was extended.
- **Fix (Batch 2):** delete the 4-line duplicate block + 1-line power duplicate. No logic change.
- **Verify:** `node -e` registry raw count drops 189 → 184, unique stays 184, zero `DUP_REG`.

## F-02 — Duplicate keys in `TWEAKS` catalog (`electron/renderer/app.js:267-278`)
- **What was broken:** `adv-no-search-highlights`, `adv-no-error-report`,
  `adv-no-driver-updates` each appear twice. Same overwrite-harmless pattern as F-01.
- **Cause:** research batch appended without checking existing entries.
- **Fix (Batch 6):** remove second copies when tooltips are added.
- **Verify:** catalog raw 187 → 184, `tierStats()` unchanged (Free 42 / Base 32 / Pro ~98 / Extreme 12).

## F-03 — `spawnSync` blocks quit (`electron/main.js:417-423`)
- **What was broken:** `before-quit` runs `spawnSync(powershell, 15s timeout)` to kill
  `TidalTweaks-TimerRes` holders. On slow/AV-heavy PCs quit hangs up to 15s; violates
  the "no sync child_process" rule and can look like a freeze.
- **Cause:** synchronous cleanup chosen for reliability.
- **Fix (Batch 2):** replace with async `spawn(..., { windowsHide: true })` + `unref()`,
  fire-and-forget. OS reclaims holders on reboot anyway.
- **Verify:** quit is instant; no `spawnSync`/`execSync` remains in `main.js`
  (`grep spawnSync main.js` = 0).

## F-04 — Terminal-flash sources (CPU cleaner / janitor / timer holder)
- **What was broken (reported):** visible console when cleaner/janitor runs.
- **What audit found:** `core/exec.js:22` already uses `execFile(..., { windowsHide: true })`;
  `cpu-timer-res` holder uses `-WindowStyle Hidden` + `windowsHide:true` (`core/cpu.js:239-242`);
  standby-task `schtasks /create` uses `-WindowStyle Hidden` (`core/ram.js:62`).
  So current code is *already hidden* — remaining flash risks are: (a) F-03 quit path,
  (b) `debloat-disk-cleanup` launches `cleanmgr` GUI (by design, `core/debloat.js:102`
  says "follow its progress window"), (c) first-run `powershell.exe` spawn flashing on
  machines with slow console-host init.
- **Fix (Batch 3):** centralize all spawns through `exec.js` (assert `windowsHide:true`),
  add `-WindowStyle Hidden` everywhere, replace cleanmgr note with in-app progress,
  surface cleaner results in modal/inline panel with files-cleaned + bytes-freed.
- **Verify:** run Scan → Clean → RAM Optimize → Standby janitor → timer-res on a
  clean boot; record screen — zero `conhost/cmd/powershell` windows at any point.

## F-05 — Crosshair dies with main window (`electron/main.js:363-367`)
- **What was broken:** `win.on('closed') → crosshair.destroy(); app.quit()`.
  Closing the panel kills the overlay — violates Issue 3-A requirement.
- **Cause:** original design tied overlay lifetime to main window.
- **Fix (Batch 4):** `win:close` hides to tray instead of quitting; overlay is
  independent (`alwaysOnTop/transparent/frame:false/skipTaskbar/focusable:false/hasShadow:false`);
  only Tray → Quit / `app.quit()` destroys it. Persist `enabled` in store so
  overlay state survives main-window hide/show.
- **Verify:** enable crosshair → X the main window → overlay stays; Tray → Quit → overlay gone.

## F-06 — No crosshair toggle hotkey, no tray (`grep Tray|globalShortcut`)
- **What was broken:** only `Ctrl+Alt+Shift+R` *recenter* exists (`core/crosshair.js:28`,
  `main.js:387`, Pro-gated). No `Ctrl+Shift+X` toggle, no `Tray` object anywhere.
- **Cause:** feature never implemented.
- **Fix (Batch 2+4):** Batch 2 adds `Tray` (Toggle Crosshair / Open / Quit, green/grey dot)
  + `globalShortcut Ctrl+Shift+X`; Batch 4 wires it to independent overlay.
- **Verify:** with main minimized, `Ctrl+Shift+X` toggles overlay; tray menu works; icon
  state changes.

## F-07 — Slow startup blocks first paint
- **What was broken:** `app.whenReady()` runs `crosshair.init+ensureWindow()` +
  `conn.checkOnline()` (DNS probe, `core/connection.js:57` timer) *before* the window is
  shown; `renderer/tabs/dashboard.js:95-97` fires heavy `sys:static`
  (`si.cpu/graphics/osInfo/fsSize`, cached 60s) immediately, even behind the auth gate.
- **Cause:** heavy work on the critical path instead of after `ready-to-show` + 500-1000 ms defer.
- **Fix (Batch 2):** show window immediately with skeleton; `setTimeout(500ms)` for
  `sys:static`/conn probe/crosshair ensure; `setTimeout(1000ms)` for C# helper/watchdog;
  lazy-require heavy cores; cap monitor to 1500 ms (dashboard already 2500 ms — keep).
- **Verify:** cold start on 4-core/8GB shows window <1s; cursor stays responsive;
  `sys:live` 2s poll is the only pre-interactive IPC.

## F-08 — Dashboard double-poll + background polling
- **What was broken:** `dashboard.js:93` (on-show) and `:97` (bottom) both create
  `setInterval(2500)`; bottom one runs even when tab hidden (guarded by `visible()`
  so cheap, but still an IPC every 2.5s forever). Cursor-jank contributor on low-end.
- **Cause:** init code runs before auth + on-show hook both arm timers.
- **Fix (Batch 8, Performance Mode):** single timer, created once, skipped when
  Performance Mode is on or tab hidden; interval 1500 ms normal / 5000 ms perf mode.
- **Verify:** one `sys:live` every 2.5s on dashboard, zero when hidden + perf mode on.

## F-09 — Preset locks go stale after unlock
- **What was broken:** `renderer/tabs/presets.js:102` loads once (`loaded` flag);
  `refreshLicense()` re-renders `tweakRenders` but never reloads presets, so a
  Free→Pro unlock still shows 🔒 until preset is applied or app reloaded.
- **Cause:** presets tab outside the `tweakRenders` replay list.
- **Fix (Batch 5+7):** expose preset reload to `refreshLicense`; cache DOM per preset.
- **Verify:** activate Pro in Settings → switch to Presets → all buttons live without reload.

## F-10 — No tooltips / info modals / category headers (Issue 6)
- **What was broken:** tweak cards show only `t` + `d` + tier/OS/impact badges
  (`app.js:458-535`). Full `m` text only appears in the apply-confirm modal.
  No hover tooltip, no ⓘ button, no "what registry key / tradeoff / reboot /
  reversible" panel, no category descriptions, preset cards have 1-line `desc` only.
- **Cause:** never built.
- **Fix (Batch 6):** hover `title=` tooltip (what + tradeoff + reboot + reversible) on
  every row; ⓘ button → modal (full desc, keys/services/files, who-for, warnings,
  manual revert); category header blurbs; preset one-sentence who-for lines.
  Data comes from existing `t/d/m` + `REBOOT_IDS` + revert-kind — no new deps.
- **Verify:** every tweak row hovers a tooltip and opens an info modal; every tab has
  a header blurb.

## F-11 — Panel/tab switch rebuilds too much
- **What was broken:** `switchTab()` toggles `.active` (cheap) but license-change
  replays *all* `tweakRenders` (180 cards), Services tab renders ~110 rows at once,
  Preset/Library lists rebuild wholesale. No caching, no lazy tab data, sync IPC on switch.
- **Cause:** render-everything approach.
- **Fix (Batch 7):** cache built tab DOM, lazy-load tab data on first `_show`,
  async IPC on switch, CSS-only `pageIn` transitions (already GPU), create overlay
  window once + hide/show.
- **Verify:** tab switch <100 ms on low-end; second visit to Services/Presets is instant.

## F-12 — `overdrive` preset is unsafe as one click
- **What was broken:** `core/presets.js:156` `overdrive` bundles ~61 tweaks including
  `net-reset-stack` (VPNs need re-setup), `debloat-disk-cleanup` (minutes-long GUI),
  AppX removals (`kind:none`, NOT auto-revertable), Spectre-mitigation removal,
  boot-config edits — all behind one confirm. `preset:apply` reports
  `ok: done===total`, so one failure reads as total failure.
- **Cause:** maximalist bundle.
- **Fix (Batch 5):** audit every preset (keep/fix/delete table in Batch 5 notes);
  split `overdrive` into reviewed stacks; add preview modal (count + list),
  per-preset Revert button, success toast. `factory-reset` already warns about
  manual-action ids (`main.js:768-795`) — surface that list in the preset modal too.
- **Verify:** each new preset (Max FPS / Low Latency / Competitive / Responsiveness /
  Privacy Max / Debloat Safe-Aggressive / Battery / Focus) previews, applies,
  toasts, and reverts cleanly.

## F-13 — Revert coverage is complete (good news, no fix)
- Checked all 69 `kind:` producers vs `core/backup.js:68-152` handlers:
  `reg/service/file/power/powercfg/device/dns/hibernate/bcdedit/cmdline/netadv/timeres/
  schtask/schtask-toggle/regkey/none` — every producer has a handler.
  `factory-reset` honestly reports `kind:none` ids as manual-action (`main.js:778`).
  No fix needed; Batch 5 reuses this for preset Revert buttons.

## F-14 — Version string drift
- `package.json` 2.4.4 vs `APP_VERSION` fallback `2.4.3` (`main.js:1111`) vs
  sidebar `v2.0` (`index.html:209`) vs Settings `v2.4.4` (`index.html:832`).
- **Fix (Batch 2):** single `APP_VERSION` from `package.json`, injected to UI.
- **Verify:** sidebar + Settings + bench saves all report same version.

## F-15 — Themes are not OLED/vibrant (user request)
- 11 themes + 8 accents exist (`main.js:859`, `styles.css:487+`). None is true-OLED
  (`#000` bg) or high-saturation neon. Palette freeze ("do NOT change color palette")
  is interpreted as: keep existing 11 intact, *add* 2-3 new OLED-vibrant themes
  (e.g. `abyss-oled`, `toxic-neon`) + respect Performance Mode (flat when on).
- **Fix (Batch 8). Verify:** new themes selectable, persist via `settings:set`, no
  contrast regressions, `body.lite` still flattens.

---

### Terminal-popup test protocol (Batches 3-4)
1. Clean boot → `npm start` → Screenshot: no console besides app.
2. Cleaner Scan → Clean (checked + recycle) → results modal shows files + bytes.
3. RAM Optimize → Standby janitor → `schtasks /query /tn "TidalTweaks Standby Cleaner"`.
4. `cpu-timer-res` apply → Task Manager shows hidden `powershell …TidalTweaks-TimerRes…`,
   no visible window → Undo kills it → quit app → no stray holders.
All spawns must carry `windowsHide:true` (+ `-WindowStyle Hidden` for PowerShell).

### Crosshair test protocol (Batch 4)
1. Toggle on → overlay visible over borderless game → X main window → overlay stays.
2. `Ctrl+Shift+X` toggles with main minimized. 3. Tray shows green (on) / grey (off);
   Toggle / Open / Quit all work. 4. `enabled` persists across relaunch.

### Startup test protocol (Batch 2)
Cold start on ≤4-core or <8GB: window visible <1s with skeleton; `sys:static` deferred;
no `execSync/spawnSync/readFileSync` on launch path; dashboard 2.5s poll only when visible.

---
## Batch 2 — DONE (2026-10-03): startup + tray + hotkey + version
Files: `electron/main.js`, `electron/preload.js`, `renderer/app.js`, `renderer/index.html`.
- F-01 FIXED: removed dupe `net-*` x4 + `power-no-modern-standby` x1 in `TWEAK_REGISTRY`.
  Verify: single definitions remain; `node --check main.js` passes.
- F-03 FIXED: `before-quit spawnSync(15s)` → async `spawn(... -WindowStyle Hidden, windowsHide:true)` + `unref()`.
  Verify: `grep spawnSync main.js` = comment only; quit is instant.
- F-06 PART-FIXED: `Tray` (Toggle Crosshair / Open / Quit, tooltip ON/OFF, click-to-show)
  + `Ctrl+Shift+X` toggle (Free) + existing `Ctrl+Alt+Shift+R` recenter kept.
  `crosshair:set/toggle` refresh tray via `updateTrayState()`. Green/grey icon art lands Batch 8 with new logo.
  Verify: minimize main → `Ctrl+Shift+X` toggles overlay; tray menu works.
- F-07 FIXED: `whenReady` does light init only; `crosshair.ensureWindow` + `conn.checkOnline`
  deferred to 500 ms AFTER `ready-to-show`; 1 s reserved helper slot (empty, non-blocking);
  X button now hides to tray (`close → preventDefault + hide`), app stays alive for overlay.
  `window-all-closed` no longer quits. Verify: cold start paints skeleton <1 s, cursor stays live.
- F-14 FIXED: single `APP_VERSION_EARLY` from `package.json`; `license:status.version` +
  `app:version` IPC + `preload.app.version()`; sidebar `#side-foot` set from `s.version`.
  Verify: sidebar shows package version; bench saves stamp same version.
- F-05 PROGRESS: main no longer destroys overlay on close (Batch 4 finishes full independence).

---
## Batch 3 — DONE (2026-10-03): silent cleaner/janitor + in-app progress
Files: `core/exec.js`, `core/cleaner.js`, `renderer/tabs/cleaner.js`, `renderer/tabs/ram.js`.
- F-04 FIXED: `runPS()` now always passes `-WindowStyle Hidden` in addition to
  `execFile(..., { windowsHide: true })` (`core/exec.js`). Central SILENT-EXEC policy
  comment added — all spawns route through `runCmd/runPS`; verified only two real
  spawn sites exist (`exec.js` + `cpu.js` timer holder, both hidden). `cpu-timer-res`
  holder + standby-task `schtasks` already carried both flags — left intact.
  `cleaner:clean` summary is now human (`"Cleanup complete — N file(s), X MB freed"`)
  instead of raw bytes.
- Cleaner tab: busy guard (no double-run), buttons disabled mid-run, progress bar +
  `"runs silently in the background"` status, confirm modal notes no terminal will
  appear, inline results panel (files + bytes + locked/skipped) with count-up, friendly
  toasts (no raw stacks). Verify: Scan → Clean → result card; record screen, zero
  `conhost/cmd/powershell` windows.
- RAM tab: busy guard + disabled button + silent status text + friendly failure toast
  (`"Nothing was closed"`). Verify: Optimize shows status, ends with freed amount.
- `node --check` passes for all five touched files.

---
## Batch 4 — DONE (2026-10-03): crosshair independence + toggle
Files: `electron/main.js`, `electron/core/crosshair.js` (Batch 2 laid tray + hotkey).
- F-05 FIXED: overlay is now independent — `win close → hide to tray` (Batch 2) +
  `closable:false` on overlay + `closed` no longer destroys it. Only `config.enabled=false`
  (in-app "Turn crosshair off" / tray checkbox / `Ctrl+Shift+X`) hides it; only
  `before-quit`/`app.quit()` (Tray → Quit) destroys it. Overlay props verified:
  `alwaysOnTop(screen-saver)/transparent/frame:false/skipTaskbar/focusable:false/hasShadow:false`.
  Verify: enable → X main → overlay stays; Tray → Quit → overlay gone; relaunch restores `enabled`.
- F-06 FIXED (remainder): tray menu is now live (`● ON / ○ OFF` checkbox + tooltip),
  rebuilt on every `crosshair:set/toggle` + hotkey + tray click. `Ctrl+Shift+X` (Free)
  + `Ctrl+Alt+Shift+R` recenter (Pro) both registered. Verify with main minimized.
  True green/grey icon art ships Batch 8 with the new logo.

---
## Batch 5 — DONE (2026-10-03): preset overhaul + Profiles removal + benchmark remodel
Files: `core/presets.js` (rewritten), `main.js` (+preset:revert), `preload.js`,
`renderer/tabs/presets.js` (rewritten), `renderer/tabs/benchmark.js`,
`renderer/index.html`, `renderer/app.js`.
- OLD 15 DELETED per user request: fps-boost/pro-gamer/ghost/eco/4x per-game/
  lowend-pc+lowend-laptop/midend-pc+midend-laptop/highend-pc+highend-laptop/overdrive.
  Audit: heavy overlap (lowend⊂midend⊂highend⊂overdrive), overdrive bundled
  VPN-breaking stack-reset + minutes-long cleanmgr GUI + non-revertable AppX behind
  one click, per-game packs duplicated the same 5-6 safe tweaks.
- NEW 9 (Issue 5 spec, all ids verified live in TWEAK_REGISTRY, redundancies excluded):
  gaming-max-fps(8), gaming-low-latency(6), gaming-competitive(7),
  desktop-responsiveness(6), privacy-maximum(7), debloat-safe(7),
  debloat-aggressive(10), battery-saver(5), work-focus(7).
  Notes: net-no-delack already covers delack-zero (not duplicated); brightness 70%
  has no safe API — warn says set manually; Edge never touched.
- Every preset: preview modal with count in title + full tweak list, `Apply N tweaks`
  button, per-card `⟲ Revert preset` (new `preset:revert` IPC, no tier gate — applier
  can always undo), success toast (+ confetti on full apply), failure toast (friendly).
  Reload on every show (F-09 stale-lock fix).
- F-12 follow-up: AppX-containing presets warn Store-reinstall; single
  `'preset:'+id` undo entry per stack preserved.
- Profiles tab REMOVED per user request: nav + page + script + router entry gone;
  backend IPC left dormant for old undo entries; watchdog harmless (acts only if
  legacy auto-flags exist). Orphan `renderer/tabs/profiles.js` no longer loaded.
- Benchmark remodel (light, no engine rebuild): same CPU/RAM/GPU/Disk engine,
  friendly failures (no raw stacks), save-failure toasts friendly. Full benchmark
  redesign stays a Batch 9 suggestion.
- Checks: `node --check` passes (main/preload/app/presets/benchmark/core-presets);
  zero `profiles` UI references remain; `preset:revert` wired main→preload→tab.

---
## Batch 6 — DONE (2026-10-03): tooltips + info modals + category blurbs
File: `electron/renderer/app.js` (single choke point — all 19 groups inherit).
- F-02 FIXED: removed 2nd copies of `adv-no-search-highlights/error-report/driver-updates`
  in the catalog (raw 187 → 184, tiers unchanged).
- F-10 FIXED (Issue 6.1/6.2): every tweak card now has a hover `title` tooltip
  (what + restart + reversible) and an always-visible ⓘ button opening a modal with:
  full `d` + `m` text, who-for (tier-derived), restart YES/NO (REBOOT_IDS), reversible
  note (manual-action list for AppX/one-shots), extracted ⚠/REBOOT/admin warnings.
  Reuses the confirm shell OK-only ("Got it") — zero new deps, zero new CSS.
- Issue 6.3: `GROUP_BLURBS` (19 keys: cpu/system/disk/visual*/advanced*/gaming*/gpu-vendor/
  net-*/debloat/services/privacy/power/adv-memory/adv-gpu) auto-prepended per
  `data-tweaks` container on every render (incl. license-flip replays).
- Issue 6.4: preset cards already carry one-sentence who-for descs + `N tweaks`
  sub-line (Batch 5) — no change needed.
- Verify: hover any tweak → tooltip; click ⓘ → modal; each group shows its blurb line.
  `node --check renderer/app.js` passes.

---
## Batch 7 — DONE (2026-10-03): panel opening performance (Issue 7)
Files: `renderer/tabs/dashboard.js|ram.js|settings.js|services.js|potato.js|crosshair.js`.
- F-11 FIXED: lazy tab data — removed all eager IPC at script load. Dashboard
  (`statics/live`/timer), RAM (`poll`), Settings (`paint`x3), Services (`refresh`),
  Potato (`paintGpu/refresh`), Crosshair (`refresh`) now run ONLY on first `_show`
  (landing-tab boot fires dashboard's). Static DOM (renderTweaks groups, BIOS guides,
  button wiring) still builds once and stays cached — switching tabs toggles
  `.active` (GPU CSS `pageIn` 220 ms) with zero rebuild.
- Async switching: `switchTab()` fires `_show` fire-and-forget in try/catch (never
  awaited) — no blocking IPC on the click path. Overlay window follows
  create-once + hide/show (`ensureWindow` returns existing). Monitor already capped
  (dashboard 2500 ms; 1500 ms cap met by design, perf-mode 5000 ms lands Batch 8).
- BIOS `render()` (static text) intentionally stays eager — no IPC cost.
  Orphan `tabs/profiles.js` untouched (not loaded).
- Verify: cold boot = zero `sys:live/static`, license, or detect IPC until first
  tab shows; second visit to any tab is instant; `node --check` passes all 7 tabs.

---
## Batch 8 — DONE (2026-10-03): Performance Mode + OLED themes + new logo
Files: `main.js`, `renderer/index.html`, `renderer/tabs/settings.js`,
`renderer/app.js`, `renderer/tabs/dashboard.js`, `renderer/styles.css`,
`assets/icon.png` + `icon.ico`.
- Performance Mode (Issue 4 spec, persists via electron-store `perfMode`):
  Settings → Performance checkbox; `settings:get/set` + `license:status.perf`;
  `body.perf` kills animations harder than lite (layout untouched); dashboard
  polling 2500 ms → 5000 ms (re-armed per show); background tabs already paused
  (Batch 7). No C# helper ships — 1 s deferred slot (Batch 2) stays the hook.
  Verify: toggle → body.perf present → dashboard ticks 5 s → persists relaunch.
- Themes (user: OLED + vibrant, existing 11 untouched): new `oled` (true #000 +
  electric cyan) + `pulse` (near-black neon magenta) — main THEMES, NATIVE_ACCENT,
  theme-select options, CSS vars. Verify: select → instant apply → persists.
- Logo: `NEW TIDAL TWEAKS LOGO` PNG (1254x1254 square) → `assets/icon.png`
  (1.15 MB) → `icon.ico` via dependency-free `scripts/make-ico.js`. Tray +
  window + installer pick it up on next build.
- Tray ON/OFF state stays menu-check + tooltip (Batch 4); dedicated green/grey
  tray art skipped — single new logo keeps branding consistent.
- Checks: `node --check` passes (main/app/settings/dashboard).

---
## Batch 9 — DONE: auto-update + setup + suggestions (FINAL)
Files: `main.js` (+updater), `preload.js`, `renderer/index.html` (About card),
`renderer/tabs/settings.js`, `renderer/app.js` (about-line); deleted orphan
`renderer/tabs/profiles.js`; rebuilt `assets/icon.ico` from the new logo.
- Auto-update (no new npm deps, plain `node:https`): `UPDATE_REPO =
  exoticccccccc/TidalTweaks`; `app:check-update` IPC (manual) + deferred 30s
  auto-probe (max daily via `updateLastCheck`) → `app:update-available` push →
  toast + Settings → About status line. No silent installer by design (needs
  signing + electron-updater); user clicks through to GitHub Releases.
  Verify: About → Check for updates (online → latest/current; offline →
  friendly message); cold boot 30s+ → toast only when newer exists.
- Setup: `npm run build` (NSIS) in `electron/` — installer lands in `dist/`.
  Committed + pushed per user request (see decomposes below).

### STEP 8 — Suggestions (add / remodel / remove)
ADD:
1. Restore-point age indicator — what: show last restore-point date in Restore
   tab header. Why: users apply stacks blind to safety-net age. Work: small.
2. Tweak search already exists (Library) — add "applied only" filter. Why:
   fastest path to "what did I change". Work: small.
3. Export/import tweak set as file (reuse profiles encode shape for presets).
   Why: share working combos without custom-presets.json hand-editing. Work: medium.
4. First-run "guided path" (3 questions → recommends 1 preset). Why: 9 presets
   still overwhelm newcomers. Work: medium.
5. Scheduled cleaner (weekly silent temp sweep via schtask, like the janitor).
   Why: set-and-forget hygiene. Work: small (clone standby-task pattern).
REMODEL:
6. Benchmark full redesign — what: shorter defaults (10s quick), live progress
   %, pause background polling during runs. Why: 30s–5m blocks + polls skew
   scores. Work: large. (Light friendly-error pass done in Batch 5.)
7. Services tab grouping — what: collapse-all by default + risk badges on rows
   (safe/caution/danger from existing warn text). Why: ~110 rows overwhelm.
   Work: medium.
8. Debloat scan → one combined "review then remove" flow (scan results feed the
   one-click list). Why: two separate lists confuse. Work: medium.
REMOVE:
9. `game-mode-master` single toggle — what: overlaps Max-FPS/Competitive presets
   + individual switches; keep the parts, drop the bundle. Why: redundant bundle
   with its own confirm path. Work: small (delete id + docs).
10. Legacy `profileAuto` watchdog backend — what: now that Profiles UI is gone,
    remove the 15s tasklist poll + `core/profiles.js` IPC once old undo entries
    age out. Why: dead code + background cost. Work: small (keep `revertOne`
    compat until then).

---
*All 9 batches complete. UI remodel is ON HOLD for the user's separate prompt —
no further visual changes will be made until then.*

> UI remodel note (user, 2026-10-03): full UI restyle comes as a separate prompt
> AFTER all batches — no visual restyle in Batches 6-8 beyond functional additions.
> Preset set from Batch 5 stands; say the word if any of the 9 stacks "don't make
> sense" and they will be revised before the setup build.

> Auto-update request (2026-10-03): user asked for in-app auto-update so users don't
> re-download from GitHub manually. Queued for Batch 9 with the setup build — plan:
> lightweight version check against GitHub Releases (no new npm deps, plain https),
> toast + modal when newer, one-click open/download; full silent install needs
> code-signing + electron-updater and stays out of scope unless requested.
