import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  console.log("Starting Google Login...");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Login successful:", result.user.email);
    return result.user;
  } catch (error: any) {
    console.error("Error signing in with Google", error);
    if (error.code === 'auth/unauthorized-domain') {
      const msg = "Этот домен не добавлен в список разрешенных в Firebase Console. Пожалуйста, добавьте текущий URL в Authentication -> Settings -> Authorized Domains.";
      console.error(msg);
      throw new Error(msg);
    }
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};
