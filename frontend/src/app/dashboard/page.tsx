'use client';

/**
 * Sub-Module 1: Personal Participant Dashboard
 * Route: /dashboard
 *
 * Displays:
 * - Registration status card
 * - Team details (name, code, members)
 * - Event timeline (PhaseStepper, real-time via onSnapshot)
 * - Announcements feed (real-time via onSnapshot, filtered by track)
 */

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PhaseStepper, type Phase } from '@/components/PhaseStepper';
import {
    CheckCircle2,
    Clock,
    XCircle,
    Copy,
    Check,
    Users,
    Megaphone,
    CalendarDays,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Announcement {
    id: string;
    title: string;
    body: string;
    targetTrack: string;
    timestamp: { seconds: number; nanoseconds: number } | null;
}

interface TeamMember {
    uid: string;
    display_name: string;
    email: string;
}

interface Team {
    id: string;
    name: string;
    teamCode: string;
    members: TeamMember[];
    track?: string;
}

// ──────────────────────────────────────────────
// Registration Status Card
// ──────────────────────────────────────────────

type RegistrationStatus = 'Registered' | 'Pending' | 'Rejected';

function StatusCard({ status }: { status: RegistrationStatus }) {
    const config = {
        Registered: {
            icon: CheckCircle2,
            color: 'text-green-600',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
            badge: 'bg-green-100 text-green-800 border-green-200',
            message: "You're all set for the event.",
        },
        Pending: {
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            badge: 'bg-amber-100 text-amber-800 border-amber-200',
            message: 'Your registration is under review.',
        },
        Rejected: {
            icon: XCircle,
            color: 'text-red-600',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            badge: 'bg-red-100 text-red-800 border-red-200',
            message: 'Your registration was not approved. Contact organizers.',
        },
    };

    const c = config[status];
    const Icon = c.icon;

    return (
        <Card className={`${c.border} border-2`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Registration Status</CardTitle>
            </CardHeader>
            <CardContent>
                <div className={`flex items-center gap-3 p-3 rounded-lg ${c.bg}`}>
                    <Icon className={`h-6 w-6 ${c.color} flex-shrink-0`} />
                    <div>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${c.badge}`}>
                            {status}
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">{c.message}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ──────────────────────────────────────────────
// Team Details Card
// ──────────────────────────────────────────────

function TeamCard({ team }: { team: Team | null }) {
    const [copied, setCopied] = useState(false);

    const copyCode = () => {
        if (!team) return;
        navigator.clipboard.writeText(team.teamCode);
        setCopied(true);
        toast.success('Team code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    if (!team) {
        return (
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" /> My Team
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">You have not joined a team yet.</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                        <a href="/dashboard/workspace">Join or Create Team</a>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4" /> {team.name}
                        </CardTitle>
                        {team.track && (
                            <Badge variant="secondary" className="mt-1 text-xs">{team.track}</Badge>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Team Code</p>
                        <button
                            onClick={copyCode}
                            className="flex items-center gap-1.5 font-mono text-sm font-semibold bg-muted px-2.5 py-1 rounded-md hover:bg-muted/80 transition-colors"
                        >
                            {team.teamCode}
                            {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Members ({team.members.length})
                </p>
                <div className="space-y-2">
                    {team.members.map((member) => (
                        <div key={member.uid} className="flex items-center gap-2.5">
                            <Avatar className="h-7 w-7">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {member.display_name?.[0]?.toUpperCase() ?? '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="text-sm font-medium leading-none">{member.display_name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ──────────────────────────────────────────────
// Announcements Feed
// ──────────────────────────────────────────────

function AnnouncementFeed({ announcements, loading }: { announcements: Announcement[]; loading: boolean }) {
    const formatTime = (ts: Announcement['timestamp']) => {
        if (!ts) return 'Just now';
        const d = new Date(ts.seconds * 1000);
        return d.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5" /> Announcements
                </CardTitle>
                <CardDescription>Real-time updates from the organizers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading announcements...</span>
                    </div>
                ) : announcements.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No announcements yet. Check back soon.</p>
                ) : (
                    announcements.map((a, i) => (
                        <div
                            key={a.id}
                            className={`border-l-4 pl-4 py-2 rounded-r-md transition-colors ${i === 0 ? 'border-primary bg-muted/30' : 'border-muted-foreground/30'}`}
                        >
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                <h4 className="font-semibold text-sm">{a.title}</h4>
                                {a.targetTrack !== 'all' && (
                                    <Badge variant="outline" className="text-xs flex-shrink-0">{a.targetTrack}</Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{a.body}</p>
                            <p className="text-xs text-muted-foreground mt-2">{formatTime(a.timestamp)}</p>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

// ──────────────────────────────────────────────
// Main Dashboard Page
// ──────────────────────────────────────────────

export default function DashboardPage() {
    const { profile, loading: authLoading } = useAuth();
    const router = useRouter();

    // Redirect admins to admin dashboard
    useEffect(() => {
        const role = profile?.role?.toLowerCase();
        if (!authLoading && (role === 'admin' || role === 'organizer' || role === 'super_admin')) {
            router.push('/dashboard/admin/overview');
        }
    }, [profile, authLoading, router]);

    const [phases, setPhases] = useState<Phase[]>([]);
    const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);
    const [team, setTeam] = useState<Team | null>(null);

    const userTrack = team?.track ?? null;

    // Real-time phases listener
    useEffect(() => {
        const phasesQuery = query(collection(db, 'phases'), orderBy('order'));
        const unsub = onSnapshot(phasesQuery, (snap) => {
            const phasesData: Phase[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Phase));
            setPhases(phasesData);
            const active = phasesData.find((p) => p.isActive);
            setCurrentPhaseId(active?.id ?? null);
        }, (err) => {
            console.error('Phases listener error:', err);
        });
        return () => unsub();
    }, []);

    // Real-time announcements listener
    useEffect(() => {
        setAnnouncementsLoading(true);
        const announcementsQuery = query(
            collection(db, 'announcements'),
            orderBy('timestamp', 'desc')
        );
        const unsub = onSnapshot(announcementsQuery, (snap) => {
            const all: Announcement[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement));
            // Filter by track: show "all" or user's track
            const filtered = all.filter(
                (a) => a.targetTrack === 'all' || !userTrack || a.targetTrack === userTrack
            );
            setAnnouncements(filtered);
            setAnnouncementsLoading(false);
        }, (err) => {
            console.error('Announcements listener error:', err);
            setAnnouncementsLoading(false);
        });
        return () => unsub();
    }, [userTrack]);

    // Load team data (one-time, when profile is available)
    useEffect(() => {
        if (!profile?.team_id) return;
        const teamUnsub = onSnapshot(
            collection(db, 'teams'),
            (snap) => {
                const doc = snap.docs.find((d) => d.id === profile.team_id);
                if (doc) setTeam({ id: doc.id, ...doc.data() } as Team);
            }
        );
        return () => teamUnsub();
    }, [profile?.team_id]);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    const registrationStatus: RegistrationStatus =
        profile ? 'Registered' : 'Pending';

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight">
                    Welcome back, {profile?.display_name?.split(' ')[0] ?? 'Participant'}! 👋
                </h2>
                <p className="text-muted-foreground mt-1">Here's your hackathon overview.</p>
            </div>

            {/* Top row: status + team */}
            <div className="grid gap-4 md:grid-cols-2">
                <StatusCard status={registrationStatus} />
                <TeamCard team={team} />
            </div>

            {/* Event Timeline */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5" /> Event Timeline
                    </CardTitle>
                    <CardDescription>
                        {currentPhaseId
                            ? `Current phase: ${phases.find((p) => p.id === currentPhaseId)?.name ?? '—'}`
                            : 'No active phase set'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {phases.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Phase information will appear here once the event begins.</p>
                    ) : (
                        <PhaseStepper phases={phases} currentPhaseId={currentPhaseId} />
                    )}
                </CardContent>
            </Card>

            {/* Announcements */}
            <AnnouncementFeed announcements={announcements} loading={announcementsLoading} />
        </div>
    );
}
