"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

import { setDApi, SupportTicket, TicketStatus, TicketPriority } from "@/lib/api/set-d";
import { toast } from "sonner";
import { useEffect } from "react";

export default function HelpdeskPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTickets = async () => {
        try {
            const data = await setDApi.listTickets();
            setTickets(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
        try {
            await setDApi.updateTicket(ticketId, { status });
            toast.success(`Ticket ${status} successfully`);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to update ticket");
        }
    };

    const stats = {
        open: tickets.filter(t => t.status === "open").length,
        urgent: tickets.filter(t => t.priority === "urgent").length,
        inProgress: tickets.filter(t => t.status === "in_progress").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
    };

    if (loading) return <div>Loading tickets...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Helpdesk Dashboard</h1>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-3 py-1 text-sm">Open: {stats.open}</Badge>
                    <Badge variant="outline" className="px-3 py-1 text-sm">Urgent: {stats.urgent}</Badge>
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
                        <div className="text-3xl font-bold">{stats.urgent.toString().padStart(2, '0')}</div>
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
                        <div className="text-3xl font-bold">{stats.inProgress.toString().padStart(2, '0')}</div>
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
                        <div className="text-3xl font-bold">{stats.resolved.toString().padStart(2, '0')}</div>
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
                        <div className="text-3xl font-bold">{tickets.length}</div>
                        <p className="text-xs text-muted-foreground uppercase">Total Tickets</p>
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
                            {tickets.map((ticket) => (
                                <TableRow key={ticket.ticket_id}>
                                    <TableCell className="font-mono text-xs">{ticket.ticket_id?.substring(0, 8)}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{ticket.title}</div>
                                        <div className="text-xs text-muted-foreground">{ticket.category}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">{ticket.raised_by_uid}</TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.priority === "urgent" ? "destructive" : ticket.priority === "high" ? "secondary" : "outline"}>
                                            {ticket.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.status === "open" ? "default" : ticket.status === "in_progress" ? "secondary" : "outline"}>
                                            {ticket.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {ticket.status === "open" && (
                                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(ticket.ticket_id!, "in_progress")}>Assign</Button>
                                        )}
                                        {ticket.status !== "resolved" && (
                                            <Button variant="ghost" size="sm" onClick={() => handleUpdateStatus(ticket.ticket_id!, "resolved")}>Resolve</Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {tickets.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No tickets found</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
