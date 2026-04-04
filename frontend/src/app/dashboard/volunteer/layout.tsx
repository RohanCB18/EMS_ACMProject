'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';

export default function VolunteerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RouteGuard allowedRoles={['volunteer']}>
            <DashboardLayout role="volunteer">
                {children}
            </DashboardLayout>
        </RouteGuard>
    );
}
