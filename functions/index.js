// Notifications push : chaque nouvelle notification de la cloche (notifs/{id}) part aussi sur les appareils
// du destinataire qui ont activé les push (users/{uid}.pushTokens), selon ses réglages Profil → Notifications.
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';

initializeApp();
const db = getFirestore();
// mêmes catégories que les réglages de l'appli (kind absent = activité d'une liste partagée)
const KINDS = { list: 'list', watch: 'watch', social: 'social' };

export const push = onDocumentCreated({ document: 'notifs/{id}', region: 'europe-west1' }, async (event) => {
  const n = event.data && event.data.data();
  if (!n || !n.to) return;
  const user = await db.doc('users/' + n.to).get();
  const u = user.exists ? user.data() : {};
  const tokens = Array.isArray(u.pushTokens) ? u.pushTokens.filter((t) => typeof t === 'string').slice(0, 20) : [];
  if (!tokens.length) return;
  // réservé aux comptes listés dans config/club.push (emails)
  const club = await db.doc('config/club').get();
  const allowed = ((club.exists && club.data().push) || []).map((e) => String(e).trim().toLowerCase());
  const email = u.email || (await getAuth().getUser(n.to).catch(() => ({}))).email;
  if (!allowed.includes(String(email || '').trim().toLowerCase())) return;
  const kind = KINDS[n.kind] || 'list';
  if (((u.prefs || {}).notif || {})[kind] === false) return;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    // message « data » : c'est le service worker de l'appli qui affiche la notification
    data: { title: 'Nocturnz/todo', body: String(n.text || '').slice(0, 380), tag: kind === 'watch' ? 'watch-' + (n.from || '') : event.params.id, url: '/' },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  });
  // jetons expirés ou révoqués : on les retire du compte
  const dead = res.responses.map((r, i) => (!r.success && /registration-token-not-registered|invalid-registration-token|invalid-argument/.test((r.error && r.error.code) || '') ? tokens[i] : null)).filter(Boolean);
  if (dead.length) await user.ref.update({ pushTokens: FieldValue.arrayRemove(...dead) });
});
