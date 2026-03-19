'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Code, Loader2 } from 'lucide-react';
import { signInWithEmail, signInWithGoogle, signInWithGitHub, verifyTokenWithBackend } from '@/lib/firebase';
import { fetchApi } from '@/lib/api';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const user = await signInWithEmail(email, password);
            // Verify with backend and get profile
            const result = await verifyTokenWithBackend(user);

            // Redirect based on role
            const role = result.profile?.role?.toLowerCase();
            if (role === 'admin' || role === 'organizer' || role === 'super_admin') {
                router.push('/dashboard/admin/overview');
            } else if (role === 'judge') {
                router.push('/dashboard/judge');
            } else {
                router.push('/dashboard/participant/overview');
            }
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === 'auth/user-not-found') {
                setError('No account found with this email. Sign up instead?');
            } else if (error.code === 'auth/wrong-password') {
                setError('Incorrect password. Please try again.');
            } else if (error.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please check and try again.');
            } else if (error.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else {
                setError(error.message || 'An error occurred during sign in.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthLogin = async (provider: 'google' | 'github') => {
        setError(null);
        setOauthLoading(provider);

        try {
            const user = provider === 'google'
                ? await signInWithGoogle()
                : await signInWithGitHub();

            // Verify with backend — if profile doesn't exist, create it
            const result = await verifyTokenWithBackend(user);

            if (!result.profile) {
                // First-time OAuth login — create profile via backend
                await fetchApi('/api/auth/create-profile', {
                    method: 'POST',
                    body: JSON.stringify({
                        uid: user.uid,
                        email: user.email,
                        display_name: user.displayName || 'User',
                        role: 'participant',
                    }),
                });
            }

            const role = result.profile?.role?.toLowerCase();
            if (role === 'admin' || role === 'organizer' || role === 'super_admin') {
                router.push('/dashboard/admin/overview');
            } else if (role === 'judge') {
                router.push('/dashboard/judge');
            } else {
                router.push('/dashboard/participant/overview');
            }
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup — don't show error
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                setError('An account with this email already exists using a different sign-in method.');
            } else {
                setError(error.message || `Failed to sign in with ${provider}`);
            }
        } finally {
            setOauthLoading(null);
        }
    };

    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-zinc-900" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Code className="mr-2 h-6 w-6" /> Event OS
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2">
                        <p className="text-lg text-zinc-300">
                            &ldquo;The most seamless hackathon experience I&apos;ve ever had. We formed our team in minutes and got straight to building.&rdquo;
                        </p>
                        <footer className="text-sm">Sofia Davis, Last Year&apos;s Winner</footer>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8 flex items-center justify-center p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your email to sign in to your account
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-6">
                        <form onSubmit={handleEmailLogin}>
                            <div className="grid gap-4">
                                <div className="grid gap-1 space-y-2">
                                    <Label className="sr-only" htmlFor="email">
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                    <Label className="sr-only" htmlFor="password">
                                        Password
                                    </Label>
                                    <Input
                                        id="password"
                                        placeholder="Password"
                                        type="password"
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign In with Email'
                                    )}
                                </Button>
                            </div>
                        </form>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">
                                    Or continue with
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={!!oauthLoading}
                                onClick={() => handleOAuthLogin('google')}
                            >
                                {oauthLoading === 'google' ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                Google
                            </Button>
                            <Button
                                variant="outline"
                                type="button"
                                disabled={!!oauthLoading}
                                onClick={() => handleOAuthLogin('github')}
                            >
                                {oauthLoading === 'github' ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                GitHub
                            </Button>
                        </div>
                    </div>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/auth/register"
                            className="underline underline-offset-4 hover:text-primary"
                        >
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
