'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Megaphone, Loader2, Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

import { setDApi } from '@/lib/api/set-d';

interface Announcement {
    id: string;
    title: string;
    body: string;
    targetTrack: string;
    timestamp?: { seconds: number; nanoseconds: number } | string | null;
}

export default function AnnouncementsPage() {
    const { profile } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', targetTrack: 'all' });

    // Fetch announcements from API (works for all authenticated users)
    const fetchAnnouncements = async () => {
        try {
            console.log('[Announcements] Fetching announcements from API...');
            const items = await setDApi.listAnnouncements();
            console.log(`[Announcements] Loaded ${items.length} announcements from API`, items);
            setAnnouncements(items);
            setLoading(false);
        } catch (error: any) {
            console.error('[Announcements] Error loading announcements from API:', error);
            toast.error(`Failed to load announcements: ${error.message}`);
            setLoading(false);
        }
    };

    // Setup effect to load announcements and set up real-time updates
    useEffect(() => {
        // Initial load from API
        fetchAnnouncements();

        // Try to set up real-time listener from Firestore as well (for better UX if available)
        try {
            const announcementsQuery = query(
                collection(db, 'announcements'),
                orderBy('timestamp', 'desc')
            );

            const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
                const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Announcement));
                console.log(`[Announcements] Real-time update: ${items.length} announcements`, items);
                setAnnouncements(items);
            }, (error) => {
                console.warn('[Announcements] Firestore real-time listener unavailable (this is OK):', error.message);
                // This is OK - we'll use API polling as fallback
            });

            return () => unsubscribe();
        } catch (error) {
            console.warn('[Announcements] Could not set up Firestore listener:', error);
            // This is OK - we have API as fallback
        }
    }, []);

    const rawRole = profile?.role?.toLowerCase();
    const isAdmin = rawRole === 'admin' || rawRole === 'organizer' || rawRole === 'super_admin';
    const role = isAdmin
        ? 'admin'
        : rawRole === 'judge'
            ? 'judge'
            : rawRole === 'volunteer'
                ? 'volunteer'
                : 'participant';

    // Create announcement via backend API (admin only)
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAnnouncement.title.trim() || !newAnnouncement.body.trim()) {
            toast.error('Please fill in the title and body.');
            return;
        }
        setCreating(true);
        try {
            console.log('[Announcements] Creating announcement:', newAnnouncement);
            const response = await setDApi.createAnnouncement({
                title: newAnnouncement.title.trim(),
                body: newAnnouncement.body.trim(),
                targetTrack: newAnnouncement.targetTrack,
            });
            console.log('[Announcements] Announcement created successfully:', response);
            toast.success('Announcement published!');
            setNewAnnouncement({ title: '', body: '', targetTrack: 'all' });
            setCreateOpen(false);
            
            // Refresh announcements list after a brief delay to ensure database update
            setTimeout(() => {
                fetchAnnouncements();
            }, 500);
        } catch (error: any) {
            console.error('[Announcements] Error creating announcement:', error);
            console.error('[Announcements] Error details:', {
                message: error.message,
                status: error.status,
                data: error.data
            });
            toast.error(error.data?.detail || error.message || 'Failed to create announcement');
        } finally {
            setCreating(false);
        }
    };

    // Delete announcement via backend API (admin only)
    const handleDelete = async (id: string) => {
        setDeleting(id);
        try {
            console.log('[Announcements] Deleting announcement:', id);
            await setDApi.deleteAnnouncement(id);
            console.log('[Announcements] Announcement deleted successfully');
            toast.success('Announcement deleted.');
            
            // Refresh announcements list after a brief delay to ensure database update
            setTimeout(() => {
                fetchAnnouncements();
            }, 500);
        } catch (error: any) {
            console.error('[Announcements] Error deleting announcement:', error);
            toast.error(error.data?.detail || error.message || 'Failed to delete announcement');
        } finally {
            setDeleting(null);
        }
    };

    // Format timestamp for display
    const formatTime = (ts: Announcement['timestamp']) => {
        if (!ts) return '';
        if (typeof ts === 'string') {
            return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        }
        if (typeof ts === 'object' && 'seconds' in ts) {
            return new Date(ts.seconds * 1000).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        }
        return '';
    };

    return (
        <DashboardLayout role={role ?? 'participant'}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
                        <p className="text-muted-foreground">Live event updates for everyone on your team.</p>
                    </div>

                    {/* Admin-only: Create Announcement button */}
                    {isAdmin && (
                        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="w-4 h-4 mr-2" />New Announcement
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[520px]">
                                <DialogHeader>
                                    <DialogTitle>Create Announcement</DialogTitle>
                                    <DialogDescription>
                                        This will be visible to all participants, judges, and volunteers in real-time.
                                    </DialogDescription>
                                </DialogHeader>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input
                                            value={newAnnouncement.title}
                                            onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                                            placeholder="e.g. Submission deadline extended by 2 hours!"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Body</Label>
                                        <Textarea
                                            value={newAnnouncement.body}
                                            onChange={e => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                                            placeholder="Provide the full details of the announcement..."
                                            className="min-h-[120px]"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Target Audience</Label>
                                        <Select
                                            value={newAnnouncement.targetTrack}
                                            onValueChange={v => setNewAnnouncement({ ...newAnnouncement, targetTrack: v })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Tracks (Everyone)</SelectItem>
                                                <SelectItem value="AI">AI Track</SelectItem>
                                                <SelectItem value="Web">Web Track</SelectItem>
                                                <SelectItem value="Blockchain">Blockchain Track</SelectItem>
                                                <SelectItem value="Open Innovation">Open Innovation Track</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" className="w-full" disabled={creating}>
                                            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
                                            Publish Announcement
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />
                            <CardTitle>Latest Announcements</CardTitle>
                        </div>
                        <Badge variant="secondary">Visible to all roles</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading announcements...
                            </div>
                        ) : announcements.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No announcements are available right now.</p>
                                {isAdmin && <p className="text-xs mt-1">Click &quot;New Announcement&quot; to publish one.</p>}
                            </div>
                        ) : (
                            announcements.map((announcement) => (
                                <div key={announcement.id} className="rounded-xl border border-muted p-4 transition-colors hover:bg-muted/30">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold">{announcement.title}</h3>
                                                {announcement.targetTrack && announcement.targetTrack !== 'all' ? (
                                                    <Badge variant="outline">{announcement.targetTrack}</Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="text-[10px]">All</Badge>
                                                )}
                                            </div>
                                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{announcement.body}</p>
                                            {announcement.timestamp && (
                                                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTime(announcement.timestamp)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Admin-only: Delete button */}
                                        {isAdmin && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleDelete(announcement.id)}
                                                disabled={deleting === announcement.id}
                                            >
                                                {deleting === announcement.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
