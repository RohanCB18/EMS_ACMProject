
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Clock, Users, ArrowRight, Megaphone, Loader2, Zap } from 'lucide-react';
import { setBApi, type Phase, type Announcement } from '@/lib/api/set-b';
import { useAuth } from '@/components/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

export default function ParticipantDashboardPage() {
    const { profile } = useAuth();
    const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Current Phase
                const phaseRes = await setBApi.getCurrentPhase();
                if ('phase' in phaseRes && phaseRes.phase) {
                    setCurrentPhase(phaseRes.phase);
                } else if ('id' in phaseRes) {
                    setCurrentPhase(phaseRes as Phase);
                }

                // Fetch Announcements (filtered by track if available)
                const annRes = await setBApi.listAnnouncements(profile?.track);
                setAnnouncements(annRes);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [profile?.track]);

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'recently';
        const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
        return formatDistanceToNow(date, { addSuffix: true });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Welcome, {profile?.display_name || 'Participant'}!</h2>
                    <p className="text-muted-foreground">Track your progress and manage your hackathon journey.</p>
                </div>
                <Button asChild disabled={currentPhase?.featureFlags?.allowSubmission === false}>
                    <Link href="/dashboard/participant/workspace">
                        {currentPhase?.featureFlags?.allowSubmission ? 'Submit Final Project' : 'Submission Locked'} 
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>

            {/* Event Lifecycle / Current Phase Banner */}
            <Card className="bg-primary/10 border-primary/20 overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-primary/20 p-3 rounded-full">
                                <Zap className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Current Phase: {currentPhase?.name || 'Loading...'}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {currentPhase?.description || 'The event is currently in progress.'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {currentPhase?.featureFlags?.allowEdits && <Badge variant="outline">Edits Open</Badge>}
                            {currentPhase?.featureFlags?.allowSubmission && <Badge variant="default" className="bg-green-600">Submissions Live</Badge>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Registration Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="font-semibold">Confirmed</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Profile: {profile?.role || 'Participant'} ({profile?.track || 'General'})
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">My Team</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {profile?.team_id ? (
                            <div className="flex items-center gap-2 text-primary">
                                <Users className="h-5 w-5" />
                                <span className="font-semibold">Team ID: {profile.team_id.slice(-6)}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-amber-500">
                                <Users className="h-5 w-5" />
                                <span className="font-semibold">Not in a team yet</span>
                            </div>
                        )}
                        <Button variant="link" className="px-0 h-auto mt-2 text-primary" asChild>
                            <Link href="/dashboard/participant/team">
                                {profile?.team_id ? 'Manage Team' : 'Find teammates'} &rarr;
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Project Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-blue-500">
                            <Clock className="h-5 w-5" />
                            <span className="font-semibold">
                                {currentPhase?.featureFlags?.allowSubmission ? 'Ready for submission' : 'Awaiting Next Phase'}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Submission gating is {currentPhase?.featureFlags?.allowSubmission ? 'Active' : 'Locked'}.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5 text-primary" />
                            Live Announcements
                        </CardTitle>
                        <CardDescription>Latest updates from the hackathon organizers.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/dashboard/announcements">View All</Link>
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : announcements.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground text-sm">No announcements yet.</p>
                    ) : (
                        announcements.slice(0, 3).map((ann) => (
                            <div key={ann.id} className="border-l-4 border-primary pl-4 py-2 bg-muted/30 rounded-r-md transition-all hover:bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">{ann.title}</h4>
                                    {ann.targetTrack !== 'all' && <Badge variant="secondary" className="text-[10px]">{ann.targetTrack}</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ann.body}</p>
                                <p className="text-xs text-muted-foreground mt-2">{formatTimestamp(ann.timestamp)}</p>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
