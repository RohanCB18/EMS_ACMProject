import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';

export default function ParticipantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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
