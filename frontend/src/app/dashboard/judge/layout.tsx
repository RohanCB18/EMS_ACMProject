import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RouteGuard } from '@/components/RouteGuard';

export default function JudgeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RouteGuard allowedRoles={['judge']}>
            <DashboardLayout role="judge">
                {children}
            </DashboardLayout>
        </RouteGuard>
    );
}
