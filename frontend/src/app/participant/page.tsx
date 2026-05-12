'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParticipantPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard/participant');
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-lg font-medium">Redirecting...</p>
        </div>
    );
}
