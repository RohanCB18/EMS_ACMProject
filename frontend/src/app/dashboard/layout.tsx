'use client';

import { RouteGuard } from '@/components/RouteGuard';

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RouteGuard>
            {children}
        </RouteGuard>
    );
}
