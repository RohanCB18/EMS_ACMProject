'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import {
    Search, Users, Plus, Target, Copy, Check, Loader2, LogOut,
    Lock, UserPlus, ClipboardCopy
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';

interface MemberDetail {
    uid: string;
    display_name: string;
    email: string;
    role?: string;
}

interface Team {
    team_id: string;
    name: string;
    invite_code: string;
    track: string;
    created_by: string;
    members: string[];
    members_count?: number;
    member_details?: MemberDetail[];
    looking_for?: string;
    description?: string;
    max_size: number;
    min_size: number;
    locked: boolean;
}

export default function TeamFormationPage() {
    const { user, refreshProfile } = useAuth();
    const [activeTab, setActiveTab] = useState('browse');
    const [openTeams, setOpenTeams] = useState<Team[]>([]);
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    const [loadingTeams, setLoadingTeams] = useState(true);
    const [loadingMyTeam, setLoadingMyTeam] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedCode, setCopiedCode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create team form state
    const [createName, setCreateName] = useState('');
    const [createTrack, setCreateTrack] = useState('Open Innovation');
    const [createLookingFor, setCreateLookingFor] = useState('');
    const [createDescription, setCreateDescription] = useState('');
    const [createMaxSize, setCreateMaxSize] = useState(4);
    const [creating, setCreating] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    // Join team form state
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState<string | null>(null);
    const [joinDialogOpen, setJoinDialogOpen] = useState(false);

    const [leaving, setLeaving] = useState(false);

    const loadOpenTeams = useCallback(async () => {
        setLoadingTeams(true);
        try {
            const res = await fetch(`${API_URL}/api/teams/browse/open`);
            if (res.ok) {
                const data = await res.json();
                setOpenTeams(data.teams || []);
            }
        } catch {
            // Silent fail — just show empty list
        } finally {
            setLoadingTeams(false);
        }
    }, []);

    const loadMyTeam = useCallback(async () => {
        if (!user) {
            setLoadingMyTeam(false);
            return;
        }
        setLoadingMyTeam(true);
        try {
            const res = await fetch(`${API_URL}/api/teams/my-team/${user.uid}`);
            if (res.ok) {
                const data = await res.json();
                setMyTeam(data.team || null);
                if (data.team) {
                    setActiveTab('my-team');
                }
            }
        } catch {
            // Silent fail
        } finally {
            setLoadingMyTeam(false);
        }
    }, [user]);

    useEffect(() => {
        loadOpenTeams();
        loadMyTeam();
    }, [loadOpenTeams, loadMyTeam]);

    const handleCreateTeam = async () => {
        if (!user || !createName.trim()) return;
        setCreating(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/teams/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName,
                    track: createTrack,
                    created_by: user.uid,
                    looking_for: createLookingFor || null,
                    description: createDescription || null,
                    max_size: createMaxSize,
                    min_size: 2,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMyTeam(data);
                setCreateDialogOpen(false);
                setActiveTab('my-team');
                await refreshProfile();
                loadOpenTeams();
                // Reset form
                setCreateName('');
                setCreateLookingFor('');
                setCreateDescription('');
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to create team');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setCreating(false);
        }
    };

    const handleJoinByCode = async () => {
        if (!user || !joinCode.trim()) return;
        setJoining('code');
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/teams/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    invite_code: joinCode.trim().toUpperCase(),
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMyTeam(data);
                setJoinDialogOpen(false);
                setActiveTab('my-team');
                await refreshProfile();
                loadOpenTeams();
                setJoinCode('');
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to join team');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setJoining(null);
        }
    };

    const handleJoinTeam = async (inviteCode: string) => {
        if (!user) return;
        setJoining(inviteCode);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/api/teams/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    invite_code: inviteCode,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setMyTeam(data);
                setActiveTab('my-team');
                await refreshProfile();
                loadOpenTeams();
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to join team');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setJoining(null);
        }
    };

    const handleLeaveTeam = async () => {
        if (!user || !myTeam) return;
        setLeaving(true);

        try {
            const res = await fetch(`${API_URL}/api/teams/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    team_id: myTeam.team_id,
                }),
            });

            if (res.ok) {
                setMyTeam(null);
                setActiveTab('browse');
                await refreshProfile();
                loadOpenTeams();
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to leave team');
            }
        } catch {
            setError('Failed to connect to server');
        } finally {
            setLeaving(false);
        }
    };

    const copyInviteCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    const filteredTeams = openTeams.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            t.name.toLowerCase().includes(q) ||
            t.track.toLowerCase().includes(q) ||
            (t.looking_for?.toLowerCase().includes(q))
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Team Formation Engine</h2>
                    <p className="text-muted-foreground">Find teammates or create your own squad for the hackathon.</p>
                </div>

                <div className="flex gap-2">
                    {/* Join by Code */}
                    <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" disabled={!!myTeam}>
                                <ClipboardCopy className="mr-2 h-4 w-4" /> Join by Code
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px]">
                            <DialogHeader>
                                <DialogTitle>Join with Invite Code</DialogTitle>
                                <DialogDescription>
                                    Enter the invite code shared by your team leader.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Invite Code</Label>
                                    <Input
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. A1B2C3"
                                        className="text-center text-lg tracking-widest font-mono"
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleJoinByCode} disabled={!joinCode.trim() || joining === 'code'}>
                                    {joining === 'code' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                    Join Team
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Create Team */}
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90" disabled={!!myTeam}>
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
                                    <Label htmlFor="team-name">Team Name</Label>
                                    <Input
                                        id="team-name"
                                        placeholder="e.g. Byte Builders"
                                        value={createName}
                                        onChange={(e) => setCreateName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="team-track">Target Track</Label>
                                    <select
                                        id="team-track"
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={createTrack}
                                        onChange={(e) => setCreateTrack(e.target.value)}
                                    >
                                        <option>FinTech Innovation</option>
                                        <option>AI/ML Solutions</option>
                                        <option>Web3 & Blockchain</option>
                                        <option>Open Innovation</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="team-size">Max Team Size</Label>
                                    <Input
                                        id="team-size"
                                        type="number"
                                        min={2}
                                        max={10}
                                        value={createMaxSize}
                                        onChange={(e) => setCreateMaxSize(parseInt(e.target.value) || 4)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="team-looking">Looking For (Roles)</Label>
                                    <Input
                                        id="team-looking"
                                        placeholder="e.g. Frontend Dev, UI/UX Designer"
                                        value={createLookingFor}
                                        onChange={(e) => setCreateLookingFor(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="team-desc">Description</Label>
                                    <textarea
                                        id="team-desc"
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="What's your project idea?"
                                        value={createDescription}
                                        onChange={(e) => setCreateDescription(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleCreateTeam} disabled={creating || !createName.trim()}>
                                    {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Create Team Profile
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-md">
                    {error}
                    <Button variant="ghost" size="sm" className="ml-2" onClick={() => setError(null)}>✕</Button>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="browse">Browse Open Teams</TabsTrigger>
                    <TabsTrigger value="my-team">
                        My Team
                        {myTeam && <Badge variant="default" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">✓</Badge>}
                    </TabsTrigger>
                </TabsList>

                {/* Browse Tab */}
                <TabsContent value="browse" className="mt-6 space-y-6">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search teams by track, required roles, or name..."
                            className="w-full bg-background pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {loadingTeams ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredTeams.length === 0 ? (
                        <Card className="border-dashed border-2 bg-muted/20">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <Users className="h-10 w-10 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-1">No open teams found</h3>
                                <p className="text-muted-foreground text-sm">
                                    {searchQuery ? 'Try a different search term.' : 'Be the first to create a team!'}
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTeams.map((team) => (
                                <Card key={team.team_id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-xl">{team.name}</CardTitle>
                                            <Badge
                                                variant={(team.members_count ?? team.members?.length ?? 0) >= team.max_size ? 'destructive' : 'secondary'}
                                            >
                                                {team.members_count ?? team.members?.length ?? 0}/{team.max_size} Members
                                            </Badge>
                                        </div>
                                        <CardDescription className="flex items-center gap-1 mt-1">
                                            <Target className="h-3 w-3" /> {team.track}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-3">
                                        <div className="space-y-3">
                                            {team.looking_for && (
                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Looking For:</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {team.looking_for.split(',').map((role, i) => (
                                                            <Badge key={i} variant="outline" className="bg-primary/5">
                                                                {role.trim()}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {team.description && (
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {team.description}
                                                </p>
                                            )}
                                            {team.member_details && team.member_details.length > 0 && (
                                                <div className="space-y-1">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Members:</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {team.member_details.map((m, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">
                                                                {m.display_name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                    <CardFooter>
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            disabled={!!myTeam || joining === team.invite_code}
                                            onClick={() => handleJoinTeam(team.invite_code)}
                                        >
                                            {joining === team.invite_code ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="mr-2 h-4 w-4" />
                                            )}
                                            {myTeam ? 'Leave current team first' : 'Request to Join'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* My Team Tab */}
                <TabsContent value="my-team" className="mt-6">
                    {loadingMyTeam ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : !myTeam ? (
                        <Card className="border-dashed border-2 bg-muted/20">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-primary/10 p-4 rounded-full mb-4">
                                    <Users className="h-10 w-10 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold mb-2">You aren&apos;t in a team yet</h3>
                                <p className="text-muted-foreground max-w-md mb-6">
                                    Browse open teams from the other tab and request to join, or create your own team and invite others.
                                </p>
                                <Button onClick={() => setActiveTab('browse')}>Browse Teams</Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6 lg:grid-cols-3">
                            {/* Team Info */}
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-2xl">{myTeam.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-1 mt-1">
                                                <Target className="h-4 w-4" /> {myTeam.track}
                                            </CardDescription>
                                        </div>
                                        {myTeam.locked && (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <Lock className="h-3 w-3" /> Locked
                                            </Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {myTeam.description && (
                                        <div>
                                            <h4 className="text-sm font-semibold text-muted-foreground mb-1">Description</h4>
                                            <p className="text-sm">{myTeam.description}</p>
                                        </div>
                                    )}

                                    {/* Members List */}
                                    <div>
                                        <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                                            Team Members ({myTeam.members.length}/{myTeam.max_size})
                                        </h4>
                                        <div className="space-y-2">
                                            {(myTeam.member_details || []).map((member) => (
                                                <div
                                                    key={member.uid}
                                                    className="flex items-center justify-between p-3 border rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                                                            {member.display_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{member.display_name}</p>
                                                            <p className="text-xs text-muted-foreground">{member.email}</p>
                                                        </div>
                                                    </div>
                                                    {member.uid === myTeam.created_by && (
                                                        <Badge variant="secondary">Leader</Badge>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {!myTeam.locked && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleLeaveTeam}
                                            disabled={leaving}
                                        >
                                            {leaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
                                            Leave Team
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Invite Card */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Invite Members</CardTitle>
                                    <CardDescription>Share your invite code with teammates.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                                        <p className="text-3xl font-mono font-bold tracking-[0.3em]">
                                            {myTeam.invite_code}
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => copyInviteCode(myTeam.invite_code)}
                                    >
                                        {copiedCode ? (
                                            <>
                                                <Check className="mr-2 h-4 w-4" /> Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="mr-2 h-4 w-4" /> Copy Code
                                            </>
                                        )}
                                    </Button>
                                    <div className="pt-2 text-center">
                                        <p className="text-xs text-muted-foreground">
                                            {myTeam.members.length}/{myTeam.max_size} spots filled
                                        </p>
                                        <div className="w-full bg-muted rounded-full h-2 mt-2">
                                            <div
                                                className="bg-primary h-2 rounded-full transition-all"
                                                style={{ width: `${(myTeam.members.length / myTeam.max_size) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
