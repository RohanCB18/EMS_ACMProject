"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Users, Clock, Zap, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Admin Analytics</h1>
                <Button className="flex gap-2">
                    <Download className="w-4 h-4" /> Export Report (CSV)
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,284</div>
                        <p className="text-xs text-muted-foreground">+12% from last week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">312</div>
                        <p className="text-xs text-muted-foreground">84% formation rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Wait Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">14m</div>
                        <p className="text-xs text-muted-foreground">-2m since yesterday</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resource Usage</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">72%</div>
                        <p className="text-xs text-muted-foreground">Optimal capacity</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Registration Funnel</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-end justify-between gap-2 px-4">
                            {/* Mock Bar Chart */}
                            {[70, 85, 60, 95, 80, 55, 75].map((h, i) => (
                                <div key={i} className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-all" style={{ height: `${h}%` }}></div>
                            ))}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-4">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Team Status</CardTitle>
                        <CardDescription>Breakdown by track and stage.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: "AI/ML", value: "35%", color: "bg-blue-500" },
                                { name: "Web3", value: "25%", color: "bg-purple-500" },
                                { name: "Fintech", value: "20%", color: "bg-green-500" },
                                { name: "Others", value: "20%", color: "bg-gray-500" },
                            ].map(track => (
                                <div key={track.name}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>{track.name}</span>
                                        <span>{track.value}</span>
                                    </div>
                                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                                        <div className={`${track.color} h-full`} style={{ width: track.value }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
