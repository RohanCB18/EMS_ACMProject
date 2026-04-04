'use client';

import React from 'react';
import Link from 'next/link';
import {
    Home, Users, Settings, Trophy, FileText, Activity,
    ClipboardList, History, Megaphone, Layers, Award,
    LifeBuoy, GraduationCap, Building2, BarChart3,
    ShieldCheck, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    role?: 'admin' | 'participant' | 'judge' | 'volunteer';
}

export function Sidebar({ className, role = 'participant' }: SidebarProps) {
    const getLinks = () => {
        switch (role) {
            case 'admin':
                return [
                    { name: 'Overview', icon: Home, href: '/dashboard/admin/overview' },
                    { name: 'Form Builder', icon: FileText, href: '/dashboard/admin/form-builder' },
                    { name: 'Phases', icon: Layers, href: '/dashboard/admin/phases' },
                    { name: 'Announcements', icon: Megaphone, href: '/dashboard/announcements' },
                    { name: 'Judging', icon: Trophy, href: '/dashboard/admin/judging' },
                    { name: 'Finance', icon: Activity, href: '/dashboard/admin/finance' },
                    { name: 'Certificates & Mails', icon: Award, href: '/dashboard/admin/certificates' },
                    { name: 'Helpdesk', icon: LifeBuoy, href: '/dashboard/admin/helpdesk' },
                    { name: 'Mentors', icon: GraduationCap, href: '/dashboard/admin/mentors' },
                    { name: 'Sponsors & Tracks', icon: Building2, href: '/dashboard/admin/sponsors' },
                    { name: 'Analytics', icon: BarChart3, href: '/dashboard/admin/analytics' },
                    { name: 'Users & RBAC', icon: ShieldCheck, href: '/dashboard/admin/roles' },
                    { name: 'Profile', icon: User, href: '/dashboard/profile' },
                ];
            case 'judge':
                return [
                    { name: 'Overview', icon: Home, href: '/dashboard/judge' },
                    { name: 'My Assignments', icon: ClipboardList, href: '/dashboard/judge?tab=assignments' },
                    { name: 'History', icon: History, href: '/dashboard/judge?tab=history' },
                    { name: 'Teams', icon: Users, href: '/dashboard/teams' },
                    { name: 'Profile', icon: User, href: '/dashboard/profile' },
                ];
            case 'volunteer':
                return [
                    { name: 'Overview', icon: Home, href: '/dashboard/volunteer' },
                    { name: 'Reimbursements', icon: Activity, href: '/dashboard/volunteer/reimbursements' },
                    { name: 'Announcements', icon: Megaphone, href: '/dashboard/announcements' },
                    { name: 'Profile', icon: User, href: '/dashboard/profile' },
                ];
            case 'participant':
            default:
                return [
                    { name: 'Dashboard', icon: Home, href: '/dashboard/participant' },
                    { name: 'Workspace', icon: FileText, href: '/dashboard/participant/workspace' },
                    { name: 'My Team', icon: Users, href: '/dashboard/participant/team' },
                    { name: 'Announcements', icon: Megaphone, href: '/dashboard/announcements' },
                    { name: 'Profile', icon: User, href: '/dashboard/profile' },
                    { name: 'Settings', icon: Settings, href: '/dashboard/participant/settings' },
                ];
        }
    };

    const links = getLinks();

    return (
        <div className={cn("pb-12 border-r bg-muted/40 h-full w-64 hidden md:block", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Hackathon EMS
                    </h2>
                    <div className="space-y-1">
                        {links.map((link) => (
                            <Button key={link.name} variant="ghost" className="w-full justify-start" asChild>
                                <Link href={link.href}>
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
