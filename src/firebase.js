import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInWithCredential, signOut } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache } from 'firebase/firestore';
import { firebaseConfig } from './firebaseConfig';

export const usingEmulators = !!import.meta.env.VITE_EMULATORS;
export const app = initializeApp(usingEmulators ? { ...firebaseConfig, projectId: 'demo-nocturnz-todo' } : firebaseConfig);
export const auth = getAuth(app);
// Cache local persistant : la liste s'ouvre et se modifie hors ligne, puis se synchronise
export const db = initializeFirestore(app, {
  localCache: usingEmulators ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (usingEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8180);
  // test uniquement : connexion « Google » simulée sans fenêtre
  window.__devSignIn = (email, name) =>
    signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true, name: name || email.split('@')[0] })));
}

export async function signInWithGoogle() {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  try { await signInWithPopup(auth, p); }
  catch (e) {
    // Fenêtre bloquée (appli installée sur iPhone, bloqueur…) : on passe par une redirection
    if (/popup-blocked|operation-not-supported|cancelled-popup/.test(e.code || '')) return signInWithRedirect(auth, p);
    throw e;
  }
}
export const signOutUser = () => signOut(auth);
