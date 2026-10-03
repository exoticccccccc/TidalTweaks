'use strict';
/* Presets tab — Batch 5 remodel (9 focused stacks, Profiles tab removed).
 * Preview modal lists every tweak + count before confirming; each card has
 * Apply + Revert-preset; success fires a toast (+ confetti on full apply).
 * Reloads on every show so Free→Pro unlocks refresh locks live (F-09 fix). */
(function () {
  const TT = window.TT;
  const $ = (id) => document.getElementById(id);

  async function load() {
    const box = $('preset-list');
    if (!box) return;
    box.innerHTML = '<div class="spinner"></div>';
    let res;
    try { res = await TT.api.preset.list(); }
    catch (e) { res = { ok: false }; }
    box.innerHTML = '';
    if (!res || !res.ok || !res.presets.length) {
      box.innerHTML = '<p class="dim">No presets available.</p>';
      return;
    }
    res.presets.forEach((p) => {
      const card = document.createElement('div');
      card.className = 'glass card';
      const h = document.createElement('h3');
      h.textContent = p.title + '  ';
      const tag = document.createElement('span');
      const pt = p.tier || 0;
      tag.className = pt === 0 ? 'free-tag' : (pt === 1 ? 'tier-tag tier-base' : (pt === 3 ? 'tier-tag tier-extreme' : 'pro-tag'));
      tag.textContent = (TT.TIER_NAMES[pt] || 'FREE').toUpperCase();
      if (p.custom) {
        // Local-only stack (custom-presets.json): never shipped, never synced.
        const mine = document.createElement('span');
        mine.className = 'os-tag';
        mine.textContent = 'CUSTOM · THIS PC ONLY';
        mine.style.marginLeft = '8px';
        h.append(mine, ' ');
      }
      h.appendChild(tag);
      const desc = document.createElement('p');
      desc.className = 'dim';
      desc.textContent = p.desc;
      // OS line: which Windows this stack targets.
      const sub = document.createElement('p');
      sub.className = 'dim';
      const osv = p.os || 'both';
      sub.textContent = `${osv === 'both' ? 'Windows 10 / 11' : (osv === 'win11' ? 'Windows 11' : 'Windows 10')}` +
        ` · ${(p.ids || []).length} tweaks` +
        ((p.games && p.games.length) ? ` · saves: ${p.games.join(', ')}` : '');
      // Transparent contents in a SCROLLABLE box so Apply/Revert never scroll off.
      const ul = document.createElement('div');
      ul.className = 'preset-includes';
      ul.style.margin = '10px 0';
      (p.ids || []).forEach((tid) => {
        const meta = (TT.TWEAKS || {})[tid];
        const row = document.createElement('div');
        row.className = 'file-row';
        const a = document.createElement('span');
        a.textContent = '• ' + ((meta && meta.t) || tid);
        row.appendChild(a);
        ul.appendChild(row);
      });
      const row = document.createElement('div');
      row.className = 'row';
      row.style.marginBottom = '0';
      const need = p.tier || 0;
      const locked = TT.tier < need;
      const btn = document.createElement('button');
      btn.className = 'btn ' + (locked ? 'secondary' : (need >= 2 ? 'gold' : 'primary'));
      btn.textContent = locked ? (TT.TIER_NAMES[need] || 'PRO').toUpperCase() : `Apply ${(p.ids || []).length} tweaks`;
      btn.onclick = () => applyPreset(p, locked);
      row.appendChild(btn);
      // Revert-preset: undoes the whole stack via its single undo entry.
      const rev = document.createElement('button');
      rev.className = 'btn secondary';
      rev.textContent = '⟲ Revert preset';
      rev.title = 'Undo everything this preset applied (one click)';
      rev.onclick = () => revertPreset(p);
      row.appendChild(rev);
      card.append(h, desc, sub, ul, row);
      box.appendChild(card);
    });
  }

  async function applyPreset(p, locked) {
    const need = p.tier || 0;
    if (locked) {
      TT.toast(`'${p.title}' needs ${TT.TIER_NAMES[need]} ($${TT.TIER_PRICES[need]}) — opening Settings…`, '', 3500);
      TT.switchTab('settings');
      return;
    }
    const names = (p.ids || []).map((tid) => '• ' + (((TT.TWEAKS || {})[tid] || {}).t || tid)).join('\n');
    const ok = await TT.confirm({
      title: `${p.title} — this will apply ${(p.ids || []).length} tweaks`,
      body: `${p.warn || ''}\n\nIncluded (${(p.ids || []).length}):\n${names}\n\nOne restore point covers everything, and Revert preset rolls it all back.`,
      okText: `Apply ${(p.ids || []).length} tweaks`,
    });
    if (!ok) return;
    // Loading screen: title + live step log streamed from the main process.
    TT.progress.show(`${p.title} (${(p.ids || []).length} tweaks)`, (p.ids || []).length, p.id);
    const res = await TT.api.preset.apply(p.id).catch((e) => ({ ok: false }));
    TT.progress.done((res && res.message) || 'Preset hit a snag — try again.', !!(res && res.ok));
    if (res && res.ok) {
      TT.confetti();
      TT.toast(`${p.title} applied (${(p.ids || []).length} tweaks).`, 'success', 4000);
    } else {
      TT.toast(`Preset incomplete — ${(res && res.message) || 'try again'}.`, 'error', 5000);
    }
    if (TT.refreshRestore) TT.refreshRestore();
    load();
  }

  async function revertPreset(p) {
    const ok = await TT.confirm({
      title: `Revert ${p.title}?`,
      body: `Undoes all ${(p.ids || []).length} tweaks this preset applied (where possible).\nAppX removals come back via the Microsoft Store; uninstalled programs need reinstalling.`,
      okText: 'Revert preset',
    });
    if (!ok) return;
    let r;
    try { r = await TT.api.preset.revert(p.id); }
    catch (e) { r = { ok: false }; }
    TT.toast((r && r.message) || 'Nothing to revert.', r && r.ok ? 'success' : '', 4000);
    if (TT.refreshRestore) TT.refreshRestore();
  }

  // Remodel Batch 5: DOM cache — build once, re-render only when the tier
  // changes (unlock purchase) or after an apply/revert touches states.
  let builtTier = null;
  let builtOnce = false;
  function show() {
    if (builtOnce && builtTier === TT.tier) return; // cached, still valid
    builtTier = TT.tier;
    builtOnce = true;
    load();
  }
  TT._show.presets = () => show();
})();
