import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RouteGuard allowedRoles={['organizer', 'super_admin']}>
            <DashboardLayout role="admin">
                {children}
            </DashboardLayout>
        </RouteGuard>
    );
}
