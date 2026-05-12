"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { setDApi, SupportTicket, TicketStatus } from "@/lib/api/set-d";
import { toast } from "sonner";

const priorityColor: Record<string, string> = {
    low: "bg-slate-400",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-600",
};

export default function AdminHelpdeskPage() {
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

    useEffect(() => { fetchTickets(); }, []);

    const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
        try {
            await setDApi.updateTicket(ticketId, { status });
            toast.success(
                status === "resolved"
                    ? "Ticket marked as resolved"
                    : "Ticket assigned successfully"
            );
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to update ticket");
        }
    };

    const stats = {
        open: tickets.filter((t) => t.status === "open").length,
        urgent: tickets.filter((t) => t.priority === "urgent").length,
        inProgress: tickets.filter((t) => t.status === "in_progress").length,
        resolved: tickets.filter((t) => t.status === "resolved").length,
    };

    if (loading) return <div className="p-8 text-center">Loading tickets…</div>;

    return (
        <div className="space-y-6">
            {/* ── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Helpdesk</h1>
                <p className="text-sm text-muted-foreground">
                    All participant tickets are shown below. Participants raise tickets from their own dashboard.
                </p>
            </div>

            {/* ── Stat Cards ─────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <Badge className="bg-yellow-500">{stats.urgent} Urgent</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">
                            {stats.open.toString().padStart(2, "0")}
                        </div>
                        <p className="text-xs text-muted-foreground uppercase">Open Tickets</p>
                    </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50/30 dark:bg-blue-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <Clock className="w-5 h-5 text-blue-600" />
                            <Badge className="bg-blue-500">In Progress</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">
                            {stats.inProgress.toString().padStart(2, "0")}
                        </div>
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
                        <div className="text-3xl font-bold">
                            {stats.resolved.toString().padStart(2, "0")}
                        </div>
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

            {/* ── Ticket Table ───────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>All Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Issue</TableHead>
                                <TableHead>Raised By</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Raised On</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tickets.map((ticket) => (
                                <TableRow key={ticket.ticket_id}>
                                    <TableCell className="font-mono text-xs">
                                        {ticket.ticket_id?.substring(0, 8)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="font-medium">{ticket.title}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {ticket.description?.substring(0, 60)}
                                            {(ticket.description?.length ?? 0) > 60 ? "…" : ""}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {ticket.raised_by_uid?.substring(0, 12) || "—"}
                                    </TableCell>
                                    <TableCell className="capitalize text-sm">
                                        {ticket.category}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`text-white text-xs ${priorityColor[ticket.priority] ?? "bg-slate-400"}`}
                                        >
                                            {ticket.priority}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                ticket.status === "open"
                                                    ? "default"
                                                    : ticket.status === "in_progress"
                                                    ? "secondary"
                                                    : "outline"
                                            }
                                        >
                                            {ticket.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {ticket.created_at
                                            ? new Date(ticket.created_at).toLocaleDateString("en-IN", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "—"}
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        {ticket.status === "open" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleUpdateStatus(ticket.ticket_id!, "in_progress")
                                                }
                                            >
                                                Assign
                                            </Button>
                                        )}
                                        {ticket.status !== "resolved" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                    handleUpdateStatus(ticket.ticket_id!, "resolved")
                                                }
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {tickets.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        No tickets have been raised yet.
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
