"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Globe, Trophy, Building2, Plus } from "lucide-react";
import { setDApi, Track, Sponsor } from "@/lib/api/set-d";
import { toast } from "sonner";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function SponsorsPage() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(true);

    const [newTrack, setNewTrack] = useState({ track_id: "", name: "", description: "", sponsor: "" });
    const [newSponsor, setNewSponsor] = useState({ name: "", tier: "Gold", industry: "" });

    const fetchData = async () => {
        try {
            const [tracksData, sponsorsData] = await Promise.all([
                setDApi.listTracks(),
                setDApi.listSponsors()
            ]);
            setTracks(tracksData);
            setSponsors(sponsorsData);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddTrack = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setDApi.createTrack({
                ...newTrack,
                problem_statements: []
            } as Track);
            toast.success("Track created successfully");
            setNewTrack({ track_id: "", name: "", description: "", sponsor: "" });
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to create track");
        }
    };

    const handleAddSponsor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setDApi.addSponsor({
                ...newSponsor,
                metrics: { engagement: 'medium', teams_interacted: 0 }
            } as Sponsor);
            toast.success("Sponsor added successfully");
            setNewSponsor({ name: "", tier: "Gold", industry: "" });
            fetchData();
        } catch (error: any) {
            toast.error(error.message || "Failed to add sponsor");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Sponsors & Tracks</h1>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Add Track</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create New Track</DialogTitle></DialogHeader>
                        <form onSubmit={handleAddTrack} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Track ID</Label>
                                <Input value={newTrack.track_id} onChange={e => setNewTrack({ ...newTrack, track_id: e.target.value })} placeholder="e.g. ai-ml" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={newTrack.name} onChange={e => setNewTrack({ ...newTrack, name: e.target.value })} placeholder="e.g. Generative AI" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Sponsor Name</Label>
                                <Input value={newTrack.sponsor} onChange={e => setNewTrack({ ...newTrack, sponsor: e.target.value })} placeholder="e.g. Google Cloud" />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={newTrack.description} onChange={e => setNewTrack({ ...newTrack, description: e.target.value })} required />
                            </div>
                            <Button type="submit" className="w-full">Create Track</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="tracks" className="w-full">
                <TabsList>
                    <TabsTrigger value="tracks">Event Tracks</TabsTrigger>
                    <TabsTrigger value="sponsors">Manage Sponsors</TabsTrigger>
                </TabsList>

                <TabsContent value="tracks" className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tracks.map(track => (
                            <Card key={track.track_id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
                                        <Badge variant="secondary">{track.track_id.toUpperCase()}</Badge>
                                    </div>
                                    <CardTitle>{track.name}</CardTitle>
                                    <CardDescription>Sponsored by {track.sponsor || "TBA"}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm mb-4 line-clamp-3">{track.description}</p>
                                    <div className="text-xs text-muted-foreground">{track.enrolled_teams || 0} Teams Enrolled</div>
                                </CardContent>
                            </Card>
                        ))}
                        {tracks.length === 0 && (
                            <div className="col-span-full text-center py-10 border-2 border-dashed rounded-xl text-muted-foreground">
                                No tracks defined yet.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="sponsors" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Partner Directory</CardTitle>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" /> Add Sponsor</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add New Partner</DialogTitle></DialogHeader>
                                    <form onSubmit={handleAddSponsor} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Sponsor Name</Label>
                                            <Input value={newSponsor.name} onChange={e => setNewSponsor({ ...newSponsor, name: e.target.value })} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Tier</Label>
                                            <select className="w-full p-2 border rounded-md" value={newSponsor.tier} onChange={e => setNewSponsor({ ...newSponsor, tier: e.target.value })}>
                                                <option value="Gold">Gold</option>
                                                <option value="Silver">Silver</option>
                                                <option value="Bronze">Bronze</option>
                                                <option value="Foundational">Foundational</option>
                                                <option value="In-Kind">In-Kind</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Industry / Domain</Label>
                                            <Input value={newSponsor.industry} onChange={e => setNewSponsor({ ...newSponsor, industry: e.target.value })} placeholder="e.g. Fintech" />
                                        </div>
                                        <Button type="submit" className="w-full">Add Sponsor</Button>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {sponsors.map(sponsor => (
                                    <div key={sponsor.name} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <div className="font-semibold">{sponsor.name}</div>
                                                <div className="text-xs text-muted-foreground">{sponsor.tier} Tier • {sponsor.industry}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline">Active</Badge>
                                        </div>
                                    </div>
                                ))}
                                {sponsors.length === 0 && (
                                    <div className="col-span-full text-center py-4 text-muted-foreground italic">
                                        No sponsors added yet.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
