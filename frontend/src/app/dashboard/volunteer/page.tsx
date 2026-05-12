'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, LifeBuoy, ClipboardList } from 'lucide-react';
import Link from 'next/link';

export default function VolunteerOverviewPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Volunteer Dashboard</h2>
                    <p className="text-muted-foreground">Manage your event support tasks, reimbursements, and announcements.</p>
                </div>
                <Button asChild className="h-12">
                    <Link href="/dashboard/volunteer/reimbursements">View Reimbursements</Link>
                </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LifeBuoy className="h-4 w-4" /> Task Board
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Track assigned shifts and event duties in one place.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-4 w-4" /> Event Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Review the latest volunteer guidelines and support checklists.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Your volunteer role and approvals are up to date.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
