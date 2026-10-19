// Glisser-déposer d'une tâche vers une autre sous-catégorie (ou un onglet de catégorie).
// Souris : on attrape la ligne et on bouge. Tactile : appui long (~0,3 s) puis on glisse, le défilement reste normal sinon.
// Lignes déplaçables : [data-drag="t:<id>"] ; cibles : [data-drop="t:<catIndex>:<groupIndex|->"] (même préfixe t/b obligatoire).
// Au-dessus d'une autre ligne d'un groupe, on insère avant/après elle (réordonner) : onDrop(ref, drop, { row, after }).
let st = null;
export const isDragging = () => !!(st && st.active);

export function installDnd({ onDrop, onHover, onEnd }) {
  const LONG = 300, MOVE = 8;
  let blockClickUntil = 0;

  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0 || st) return;
    const row = e.target.closest && e.target.closest('[data-drag]');
    if (!row || e.target.closest('input,textarea,select,a,.check,.pen,.tagbtn,.pricetag')) return;
    st = { row, ref: row.dataset.drag, x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, pid: e.pointerId, touch: e.pointerType !== 'mouse', active: false };
    if (st.touch) st.timer = setTimeout(() => { if (st && !st.active) begin(); }, LONG);
  });

  document.addEventListener('pointermove', (e) => {
    if (!st || e.pointerId !== st.pid) return;
    st.cx = e.clientX; st.cy = e.clientY;
    if (!st.active) {
      const d = Math.hypot(e.clientX - st.x, e.clientY - st.y);
      if (st.touch) { if (d > MOVE) reset(); return; } // l'utilisateur fait défiler
      if (d < MOVE) return;
      begin();
    }
    move();
  });
  // Une fois le glisser lancé au doigt, on bloque le défilement de la page
  document.addEventListener('touchmove', (e) => { if (st && st.active) e.preventDefault(); }, { passive: false });
  document.addEventListener('contextmenu', (e) => { if (st) e.preventDefault(); });
  document.addEventListener('pointerup', (e) => {
    if (!st || e.pointerId !== st.pid) return;
    if (st.active) {
      const t = st.target, ref = st.ref, row = st.row2 ? { row: st.row2.dataset.drag, after: st.after } : null;
      blockClickUntil = Date.now() + 400;
      reset();
      if (t) onDrop(ref, t.dataset.drop, row);
      onEnd && onEnd();
    } else reset();
  });
  document.addEventListener('pointercancel', () => { if (st) { const was = st.active; reset(); if (was && onEnd) onEnd(); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && st && st.active) { reset(); onEnd && onEnd(); } });
  // Le relâchement ne doit pas ouvrir la tâche
  document.addEventListener('click', (e) => { if (Date.now() < blockClickUntil) { e.preventDefault(); e.stopPropagation(); } }, true);

  function begin() {
    clearTimeout(st.timer);
    st.active = true;
    const r = st.row.getBoundingClientRect();
    const g = st.row.cloneNode(true);
    g.removeAttribute('data-drag');
    g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    g.className += ' drag-ghost';
    g.style.width = r.width + 'px'; g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
    st.ox = st.cx - r.left; st.oy = st.cy - r.top; st.ghost = g;
    document.body.appendChild(g);
    st.row.classList.add('drag-src');
    document.body.classList.add('dragging');
    try { navigator.vibrate && navigator.vibrate(12); } catch (_) {}
    try { window.getSelection().removeAllRanges(); } catch (_) {}
    st.raf = requestAnimationFrame(tick);
    move();
  }
  function move() {
    if (!st || !st.active) return;
    st.ghost.style.transform = 'translate(' + (st.cx - st.ox - parseFloat(st.ghost.style.left)) + 'px,' + (st.cy - st.oy - parseFloat(st.ghost.style.top)) + 'px) rotate(-1.2deg)';
    const el = document.elementFromPoint(st.cx, st.cy);
    let t = el && el.closest && el.closest('[data-drop]');
    if (t && t.dataset.drop.split(':')[0] !== st.ref.split(':')[0]) t = null;
    if (t !== st.target) {
      if (st.target) st.target.classList.remove('drop-on');
      st.target = t; st.since = Date.now();
      if (t) t.classList.add('drop-on');
    }
    // ligne survolée dans ce groupe → trait d'insertion avant ou après
    let r = t && !t.hasAttribute('data-drop-open') && el.closest('[data-drag]');
    if (r && (!t.contains(r) || r === st.row)) r = null;
    const after = r ? st.cy > r.getBoundingClientRect().top + r.getBoundingClientRect().height / 2 : false;
    if (r !== st.row2 || after !== st.after) {
      if (st.row2) st.row2.classList.remove('ins-before', 'ins-after');
      st.row2 = r; st.after = after;
      if (r) r.classList.add(after ? 'ins-after' : 'ins-before');
    }
  }
  // Défilement auto près des bords + survol prolongé d'un onglet = on l'ouvre
  function tick() {
    if (!st || !st.active) return;
    const m = 70, h = window.innerHeight;
    if (st.cy < m + 60) window.scrollBy(0, -Math.ceil((m + 60 - st.cy) / 6));
    else if (st.cy > h - m) window.scrollBy(0, Math.ceil((st.cy - (h - m)) / 6));
    if (st.target && st.target.hasAttribute('data-drop-open') && Date.now() - st.since > 650) {
      const t = st.target; st.target = null; st.since = Date.now();
      onHover && onHover(t.dataset.drop);
      move();
    }
    st.raf = requestAnimationFrame(tick);
  }
  function reset() {
    if (!st) return;
    clearTimeout(st.timer); cancelAnimationFrame(st.raf);
    if (st.ghost) st.ghost.remove();
    if (st.target) st.target.classList.remove('drop-on');
    if (st.row2) st.row2.classList.remove('ins-before', 'ins-after');
    document.querySelectorAll('.drag-src').forEach((n) => n.classList.remove('drag-src'));
    document.body.classList.remove('dragging');
    st = null;
  }
}
