"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

const MOCK_TICKETS = [
    { id: "T1", title: "WiFi connection issues", user: "Team Rocket", priority: "High", status: "Open", category: "Technical" },
    { id: "T2", title: "Request for extra extension cord", user: "Super Coders", priority: "Low", status: "In Progress", category: "Logistics" },
    { id: "T3", title: "API key not working", user: "Dev Ops", priority: "Urgent", status: "Open", category: "Technical" },
    { id: "T4", title: "Where is the canteen?", user: "Newbies", priority: "Medium", status: "Resolved", category: "Queries" },
];

export default function HelpdeskPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Helpdesk Dashboard</h1>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-3 py-1 text-sm">Open: 12</Badge>
                    <Badge variant="outline" className="px-3 py-1 text-sm">Urgent: 3</Badge>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-red-200 bg-red-50/30 dark:bg-red-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            <Badge variant="destructive">Critical</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">03</div>
                        <p className="text-xs text-muted-foreground uppercase">Urgent Tickets</p>
                    </CardContent>
                </Card>
                <Card className="border-orange-200 bg-orange-50/30 dark:bg-orange-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <Badge className="bg-orange-500">In Progress</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">08</div>
                        <p className="text-xs text-muted-foreground uppercase">Active Tasks</p>
                    </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50/30 dark:bg-green-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <Badge className="bg-green-500">Resolved</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">45</div>
                        <p className="text-xs text-muted-foreground uppercase">Total Resolved</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <MessageCircle className="w-5 h-5 text-blue-600" />
                            <Badge variant="outline">Total</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">56</div>
                        <p className="text-xs text-muted-foreground uppercase">Avg. Response Time</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Active Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Issue</TableHead>
                                <TableHead>Raised By</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {MOCK_TICKETS.map((ticket) => (
                                <TableRow key={ticket.id}>
                                    <TableCell className="font-mono">{ticket.id}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{ticket.title}</div>
                                        <div className="text-xs text-muted-foreground">{ticket.category}</div>
                                    </TableCell>
                                    <TableCell>{ticket.user}</TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.priority === "Urgent" ? "destructive" : ticket.priority === "High" ? "secondary" : "outline"}>
                                            {ticket.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.status === "Open" ? "default" : ticket.status === "In Progress" ? "secondary" : "outline"}>
                                            {ticket.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm">Assign</Button>
                                        <Button variant="ghost" size="sm">Resolve</Button>
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
