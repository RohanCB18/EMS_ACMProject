'use client';

import { useAuth } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Trophy, ShieldCheck, LifeBuoy } from 'lucide-react';

export default function TeamsPage() {
    const { profile } = useAuth();
    const rawRole = profile?.role?.toLowerCase();
    const role = rawRole === 'admin' || rawRole === 'organizer' || rawRole === 'super_admin'
        ? 'admin'
        : rawRole === 'judge'
            ? 'judge'
            : rawRole === 'volunteer'
                ? 'volunteer'
                : 'participant';
    const title = role === 'admin'
        ? 'Team Management'
        : role === 'judge'
            ? 'Teams for Review'
            : role === 'volunteer'
                ? 'Support Teams'
                : 'My Team';

    const description = role === 'admin'
        ? 'View and manage the full team roster for the hackathon.'
        : role === 'judge'
            ? 'See the teams assigned to your judging queue.'
            : role === 'volunteer'
                ? 'Collaborate with support teams and event coordination groups.'
                : 'Track your current team and invite members if needed.';

    return (
        <DashboardLayout role={role ?? 'participant'}>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
                        <p className="text-muted-foreground">{description}</p>
                    </div>
                    <Button variant="outline" className="h-12">
                        {role === 'admin' ? 'Create New Team' : 'Refresh Team List'}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Card>
                        <CardHeader className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <CardTitle>{role === 'admin' ? 'All Teams' : 'Assigned Teams'}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">A snapshot of the most important teams for your current role.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            <CardTitle>Access Controls</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Use role-aware views to keep team assignments private and secure.</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            <CardTitle>Judging Delegation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Judges can see team details relevant to their scoring assignments.</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
