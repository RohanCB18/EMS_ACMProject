import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function DashboardRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <DashboardLayout role="participant">
            {children}
        </DashboardLayout>
    );
}
