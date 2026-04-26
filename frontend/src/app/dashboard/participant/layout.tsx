'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';

export default function ParticipantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { profile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const role = profile?.role?.toLowerCase();
        if (!loading && (role === 'admin' || role === 'organizer' || role === 'super_admin')) {
            router.push('/dashboard/admin/overview');
        }
    }, [profile, loading, router]);

    return (
        <>
            <RouteGuard allowedRoles={['participant']}>
                <DashboardLayout role="participant">
                    {children}
                </DashboardLayout>
            </RouteGuard>
        </>
    );
}
