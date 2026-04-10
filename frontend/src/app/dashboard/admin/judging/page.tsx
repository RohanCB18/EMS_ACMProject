'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Trophy, UserPlus, Users, Scale, BarChart3, Shuffle, Download,
    Plus, Trash2, AlertTriangle, CheckCircle2, Clock, Star, Target,
    Gavel, Award, Eye, Flag, Save,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

// ─── Types ────────────────────────────────────────────────────
// Types are now imported from the shared client

// Types are now imported from the shared client
import { judgingApi } from '@/lib/api/judging';
import type { Judge, Allocation, ProjectRanking, RubricCriteria } from '@/lib/api/judging';

// ─── Expertise Tag Colors ────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
    'AI/ML': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    'Web': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Blockchain': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'IoT': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    'Cybersecurity': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'Mobile': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
    'Cloud': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    'Data Science': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    'Game Dev': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
};

function getTagColor(tag: string) {
    return TAG_COLORS[tag] || 'bg-muted text-muted-foreground';
}

// ─── Status Badge Colors ─────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'assigned':
            return <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 dark:border-blue-800"><Clock className="mr-1 h-3 w-3" />Assigned</Badge>;
        case 'pending':
            return <Badge variant="secondary" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"><AlertTriangle className="mr-1 h-3 w-3" />Pending</Badge>;
        case 'reviewed':
            return <Badge className="bg-green-500/15 text-green-600 border-green-200 dark:border-green-800"><CheckCircle2 className="mr-1 h-3 w-3" />Reviewed</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════

export default function JudgingDashboard() {
    const [activeTab, setActiveTab] = useState('judges');

    // ─── Judge State ─────────────────────────────────────────
    const [judges, setJudges] = useState<Judge[]>([]);
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '', organization: '', tags: '' });

    // ─── Rubric State ────────────────────────────────────────
    const [criteria, setCriteria] = useState<RubricCriteria[]>([
        { id: 'innovation', name: 'Innovation', weight: 25, max_score: 10, description: 'Novelty and creativity of the solution' },
        { id: 'execution', name: 'Execution', weight: 30, max_score: 10, description: 'Quality of implementation and code' },
        { id: 'presentation', name: 'Presentation', weight: 20, max_score: 10, description: 'Clarity of demo and pitch' },
        { id: 'impact', name: 'Impact', weight: 25, max_score: 10, description: 'Real-world applicability and potential' },
    ]);
    const [newCriteria, setNewCriteria] = useState({ name: '', weight: '', max_score: '10', description: '' });

    // ─── Allocation State ────────────────────────────────────
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [isAllocating, setIsAllocating] = useState(false);
    const [teams, setTeams] = useState<any[]>([]);
    const [manualAllocOpen, setManualAllocOpen] = useState(false);
    const [manualForm, setManualForm] = useState({ judge_id: '', project_id: '', round: 'round_1' });
    const [autoAllocOpen, setAutoAllocOpen] = useState(false);
    const [judgesPerProject, setJudgesPerProject] = useState(3);

    // ─── Ranking State ───────────────────────────────────────
    const [rankings, setRankings] = useState<ProjectRanking[]>([]);
    const [selectedRound, setSelectedRound] = useState('round_1');

    // ─── Data Fetchers (Real API) ────────────────────────────

    const EVENT_ID = 'default_event';
    const [loading, setLoading] = useState(true);

    const fetchJudges = useCallback(async () => {
        try {
            const data = await judgingApi.listJudges();
            setJudges(data);
        } catch (err: any) {
            console.error('Failed to fetch judges:', err);
        }
    }, []);

    const fetchAllocations = useCallback(async () => {
        try {
            const data = await judgingApi.listAllocations();
            setAllocations(data);
        } catch (err: any) {
            console.error('Failed to fetch allocations:', err);
        }
    }, []);

    const fetchRubric = useCallback(async () => {
        try {
            const rubrics = await judgingApi.getRubrics(EVENT_ID);
            if (rubrics && rubrics.length > 0) {
                setCriteria(rubrics[0].criteria);
            }
        } catch (err: any) {
            console.error('Failed to fetch rubric:', err);
        }
    }, [EVENT_ID]);

    const fetchTeams = useCallback(async () => {
        try {
            const data = await judgingApi.listTeams();
            setTeams(data);
        } catch (err: any) {
            console.error('Failed to fetch teams:', err);
        }
    }, []);

    const fetchRankings = useCallback(async (round: string = 'round_1') => {
        try {
            const data = await judgingApi.getRankings(EVENT_ID, round);
            setRankings(data.rankings || []);
        } catch (err: any) {
            console.error('Failed to fetch rankings:', err);
            setRankings([]);
        }
    }, [EVENT_ID]);

    useEffect(() => {
        const loadAll = async () => {
            setLoading(true);
            await Promise.all([fetchJudges(), fetchAllocations(), fetchRankings(selectedRound), fetchRubric(), fetchTeams()]);
            setLoading(false);
        };
        loadAll();
    }, [fetchJudges, fetchAllocations, fetchRankings, fetchRubric, fetchTeams, selectedRound]);

    // ─── Action Handlers ─────────────────────────────────────

    const handleInviteJudge = async () => {
        if (!inviteForm.name || !inviteForm.email) {
            toast.error('Name and email are required');
            return;
        }
        const tags = inviteForm.tags.split(',').map(t => t.trim()).filter(Boolean);
        try {
            const newJudge = await judgingApi.inviteJudge({
                email: inviteForm.email,
                name: inviteForm.name,
                expertise_tags: tags,
                organization: inviteForm.organization || undefined,
            });
            setJudges(prev => [...prev, newJudge]);
            setInviteForm({ name: '', email: '', organization: '', tags: '' });
            setInviteOpen(false);
            toast.success(`Judge ${newJudge.name} invited successfully!`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to invite judge');
        }
    };

    const handleRemoveJudge = async (judgeId: string) => {
        try {
            await judgingApi.removeJudge(judgeId);
            setJudges(prev => prev.filter(j => j.judge_id !== judgeId));
            toast.success('Judge removed');
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove judge');
        }
    };

    const handleAddCriteria = () => {
        if (!newCriteria.name || !newCriteria.weight) {
            toast.error('Criteria name and weight are required');
            return;
        }
        const id = newCriteria.name.toLowerCase().replace(/\s+/g, '_');
        setCriteria(prev => [...prev, {
            id,
            name: newCriteria.name,
            weight: parseFloat(newCriteria.weight),
            max_score: parseInt(newCriteria.max_score) || 10,
            description: newCriteria.description,
        }]);
        setNewCriteria({ name: '', weight: '', max_score: '10', description: '' });
        toast.success('Criteria added');
    };

    const handleRemoveCriteria = (id: string) => {
        setCriteria(prev => prev.filter(c => c.id !== id));
    };

    const handleSaveRubric = async () => {
        if (Math.abs(totalWeight - 100) > 0.01) {
            toast.error('Criteria weights must sum to 100% before saving.');
            return;
        }
        try {
            await judgingApi.createRubric({
                event_id: EVENT_ID,
                name: 'Main Rubric',
                criteria: criteria,
                round: 'round_1',
            });
            toast.success('Rubric saved successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save rubric');
        }
    };

    const totalWeight = useMemo(() => criteria.reduce((sum, c) => sum + c.weight, 0), [criteria]);

    const handleAutoAllocate = async () => {
        setIsAllocating(true);
        try {
            const result = await judgingApi.autoAllocate({ 
                event_id: EVENT_ID, 
                round: selectedRound,
                judges_per_project: judgesPerProject
            });
            toast.success(result.message);
            setAutoAllocOpen(false);
            await fetchAllocations();
        } catch (err: any) {
            toast.error(err.message || 'Failed to auto-allocate');
        } finally {
            setIsAllocating(false);
        }
    };

    const handleManualAllocate = async () => {
        if (!manualForm.judge_id || !manualForm.project_id) {
            toast.error('Please select both a judge and a project/team');
            return;
        }
        setIsAllocating(true);
        try {
            await judgingApi.manualAllocate({
                ...manualForm,
                action: 'assign',
            });
            toast.success('Manual allocation created successfully');
            setManualAllocOpen(false);
            setManualForm({ judge_id: '', project_id: '', round: 'round_1' });
            await fetchAllocations();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create manual allocation');
        } finally {
            setIsAllocating(false);
        }
    };

    const handleExport = async () => {
        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) throw new Error('Not authenticated');
            const token = await user.getIdToken();

            const response = await fetch(`${API_BASE}/api/judging/rankings/${EVENT_ID}/export?round=${selectedRound}&top_n=100`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to export results');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `rankings_${selectedRound}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success('Results exported successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to export results');
        }
    };

    const handleSaveRankings = async () => {
        try {
            const result = await judgingApi.saveRankings(EVENT_ID, selectedRound);
            toast.success(result.message);
        } catch (err: any) {
            toast.error(err.message || 'Failed to save rankings');
        }
    };
    const handleRemoveAllocation = async (alloc: Allocation) => {
        if (!confirm(`Remove assignment of "${alloc.project_title}" from judge ${alloc.judge_name}?`)) return;
        try {
            await judgingApi.manualAllocate({
                judge_id: alloc.judge_id,
                project_id: alloc.project_id,
                allocation_id: alloc.allocation_id,
                action: 'remove',
            });
            toast.success('Allocation removed');
            await fetchAllocations();
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove allocation');
        }
    };

    const handleToggleShortlist = async (projectId: string) => {
        const newRankings = rankings.map(r =>
            r.project_id === projectId ? { ...r, shortlisted: !r.shortlisted } : r
        );
        setRankings(newRankings);

        const shortlistedIds = newRankings.filter(r => r.shortlisted).map(r => r.project_id);

        try {
            await judgingApi.saveShortlist(EVENT_ID, {
                round: selectedRound,
                advance_to: 'finals',
                project_ids: shortlistedIds,
            });
            toast.success('Shortlist updated');
        } catch (err: any) {
            toast.error('Failed to save shortlist');
        }
    };

    // ─── Computed Stats ──────────────────────────────────────

    const stats = useMemo(() => ({
        totalJudges: judges.length,
        totalAllocations: allocations.length,
        reviewedCount: allocations.filter(a => a.status === 'reviewed').length,
        pendingCount: allocations.filter(a => a.status === 'assigned').length,
        avgScore: rankings.length ? (rankings.reduce((s, r) => s + r.avg_weighted_score, 0) / rankings.length).toFixed(1) : '0',
        shortlistedCount: rankings.filter(r => r.shortlisted).length,
    }), [judges, allocations, rankings]);

    // ═════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Gavel className="h-8 w-8 text-primary" />
                        Judging System
                    </h2>
                    <p className="text-muted-foreground">Manage judges, rubrics, allocations, and rankings.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export Results</Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Judges</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalJudges}</div>
                        <p className="text-xs text-muted-foreground">{stats.totalJudges > 0 ? 'Active panel members' : 'No judges invited yet'}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Evaluations</CardTitle>
                        <Scale className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.reviewedCount}/{stats.totalAllocations}</div>
                        <p className="text-xs text-muted-foreground">{stats.pendingCount} pending reviews</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
                        <Star className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgScore}%</div>
                        <p className="text-xs text-muted-foreground">Weighted average across all projects</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Shortlisted</CardTitle>
                        <Award className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.shortlistedCount}</div>
                        <p className="text-xs text-muted-foreground">Projects advancing to finals</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="judges" className="flex items-center gap-1.5"><Users className="h-4 w-4" /><span className="hidden sm:inline">Judges</span></TabsTrigger>
                    <TabsTrigger value="rubric" className="flex items-center gap-1.5"><Target className="h-4 w-4" /><span className="hidden sm:inline">Rubric</span></TabsTrigger>
                    <TabsTrigger value="allocations" className="flex items-center gap-1.5"><Shuffle className="h-4 w-4" /><span className="hidden sm:inline">Allocations</span></TabsTrigger>
                    <TabsTrigger value="rankings" className="flex items-center gap-1.5"><Trophy className="h-4 w-4" /><span className="hidden sm:inline">Rankings</span></TabsTrigger>
                </TabsList>

                {/* ═══ TAB 1: JUDGES ═══ */}
                <TabsContent value="judges" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Judge Panel</CardTitle>
                                <CardDescription>Manage judges, expertise tags, and conflict-of-interest flags.</CardDescription>
                            </div>
                            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                                <DialogTrigger asChild>
                                    <Button><UserPlus className="mr-2 h-4 w-4" /> Invite Judge</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Invite New Judge</DialogTitle>
                                        <DialogDescription>Add a judge to the evaluation panel.</DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Full Name</Label>
                                            <Input placeholder="Dr. Jane Smith" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input type="email" placeholder="jane@university.edu" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Organization</Label>
                                            <Input placeholder="University / Company" value={inviteForm.organization} onChange={e => setInviteForm(p => ({ ...p, organization: e.target.value }))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Expertise Tags <span className="text-muted-foreground text-xs">(comma-separated)</span></Label>
                                            <Input placeholder="AI/ML, Web, Blockchain" value={inviteForm.tags} onChange={e => setInviteForm(p => ({ ...p, tags: e.target.value }))} />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                                        <Button onClick={handleInviteJudge}><UserPlus className="mr-2 h-4 w-4" /> Send Invite</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Judge</TableHead>
                                        <TableHead>Expertise</TableHead>
                                        <TableHead>Organization</TableHead>
                                        <TableHead className="text-center">Assigned</TableHead>
                                        <TableHead className="text-center">Reviewed</TableHead>
                                        <TableHead>Flags</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {judges.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-6 w-6 opacity-40" />
                                                    <p className="text-sm">No judges yet. Click &quot;Invite Judge&quot; to add one.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : judges.map(judge => (
                                        <TableRow key={judge.judge_id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{judge.name}</p>
                                                    <p className="text-xs text-muted-foreground">{judge.email}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {judge.expertise_tags.map(tag => (
                                                        <Badge key={tag} variant="outline" className={`text-xs ${getTagColor(tag)}`}>{tag}</Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{judge.organization || '—'}</TableCell>
                                            <TableCell className="text-center font-medium">{judge.assigned_count}</TableCell>
                                            <TableCell className="text-center font-medium">{judge.reviewed_count}</TableCell>
                                            <TableCell>
                                                {judge.coi_flags.length > 0 ? (
                                                    <Badge variant="destructive" className="text-xs"><Flag className="mr-1 h-3 w-3" /> {judge.coi_flags.length} COI</Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveJudge(judge.judge_id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 2: RUBRIC BUILDER ═══ */}
                <TabsContent value="rubric" className="space-y-4">
                    <div className="grid gap-4 lg:grid-cols-3">
                        {/* Current Rubric */}
                        <Card className="lg:col-span-2">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Scoring Rubric</CardTitle>
                                    <CardDescription>
                                        Define evaluation criteria and their weights.
                                        <span className={`ml-2 font-semibold ${Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 'text-destructive'}`}>
                                            Total: {totalWeight}%
                                        </span>
                                    </CardDescription>
                                </div>
                                <Button onClick={handleSaveRubric} disabled={Math.abs(totalWeight - 100) > 0.01}>
                                    <Save className="mr-2 h-4 w-4" /> Save Rubric
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Criteria</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="text-center">Weight</TableHead>
                                            <TableHead className="text-center">Max Score</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {criteria.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell className="font-medium">{c.name}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.description || '—'}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline" className="font-mono">{c.weight}%</Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground">{c.max_score}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleRemoveCriteria(c.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {Math.abs(totalWeight - 100) > 0.01 && (
                                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Weights must sum to 100%. Currently at {totalWeight}%.
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Add New Criteria */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Add Criteria</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Name</Label>
                                    <Input placeholder="e.g. Scalability" value={newCriteria.name} onChange={e => setNewCriteria(p => ({ ...p, name: e.target.value }))} />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Weight (%)</Label>
                                        <Input type="number" placeholder="20" value={newCriteria.weight} onChange={e => setNewCriteria(p => ({ ...p, weight: e.target.value }))} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Max Score</Label>
                                        <Input type="number" placeholder="10" value={newCriteria.max_score} onChange={e => setNewCriteria(p => ({ ...p, max_score: e.target.value }))} />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Description</Label>
                                    <Textarea placeholder="What this criteria evaluates..." className="min-h-[60px]" value={newCriteria.description} onChange={e => setNewCriteria(p => ({ ...p, description: e.target.value }))} />
                                </div>
                                <Button className="w-full" onClick={handleAddCriteria}><Plus className="mr-2 h-4 w-4" /> Add Criteria</Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ═══ TAB 3: ALLOCATIONS ═══ */}
                <TabsContent value="allocations" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Project Allocations</CardTitle>
                                <CardDescription>Assign projects to judges automatically or manually override.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Dialog open={manualAllocOpen} onOpenChange={setManualAllocOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Manual Allocate</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Manual Allocation</DialogTitle>
                                            <DialogDescription>Assign a specific team to a judge for evaluation.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-2">
                                            <div className="space-y-2">
                                                <Label>Select Team</Label>
                                                <Select value={manualForm.project_id} onValueChange={val => setManualForm(p => ({ ...p, project_id: val }))}>
                                                    <SelectTrigger><SelectValue placeholder="Select a team" /></SelectTrigger>
                                                    <SelectContent>
                                                        {teams.map(t => (
                                                            <SelectItem key={t.team_id} value={t.team_id}>{t.name} ({t.track})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Select Judge</Label>
                                                <Select value={manualForm.judge_id} onValueChange={val => setManualForm(p => ({ ...p, judge_id: val }))}>
                                                    <SelectTrigger><SelectValue placeholder="Select a judge" /></SelectTrigger>
                                                    <SelectContent>
                                                        {judges.map(j => (
                                                            <SelectItem key={j.judge_id} value={j.judge_id}>{j.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Evaluation Round</Label>
                                                <Select value={manualForm.round} onValueChange={val => setManualForm(p => ({ ...p, round: val }))}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="round_1">Round 1</SelectItem>
                                                        <SelectItem value="finals">Finals</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setManualAllocOpen(false)}>Cancel</Button>
                                            <Button onClick={handleManualAllocate} disabled={isAllocating}>
                                                {isAllocating ? 'Allocating...' : 'Assign Project'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={autoAllocOpen} onOpenChange={setAutoAllocOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Shuffle className="mr-2 h-4 w-4" /> Auto-Allocate
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Intelligent Auto-Allocation</DialogTitle>
                                            <DialogDescription>Assign projects to judges using a load-balancing algorithm.</DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-2">
                                            <div className="space-y-2">
                                                <Label>Judges per Project</Label>
                                                <Input type="number" min={1} max={10} value={judgesPerProject} onChange={e => setJudgesPerProject(Number(e.target.value) || 1)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Evaluation Round</Label>
                                                <Select value={selectedRound} onValueChange={setSelectedRound}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="round_1">Round 1</SelectItem>
                                                        <SelectItem value="finals">Finals (Shortlisted only)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground mt-1">If Finals is selected, only shortlisted projects will be assigned.</p>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setAutoAllocOpen(false)}>Cancel</Button>
                                            <Button onClick={handleAutoAllocate} disabled={isAllocating}>
                                                {isAllocating ? 'Allocating...' : 'Start Allocation'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Judge</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Track</TableHead>
                                        <TableHead>Round</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Assigned At</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allocations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Shuffle className="h-6 w-6 opacity-40" />
                                                    <p className="text-sm">No allocations yet. Click &quot;Auto-Allocate&quot; to assign projects.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : allocations.map(alloc => (
                                        <TableRow key={alloc.allocation_id}>
                                            <TableCell className="font-medium">{alloc.judge_name}</TableCell>
                                            <TableCell>{alloc.project_title}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getTagColor(alloc.track || '')}>{alloc.track || '—'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm capitalize">{alloc.round.replace('_', ' ')}</TableCell>
                                            <TableCell><StatusBadge status={alloc.status} /></TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {alloc.assigned_at ? new Date(alloc.assigned_at).toLocaleDateString() : '—'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveAllocation(alloc)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ═══ TAB 4: RANKINGS ═══ */}
                <TabsContent value="rankings" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Live Rankings</CardTitle>
                                <CardDescription>
                                    {selectedRound === 'round_1'
                                        ? 'Aggregated scores from Round 1. Select teams to advance to the Finals round.'
                                        : 'Final round rankings. These are the results.'}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={selectedRound} onValueChange={setSelectedRound}>
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="round_1">Round 1</SelectItem>
                                        <SelectItem value="finals">Finals</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" /> Export</Button>
                                {selectedRound === 'finals' && (
                                    <Button onClick={handleSaveRankings} className="bg-green-600 hover:bg-green-700 text-white">
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Save Results
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center">Rank</TableHead>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Team</TableHead>
                                        <TableHead>Track</TableHead>
                                        <TableHead className="text-center">Evaluations</TableHead>
                                        <TableHead className="text-center">Avg. Score</TableHead>
                                        {selectedRound === 'round_1' && <TableHead className="text-center">Advance to Finals</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rankings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={selectedRound === 'round_1' ? 7 : 6} className="h-32 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Trophy className="h-6 w-6 opacity-40" />
                                                    <p className="text-sm">No rankings available. Scores must be submitted first.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : rankings.map(r => (
                                        <TableRow key={r.project_id} className={r.shortlisted ? 'bg-green-50/50 dark:bg-green-950/10' : ''}>
                                            <TableCell className="text-center">
                                                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${r.rank === 1 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                                    r.rank === 2 ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' :
                                                        r.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                                                            'bg-muted text-muted-foreground'}`}>
                                                    {r.rank}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">{r.project_title}</TableCell>
                                            <TableCell className="text-muted-foreground">{r.team_name || '—'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getTagColor(r.track || '')}>{r.track || '—'}</Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-muted-foreground">{r.total_evaluations}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`font-bold ${r.avg_weighted_score >= 80 ? 'text-green-600 dark:text-green-400' :
                                                    r.avg_weighted_score >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-red-600 dark:text-red-400'}`}>
                                                    {r.avg_weighted_score.toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            {selectedRound === 'round_1' && (
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant={r.shortlisted ? 'default' : 'outline'}
                                                        size="sm"
                                                        className={r.shortlisted ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                                                        onClick={() => handleToggleShortlist(r.project_id)}
                                                    >
                                                        {r.shortlisted ? <><CheckCircle2 className="mr-1 h-3 w-3" /> Yes</> : 'Select'}
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
