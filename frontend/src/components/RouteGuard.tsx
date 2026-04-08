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
        if (loading) {
            return;
        }

        if (!user) {
            router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
            return;
        }

        if (allowedRoles && profile?.role) {
            const role = profile.role.toLowerCase();
            if (!allowedRoles.includes(role)) {
                if (role === 'admin' || role === 'organizer' || role === 'super_admin') {
                    router.replace('/dashboard/admin/overview');
                } else if (role === 'judge') {
                    router.replace('/dashboard/judge');
                } else if (role === 'participant') {
                    router.replace('/dashboard/participant');
                } else if (role === 'volunteer') {
                    router.replace('/dashboard/volunteer');
                } else {
                    router.replace('/auth/login');
                }
            }
        }
    }, [user, profile, loading, router, pathname, allowedRoles]);

    if (
        loading ||
        !user ||
        (allowedRoles && (!profile || !allowedRoles.includes(profile.role.toLowerCase())))
    ) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
}
