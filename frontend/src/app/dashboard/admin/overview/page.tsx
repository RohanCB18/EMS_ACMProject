import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Activity, Trophy } from 'lucide-react';

export default function AdminOverviewPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Admin Overview</h2>
                <p className="text-muted-foreground">Manage your hackathon, track registrations, and monitor finances.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">1,245</div>
                        <p className="text-xs text-muted-foreground">+20% from last week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teams Formed</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">342</div>
                        <p className="text-xs text-muted-foreground">+12 since yesterday</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Projects Submitted</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">128</div>
                        <p className="text-xs text-muted-foreground">Judging pending for 45</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Finance Reconciled</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$12,450</div>
                        <p className="text-xs text-muted-foreground">Sponsorship funds</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Registration Timeline</CardTitle>
                        <CardDescription>Daily registration counts over the past 30 days.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px] flex items-center justify-center border-dashed border-2 m-4 rounded-xl">
                        <span className="text-muted-foreground">Chart Placeholder (Recharts)</span>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest actions taken by participants and judges.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            <div className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>OM</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Olivia Martin created a team</p>
                                    <p className="text-sm text-muted-foreground">Team "Code Ninjas"</p>
                                </div>
                                <div className="ml-auto font-medium text-xs text-muted-foreground">Just now</div>
                            </div>
                            <div className="flex items-center">
                                <Avatar className="h-9 w-9">
                                    <AvatarFallback>JL</AvatarFallback>
                                </Avatar>
                                <div className="ml-4 space-y-1">
                                    <p className="text-sm font-medium leading-none">Jackson Lee submitted project</p>
                                    <p className="text-sm text-muted-foreground">Track: FinTech</p>
                                </div>
                                <div className="ml-auto font-medium text-xs text-muted-foreground">2h ago</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Temporary Avatar Component Mock since it's used in the page above before complex full exports
const Avatar = ({ children, className }: any) => <div className={`rounded-full bg-muted flex items-center justify-center ${className}`}>{children}</div>
const AvatarFallback = ({ children }: any) => <span className="text-xs">{children}</span>
