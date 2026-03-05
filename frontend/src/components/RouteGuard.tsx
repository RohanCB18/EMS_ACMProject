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
    // TEMPORARY BYPASS: allow all access without authentication
    return <>{children}</>;
}
