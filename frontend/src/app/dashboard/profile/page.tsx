'use client';

import { useAuth } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
    const { profile } = useAuth();
    const rawRole = profile?.role?.toLowerCase();
    const role = rawRole === 'admin' || rawRole === 'organizer' || rawRole === 'super_admin'
        ? 'admin'
        : rawRole === 'judge'
            ? 'judge'
            : rawRole === 'volunteer'
                ? 'volunteer'
                : 'participant';

    return (
        <DashboardLayout role={role ?? 'participant'}>
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">My Profile</h2>
                    <p className="text-muted-foreground">Your personal account details and role information.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Name</p>
                                <p className="mt-1 text-base font-semibold">{profile?.display_name ?? 'Not available'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
                                <p className="mt-1 text-base font-semibold">{profile?.email ?? 'Not available'}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Role</p>
                                <Badge className="mt-1">{profile?.role ?? 'Unknown'}</Badge>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Team</p>
                                <p className="mt-1 text-base font-semibold">{profile?.team_id ?? 'No team assigned'}</p>
                            </div>
                            <div className="md:col-span-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Institution</p>
                                <p className="mt-1 text-base font-semibold">{profile?.institution ?? 'Not provided'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
