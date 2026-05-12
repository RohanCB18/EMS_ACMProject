"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { setDApi, MentorProfile } from "@/lib/api/set-d";
import { toast } from "sonner";
import { useEffect } from "react";

export default function MentorsPage() {
    const [mentors, setMentors] = useState<MentorProfile[]>([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchMentors();
    }, []);

    const totalSessions = mentors.reduce((acc, m) => acc + (m.availability?.filter(s => s.booked).length || 0), 0);

    if (loading) return <div>Loading mentors...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Mentor System</h1>
                <Button>Add New Mentor</Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mentors</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{mentors.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Slots Booked</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalSessions}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.8/5</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">25m</div>
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
                                            {mentor.display_name}
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
                                        <Badge variant="outline">
                                            {mentor.availability?.some(s => !s.booked) ? "Available" : "Full"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{mentor.availability?.filter(s => s.booked).length || 0}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Manage Slots</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {mentors.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No mentors found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
