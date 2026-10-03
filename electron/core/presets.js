'use strict';
/* ============================================================================
 * core/presets.js — one-click tweak STACKS (Batch 5 remodel).
 * ----------------------------------------------------------------------------
 * Old 15-preset set (fps-boost/pro-gamer/ghost/eco/per-game/lowend/midend/
 * highend/overdrive) DELETED per user request — audit found: heavy overlap
 * (lowend ⊂ midend ⊂ highend ⊂ overdrive), `overdrive` bundled a VPN-breaking
 * stack-reset + minutes-long cleanmgr GUI + non-revertable AppX removals
 * behind one click, and per-game packs duplicated 5-6 identical safe tweaks.
 *
 * New set (9 focused stacks, Issue 5 spec): Max FPS / Low Latency /
 * Competitive / Responsiveness / Privacy Max / Debloat Safe+Aggressive /
 * Battery / Focus. Every id below is a live TWEAK_REGISTRY key (verified
 * Batch 5); redundant pairs deliberately excluded (e.g. net-no-delack already
 * covers TcpDelAckTicks=0, so net-delack-zero is NOT bundled with it).
 * Runner in main.js creates ONE restore point + ONE undo entry ('preset:'+id)
 * per stack; revert via preset:revert.
 *
 * CUSTOM PRESETS (local-only): <userData>/custom-presets.json, same shape.
 * ========================================================================== */
const fs = require('node:fs');
const path = require('node:path');

const PRESETS = [
  {
    id: 'gaming-max-fps',
    title: 'Gaming — Max FPS',
    desc: 'For fps chasers: kills capture overhead, unlocks GPU scheduling + top power plan, stops background drag. Who: gamers on any GPU.',
    os: 'both',
    warn: 'Applies 8 tweaks: Game Bar/DVR off, HAGS on, Ultimate plan, FSO bypass, background apps off, Search indexing off, SysMain off.\nHAGS needs a REBOOT + ADMIN. One restore point covers all eight.',
    ids: ['game-bar-off', 'game-hags-on', 'game-power-ultimate', 'game-no-fs-optim', 'game-bg-apps-off', 'adv-no-indexing', 'adv-no-sysmain', 'game-mode-win-on'],
  },
  {
    id: 'gaming-low-latency',
    title: 'Gaming — Low Latency',
    desc: 'For twitch shooters: faster ACKs, no traffic shaping, foreground priority, tick/timer tuning. Who: competitive players on stable PCs.',
    os: 'both',
    warn: 'Applies 6 tweaks: Nagle off, delayed-ACK off (covers delack-zero, not duplicated), network throttling off, foreground priority 0x26, dynamic-tick off, input queues.\nDynamic-tick needs REBOOT + ADMIN. Slightly more upstream ACK traffic.',
    ids: ['game-no-nagle', 'net-no-delack', 'game-net-throttle-off', 'cpu-fg-priority', 'cpu-no-dynamictick', 'game-input-latency'],
  },
  {
    id: 'gaming-competitive',
    title: 'Gaming — Competitive (Balanced)',
    desc: 'Safe subset of both gaming stacks, no boot edits or security trade-offs. Who: ranked players who want stability first.',
    os: 'both',
    warn: 'Applies 7 safe tweaks: Game Bar off, FSO bypass, Game Mode on, raw mouse, throttling off, delayed-ACK off, responsiveness floor.\nNo reboot needed. Fully reversible.',
    ids: ['game-bar-off', 'game-no-fs-optim', 'game-mode-win-on', 'game-mouse-raw', 'game-net-throttle-off', 'net-no-delack', 'game-sys-responsiveness'],
  },
  {
    id: 'desktop-responsiveness',
    title: 'Desktop — Responsiveness',
    desc: 'Makes Windows feel instant: no animation waits, instant menus, foreground boost. Who: everyone on HDDs or weak iGPUs.',
    os: 'both',
    warn: 'Applies 6 tweaks: window animations off, MenuShowDelay 0, transparency off, micro-animation bundle off, fast shutdown/logoff, foreground priority.\nWindows looks flatter but feels instant. Reversible.',
    ids: ['vis-no-anim', 'vis-menu-delay', 'vis-transparency-off', 'vis-fx-custom-min', 'sys-fast-shutdown', 'cpu-fg-priority'],
  },
  {
    id: 'privacy-maximum',
    title: 'Privacy — Maximum',
    desc: 'Locks down tracking without breaking logins: telemetry, ad ID, Cortana, location, history. Who: privacy-focused users.',
    os: 'both',
    warn: 'Applies 7 tweaks: telemetry off, ad ID off, tailored experiences off, Cortana data off, location off, Activity History off, clipboard history off.\nMaps/Find-my-device and Win+V history stop working. No reboot. Reversible.',
    ids: ['priv-no-telemetry', 'priv-no-adid', 'priv-no-tailored', 'priv-no-cortana', 'priv-no-location', 'adv-no-activity', 'adv-no-clipboard-hist'],
  },
  {
    id: 'debloat-safe',
    title: 'Debloat — Safe',
    desc: 'Removes only expendable extras + silences suggestions. No critical apps touched. Who: clean-install feel without risk.',
    os: 'both',
    warn: 'Applies 7 tweaks: Cortana app + Xbox app removal (reinstall via Store if missed — NOT auto-revertable), Chrome background off, tips/sponsored-apps/Copilot/Widgets off.\nOne restore point; AppX removals need Store reinstall to come back.',
    ids: ['debloat-cortana-app', 'debloat-xbox-app', 'debloat-chrome-bg', 'adv-no-tips', 'adv-consumer-feats', 'adv-no-copilot', 'adv-no-widgets'],
  },
  {
    id: 'debloat-aggressive',
    title: 'Debloat — Aggressive',
    desc: 'Safe set plus OneDrive removal + Xbox services/bar kills. Who: gamers who never touch Xbox/OneDrive. Edge is NOT touched.',
    os: 'both',
    warn: 'Applies 10 tweaks: safe set + OneDrive uninstall (files stay in cloud), Xbox services off, Xbox Game Bar off.\nXbox sign-in/party chat stops until reverted. Edge untouched. Reboot recommended.',
    ids: ['debloat-cortana-app', 'debloat-xbox-app', 'debloat-chrome-bg', 'adv-no-tips', 'adv-consumer-feats', 'adv-no-copilot', 'adv-no-widgets', 'debloat-onedrive', 'svc-xbox-off', 'adv-no-xbox-bar'],
  },
  {
    id: 'battery-saver',
    title: 'Battery Saver (laptops)',
    desc: 'Stretches unplugged time: Balanced plan, quiet background, less disk churn. Who: laptops on the go. Screen brightness stays manual (see warn).',
    os: 'both',
    warn: 'Applies 5 tweaks: Balanced plan, background apps off, delivery optimization off, Search indexing off, SysMain off.\nScreen brightness has no safe programmatic API — set 70% manually (Settings → Display). Fully reversible.',
    ids: ['power-balanced', 'adv-no-bg-apps', 'adv-no-delivery-opt', 'adv-no-indexing', 'adv-no-sysmain'],
  },
  {
    id: 'work-focus',
    title: 'Work — Focus Mode',
    desc: 'Distraction-free desktop: tips/feeds/widgets/bar off, telemetry + feedback quiet. Who: students, office, streamers.',
    os: 'both',
    warn: 'Applies 7 tweaks: tips off, news feed off, Widgets off, Xbox Game Bar off, Xbox services off, telemetry off, feedback prompts Never.\nWin+W widgets and Game Bar stop until reverted. No reboot.',
    ids: ['adv-no-tips', 'adv-no-news', 'adv-no-widgets', 'adv-no-xbox-bar', 'svc-xbox-off', 'priv-no-telemetry', 'priv-no-feedback'],
  },
];

function list() {
  return PRESETS.map((p) => ({ ...p }));
}
function get(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

/* Read custom presets from a userData dir. Returns shape-validated entries
 * (unknown tweak ids are filtered by the CALLER against TWEAK_REGISTRY —
 * this module must stay UI/registry-agnostic). Never throws. */
function listCustom(userDataDir) {
  try {
    const raw = fs.readFileSync(path.join(String(userDataDir || ''), 'custom-presets.json'), 'utf8');
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((p) => p && typeof p === 'object')
      .map((p) => ({
        id: String(p.id || '').trim(),
        title: String(p.title || '').trim().slice(0, 80),
        desc: String(p.desc || '').trim().slice(0, 500),
        warn: String(p.warn || '').trim().slice(0, 800),
        os: p.os === 'win11' || p.os === 'win10' ? p.os : 'both',
        ids: Array.isArray(p.ids) ? p.ids.map((x) => String(x)) : [],
        games: Array.isArray(p.games) ? p.games.map((x) => String(x)).slice(0, 20) : [],
        custom: true,
      }))
      .filter((p) => p.id && p.title && p.ids.length > 0);
  } catch {
    return []; // missing/corrupt file = no customs, built-ins unaffected
  }
}

module.exports = { list, get, listCustom };
