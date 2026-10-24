// Notifications push (Firebase Cloud Messaging) : une seule fois par appareil, depuis Profil → Notifications.
// Sur iPhone, ça ne marche que dans l'appli ajoutée à l'écran d'accueil (iOS 16.4+).
import { getMessaging, getToken, deleteToken, isSupported } from 'firebase/messaging';
import { app } from './firebase.js';

// Clé publique « Web Push » du projet (Console Firebase → Cloud Messaging → Configuration Web). Ce n'est pas un secret.
export const VAPID_KEY = '';

const KEY = 'pushToken';
const ios = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// 'on' | 'off' | 'blocked' | 'install' (iPhone hors appli installée) | 'unsupported'
export async function pushState() {
  if (!VAPID_KEY || !('Notification' in window) || !('serviceWorker' in navigator)) return ios() && !standalone() ? 'install' : 'unsupported';
  if (ios() && !standalone()) return 'install';
  if (!(await isSupported().catch(() => false))) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && localStorage.getItem(KEY) ? 'on' : 'off';
}

// À appeler depuis un clic (iOS refuse la demande d'autorisation sinon). Renvoie le jeton enregistré.
export async function enablePush(save) {
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error(perm === 'denied' ? 'blocked' : 'dismissed');
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  const old = localStorage.getItem(KEY);
  await save(token, old && old !== token ? old : null);
  localStorage.setItem(KEY, token);
  return token;
}

export async function disablePush(remove) {
  const token = localStorage.getItem(KEY);
  localStorage.removeItem(KEY);
  if (!token) return;
  await remove(token);
  await deleteToken(getMessaging(app)).catch(() => {});
}
