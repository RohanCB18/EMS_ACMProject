import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Code } from 'lucide-react';

export default function LoginPage() {
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
                            "The most seamless hackathon experience I've ever had. We formed our team in minutes and got straight to building."
                        </p>
                        <footer className="text-sm">Sofia Davis, Last Year's Winner</footer>
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

                    <div className="grid gap-6">
                        <form>
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
                                    />
                                </div>
                                <Button asChild className="w-full">
                                    <Link href="/dashboard/participant/overview">Sign In with Email</Link>
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
                            <Button variant="outline" type="button" disabled>
                                Google
                            </Button>
                            <Button variant="outline" type="button" disabled>
                                GitHub
                            </Button>
                        </div>
                    </div>
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
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
