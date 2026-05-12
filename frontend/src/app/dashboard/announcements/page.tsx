'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Loader2 } from 'lucide-react';

interface Announcement {
    id: string;
    title: string;
    body: string;
    targetTrack: string;
    timestamp?: { seconds: number; nanoseconds: number } | null;
}

export default function AnnouncementsPage() {
    const { profile } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const announcementsQuery = query(
            collection(db, 'announcements'),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
            const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Announcement));
            setAnnouncements(items);
            setLoading(false);
        }, () => {
            setLoading(false);
        });

        return () => unsubscribe();
    }, [profile?.team_id]);

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
                    <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
                    <p className="text-muted-foreground">Live event updates for everyone on your team.</p>
                </div>
                <Card>
                    <CardHeader className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Megaphone className="h-5 w-5" />
                            <CardTitle>Latest Announcements</CardTitle>
                        </div>
                        <Badge variant="secondary">Visible to all roles</Badge>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading announcements...
                            </div>
                        ) : announcements.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No announcements are available right now. Check back soon.</p>
                        ) : (
                            announcements.map((announcement) => (
                                <div key={announcement.id} className="rounded-xl border border-muted p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="font-semibold">{announcement.title}</h3>
                                        {announcement.targetTrack && announcement.targetTrack !== 'all' ? (
                                            <Badge>{announcement.targetTrack}</Badge>
                                        ) : null}
                                    </div>
                                    <p className="mt-2 text-sm text-muted-foreground">{announcement.body}</p>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
