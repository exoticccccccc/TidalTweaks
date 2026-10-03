'use strict';
/* Cleaner tab (Free): scan %TEMP% / Windows Temp / Prefetch / recycle bin /
 * browser caches, PREVIEW every file with its size (checkboxes), then delete
 * only what is checked. Ends with a count-up "space freed" summary card. */
(function () {
  const TT = window.TT;
  const $ = (id) => document.getElementById(id);
  let lastScan = [];

  function setProgress(pct) {
    const bar = $('cleaner-progress');
    bar.hidden = false;
    bar.firstElementChild.style.width = Math.round(pct * 100) + '%';
    if (pct >= 1) setTimeout(() => { bar.hidden = true; }, 600);
  }

  // Batch 3 (Issue 2): everything runs silently in the main process
  // (windowsHide + -WindowStyle Hidden, see core/exec.js). This tab only
  // shows in-app progress + an inline results panel — never a terminal.
  let busy = false;
  async function scan() {
    if (busy) return;
    busy = true;
    const scanBtn = $('cleaner-scan');
    const cleanBtn = $('cleaner-clean');
    scanBtn.disabled = true;
    const list = $('cleaner-list');
    list.innerHTML = '<div class="spinner"></div><p class="dim">Scanning temp files, caches and recycle bin… (runs silently in the background)</p>';
    cleanBtn.disabled = true;
    $('cleaner-result').hidden = true;
    setProgress(0.15);
    let res;
    try { res = await TT.api.cleaner.scan(); }
    catch (e) { res = { ok: false }; }
    setProgress(1);
    busy = false;
    scanBtn.disabled = false;
    if (!res || !res.ok) {
      list.innerHTML = '';
      const p = document.createElement('p');
      p.className = 'dim';
      p.textContent = 'Scan hit a snag (usually a locked system folder). Try again — nothing was deleted.';
      list.appendChild(p);
      TT.toast('Cleaner scan hit a snag — try again.', 'error');
      return;
    }
    lastScan = res.files || [];
    list.innerHTML = '';
    if (!lastScan.length) {
      list.innerHTML = '<p class="dim">✨ Nothing to clean — system is spotless.</p>';
      return;
    }
    // Render cap: thousands of DOM rows jank low-end machines. Files arrive
    // biggest-first, so the top slice covers ~all of the bytes; rescan after
    // cleaning to reveal the next slice.
    const SHOWN = 400;
    const shown = lastScan.slice(0, SHOWN);
    // One checkbox row per file: path + human size. Nothing is deleted yet.
    shown.forEach((f) => {
      const i = lastScan.indexOf(f);
      const row = document.createElement('label');
      row.className = 'file-row check';
      row.style.cursor = 'pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.idx = String(i);
      const box = document.createElement('span');
      box.className = 'box';
      const name = document.createElement('span');
      name.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:0 10px';
      name.textContent = f.path;
      name.title = f.path;
      const size = document.createElement('span');
      size.textContent = TT.fmtBytes(f.size);
      row.append(cb, box, name, size);
      list.appendChild(row);
    });
    const total = document.createElement('p');
    total.className = 'dim';
    total.style.marginTop = '10px';
    total.textContent = `Showing ${shown.length} of ${lastScan.length} files · ${TT.fmtBytes(res.totalBytes)} reclaimable` +
      (lastScan.length > shown.length ? ' (clean, then rescan for the rest)' : '');
    list.appendChild(total);
    $('cleaner-clean').disabled = false;
    TT.toast(`Scan complete — ${TT.fmtBytes(res.totalBytes)} found.`, 'success');
  }

  async function clean() {
    if (busy) return;
    const checked = Array.from(document.querySelectorAll('#cleaner-list input:checked'))
      .map((cb) => lastScan[Number(cb.dataset.idx)])
      .filter(Boolean)
      .map((f) => f.path);
    if (!checked.length) { TT.toast('Select at least one file first.', '', 3000); return; }
    // Destructive → confirmation modal with the exact blast radius.
    const ok = await TT.confirm({
      title: 'Delete selected junk?',
      body: `${checked.length} file(s) will be permanently deleted.` +
        ($('cleaner-recycle').checked ? '\nThe Recycle Bin will also be emptied.' : '') +
        '\nThis runs silently in the background — no terminal window will appear.' +
        '\n\nThis cannot be undone.',
      okText: 'Delete',
    });
    if (!ok) return;
    busy = true;
    $('cleaner-scan').disabled = true;
    $('cleaner-clean').disabled = true;
    $('cleaner-clean').textContent = '🧹 Cleaning… (silent)';
    setProgress(0.3);
    const box = $('cleaner-result');
    box.hidden = false;
    box.innerHTML = '<p class="dim">Cleaning… working silently in the background.</p>';
    let res;
    try {
      res = await TT.api.cleaner.clean({ paths: checked, includeRecycleBin: $('cleaner-recycle').checked });
    } catch (e) { res = { ok: false }; }
    setProgress(1);
    busy = false;
    $('cleaner-scan').disabled = false;
    $('cleaner-clean').disabled = false;
    $('cleaner-clean').textContent = '🧹  Clean selected';
    if (!res || !res.ok) { TT.toast('Cleanup hit a snag — try again. Nothing was harmed.', 'error', 5000); return; }
    // Inline results panel: files cleaned, space freed, skipped count. No terminal.
    box.hidden = false;
    box.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = '✨ Cleanup complete — all silent, no terminal shown';
    const big = document.createElement('div');
    big.className = 'big-number';
    big.textContent = '0 MB';
    const sub = document.createElement('p');
    sub.className = 'dim';
    sub.textContent = `${res.deleted || 0} files removed · ${TT.fmtBytes(res.freed || 0)} freed` +
      (res.errors ? ` · ${res.errors} locked/skipped (in use by Windows)` : '') + '.';
    box.append(h, big, sub);
    // Count up in MB for drama, then snap to the exact human string.
    TT.countUp(big, (res.freed || 0) / 1048576, { decimals: 1, suffix: ' MB' });
    setTimeout(() => { big.textContent = TT.fmtBytes(res.freed || 0) + ' freed'; }, 500);
    TT.toast((res.message || `Cleaned ${TT.fmtBytes(res.freed || 0)}!`), 'success');
    scan(); // re-scan to show the fresh state
  }

  $('cleaner-scan').onclick = scan;
  $('cleaner-clean').onclick = clean;
})();
