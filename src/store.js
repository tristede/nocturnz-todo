// Synchro Firestore ⇄ état local.
// L'interface garde la même forme de données que l'ancienne version (S.sections / S.buy / S.focus) et la modifie
// directement ; commit(S) compare ensuite avec la dernière version connue et n'écrit que ce qui a changé.
import { db } from './firebase.js';
import {
  collection, doc, query, where, onSnapshot, writeBatch, setDoc, updateDoc, deleteDoc, getDoc,
  serverTimestamp, arrayUnion, arrayRemove, deleteField,
} from 'firebase/firestore';

export const nid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const normEmail = (e) => String(e || '').trim().toLowerCase();
// tu/tn = qui a posé le tag (uid, pseudo) : les tags sont propres à chaque compte
const TASK_FIELDS = ['t', 'd', 'p', 'due', 'at', 'hist', 'rep', 'lvl', 'price', 'link', 'note', 'tu', 'tn'];
export const SHARED = { todo: '__shared_todo', buy: '__shared_buy' };

function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object' && !(v.toMillis)) return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
function pick(t) { const o = {}; TASK_FIELDS.forEach((k) => { if (t[k] !== undefined && t[k] !== '' && t[k] !== null) o[k] = t[k]; }); return o; }

export const CLUB_MAX = 2;

// Club privé : la personne a-t-elle une carte (ou est-elle admin) ? Appelle cb(true/false) à chaque changement.
export function watchAccess(user, cb) {
  const email = normEmail(user.email);
  let admin = null;
  return onSnapshot(doc(db, 'access', email), async (s) => {
    if (s.exists()) {
      const d = s.data();
      if (!d.joined) updateDoc(doc(db, 'access', email), { joined: true, uid: user.uid, name: user.displayName || '', joinedAt: serverTimestamp() }).catch(() => {});
      return cb({ member: true, admin: admin === null ? await isAdminCheck() : admin });
    }
    admin = await isAdminCheck();
    if (admin) {
      // l'admin se crée sa propre carte, pour que les autres le voient comme membre
      setDoc(doc(db, 'access', email), { email, by: user.uid, byName: user.displayName || '', joined: true, createdAt: serverTimestamp() }).catch(() => {});
      return cb({ member: true, admin: true });
    }
    cb({ member: false, admin: false });
  }, () => cb({ member: false, admin: false }));
  async function isAdminCheck() {
    try { const c = await getDoc(doc(db, 'config', 'club')); admin = !!(c.exists() && (c.data().admins || []).map(normEmail).includes(email)); }
    catch (_) { admin = false; }
    return admin;
  }
}

export function createStore(user, { onData, onStatus, admin }) {
  const me = { uid: user.uid, email: normEmail(user.email), name: user.displayName || normEmail(user.email).split('@')[0], photo: user.photoURL || '' };
  const cats = new Map(), catTasks = new Map(), guestTasks = new Map(), catUnsubs = new Map();
  let profile = null, profileLoaded = false, invites = [], sent = [], notifs = [], club = [], quota = 0;
  const unsubs = [];
  let emitTimer = null;
  const emit = () => { clearTimeout(emitTimer); emitTimer = setTimeout(() => onData(snapshot()), 0); };
  const err = (e) => { console.error(e); onStatus && onStatus(e.code === 'permission-denied' ? 'Accès refusé' : 'Erreur de synchro'); };

  /* ---------- Abonnements ---------- */
  unsubs.push(onSnapshot(doc(db, 'users', me.uid), (s) => {
    profile = s.exists() ? s.data() : null;
    if (profile && profile.pseudo) me.name = profile.pseudo;
    if (!s.exists() && !s.metadata.fromCache && !profileLoaded) bootstrap();
    profileLoaded = true; emit();
  }, err));
  // includeMetadataChanges : on n'écoute les tâches d'une catégorie qu'une fois celle-ci enregistrée côté serveur
  unsubs.push(onSnapshot(query(collection(db, 'cats'), where('members', 'array-contains', me.uid)), { includeMetadataChanges: true }, (qs) => {
    const seen = new Set();
    qs.forEach((d) => { seen.add(d.id); cats.set(d.id, { id: d.id, ...d.data() }); if (!catUnsubs.has(d.id) && !d.metadata.hasPendingWrites) watchCat(d.id); });
    [...cats.keys()].forEach((id) => { if (!seen.has(id)) { cats.delete(id); catTasks.delete(id); const u = catUnsubs.get(id); if (u) u(); catUnsubs.delete(id); } });
    emit();
  }, err));
  unsubs.push(onSnapshot(query(collection(db, 'tasks'), where('guests', 'array-contains', me.uid)), (qs) => {
    guestTasks.clear(); qs.forEach((d) => guestTasks.set(d.id, { id: d.id, ...d.data() })); emit();
  }, err));
  if (user.emailVerified !== false && me.email) {
    unsubs.push(onSnapshot(query(collection(db, 'invites'), where('toEmail', '==', me.email), where('status', '==', 'pending')), (qs) => {
      invites = qs.docs.map((d) => ({ id: d.id, ...d.data() })); emit();
    }, err));
  }
  unsubs.push(onSnapshot(query(collection(db, 'invites'), where('from', '==', me.uid)), (qs) => {
    sent = qs.docs.map((d) => ({ id: d.id, ...d.data() })); emit();
  }, err));
  unsubs.push(onSnapshot(query(collection(db, 'access'), where('by', '==', me.uid)), (qs) => {
    club = qs.docs.map((d) => d.data()).filter((x) => x.email !== me.email).sort((a, b) => (a.createdAt?.toMillis?.() || Date.now()) - (b.createdAt?.toMillis?.() || Date.now()));
    emit();
  }, err));
  unsubs.push(onSnapshot(doc(db, 'quota', me.uid), (s) => { quota = s.exists() ? s.data().n || 0 : 0; emit(); }, err));
  unsubs.push(onSnapshot(query(collection(db, 'notifs'), where('to', '==', me.uid)), (qs) => {
    notifs = qs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || Date.now()) - (a.createdAt?.toMillis?.() || Date.now()));
    emit();
  }, err));

  function watchCat(id) {
    catUnsubs.set(id, onSnapshot(query(collection(db, 'tasks'), where('catId', '==', id)), (qs) => {
      const m = new Map(); qs.forEach((d) => m.set(d.id, { id: d.id, ...d.data() })); catTasks.set(id, m); emit();
    }, (e) => {
      // accès pas encore propagé (catégorie qu'on vient de rejoindre) : on réessaie
      catUnsubs.delete(id);
      if (cats.has(id)) { if (e.code !== 'permission-denied') err(e); setTimeout(() => { if (cats.has(id) && !catUnsubs.has(id)) watchCat(id); }, 1500); }
    }));
  }

  // Premier passage : profil + catégories de départ
  function bootstrap() {
    const b = writeBatch(db), mk = (kind, name, color, groups) => {
      const id = nid('c');
      b.set(doc(db, 'cats', id), { kind, name, color, groups: groups.map((g) => ({ id: nid('g'), name: g })), owner: me.uid, members: [me.uid], memberInfo: { [me.uid]: info() }, createdAt: serverTimestamp() });
      return id;
    };
    const order = { todo: [mk('todo', 'Perso', 'perso', ['Général']), mk('todo', 'Travail', 'contenu', ['Général'])], buy: [mk('buy', 'Perso', 'perso', ['Divers'])] };
    b.set(doc(db, 'users', me.uid), { name: me.name, email: me.email, order, focus: [], createdAt: serverTimestamp() });
    b.commit().catch(err);
  }
  const info = () => ({ n: me.name, e: me.email, ph: me.photo });

  /* ---------- Vers l'interface ---------- */
  function allTasks() {
    const m = new Map();
    catTasks.forEach((ts) => ts.forEach((t, id) => m.set(id, t)));
    guestTasks.forEach((t, id) => { if (!m.has(id)) m.set(id, t); });
    return m;
  }
  function snapshot() {
    const order = (profile && profile.order) || {};
    const T = allTasks();
    const build = (kind) => {
      const ord = order[kind] || [];
      const list = [...cats.values()].filter((c) => c.kind === kind)
        .sort((a, b) => ((ord.indexOf(a.id) + 1 || 1e6) - (ord.indexOf(b.id) + 1 || 1e6)) || ((a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0)));
      const secs = list.map((c) => ({
        id: c.id, name: c.name, color: c.color, owner: c.owner, members: c.members, memberInfo: c.memberInfo || {},
        groups: (c.groups && c.groups.length ? c.groups : [{ id: 'g0', name: 'Divers' }]).map((g) => ({ id: g.id, name: g.name, tasks: [] })),
      }));
      const byId = new Map(secs.map((s) => [s.id, s]));
      const shared = { id: SHARED[kind], name: 'Partagées avec moi', color: 'other', virtual: true, members: [], memberInfo: {}, groups: [{ id: '__g', name: 'Partagées avec moi', tasks: [] }] };
      [...T.values()].filter((t) => (t.kind || 'todo') === kind).sort((a, b) => (a.o || 0) - (b.o || 0)).forEach((t) => {
        const ui = { id: t.id, ...pick(t), guests: t.guests || [], guestInfo: t.guestInfo || {}, by: t.by, byName: t.byName };
        if (ui.p === undefined && kind === 'todo') ui.p = 2;
        if (ui.lvl === undefined && kind === 'buy') ui.lvl = 2;
        ui.d = !!ui.d;
        const s = byId.get(t.catId);
        if (!s) { shared.groups[0].tasks.push(ui); return; }
        (s.groups.find((g) => g.id === t.groupId) || s.groups[0]).tasks.push(ui);
      });
      if (shared.groups[0].tasks.length) secs.push(shared);
      return secs;
    };
    return {
      me, ready: profileLoaded && !!profile,
      S: { sections: build('todo'), buy: build('buy'), focus: ((profile && profile.focus) || []).slice() },
      invites, sent, notifs, prefs: (profile && profile.prefs) || {},
      club: { admin: !!admin, invited: club, used: quota, left: admin ? Infinity : Math.max(0, CLUB_MAX - quota) },
    };
  }

  /* ---------- Écriture : diff entre l'état local et la dernière version connue ---------- */
  function commit(S) {
    const T = allTasks(), b = writeBatch(db), notes = [];
    let n = 0;
    const order = { todo: [], buy: [] };
    const seenCats = new Set(), seenTasks = new Set();
    const catKind = new Map();

    [['todo', S.sections], ['buy', S.buy]].forEach(([kind, secs]) => {
      secs.forEach((s) => {
        if (s.virtual) return;
        if (!s.id) s.id = nid('c');
        s.groups.forEach((g) => { if (!g.id) g.id = nid('g'); });
        order[kind].push(s.id); seenCats.add(s.id); catKind.set(s.id, s);
        const groups = s.groups.map((g) => ({ id: g.id, name: g.name }));
        const cur = cats.get(s.id);
        if (!cur) {
          const data = { kind, name: s.name, color: s.color || 'other', groups, owner: me.uid, members: [me.uid], memberInfo: { [me.uid]: info() }, createdAt: serverTimestamp() };
          b.set(doc(db, 'cats', s.id), data); n++;
          cats.set(s.id, { id: s.id, ...data, createdAt: null });
        } else if (cur.name !== s.name || (cur.color || '') !== (s.color || '') || stable(cur.groups || []) !== stable(groups)) {
          b.update(doc(db, 'cats', s.id), { name: s.name, color: s.color || 'other', groups, updatedAt: serverTimestamp() }); n++;
          Object.assign(cur, { name: s.name, color: s.color, groups });
        }
      });
    });

    // Tâches
    [['todo', S.sections], ['buy', S.buy]].forEach(([kind, secs]) => {
      secs.forEach((s) => s.groups.forEach((g) => g.tasks.forEach((t, i) => {
        if (!t.id) t.id = nid(kind === 'buy' ? 'b' : 't');
        seenTasks.add(t.id);
        const cur = T.get(t.id);
        const catId = s.virtual ? (cur && cur.catId) : s.id, groupId = s.virtual ? (cur && cur.groupId) : g.id;
        if (!catId) return;
        const data = { ...pick(t), kind, catId, groupId, o: i, by: cur ? cur.by : me.uid, byName: cur ? (cur.byName || '') : me.name };
        if (cur) { if (cur.guests) data.guests = cur.guests; if (cur.guestInfo) data.guestInfo = cur.guestInfo; data.createdAt = cur.createdAt || null; }
        else { data.guests = []; data.createdAt = serverTimestamp(); }
        const base = cur ? { ...pick(cur), kind: cur.kind || 'todo', catId: cur.catId, groupId: cur.groupId, o: cur.o } : null;
        const mine = { ...pick(t), kind, catId, groupId, o: i };
        if (base && stable(base) === stable(mine)) return;
        b.set(doc(db, 'tasks', t.id), data); n++;
        // notifications pour les autres membres d'une catégorie partagée
        const sec = catKind.get(catId) || (cur && cats.get(cur.catId));
        const others = new Set([...(sec && sec.members ? sec.members : []), ...(data.guests || []), ...(cur && s.virtual ? [cur.by] : [])]);
        others.delete(me.uid);
        if (others.size) {
          const where = sec && sec.name ? ' dans ' + sec.name : '';
          let txt = '';
          if (!cur) txt = me.name + ' a ajouté « ' + t.t + ' »' + where;
          else if (t.d && !cur.d) txt = me.name + (kind === 'buy' ? ' a acheté « ' : ' a terminé « ') + t.t + ' »';
          else if (cur.catId !== catId || cur.groupId !== groupId) txt = me.name + ' a déplacé « ' + t.t + ' »' + where;
          if (txt) others.forEach((to) => notes.push({ to, text: txt, catId, taskId: t.id }));
        }
        const keep = cur || {};
        const merged = { ...data, id: t.id, createdAt: keep.createdAt || null };
        if (!catTasks.has(catId) && cats.has(catId)) catTasks.set(catId, new Map());
        const holder = catTasks.get(catId);
        if (cur && cur.catId !== catId && catTasks.get(cur.catId)) catTasks.get(cur.catId).delete(t.id);
        if (holder) holder.set(t.id, merged); else if (guestTasks.has(t.id)) guestTasks.set(t.id, merged);
      })));
    });

    // Suppressions
    T.forEach((t, id) => {
      if (seenTasks.has(id)) return;
      if (cats.has(t.catId)) {
        if (!seenCats.has(t.catId)) return; // la catégorie entière part plus bas
        b.delete(doc(db, 'tasks', id)); n++; catTasks.get(t.catId) && catTasks.get(t.catId).delete(id);
      } else if (guestTasks.has(id)) {
        b.update(doc(db, 'tasks', id), { guests: arrayRemove(me.uid), ['guestInfo.' + me.uid]: deleteField() }); n++; guestTasks.delete(id);
      }
    });
    [...cats.values()].forEach((c) => {
      if (seenCats.has(c.id)) return;
      if (c.owner === me.uid) {
        (catTasks.get(c.id) || new Map()).forEach((_, id) => { b.delete(doc(db, 'tasks', id)); n++; });
        b.delete(doc(db, 'cats', c.id)); n++;
      } else { b.update(doc(db, 'cats', c.id), { members: arrayRemove(me.uid), ['memberInfo.' + me.uid]: deleteField() }); n++; }
      cats.delete(c.id); catTasks.delete(c.id);
    });

    // Profil : ordre des catégories + focus
    const focus = (S.focus || []).filter((id) => seenTasks.has(id));
    if (profile && (stable(profile.order || {}) !== stable(order) || stable(profile.focus || []) !== stable(focus))) {
      b.set(doc(db, 'users', me.uid), { order, focus }, { merge: true }); n++;
      profile = { ...profile, order, focus };
    }
    notes.slice(0, 50).forEach((x) => { b.set(doc(collection(db, 'notifs')), { ...x, from: me.uid, fromName: me.name, read: false, createdAt: serverTimestamp() }); n++; });
    if (!n) return Promise.resolve();
    onStatus && onStatus('Synchro…');
    return b.commit().then(() => onStatus && onStatus(navigator.onLine === false ? 'Hors ligne' : ''), (e) => { err(e); emit(); });
  }

  /* ---------- Partage ---------- */
  async function invite(type, targetId, email, targetName, kind) {
    email = normEmail(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Adresse email invalide');
    if (email === me.email) throw new Error('C’est ton adresse');
    const id = type + '_' + targetId + '__' + email;
    await setDoc(doc(db, 'invites', id), { type, target: targetId, targetName, kind, from: me.uid, fromName: me.name, fromEmail: me.email, toEmail: email, status: 'pending', createdAt: serverTimestamp() });
    return id;
  }
  const cancelInvite = (id) => deleteDoc(doc(db, 'invites', id));

  /* ---------- Club : 2 invitations par membre ---------- */
  // 'joined' = a un compte, 'pending' = invité au club mais jamais connecté, 'none' = pas de compte
  async function memberStatus(email) {
    try { const s = await getDoc(doc(db, 'access', normEmail(email))); return !s.exists() ? 'none' : s.data().joined ? 'joined' : 'pending'; }
    catch (_) { return 'none'; }
  }
  async function clubInvite(email) {
    email = normEmail(email);
    if (!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email)) throw new Error('Adresse email invalide');
    if (email === me.email) throw new Error('C’est ton adresse');
    if ((await memberStatus(email)) !== 'none') return false;
    if (!admin && quota >= CLUB_MAX) throw new Error('Tu as déjà utilisé tes ' + CLUB_MAX + ' invitations');
    const b = writeBatch(db);
    b.set(doc(db, 'access', email), { email, by: me.uid, byName: me.name, joined: false, createdAt: serverTimestamp() });
    if (!admin) b.set(doc(db, 'quota', me.uid), { n: quota + 1, last: email });
    await b.commit();
    return true;
  }
  async function cancelClubInvite(email) {
    const b = writeBatch(db);
    b.delete(doc(db, 'access', email));
    if (!admin) b.set(doc(db, 'quota', me.uid), { n: Math.max(0, quota - 1), last: email });
    await b.commit();
  }
  async function accept(inv) {
    const b = writeBatch(db);
    if (inv.type === 'cat') {
      b.update(doc(db, 'cats', inv.target), { members: arrayUnion(me.uid), ['memberInfo.' + me.uid]: info() });
    } else {
      b.update(doc(db, 'tasks', inv.target), { guests: arrayUnion(me.uid), ['guestInfo.' + me.uid]: info() });
    }
    b.update(doc(db, 'invites', inv.id), { status: 'accepted', answeredAt: serverTimestamp() });
    b.set(doc(collection(db, 'notifs')), { to: inv.from, from: me.uid, fromName: me.name, text: me.name + ' a rejoint « ' + inv.targetName + ' »', read: false, createdAt: serverTimestamp() });
    await b.commit();
    if (inv.type === 'cat' && profile) {
      const order = { todo: [], buy: [], ...(profile.order || {}) }, k = inv.kind === 'buy' ? 'buy' : 'todo';
      if (order[k].indexOf(inv.target) < 0) { order[k] = order[k].concat(inv.target); await setDoc(doc(db, 'users', me.uid), { order }, { merge: true }); }
    }
  }
  const decline = (inv) => updateDoc(doc(db, 'invites', inv.id), { status: 'declined', answeredAt: serverTimestamp() });
  const removeMember = (catId, uid) => updateDoc(doc(db, 'cats', catId), { members: arrayRemove(uid), ['memberInfo.' + uid]: deleteField() });
  const removeGuest = (taskId, uid) => updateDoc(doc(db, 'tasks', taskId), { guests: arrayRemove(uid), ['guestInfo.' + uid]: deleteField() });
  function readAll() {
    const un = notifs.filter((x) => !x.read); if (!un.length) return;
    const b = writeBatch(db); un.forEach((x) => b.update(doc(db, 'notifs', x.id), { read: true })); return b.commit().catch(err);
  }
  function clearNotifs() {
    const b = writeBatch(db); notifs.forEach((x) => b.delete(doc(db, 'notifs', x.id))); notifs = []; emit(); return b.commit().catch(err);
  }

  const savePrefs = (prefs) => setDoc(doc(db, 'users', me.uid), { prefs }, { merge: true }).catch(err);
  // Pseudo : profil + carte d'accès + fiche membre dans chaque liste partagée + invité sur une tâche
  async function savePseudo(name) {
    name = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (!name || name === me.name) return;
    me.name = name;
    const b = writeBatch(db);
    b.set(doc(db, 'users', me.uid), { pseudo: name }, { merge: true });
    b.update(doc(db, 'access', me.email), { name, uid: me.uid });
    cats.forEach((c) => { if (c.members.length > 1) b.update(doc(db, 'cats', c.id), { ['memberInfo.' + me.uid]: info() }); });
    guestTasks.forEach((t) => b.update(doc(db, 'tasks', t.id), { ['guestInfo.' + me.uid]: info() }));
    await b.commit().catch(err);
    emit();
  }

  function stop() { unsubs.forEach((u) => u()); catUnsubs.forEach((u) => u()); }
  return { me, commit, invite, cancelInvite, memberStatus, clubInvite, cancelClubInvite, accept, decline, removeMember, removeGuest, readAll, clearNotifs, savePrefs, savePseudo, stop, current: snapshot };
}
