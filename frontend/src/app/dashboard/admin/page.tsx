'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardAdminPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/admin/overview');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 text-center">
            <div>
                <p className="text-lg font-medium">Redirecting to the admin overview...</p>
            </div>
        </div>
    );
}
