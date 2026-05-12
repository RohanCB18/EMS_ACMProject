"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    MessageCircle, AlertCircle, Clock,
    CheckCircle2, Plus, LifeBuoy,
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem,
    SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { setDApi, SupportTicket } from "@/lib/api/set-d";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

const priorityColor: Record<string, string> = {
    low: "bg-slate-400",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    urgent: "bg-red-600",
};

const statusVariant = (status: string): "default" | "secondary" | "outline" => {
    if (status === "open") return "default";
    if (status === "in_progress") return "secondary";
    return "outline";
};

export default function ParticipantHelpdeskPage() {
    const { profile } = useAuth();
    const uid = profile?.uid ?? "";

    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newTicket, setNewTicket] = useState({
        title: "",
        description: "",
        category: "technical",
    });

    const fetchTickets = async () => {
        try {
            const all = await setDApi.listTickets();
            setTickets(uid ? all.filter((t) => t.raised_by_uid === uid) : all);
        } catch (error: any) {
            toast.error(error.message || "Failed to fetch tickets");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTicket.title.trim() || !newTicket.description.trim()) {
            toast.error("Please fill in all fields");
            return;
        }
        setSubmitting(true);
        try {
            await setDApi.createTicket({
                title: newTicket.title.trim(),
                description: newTicket.description.trim(),
                category: newTicket.category,
                priority: "medium", // default — not set by participant
                status: "open",
                raised_by_uid: uid,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            toast.success("Ticket submitted! Our team will get back to you shortly.");
            setNewTicket({ title: "", description: "", category: "technical" });
            setCreateOpen(false);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || "Failed to create ticket");
        } finally {
            setSubmitting(false);
        }
    };

    const stats = {
        open: tickets.filter((t) => t.status === "open").length,
        inProgress: tickets.filter((t) => t.status === "in_progress").length,
        resolved: tickets.filter((t) => t.status === "resolved").length,
    };

    if (loading)
        return (
            <div className="flex items-center justify-center p-16 text-muted-foreground gap-2">
                <LifeBuoy className="w-5 h-5 animate-pulse" />
                Loading your tickets…
            </div>
        );

    return (
        <div className="space-y-6">
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Support &amp; Helpdesk</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Raise a ticket and track its status in real time.
                    </p>
                </div>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Ticket
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Raise a Support Ticket</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={newTicket.title}
                                    onChange={(e) =>
                                        setNewTicket({ ...newTicket, title: e.target.value })
                                    }
                                    placeholder="Brief summary of your issue"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={newTicket.description}
                                    onChange={(e) =>
                                        setNewTicket({ ...newTicket, description: e.target.value })
                                    }
                                    placeholder="Describe your issue in detail…"
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={newTicket.category}
                                    onValueChange={(v) =>
                                        setNewTicket({ ...newTicket, category: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technical">Technical</SelectItem>
                                        <SelectItem value="logistics">Logistics</SelectItem>
                                        <SelectItem value="query">General Query</SelectItem>
                                        <SelectItem value="network">Network / WiFi</SelectItem>
                                        <SelectItem value="food">Food / Refreshments</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? "Submitting…" : "Submit Ticket"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* ── Stat Cards ──────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-yellow-200 bg-yellow-50/30 dark:bg-yellow-900/10">
                    <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                            <Badge className="bg-yellow-500">Open</Badge>
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
                        <p className="text-xs text-muted-foreground uppercase">Being Handled</p>
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
            </div>

            {/* ── Ticket Table ─────────────────────────────────────── */}
            <Card>
                <CardHeader>
                    <CardTitle>My Tickets</CardTitle>
                    <CardDescription>
                        Track the status of all tickets you have raised.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Issue</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Raised On</TableHead>
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
                                            {ticket.description?.substring(0, 70)}
                                            {(ticket.description?.length ?? 0) > 70 ? "…" : ""}
                                        </div>
                                    </TableCell>
                                    <TableCell className="capitalize text-sm">
                                        {ticket.category}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant(ticket.status)}>
                                            {ticket.status.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {ticket.created_at
                                            ? new Date(ticket.created_at).toLocaleDateString(
                                                  "en-IN",
                                                  { day: "2-digit", month: "short", year: "numeric" }
                                              )
                                            : "—"}
                                    </TableCell>
                                </TableRow>
                            ))}

                            {tickets.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={5}
                                        className="text-center py-12 text-muted-foreground"
                                    >
                                        <LifeBuoy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                        No tickets yet. Click &ldquo;New Ticket&rdquo; to raise one.
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
