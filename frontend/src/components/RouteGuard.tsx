'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

interface RouteGuardProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading) {
            if (!user || !profile) {
                // Not authenticated or missing profile (needs registration)
                const returnUrl = encodeURIComponent(pathname);
                router.replace(`/auth/login?returnUrl=${returnUrl}`);
            } else if (allowedRoles && allowedRoles.length > 0) {
                // Authenticated, check role
                if (!allowedRoles.includes(profile.role)) {
                    // Unauthorized route
                    if (profile.role === 'admin' || profile.role === 'super_admin') {
                        router.replace('/dashboard/admin/overview');
                    } else {
                        router.replace('/dashboard/participant/overview');
                    }
                }
            }
        }
    }, [user, profile, loading, router, pathname, allowedRoles]);

    // Show loading spinner while checking auth state
    if (loading || !user || !profile) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium">Verifying access...</p>
                </div>
            </div>
        );
    }

    // Role check for render (prevents flash of content before useEffect redirects)
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        return null;
    }

    return <>{children}</>;
}
