import React from 'react';
import Link from 'next/link';
import { Home, Users, Settings, Trophy, FileText, Activity, ClipboardList, History, Megaphone, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
    role?: 'admin' | 'participant' | 'judge' | 'mentor';
}

export function Sidebar({ className, role = 'participant' }: SidebarProps) {
    // Define links based on role
    const getLinks = () => {
        switch (role) {
            case 'admin':
                return [
                    { name: 'Overview', icon: Home, href: '/dashboard/admin/overview' },
                    { name: 'Form Builder', icon: FileText, href: '/dashboard/admin/form-builder' },
                    { name: 'Users & RBAC', icon: Users, href: '/dashboard/admin/users' },
                    { name: 'Phases', icon: Layers, href: '/dashboard/admin/phases' },
                    { name: 'Announcements', icon: Megaphone, href: '/dashboard/admin/announcements' },
                    { name: 'Judging', icon: Trophy, href: '/dashboard/admin/judging' },
                    { name: 'Finance', icon: Activity, href: '/dashboard/admin/finance' },
                    { name: 'Settings', icon: Settings, href: '/dashboard/admin/settings' },
                ];
            case 'judge':
                return [
                    { name: 'Overview', icon: Home, href: '/dashboard/judge' },
                    { name: 'My Assignments', icon: ClipboardList, href: '/dashboard/judge' },
                    { name: 'History', icon: History, href: '/dashboard/judge' },
                ];
            case 'participant':
            default:
                return [
                    { name: 'Dashboard', icon: Home, href: '/dashboard' },
                    { name: 'Workspace', icon: FileText, href: '/dashboard/workspace' },
                    { name: 'My Team', icon: Users, href: '/dashboard/participant/team' },
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
