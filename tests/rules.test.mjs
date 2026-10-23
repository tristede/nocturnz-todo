// Tests des règles Firestore sur l'émulateur : npm run test:rules
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, writeBatch, arrayUnion, arrayRemove, deleteField } from 'firebase/firestore';

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8180').split(':');
const env = await initializeTestEnvironment({
  projectId: 'nocturnz-todo-test',
  firestore: { host, port: Number(port), rules: readFileSync('firestore.rules', 'utf8') },
});
const cat = (owner, members, over = {}) => ({ kind: 'todo', name: 'Perso', color: 'perso', groups: [{ id: 'g1', name: 'Général' }], owner, members, memberInfo: {}, ...over });
const task = (catId, by, over = {}) => ({ kind: 'todo', catId, groupId: 'g1', o: 0, t: 'Tâche', d: false, p: 2, by, byName: '', guests: [], ...over });

await env.clearFirestore();
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'cats/A'), cat('adam', ['adam']));
  await setDoc(doc(db, 'cats/A2'), cat('adam', ['adam'], { name: 'Travail' }));
  await setDoc(doc(db, 'cats/SH'), cat('adam', ['adam', 'sara']));
  await setDoc(doc(db, 'cats/Z'), cat('zoe', ['zoe']));
  await setDoc(doc(db, 'tasks/t1'), task('A', 'adam'));
  await setDoc(doc(db, 'tasks/t2'), task('SH', 'adam'));
  await setDoc(doc(db, 'tasks/tz'), task('Z', 'zoe'));
  await setDoc(doc(db, 'tasks/tg'), task('A', 'adam', { guests: ['lea'] }));
  await setDoc(doc(db, 'invites/cat_A__lea@x.test'), { type: 'cat', target: 'A', targetName: 'Perso', kind: 'todo', from: 'adam', fromName: 'Adam', toEmail: 'lea@x.test', status: 'pending' });
  await setDoc(doc(db, 'invites/task_t1__zoe@x.test'), { type: 'task', target: 't1', targetName: 'Tâche', kind: 'todo', from: 'adam', fromName: 'Adam', toEmail: 'zoe@x.test', status: 'pending' });
  for (const e of ['adam@x.test', 'sara@x.test', 'lea@x.test', 'zoe@x.test']) await setDoc(doc(db, 'access/' + e), { email: e, by: 'admin', byName: 'Admin', joined: true });
  await setDoc(doc(db, 'config/club'), { admins: ['admin@x.test'] });
  await setDoc(doc(db, 'notifs/n1'), { to: 'adam', from: 'sara', fromName: 'Sara', text: 'hey', read: false });
});

const user = (uid, email, verified = true) => env.authenticatedContext(uid, { email, email_verified: verified }).firestore();
const adam = user('adam', 'adam@x.test'), sara = user('sara', 'sara@x.test'), lea = user('lea', 'Lea@x.test'), zoe = user('zoe', 'zoe@x.test');
const leaUnverified = user('lea', 'lea@x.test', false), anon = env.unauthenticatedContext().firestore();
const outsider = user('out', 'out@x.test'), admin = user('adm', 'admin@x.test');

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; } catch (e) { fail++; console.error('✗', name, '\n ', e.message.split('\n')[0]); }
}

// Profil
await t('profil : soi-même', () => assertSucceeds(setDoc(doc(adam, 'users/adam'), { name: 'Adam' })));
await t('profil : pas celui des autres', () => assertFails(getDoc(doc(sara, 'users/adam'))));

// Catégories
await t('cat : membre lit', () => assertSucceeds(getDoc(doc(sara, 'cats/SH'))));
await t('cat : étranger ne lit pas', () => assertFails(getDoc(doc(zoe, 'cats/A'))));
await t('cat : anonyme ne lit pas', () => assertFails(getDoc(doc(anon, 'cats/A'))));
await t('cat : liste de mes catégories', () => assertSucceeds(getDocs(query(collection(sara, 'cats'), where('members', 'array-contains', 'sara')))));
await t('cat : création par soi seul', () => assertSucceeds(setDoc(doc(zoe, 'cats/Z2'), cat('zoe', ['zoe']))));
await t('cat : création avec un autre membre refusée', () => assertFails(setDoc(doc(zoe, 'cats/Z3'), cat('zoe', ['zoe', 'adam']))));
await t('cat : membre renomme', () => assertSucceeds(updateDoc(doc(sara, 'cats/SH'), { name: 'Courses' })));
await t('cat : membre change son pseudo', () => assertSucceeds(updateDoc(doc(sara, 'cats/SH'), { 'memberInfo.sara': { n: 'Saroush' } })));
await t('cat : membre ne change pas le pseudo d’un autre', () => assertFails(updateDoc(doc(sara, 'cats/SH'), { 'memberInfo.adam': { n: 'X' } })));
await t('cat : membre ne s’approprie pas', () => assertFails(updateDoc(doc(sara, 'cats/SH'), { owner: 'sara' })));
await t('cat : membre n’ajoute personne', () => assertFails(updateDoc(doc(sara, 'cats/SH'), { members: arrayUnion('zoe') })));
await t('cat : étranger ne rejoint pas sans invitation', () => assertFails(updateDoc(doc(zoe, 'cats/A'), { members: arrayUnion('zoe') })));
await t('cat : membre ne supprime pas', () => assertFails(deleteDoc(doc(sara, 'cats/SH'))));

// Tâches
await t('tâche : membre de la catégorie lit (requête par catégorie)', () => assertSucceeds(getDocs(query(collection(sara, 'tasks'), where('catId', '==', 'SH')))));
await t('tâche : étranger ne lit pas la catégorie', () => assertFails(getDocs(query(collection(zoe, 'tasks'), where('catId', '==', 'A')))));
await t('tâche : invité lit (requête guests)', () => assertSucceeds(getDocs(query(collection(lea, 'tasks'), where('guests', 'array-contains', 'lea')))));
await t('tâche : invité ne lit pas les autres tâches', () => assertFails(getDoc(doc(lea, 'tasks/t1'))));
await t('tâche : membre coche', () => assertSucceeds(updateDoc(doc(sara, 'tasks/t2'), { d: true })));
await t('tâche : invité coche', () => assertSucceeds(updateDoc(doc(lea, 'tasks/tg'), { d: true })));
await t('tâche : invité ne déplace pas vers une catégorie d’Adam', () => assertFails(updateDoc(doc(lea, 'tasks/tg'), { catId: 'A2' })));
await t('tâche : déplacement entre mes catégories (glisser-déposer)', () => assertSucceeds(updateDoc(doc(adam, 'tasks/t1'), { catId: 'A2', groupId: 'g1' })));
await t('tâche : pas de déplacement vers une catégorie étrangère', () => assertFails(updateDoc(doc(adam, 'tasks/t2'), { catId: 'Z' })));
await t('tâche : création dans ma catégorie', () => assertSucceeds(setDoc(doc(sara, 'tasks/n1'), task('SH', 'sara'))));
await t('tâche : création chez un autre refusée', () => assertFails(setDoc(doc(sara, 'tasks/n2'), task('Z', 'sara'))));
await t('tâche : création avec des invités refusée', () => assertFails(setDoc(doc(adam, 'tasks/n3'), task('A', 'adam', { guests: ['zoe'] }))));
await t('tâche : membre n’ajoute pas d’invité directement', () => assertFails(updateDoc(doc(adam, 'tasks/t1'), { guests: arrayUnion('zoe') })));
await t('tâche : invité ne supprime pas', () => assertFails(deleteDoc(doc(lea, 'tasks/tg'))));
await t('tâche : invité peut se retirer', () => assertSucceeds(updateDoc(doc(lea, 'tasks/tg'), { guests: arrayRemove('lea') })));
await t('tâche : membre supprime', () => assertSucceeds(deleteDoc(doc(sara, 'tasks/n1'))));

// Invitations
await t('invitation : la destinataire la voit (email en majuscules dans le compte)', () => assertSucceeds(getDocs(query(collection(lea, 'invites'), where('toEmail', '==', 'lea@x.test'), where('status', '==', 'pending')))));
await t('invitation : email non vérifié ne la voit pas', () => assertFails(getDoc(doc(leaUnverified, 'invites/cat_A__lea@x.test'))));
await t('invitation : un autre ne la voit pas', () => assertFails(getDoc(doc(zoe, 'invites/cat_A__lea@x.test'))));
await t('invitation : membre invite', () => assertSucceeds(setDoc(doc(sara, 'invites/cat_SH__zoe@x.test'), { type: 'cat', target: 'SH', targetName: 'x', kind: 'todo', from: 'sara', fromName: 'Sara', toEmail: 'zoe@x.test', status: 'pending' })));
await t('invitation : non-membre n’invite pas', () => assertFails(setDoc(doc(zoe, 'invites/cat_A__zoe2@x.test'), { type: 'cat', target: 'A', targetName: 'x', kind: 'todo', from: 'zoe', fromName: 'Z', toEmail: 'zoe2@x.test', status: 'pending' })));
await t('invitation : id incohérent refusé', () => assertFails(setDoc(doc(adam, 'invites/cat_A__autre@x.test'), { type: 'cat', target: 'A', targetName: 'x', kind: 'todo', from: 'adam', fromName: 'A', toEmail: 'zoe@x.test', status: 'pending' })));
await t('invitation : rejoindre la catégorie et accepter', async () => {
  const b = writeBatch(lea);
  b.update(doc(lea, 'cats/A'), { members: arrayUnion('lea'), 'memberInfo.lea': { n: 'Léa', e: 'lea@x.test' } });
  b.update(doc(lea, 'invites/cat_A__lea@x.test'), { status: 'accepted' });
  await assertSucceeds(b.commit());
});
await t('invitation : une fois acceptée, impossible de rejoindre à nouveau', () => assertFails(updateDoc(doc(lea, 'cats/A'), { members: arrayUnion('lea', 'zoe') })));
await t('après invitation : Léa lit les tâches de Perso', () => assertSucceeds(getDocs(query(collection(lea, 'tasks'), where('catId', '==', 'A')))));
await t('invitation tâche : Zoé rejoint la tâche', async () => {
  const b = writeBatch(zoe);
  b.update(doc(zoe, 'tasks/t1'), { guests: arrayUnion('zoe'), 'guestInfo.zoe': { n: 'Zoé' } });
  b.update(doc(zoe, 'invites/task_t1__zoe@x.test'), { status: 'accepted' });
  await assertSucceeds(b.commit());
});
await t('propriétaire retire Léa', () => assertSucceeds(updateDoc(doc(adam, 'cats/A'), { members: arrayRemove('lea'), 'memberInfo.lea': deleteField() })));
await t('Sara quitte la liste partagée', () => assertSucceeds(updateDoc(doc(sara, 'cats/SH'), { members: arrayRemove('sara') })));
await t('Sara ne la lit plus', () => assertFails(getDoc(doc(sara, 'cats/SH'))));

// Notifications
await t('notif : destinataire lit', () => assertSucceeds(getDocs(query(collection(adam, 'notifs'), where('to', '==', 'adam')))));
await t('notif : un autre ne lit pas', () => assertFails(getDoc(doc(sara, 'notifs/n1'))));
await t('notif : marquer lue', () => assertSucceeds(updateDoc(doc(adam, 'notifs/n1'), { read: true })));
await t('notif : pas modifier le texte', () => assertFails(updateDoc(doc(adam, 'notifs/n1'), { text: 'x' })));
await t('notif : envoyer à quelqu’un', () => assertSucceeds(setDoc(doc(sara, 'notifs/n2'), { to: 'adam', from: 'sara', fromName: 'Sara', text: 'ok', read: false })));
await t('notif : pas au nom d’un autre', () => assertFails(setDoc(doc(sara, 'notifs/n3'), { to: 'adam', from: 'zoe', fromName: 'Z', text: 'ok', read: false })));

// Club privé
const card = (email, by, over = {}) => ({ email, by, byName: 'X', joined: false, ...over });
await t('club : un non-membre ne crée pas de catégorie', () => assertFails(setDoc(doc(outsider, 'cats/O1'), cat('out', ['out']))));
await t('club : un non-membre ne lit pas son profil', () => assertFails(getDoc(doc(outsider, 'users/out'))));
await t('club : un non-membre peut lire sa carte (absente)', () => assertSucceeds(getDoc(doc(outsider, 'access/out@x.test'))));
await t('club : un non-membre ne lit pas la carte des autres', () => assertFails(getDoc(doc(outsider, 'access/adam@x.test'))));
await t('club : un non-membre ne s’invite pas lui-même', async () => {
  const b = writeBatch(outsider); b.set(doc(outsider, 'access/out@x.test'), card('out@x.test', 'out')); b.set(doc(outsider, 'quota/out'), { n: 1, last: 'out@x.test' });
  await assertFails(b.commit());
});
const clubInvite = (db, uid, email, n) => { const b = writeBatch(db); b.set(doc(db, 'access/' + email), card(email, uid)); b.set(doc(db, 'quota/' + uid), { n, last: email }); return b.commit(); };
await t('club : invitation 1/2', () => assertSucceeds(clubInvite(sara, 'sara', 'k1@x.test', 1)));
await t('club : invitation sans compteur refusée', () => assertFails(setDoc(doc(sara, 'access/k9@x.test'), card('k9@x.test', 'sara'))));
await t('club : compteur qui saute refusé', () => assertFails(clubInvite(sara, 'sara', 'k2@x.test', 3)));
await t('club : invitation 2/2', () => assertSucceeds(clubInvite(sara, 'sara', 'k2@x.test', 2)));
await t('club : 3e invitation refusée', () => assertFails(clubInvite(sara, 'sara', 'k3@x.test', 3)));
await t('club : remettre le compteur à 0 à la main refusé', () => assertFails(setDoc(doc(sara, 'quota/sara'), { n: 0, last: 'x' })));
await t('club : annuler une invitation pas utilisée rend la place', async () => {
  const b = writeBatch(sara); b.delete(doc(sara, 'access/k2@x.test')); b.set(doc(sara, 'quota/sara'), { n: 1, last: 'k2@x.test' });
  await assertSucceeds(b.commit());
});
await t('club : la place rendue resservira', () => assertSucceeds(clubInvite(sara, 'sara', 'k3@x.test', 2)));
await t('club : pas d’invitation au nom d’un autre', () => assertFails(clubInvite(zoe, 'sara', 'k4@x.test', 3)));
await t('club : l’invité active sa carte', () => assertSucceeds(updateDoc(doc(user('k1', 'k1@x.test'), 'access/k1@x.test'), { joined: true, uid: 'k1', name: 'K' })));
await t('club : l’invité actif peut créer une catégorie', () => assertSucceeds(setDoc(doc(user('k1', 'k1@x.test'), 'cats/K1'), cat('k1', ['k1']))));
await t('club : carte activée non annulable par l’inviteur', async () => {
  const b = writeBatch(sara); b.delete(doc(sara, 'access/k1@x.test')); b.set(doc(sara, 'quota/sara'), { n: 1, last: 'k1@x.test' });
  await assertFails(b.commit());
});
await t('club : admin invite sans limite ni compteur', async () => {
  for (const e of ['a1@x.test', 'a2@x.test', 'a3@x.test']) await assertSucceeds(setDoc(doc(admin, 'access/' + e), card(e, 'adm')));
});
await t('club : admin crée sa propre carte', () => assertSucceeds(setDoc(doc(admin, 'access/admin@x.test'), card('admin@x.test', 'adm', { joined: true }))));
await t('club : membre ne crée pas de carte active', () => assertFails(setDoc(doc(zoe, 'access/zz@x.test'), card('zz@x.test', 'zoe', { joined: true }))));
await t('club : admin retire un membre', () => assertSucceeds(deleteDoc(doc(admin, 'access/k3@x.test'))));
await t('club : membre ne retire personne', () => assertFails(deleteDoc(doc(zoe, 'access/sara@x.test'))));
await t('club : config lisible par un membre', () => assertSucceeds(getDoc(doc(zoe, 'config/club'))));
await t('club : config pas modifiable', () => assertFails(setDoc(doc(admin, 'config/club'), { admins: ['admin@x.test', 'zoe@x.test'] })));
await t('club : liste de mes invités', () => assertSucceeds(getDocs(query(collection(sara, 'access'), where('by', '==', 'sara')))));

// Suivi à plusieurs (amis par modèle, non transitif)
const T = 'mcu-endgame', pr = (a, b) => (a < b ? a + '_' + b : b + '_' + a);
const winv = (from, fromDb, to) => setDoc(doc(fromDb, 'invites/watch_' + T + '__' + to), { type: 'watch', target: T, targetName: 'MCU', kind: 'todo', from, fromName: from, toEmail: to, status: 'pending' });
await t('suivi : invitation à suivre ensemble', () => assertSucceeds(winv('adam', adam, 'sara@x.test')));
await t('suivi : 2e invitation (vers Zoé)', () => assertSucceeds(winv('adam', adam, 'zoe@x.test')));
const accept = (uid, db, email, from) => { const b = writeBatch(db); b.set(doc(db, 'friends/' + T + '__' + pr(uid, from)), { tpl: T, users: [from, uid], names: {} }); b.update(doc(db, 'invites/watch_' + T + '__' + email), { status: 'accepted' }); return b.commit(); };
await t('suivi : Sara accepte', () => assertSucceeds(accept('sara', sara, 'sara@x.test', 'adam')));
await t('suivi : Zoé accepte', () => assertSucceeds(accept('zoe', zoe, 'zoe@x.test', 'adam')));
await t('suivi : pas de lien sans invitation (Sara–Zoé)', () => assertFails(setDoc(doc(sara, 'friends/' + T + '__' + pr('sara', 'zoe')), { tpl: T, users: ['sara', 'zoe'], names: {} })));
await t('suivi : chacun publie sa progression', async () => {
  for (const [u, db] of [['adam', adam], ['sara', sara], ['zoe', zoe]]) await assertSucceeds(setDoc(doc(db, 'progress/' + u + '__' + T), { uid: u, tpl: T, pct: 10 }));
});
await t('suivi : pas au nom d’un autre', () => assertFails(setDoc(doc(sara, 'progress/adam__' + T), { uid: 'adam', tpl: T, pct: 99 })));
await t('suivi : Adam voit Sara', () => assertSucceeds(getDoc(doc(adam, 'progress/sara__' + T))));
await t('suivi : Sara voit Adam', () => assertSucceeds(getDoc(doc(sara, 'progress/adam__' + T))));
await t('suivi : Sara ne voit pas Zoé (pas amies entre elles)', () => assertFails(getDoc(doc(sara, 'progress/zoe__' + T))));
await t('suivi : Léa ne voit personne', () => assertFails(getDoc(doc(lea, 'progress/adam__' + T))));
await t('suivi : Sara voit ses liens', () => assertSucceeds(getDocs(query(collection(sara, 'friends'), where('users', 'array-contains', 'sara')))));
await t('suivi : Sara arrête de suivre avec Adam', () => assertSucceeds(deleteDoc(doc(sara, 'friends/' + T + '__' + pr('sara', 'adam')))));
await t('suivi : ensuite Sara ne voit plus Adam', () => assertFails(getDoc(doc(sara, 'progress/adam__' + T))));

await env.cleanup();
console.log(`\n${pass} réussis, ${fail} échoués`);
process.exit(fail ? 1 : 0);
