'use client';

/**
 * Sub-Module 4 (Admin): Announcement Manager
 * Route: /dashboard/admin/announcements
 *
 * Features:
 *  - Create announcement (title, body, targetTrack)
 *  - List all announcements with delete button
 *  - Redirects non-admins to /dashboard
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { setDApi, Announcement } from '@/lib/api/set-d';
import { useAuth } from '@/components/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Megaphone, Plus, Trash2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

const TRACKS = ['all', 'AI', 'Web', 'Blockchain', 'Open Innovation'] as const;

const TRACK_LABELS: Record<string, string> = {
    all: 'All Tracks',
    AI: 'AI',
    Web: 'Web',
    Blockchain: 'Blockchain',
    'Open Innovation': 'Open Innovation',
};

const TRACK_COLORS: Record<string, string> = {
    all: 'bg-muted text-muted-foreground',
    AI: 'bg-blue-100 text-blue-800 border-blue-200',
    Web: 'bg-green-100 text-green-800 border-green-200',
    Blockchain: 'bg-purple-100 text-purple-800 border-purple-200',
    'Open Innovation': 'bg-orange-100 text-orange-800 border-orange-200',
};

// ──────────────────────────────────────────────
// Create Announcement Form (in Dialog)
// ──────────────────────────────────────────────

function CreateAnnouncementDialog({
    user,
    onCreated,
}: {
    user: { getIdToken: () => Promise<string> } | null;
    onCreated: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [track, setTrack] = useState<string>('all');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Title and body are required.');
            return;
        }
        setLoading(true);
        try {
            await setDApi.createAnnouncement({
                title: title.trim(),
                body: body.trim(),
                targetTrack: track
            });
            toast.success('Announcement published!');
            setTitle('');
            setBody('');
            setTrack('all');
            setOpen(false);
            onCreated();
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            toast.error(`Error: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                    <DialogDescription>
                        Publish a message to participants. You can target a specific track or broadcast to all.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="ann-title">Title</Label>
                        <Input
                            id="ann-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Important: Submission Deadline Extended"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="ann-body">Message</Label>
                        <Textarea
                            id="ann-body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write your announcement here..."
                            className="min-h-[100px] resize-y"
                            disabled={loading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Target Track</Label>
                        <Select value={track} onValueChange={setTrack} disabled={loading}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select track" />
                            </SelectTrigger>
                            <SelectContent>
                                {TRACKS.map((t) => (
                                    <SelectItem key={t} value={t}>{TRACK_LABELS[t]}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Publish
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ──────────────────────────────────────────────
// Announcement List Item
// ──────────────────────────────────────────────

function AnnouncementItem({
    announcement,
    onDelete,
    deleting,
}: {
    announcement: Announcement;
    onDelete: (id: string) => void;
    deleting: string | null;
}) {
    const formatTime = (ts: Announcement['timestamp']) => {
        if (!ts) return 'Just now';
        return new Date(ts.seconds * 1000).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    return (
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h4 className="font-semibold text-sm">{announcement.title}</h4>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ${TRACK_COLORS[announcement.targetTrack] ?? TRACK_COLORS.all}`}>
                        {TRACK_LABELS[announcement.targetTrack] ?? announcement.targetTrack}
                    </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{announcement.body}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{formatTime(announcement.timestamp)}</p>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete(announcement.id)}
                disabled={deleting === announcement.id}
            >
                {deleting === announcement.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Trash2 className="h-4 w-4" />
                )}
                <span className="sr-only">Delete</span>
            </Button>
        </div>
    );
}

// ──────────────────────────────────────────────
// Main Admin Announcements Page
// ──────────────────────────────────────────────

export default function AdminAnnouncementsPage() {
    const { profile, user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Auth guard
    useEffect(() => {
        if (!authLoading && profile?.role !== 'organizer' && profile?.role !== 'super_admin') {
            router.replace('/dashboard');
        }
    }, [authLoading, profile, router]);

    // Real-time announcements listener
    useEffect(() => {
        setAnnouncementsLoading(true);
        const announcementsQ = query(
            collection(db, 'announcements'),
            orderBy('timestamp', 'desc')
        );
        const unsub = onSnapshot(announcementsQ, (snap) => {
            setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Announcement)));
            setAnnouncementsLoading(false);
        }, (err) => {
            console.error('Announcements error:', err);
            setAnnouncementsLoading(false);
        });
        return () => unsub();
    }, [refreshKey]);

    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            await setDApi.deleteAnnouncement(id);
            toast.success('Announcement deleted.');
        } catch (e: any) {
            toast.error(`Error: ${e.message}`);
        } finally {
            setDeleting(null);
        }
    };

    if (authLoading || (!authLoading && profile?.role !== 'organizer' && profile?.role !== 'super_admin')) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                {authLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldAlert className="h-8 w-8" />
                        <p className="text-sm">Access denied. Redirecting...</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Megaphone className="h-6 w-6" /> Announcements
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Broadcast messages to participants. {announcements.length > 0 && `${announcements.length} total.`}
                    </p>
                </div>
                <CreateAnnouncementDialog
                    user={user}
                    onCreated={() => setRefreshKey((k) => k + 1)}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Announcements</CardTitle>
                    <CardDescription>Real-time updates — changes reflect instantly for participants.</CardDescription>
                </CardHeader>
                <CardContent>
                    {announcementsLoading ? (
                        <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm">Loading...</span>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="py-12 text-center">
                            <Megaphone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No announcements yet. Create one to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {announcements.map((a) => (
                                <AnnouncementItem
                                    key={a.id}
                                    announcement={a}
                                    onDelete={handleDelete}
                                    deleting={deleting}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
