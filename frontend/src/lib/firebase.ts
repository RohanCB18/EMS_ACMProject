/**
 * Firebase Client SDK Configuration
 *
 * Initializes Firebase app, Auth, and Firestore for the frontend.
 * Uses environment variables from .env.local
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    GithubAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (prevent duplicate initialization in dev hot-reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// OAuth Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// Backend API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

/**
 * Sign in with email and password.
 */
async function signInWithEmail(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

/**
 * Create a new account with email and password.
 */
async function signUpWithEmail(email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
}

/**
 * Sign in with Google OAuth popup.
 */
async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
}

/**
 * Sign in with GitHub OAuth popup.
 */
async function signInWithGitHub() {
    const result = await signInWithPopup(auth, githubProvider);
    return result.user;
}

/**
 * Sign out the current user.
 */
async function signOut() {
    await firebaseSignOut(auth);
}

/**
 * Get the current user's Firebase ID token for backend API calls.
 */
async function getIdToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
}

/**
 * Create user profile in backend Firestore via API.
 */
async function createUserProfile(user: User, displayName: string, institution?: string) {
    const token = await user.getIdToken();
    const response = await fetch(`${API_URL}/api/auth/create-profile`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            uid: user.uid,
            email: user.email,
            display_name: displayName || user.displayName || "User",
            role: "participant",
            institution: institution || null,
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create profile");
    }

    return response.json();
}

/**
 * Verify token with backend and get user profile.
 */
async function verifyTokenWithBackend(user: User) {
    const token = await user.getIdToken();
    const response = await fetch(`${API_URL}/api/auth/verify-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: token }),
    });

    if (!response.ok) {
        throw new Error("Token verification failed");
    }

    return response.json();
}

export {
    app,
    auth,
    db,
    API_URL,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    getIdToken,
    createUserProfile,
    verifyTokenWithBackend,
    onAuthStateChanged,
};

export type { User };
