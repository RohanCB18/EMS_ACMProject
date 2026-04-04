
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Users, ArrowRight } from 'lucide-react';

export default function ParticipantDashboardPage() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome, Participant!</h2>
                    <p className="text-muted-foreground">Track your progress and manage your hackathon journey.</p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/participant/team">
                        Submit Final Project <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Current Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="font-semibold">Registered Successfully</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            You are all set for the event. Next step: join a team.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">My Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-amber-500">
                            <Users className="h-5 w-5" />
                            <span className="font-semibold">Not in a team yet</span>
                        </div>
                        <Button variant="link" className="px-0 h-auto mt-2 text-primary" asChild>
                            <Link href="/dashboard/participant/team">
                                Find teammates &rarr;
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Next Deadline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-red-500">
                            <Clock className="h-5 w-5" />
                            <span className="font-semibold">Team locking in 2 days</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Make sure to finalize your team size.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Event Announcements</CardTitle>
                    <CardDescription>Stay updated with the latest from the organizers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border-l-4 border-primary pl-4 py-2 bg-muted/30 rounded-r-md">
                        <h4 className="font-semibold">API Track Details Released</h4>
                        <p className="text-sm text-muted-foreground mt-1">Make sure you check the sponsors page for API keys provided by our partners!</p>
                        <p className="text-xs text-muted-foreground mt-2">Posted 2 hours ago by Super Admin</p>
                    </div>
                    <div className="border-l-4 border-muted-foreground pl-4 py-2">
                        <h4 className="font-semibold">Welcome to the Event OS Hackathon!</h4>
                        <p className="text-sm text-muted-foreground mt-1">Registrations are officially open. Start forming your teams early to get a head start on ideas.</p>
                        <p className="text-xs text-muted-foreground mt-2">Posted 1 day ago by Organizers</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
