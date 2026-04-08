"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Calendar, GraduationCap, Users } from "lucide-react";
import { setDApi, MentorProfile } from "@/lib/api/set-d";
import { toast } from "sonner";

export default function MentorsPage() {
    const [mentors, setMentors] = useState<MentorProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [addOpen, setAddOpen] = useState(false);
    const [slotsOpen, setSlotsOpen] = useState<string | null>(null);
    const [newMentor, setNewMentor] = useState({ display_name: "", expertise: "", bio: "" });

    const fetchMentors = async () => {
        try {
            const data = await setDApi.listMentors();
            setMentors(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch mentors");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMentors(); }, []);

    const handleAddMentor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMentor.display_name.trim()) return;
        try {
            await setDApi.createMentor({
                uid: "",
                display_name: newMentor.display_name.trim(),
                expertise: newMentor.expertise.split(",").map(s => s.trim()).filter(Boolean),
                bio: newMentor.bio.trim(),
                availability: [],
            });
            toast.success("Mentor added successfully");
            setNewMentor({ display_name: "", expertise: "", bio: "" });
            setAddOpen(false);
            fetchMentors();
        } catch (error: any) {
            toast.error(error.message || "Failed to add mentor");
        }
    };

    const handleDeleteMentor = async (uid: string, name: string) => {
        if (!confirm(`Delete mentor "${name}"?`)) return;
        try {
            await setDApi.deleteMentor(uid);
            toast.success(`Mentor "${name}" deleted`);
            fetchMentors();
        } catch (error: any) {
            toast.error(error.message || "Failed to delete mentor");
        }
    };

    const totalSlots = mentors.reduce((acc, m) => acc + (m.availability?.length || 0), 0);
    const bookedSlots = mentors.reduce((acc, m) => acc + (m.availability?.filter(s => s.booked).length || 0), 0);
    const availableMentors = mentors.filter(m => m.availability?.some(s => !s.booked)).length;

    if (loading) return <div className="p-8 text-center">Loading mentors...</div>;

    const selectedMentor = slotsOpen ? mentors.find(m => m.uid === slotsOpen) : null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Mentor System</h1>
                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" />Add New Mentor</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Add New Mentor</DialogTitle></DialogHeader>
                        <form onSubmit={handleAddMentor} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Display Name</Label>
                                <Input value={newMentor.display_name} onChange={e => setNewMentor({ ...newMentor, display_name: e.target.value })} placeholder="Dr. Jane Smith" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Expertise (comma-separated)</Label>
                                <Input value={newMentor.expertise} onChange={e => setNewMentor({ ...newMentor, expertise: e.target.value })} placeholder="AI/ML, Cloud, Security" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Bio</Label>
                                <Textarea value={newMentor.bio} onChange={e => setNewMentor({ ...newMentor, bio: e.target.value })} placeholder="Brief description of the mentor..." />
                            </div>
                            <Button type="submit" className="w-full">Create Mentor</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mentors.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Now</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{availableMentors}</div>
                        <p className="text-xs text-muted-foreground">with open slots</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Slots Booked</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bookedSlots}</div>
                        <p className="text-xs text-muted-foreground">of {totalSlots} total slots</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Booking Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSlots > 0 ? ((bookedSlots / totalSlots) * 100).toFixed(0) : 0}%</div>
                        <p className="text-xs text-muted-foreground">slot utilization</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Mentor Directory</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mentor</TableHead>
                                <TableHead>Expertise</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Sessions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mentors.map((mentor) => (
                                <TableRow key={mentor.uid}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{mentor.display_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div>{mentor.display_name}</div>
                                                {mentor.bio && <div className="text-xs text-muted-foreground line-clamp-1">{mentor.bio}</div>}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {mentor.expertise.map(exp => (
                                                <Badge key={exp} variant="secondary" className="text-[10px]">{exp}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={mentor.availability?.some(s => !s.booked) ? "outline" : "destructive"}>
                                            {mentor.availability?.some(s => !s.booked) ? "Available" : mentor.availability?.length ? "Full" : "No Slots"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{mentor.availability?.filter(s => s.booked).length || 0} / {mentor.availability?.length || 0}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Dialog open={slotsOpen === mentor.uid} onOpenChange={(open) => setSlotsOpen(open ? mentor.uid : null)}>
                                            <DialogTrigger asChild>
                                                <Button variant="ghost" size="sm">Manage Slots</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader><DialogTitle>Slots — {mentor.display_name}</DialogTitle></DialogHeader>
                                                {selectedMentor?.availability && selectedMentor.availability.length > 0 ? (
                                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                        {selectedMentor.availability.map((slot, i) => (
                                                            <div key={i} className={`flex justify-between items-center p-3 border rounded-lg ${slot.booked ? 'bg-red-50 dark:bg-red-900/10' : 'bg-green-50 dark:bg-green-900/10'}`}>
                                                                <div className="text-sm">
                                                                    <div className="font-medium">{slot.start} — {slot.end}</div>
                                                                    {slot.booked_by_team_id && <div className="text-xs text-muted-foreground">Team: {slot.booked_by_team_id}</div>}
                                                                </div>
                                                                <Badge variant={slot.booked ? "destructive" : "outline"}>
                                                                    {slot.booked ? "Booked" : "Open"}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground py-4 text-center">No slots configured for this mentor.</p>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-red-600" onClick={() => handleDeleteMentor(mentor.uid, mentor.display_name)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {mentors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No mentors found. Click "Add New Mentor" to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
