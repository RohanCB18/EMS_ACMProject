"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Users, Clock, Zap, Download, RefreshCw, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { setDApi, AnalyticsOverview } from "@/lib/api/set-d";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AnalyticsPage() {
    const [stats, setStats] = useState<AnalyticsOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [exportCollection, setExportCollection] = useState("users");

    const fetchStats = async () => {
        setLoading(true);
        try {
            const data = await setDApi.getOverview();
            setStats(data);
        } catch (error: any) {
            toast.error("Failed to fetch analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const handleExport = () => {
        setDApi.exportCsv(exportCollection);
        toast.success(`Exporting ${exportCollection} as CSV...`);
    };

    if (loading) return <div className="p-8 text-center">Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Admin Analytics</h1>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchStats}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_registrations ?? 0}</div>
                        <p className="text-xs text-muted-foreground">from users collection</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.teams_formed ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats && stats.total_registrations > 0
                                ? `${((stats.teams_formed / stats.total_registrations) * 100).toFixed(0)}% formation rate`
                                : "N/A"}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.attendance_rate?.toFixed(1) ?? 0}%</div>
                        <p className="text-xs text-muted-foreground">based on check-in data</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tickets Resolved</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.tickets_resolved ?? 0}</div>
                        <p className="text-xs text-muted-foreground">from helpdesk</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Track Breakdown */}
                <Card>
                    <CardHeader>
                        <CardTitle>Track Breakdown</CardTitle>
                        <CardDescription>Teams per sponsor track</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {stats?.top_tracks && stats.top_tracks.length > 0 ? (
                            <div className="space-y-4">
                                {stats.top_tracks.map((track, i) => (
                                    <div key={track.name}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium">{track.name}</span>
                                            <span>{track.count} teams</span>
                                        </div>
                                        <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : i === 2 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                style={{ width: `${Math.min((track.count / (stats?.teams_formed || 1)) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No track data available yet.</p>
                        )}
                    </CardContent>
                </Card>

                {/* CSV Export */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /> Data Export</CardTitle>
                        <CardDescription>Download any Firestore collection as CSV</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Select value={exportCollection} onValueChange={setExportCollection}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select collection" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="users">Users</SelectItem>
                                    <SelectItem value="teams">Teams</SelectItem>
                                    <SelectItem value="attendance">Attendance</SelectItem>
                                    <SelectItem value="tickets">Helpdesk Tickets</SelectItem>
                                    <SelectItem value="mentors">Mentors</SelectItem>
                                    <SelectItem value="sponsors">Sponsors</SelectItem>
                                    <SelectItem value="tracks">Tracks</SelectItem>
                                    <SelectItem value="mentor_sessions">Mentor Sessions</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full" onClick={handleExport}>
                            <Download className="w-4 h-4 mr-2" /> Export "{exportCollection}" as CSV
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Summary Row */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Projects Submitted</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.projects_submitted ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Finance Reconciled</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{stats?.finance_reconciled?.toLocaleString() ?? 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats && stats.tickets_resolved > 0 ? "Active" : "No tickets"}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
