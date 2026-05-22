import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

export function isFirebaseConfigured(config) {
  return Boolean(
    config?.apiKey &&
      config?.projectId &&
      !config.apiKey.includes("PEGA_AQUI") &&
      !config.projectId.includes("PEGA_AQUI")
  );
}

export function createFirebaseService(config) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();

  function userDoc(userId) {
    return doc(db, "usuarios", userId);
  }

  return {
    onAuthStateChanged: (callback) => onAuthStateChanged(auth, callback),
    signInGoogle: () => signInWithPopup(auth, provider),
    signInEmail: (email, password) => signInWithEmailAndPassword(auth, email, password),
    registerEmail: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    signOut: () => signOut(auth),
    async loadUserState(userId) {
      const snapshot = await getDoc(userDoc(userId));
      return snapshot.exists() ? snapshot.data().appState : null;
    },
    async saveUserState(userId, appState) {
      await setDoc(
        userDoc(userId),
        {
          appState,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
  };
}
