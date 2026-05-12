'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Code, Loader2 } from 'lucide-react';
import {
    signUpWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    createUserProfile,
    verifyTokenWithBackend,
} from '@/lib/firebase';

const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Manage the event, users, and dashboards.' },
    { value: 'participant', label: 'Participant', description: 'Join a team, submit your project, and view your workspace.' },
    { value: 'judge', label: 'Judge', description: 'Evaluate teams, review submissions, and submit scored feedback.' },
    { value: 'volunteer', label: 'Volunteer', description: 'Support event operations and manage logistics.' },
] as const;

export type AuthRole = (typeof roleOptions)[number]['value'];

export default function RegisterPage() {
    const router = useRouter();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [institution, setInstitution] = useState('');
    const [selectedRole, setSelectedRole] = useState<AuthRole>('participant');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const roleParam = searchParams.get('role')?.toLowerCase();
        if (roleParam && roleOptions.some((option) => option.value === roleParam)) {
            setSelectedRole(roleParam as AuthRole);
        }
    }, []);

    const getRedirectTarget = (role: string) => {
        if (role === 'admin') return '/dashboard/admin/overview';
        if (role === 'judge') return '/dashboard/judge';
        if (role === 'volunteer') return '/dashboard/volunteer';
        return '/dashboard/participant';
    };

    const handleEmailRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
                setLoading(false);
                return;
            }

            const user = await signUpWithEmail(email, password);
            const displayName = `${firstName} ${lastName}`.trim();
            await createUserProfile(user, displayName, institution || undefined, selectedRole);
            router.push(getRedirectTarget(selectedRole));
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists. Try logging in instead.');
            } else if (error.code === 'auth/weak-password') {
                setError('Password is too weak. Please use at least 6 characters.');
            } else if (error.code === 'auth/invalid-email') {
                setError('Invalid email address.');
            } else {
                setError(error.message || 'An error occurred during registration.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOAuthRegister = async (provider: 'google' | 'github') => {
        setError(null);
        setOauthLoading(provider);

        try {
            const user = provider === 'google'
                ? await signInWithGoogle()
                : await signInWithGitHub();

            const result = await verifyTokenWithBackend(user);
            if (!result.profile) {
                await createUserProfile(
                    user,
                    user.displayName || 'User',
                    undefined,
                    selectedRole,
                );
            }

            router.push(getRedirectTarget(selectedRole));
        } catch (err: unknown) {
            const error = err as { code?: string; message?: string };
            if (error.code === 'auth/popup-closed-by-user') {
                // Silent — user closed popup
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                setError('An account with this email already exists using a different sign-in method.');
            } else {
                setError(error.message || `Failed to sign up with ${provider}`);
            }
        } finally {
            setOauthLoading(null);
        }
    };

    return (
        <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                <div className="absolute inset-0 bg-primary/90" />
                <div className="relative z-20 flex items-center text-lg font-medium">
                    <Code className="mr-2 h-6 w-6" /> Event OS
                </div>
                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2 text-primary-foreground">
                        <h2 className="text-3xl font-bold">Join the next big Hackathon.</h2>
                        <p className="text-lg opacity-90 mt-4 max-w-md">
                            Register now to access the dashboard, form a team, and submit your project. The $10,000 prize pool is waiting.
                        </p>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8 flex items-center justify-center p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Create an account
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Enter your details below to create your account
                        </p>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid gap-6">
                        <form onSubmit={handleEmailRegister}>
                            <div className="grid gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="firstName">First name</Label>
                                        <Input
                                            id="firstName"
                                            placeholder="Max"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="lastName">Last name</Label>
                                        <Input
                                            id="lastName"
                                            placeholder="Robinson"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            disabled={loading}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="institution">Institution (optional)</Label>
                                    <Input
                                        id="institution"
                                        placeholder="e.g. MIT, Stanford, IIT Bombay"
                                        value={institution}
                                        onChange={(e) => setInstitution(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Choose your role</Label>
                                    <div className="grid gap-2">
                                        {roleOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setSelectedRole(option.value)}
                                                className={`rounded-lg border p-4 text-left transition ${selectedRole === option.value ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/80'}`}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="font-semibold">{option.label}</span>
                                                    {selectedRole === option.value ? <span className="text-xs uppercase tracking-[0.2em] text-primary">Selected</span> : null}
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">{option.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Create Account'
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
                                onClick={() => handleOAuthRegister('google')}
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
                                onClick={() => handleOAuthRegister('github')}
                            >
                                {oauthLoading === 'github' ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : null}
                                GitHub
                            </Button>
                        </div>
                    </div>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="underline underline-offset-4 hover:text-primary">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
