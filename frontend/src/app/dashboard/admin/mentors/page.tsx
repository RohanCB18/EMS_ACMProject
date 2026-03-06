"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const MOCK_MENTORS = [
    { uid: "m1", name: "Alice Johnson", expertise: ["AI/ML", "Python"], availability: "Available", sessions: 5 },
    { uid: "m2", name: "Bob Smith", expertise: ["React", "TypeScript", "Node.js"], availability: "Busy", sessions: 12 },
    { uid: "m3", name: "Charlie Davis", expertise: ["Blockchain", "Solidity"], availability: "Available", sessions: 3 },
    { uid: "m4", name: "Diana Prince", expertise: ["UX Design", "Figma"], availability: "Available", sessions: 8 },
];

export default function MentorsPage() {
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
                        <div className="text-2xl font-bold">24</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Slots Booked</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">86</div>
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
                                <TableHead>Total Sessions</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_MENTORS.map((mentor) => (
                                <TableRow key={mentor.uid}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{mentor.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            {mentor.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {mentor.expertise.map(exp => (
                                                <Badge key={exp} variant="secondary">{exp}</Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={mentor.availability === "Available" ? "outline" : "outline"}>
                                            {mentor.availability}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{mentor.sessions}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Manage Slots</Button>
                                        <Button variant="ghost" size="sm">View History</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
