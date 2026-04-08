"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, AlertCircle, Clock, CheckCircle2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { setDApi, SupportTicket, TicketStatus, TicketPriority } from "@/lib/api/set-d";
import { toast } from "sonner";

export default function HelpdeskPage() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [newTicket, setNewTicket] = useState({ title: "", description: "", category: "technical", priority: "medium" as TicketPriority });

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

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await setDApi.createTicket({
                title: newTicket.title.trim(),
                description: newTicket.description.trim(),
                category: newTicket.category,
                priority: newTicket.priority,
                status: "open",
                raised_by_uid: "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            toast.success("Ticket created!");
            setNewTicket({ title: "", description: "", category: "technical", priority: "medium" });
            setCreateOpen(false);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to create ticket");
        }
    };

    const handleUpdateStatus = async (ticketId: string, status: TicketStatus) => {
        try {
            await setDApi.updateTicket(ticketId, { status });
            toast.success(`Ticket ${status === "resolved" ? "resolved" : "assigned"} successfully`);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to update ticket");
        }
    };

    const handleUpdatePriority = async (ticketId: string, priority: TicketPriority) => {
        try {
            await setDApi.updateTicket(ticketId, { priority });
            toast.success(`Priority set to ${priority}`);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to update priority");
        }
    };

    const stats = {
        open: tickets.filter(t => t.status === "open").length,
        urgent: tickets.filter(t => t.priority === "urgent").length,
        inProgress: tickets.filter(t => t.status === "in_progress").length,
        resolved: tickets.filter(t => t.status === "resolved").length,
    };

    if (loading) return <div className="p-8 text-center">Loading tickets...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Helpdesk</h1>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" />Create Ticket</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Create New Ticket</DialogTitle></DialogHeader>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={newTicket.title} onChange={e => setNewTicket({ ...newTicket, title: e.target.value })} placeholder="Brief issue summary" required />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea value={newTicket.description} onChange={e => setNewTicket({ ...newTicket, description: e.target.value })} placeholder="Detailed description of the issue..." required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={newTicket.category} onValueChange={v => setNewTicket({ ...newTicket, category: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="technical">Technical</SelectItem>
                                            <SelectItem value="logistics">Logistics</SelectItem>
                                            <SelectItem value="query">General Query</SelectItem>
                                            <SelectItem value="network">Network/WiFi</SelectItem>
                                            <SelectItem value="food">Food/Refreshments</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={newTicket.priority} onValueChange={v => setNewTicket({ ...newTicket, priority: v as TicketPriority })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Submit Ticket</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <Badge className="bg-yellow-500">{stats.urgent} Urgent</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                        <div className="text-3xl font-bold">{stats.open.toString().padStart(2, '0')}</div>
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
                    <CardTitle>All Tickets</CardTitle>
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
                                        <div className="text-xs text-muted-foreground">{ticket.category} • {ticket.description?.substring(0, 60)}{(ticket.description?.length || 0) > 60 ? '…' : ''}</div>
                                    </TableCell>
                                    <TableCell className="text-xs">{ticket.raised_by_uid?.substring(0, 12) || "—"}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={ticket.priority}
                                            onValueChange={(val) => handleUpdatePriority(ticket.ticket_id!, val as TicketPriority)}
                                        >
                                            <SelectTrigger className="h-7 w-24 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
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
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tickets found. Click "Create Ticket" to raise one.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
