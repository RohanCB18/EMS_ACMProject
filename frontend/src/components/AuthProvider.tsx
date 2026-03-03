'use client';

/**
 * AuthProvider — Global authentication context.
 *
 * Wraps the app and provides:
 * - `user`: current Firebase user or null
 * - `profile`: user profile from Firestore (role, team, etc.) or null
 * - `loading`: true while checking auth state
 * - `signOut`: sign out function
 *
 * All components can use `useAuth()` to access auth state.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    auth,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    verifyTokenWithBackend,
    type User,
} from '@/lib/firebase';

interface UserProfile {
    uid: string;
    email: string;
    display_name: string;
    role: string;
    institution?: string | null;
    team_id?: string | null;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (firebaseUser: User) => {
        try {
            const result = await verifyTokenWithBackend(firebaseUser);
            if (result.profile) {
                setProfile(result.profile);
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                await fetchProfile(firebaseUser);
            } else {
                setProfile(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        await firebaseSignOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                loading,
                signOut: handleSignOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
