"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Globe, Trophy, Building2 } from "lucide-react";

export default function SponsorsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Sponsors & Tracks</h1>
                <Button>Add Track</Button>
            </div>

            <Tabs defaultValue="tracks" className="w-full">
                <TabsList>
                    <TabsTrigger value="tracks">Event Tracks</TabsTrigger>
                    <TabsTrigger value="sponsors">Manage Sponsors</TabsTrigger>
                </TabsList>

                <TabsContent value="tracks" className="space-y-4 pt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Trophy className="w-8 h-8 text-yellow-500 mb-2" />
                                    <Badge>AI/ML</Badge>
                                </div>
                                <CardTitle>Generative AI for Social Good</CardTitle>
                                <CardDescription>Sponsored by Google Cloud</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm mb-4">Focus on leveraging LLMs and GenAI to solve environmental and educational challenges.</p>
                                <div className="text-xs text-muted-foreground">32 Teams Enrolled</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Trophy className="w-8 h-8 text-blue-500 mb-2" />
                                    <Badge>Fintech</Badge>
                                </div>
                                <CardTitle>Next-Gen Payments</CardTitle>
                                <CardDescription>Sponsored by Razorpay</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm mb-4">Building secure, scalable, and innovative payment solutions for the Indian digital economy.</p>
                                <div className="text-xs text-muted-foreground">18 Teams Enrolled</div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <Trophy className="w-8 h-8 text-purple-500 mb-2" />
                                    <Badge>Web3</Badge>
                                </div>
                                <CardTitle>Decentralized Governance</CardTitle>
                                <CardDescription>Sponsored by Polygon</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm mb-4">Explore DAOs and on-chain governance models for community-driven projects.</p>
                                <div className="text-xs text-muted-foreground">12 Teams Enrolled</div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="sponsors" className="space-y-4 pt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Partner Directory</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-4 md:grid-cols-2">
                                {[
                                    { name: "Google Cloud", tier: "Gold", engagement: "High" },
                                    { name: "Razorpay", tier: "Silver", engagement: "Medium" },
                                    { name: "Polygon", tier: "Foundational", engagement: "High" },
                                    { name: "GitHub", tier: "In-Kind", engagement: "Medium" },
                                ].map(sponsor => (
                                    <div key={sponsor.name} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <div className="font-semibold">{sponsor.name}</div>
                                                <div className="text-xs text-muted-foreground">{sponsor.tier} Tier</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline">{sponsor.engagement} Engagement</Badge>
                                            <div className="flex gap-2 mt-2">
                                                <Button size="icon" variant="ghost" className="h-8 w-8"><Globe className="h-4 w-4" /></Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
