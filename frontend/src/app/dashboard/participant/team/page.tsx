'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, Users, Plus, Code, Target, ShieldCheck } from 'lucide-react';

export default function TeamFormationPage() {
    const [activeTab, setActiveTab] = useState('browse');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Formation Engine</h2>
                    <p className="text-muted-foreground">Find teammates or create your own squad for the hackathon.</p>
                </div>

                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" /> Create Team
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create a New Team</DialogTitle>
                            <DialogDescription>
                                Set up your team profile to start recruiting members.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Team Name</Label>
                                <Input id="name" placeholder="e.g. Byte Builders" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="track">Target Track</Label>
                                <select id="track" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50">
                                    <option>FinTech Innovation</option>
                                    <option>AI/ML Solutions</option>
                                    <option>Web3 & Blockchain</option>
                                    <option>Open Innovation</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lookingFor">Looking For (Roles)</Label>
                                <Input id="lookingFor" placeholder="e.g. Frontend Dev, UI/UX Designer" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit">Create Team Profile</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs defaultValue="browse" onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="browse">Browse Open Teams</TabsTrigger>
                    <TabsTrigger value="my-team">My Workspace</TabsTrigger>
                </TabsList>

                <TabsContent value="browse" className="mt-6 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search teams by track, required roles, or name..."
                            className="w-full bg-background pl-8"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Mock Team Card 1 */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">Crypto Kings</CardTitle>
                                    <Badge variant="secondary">2/4 Members</Badge>
                                </div>
                                <CardDescription className="flex items-center gap-1 mt-1">
                                    <Target className="h-3 w-3" /> Web3 & Blockchain
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Looking For:</span>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="outline" className="bg-primary/5">Smart Contract Dev</Badge>
                                            <Badge variant="outline" className="bg-primary/5">UI Designer</Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Building a decentralized escrow service for freelancers. We have the backend planned out.
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full">Request to Join</Button>
                            </CardFooter>
                        </Card>

                        {/* Mock Team Card 2 */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">Neural Ninjas</CardTitle>
                                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">3/4 Members</Badge>
                                </div>
                                <CardDescription className="flex items-center gap-1 mt-1">
                                    <Target className="h-3 w-3" /> AI/ML Solutions
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Looking For:</span>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="outline" className="bg-primary/5">Data Scientist</Badge>
                                        </div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Predictive analysis model for retail supply chains. Strong background in Python required!
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="outline" className="w-full">Request to Join</Button>
                            </CardFooter>
                        </Card>

                        {/* Mock Team Card 3 */}
                        <Card className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">Code Crafters</CardTitle>
                                    <Badge variant="destructive">4/4 Full</Badge>
                                </div>
                                <CardDescription className="flex items-center gap-1 mt-1">
                                    <Target className="h-3 w-3" /> FinTech Innovation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-3">
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Looking For:</span>
                                        <p className="text-sm">Not accepting members</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        Micro-investing platform for college students. Fully staffed and coding!
                                    </p>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="ghost" className="w-full" disabled>Team is Full</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="my-team" className="mt-6">
                    <Card className="border-dashed border-2 bg-muted/20">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-primary/10 p-4 rounded-full mb-4">
                                <Users className="h-10 w-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">You aren't in a team yet</h3>
                            <p className="text-muted-foreground max-w-md mb-6">
                                Browse open teams from the other tab and request to join, or create your own team and invite others.
                            </p>
                            <Button onClick={() => setActiveTab('browse')}>Browse Teams</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
