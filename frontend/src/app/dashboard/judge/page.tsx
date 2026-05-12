'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    ClipboardList, CheckCircle2, Clock, Star, Send, Eye,
    FileText, MessageSquare, Lock, Trophy, BarChart3,
} from 'lucide-react';

import { getAuth } from 'firebase/auth';
import { judgingApi } from '@/lib/api/judging';

// ─── Types ────────────────────────────────────────────────

interface Assignment {
    allocation_id: string;
    project_id: string;
    project_title: string;
    track: string;
    team_name: string;
    status: 'assigned' | 'reviewed';
    round: string;
}

interface RubricCriteria {
    id: string;
    name: string;
    weight: number;
    max_score: number;
    description?: string;
}

interface PastEvaluation {
    score_id: string;
    project_id: string;
    project_title: string;
    weighted_total: number;
    overall_comment?: string;
    submitted_at: string;
    round: string;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export default function JudgeDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const tabParam = searchParams.get('tab');
    
    const [activeTab, setActiveTab] = useState(tabParam || 'assignments');

    // Sync state with URL param if it changes externally
    useEffect(() => {
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam, activeTab]);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        router.push(`/dashboard/judge?tab=${val}`, { scroll: false });
    };

    // ─── State ───────────────────────────────────────────────
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [pastEvaluations, setPastEvaluations] = useState<PastEvaluation[]>([]);

    const EVENT_ID = 'default_event';
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rubric, setRubric] = useState<RubricCriteria[]>([
        { id: 'innovation', name: 'Innovation', weight: 25, max_score: 10, description: 'Novelty and creativity of the solution' },
        { id: 'execution', name: 'Execution', weight: 30, max_score: 10, description: 'Quality of implementation and code' },
        { id: 'presentation', name: 'Presentation', weight: 20, max_score: 10, description: 'Clarity of demo and pitch' },
        { id: 'impact', name: 'Impact', weight: 25, max_score: 10, description: 'Real-world applicability and potential' },
    ]);

    // Scoring form state
    const [scoringProject, setScoringProject] = useState<Assignment | null>(null);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [overallComment, setOverallComment] = useState('');
    const [privateNotes, setPrivateNotes] = useState('');

    // ─── Data Fetchers (Real API) ────────────────────────────

    const getJudgeId = useCallback(async (): Promise<string | null> => {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            if (!user) return null;
            // Try to find the judge doc by email
            const judges = await judgingApi.listJudges();
            const match = judges.find(j => j.email === user.email);
            return match?.judge_id || user.uid;
        } catch {
            return null;
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const judgeId = await getJudgeId();
            if (!judgeId) {
                setLoading(false);
                return;
            }

            // Fetch assignments for this judge
            const allocs = await judgingApi.getJudgeAllocations(judgeId);
            const pending = allocs
                .filter(a => a.status === 'assigned')
                .map(a => ({
                    allocation_id: a.allocation_id,
                    project_id: a.project_id,
                    project_title: a.project_title,
                    track: a.track || '',
                    team_name: a.judge_name, // Will be enriched later
                    status: a.status as 'assigned' | 'reviewed',
                    round: a.round,
                }));
            setAssignments(pending);

            // Fetch past evaluations
            const evalScores = await judgingApi.getJudgeScores(judgeId);
            const evals = evalScores.map(s => ({
                score_id: s.score_id,
                project_id: s.project_id,
                project_title: s.project_title,
                weighted_total: s.weighted_total,
                overall_comment: s.overall_comment,
                submitted_at: s.submitted_at || '',
                round: s.round,
            }));
            setPastEvaluations(evals);

            // Try to fetch rubric
            try {
                const rubrics = await judgingApi.getRubrics(EVENT_ID);
                if (rubrics && rubrics.length > 0) {
                    setRubric(rubrics[0].criteria);
                }
            } catch (error) {
                console.warn('Using default rubric as fetch failed or no rubric set.');
            }
        } catch (err: any) {
            console.error('Failed to load judge data:', err);
        } finally {
            setLoading(false);
        }
    }, [getJudgeId, EVENT_ID]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Scoring Logic ───────────────────────────────────────

    const openScoringForm = (assignment: Assignment) => {
        setScoringProject(assignment);
        setScores({});
        setOverallComment('');
        setPrivateNotes('');
    };

    const weightedTotal = useMemo(() => {
        let total = 0;
        for (const c of rubric) {
            const score = scores[c.id] || 0;
            const normalized = (score / c.max_score) * 100;
            total += normalized * (c.weight / 100);
        }
        return Math.round(total * 100) / 100;
    }, [scores, rubric]);

    const handleSubmitScore = async () => {
        const unscored = rubric.filter(c => scores[c.id] === undefined || scores[c.id] === 0);
        if (unscored.length > 0) {
            toast.error(`Please score all criteria. Missing: ${unscored.map(c => c.name).join(', ')}`);
            return;
        }

        if (!scoringProject) return;

        setSubmitting(true);
        try {
            await judgingApi.submitScore({
                event_id: EVENT_ID,
                project_id: scoringProject.project_id,
                round: scoringProject.round,
                criteria_scores: rubric.map(c => ({
                    criteria_id: c.id,
                    score: scores[c.id] || 0,
                })),
                overall_comment: overallComment || undefined,
                private_notes: privateNotes || undefined,
            });

            // Move from assignments to past evaluations
            setAssignments(prev => prev.filter(a => a.allocation_id !== scoringProject.allocation_id));
            setPastEvaluations(prev => [{
                score_id: `s${Date.now()}`,
                project_id: scoringProject.project_id,
                project_title: scoringProject.project_title,
                weighted_total: weightedTotal,
                overall_comment: overallComment,
                submitted_at: new Date().toISOString(),
                round: scoringProject.round,
            }, ...prev]);

            setScoringProject(null);
            toast.success(`Score submitted for "${scoringProject.project_title}" — ${weightedTotal}%`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit score');
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Computed Stats ──────────────────────────────────────

    const stats = useMemo(() => ({
        pending: assignments.length,
        completed: pastEvaluations.length,
        avgScore: pastEvaluations.length
            ? (pastEvaluations.reduce((s, e) => s + e.weighted_total, 0) / pastEvaluations.length).toFixed(1)
            : '—',
    }), [assignments, pastEvaluations]);

    // ═══════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Trophy className="h-8 w-8 text-primary" />
                    Judge Dashboard
                </h2>
                <p className="text-muted-foreground">Evaluate assigned projects and submit your scores.</p>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Projects awaiting your evaluation</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.completed}</div>
                        <p className="text-xs text-muted-foreground">Evaluations submitted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Your Avg. Score</CardTitle>
                        <Star className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgScore}{stats.avgScore !== '—' ? '%' : ''}</div>
                        <p className="text-xs text-muted-foreground">Average weighted score given</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="assignments" className="flex items-center gap-1.5"><ClipboardList className="h-4 w-4" /> My Assignments</TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-1.5"><BarChart3 className="h-4 w-4" /> History</TabsTrigger>
                </TabsList>

                {/* ═══ Assignments Tab ═══ */}
                <TabsContent value="assignments" className="space-y-4">
                    {assignments.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                                <CheckCircle2 className="h-12 w-12 mb-4 opacity-30" />
                                <p className="text-lg font-medium">All caught up!</p>
                                <p className="text-sm">No pending assignments. Check back later.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {assignments.map(a => (
                                <Card key={a.allocation_id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base">{a.project_title}</CardTitle>
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800">
                                                <Clock className="mr-1 h-3 w-3" /> Pending
                                            </Badge>
                                        </div>
                                        <CardDescription>
                                            <span className="font-medium">{a.team_name}</span> • {a.track} • {a.round.replace('_', ' ')}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                        <Button className="w-full" onClick={() => openScoringForm(a)}>
                                            <Star className="mr-2 h-4 w-4" /> Evaluate Project
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ═══ History Tab ═══ */}
                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Evaluation History</CardTitle>
                            <CardDescription>Your previously submitted evaluations.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project</TableHead>
                                        <TableHead>Round</TableHead>
                                        <TableHead className="text-center">Score</TableHead>
                                        <TableHead>Comment</TableHead>
                                        <TableHead className="text-right">Submitted</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pastEvaluations.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                <p className="text-sm">No evaluations submitted yet.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : pastEvaluations.map(ev => (
                                        <TableRow key={ev.score_id}>
                                            <TableCell className="font-medium">{ev.project_title}</TableCell>
                                            <TableCell className="text-muted-foreground capitalize">{ev.round.replace('_', ' ')}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={`font-bold ${ev.weighted_total >= 80 ? 'text-green-600 dark:text-green-400' :
                                                    ev.weighted_total >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                                        'text-red-600 dark:text-red-400'}`}>
                                                    {ev.weighted_total.toFixed(1)}%
                                                </span>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                                                {ev.overall_comment || '—'}
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                {new Date(ev.submitted_at).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ═══ SCORING DIALOG ═══ */}
            <Dialog open={!!scoringProject} onOpenChange={(open) => { if (!open) setScoringProject(null); }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500" />
                            Evaluate: {scoringProject?.project_title}
                        </DialogTitle>
                        <DialogDescription>
                            Score each criterion below. The weighted total is calculated automatically.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-2">
                        {/* Rubric Criteria Inputs */}
                        {rubric.map(c => (
                            <div key={c.id} className="space-y-2 p-4 rounded-lg border bg-muted/30">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <Label className="text-sm font-semibold">{c.name}</Label>
                                        <span className="text-xs text-muted-foreground ml-2">({c.weight}% weight)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            min={0}
                                            max={c.max_score}
                                            className="w-20 text-center font-mono font-bold"
                                            placeholder="0"
                                            value={scores[c.id] ?? ''}
                                            onChange={e => {
                                                const val = Math.min(c.max_score, Math.max(0, parseFloat(e.target.value) || 0));
                                                setScores(prev => ({ ...prev, [c.id]: val }));
                                            }}
                                        />
                                        <span className="text-sm text-muted-foreground">/ {c.max_score}</span>
                                    </div>
                                </div>
                                {c.description && (
                                    <p className="text-xs text-muted-foreground">{c.description}</p>
                                )}
                                {/* Visual score bar */}
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full transition-all duration-300 bg-primary"
                                        style={{ width: `${((scores[c.id] || 0) / c.max_score) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Weighted Total Display */}
                        <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary/20 text-center">
                            <p className="text-sm text-muted-foreground">Weighted Total Score</p>
                            <p className={`text-4xl font-bold ${weightedTotal >= 80 ? 'text-green-600 dark:text-green-400' :
                                weightedTotal >= 60 ? 'text-amber-600 dark:text-amber-400' :
                                    'text-red-600 dark:text-red-400'}`}>
                                {weightedTotal}%
                            </p>
                        </div>

                        {/* Comments */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5"><MessageSquare className="h-4 w-4" /> Overall Comment</Label>
                            <Textarea
                                placeholder="Share your feedback about this project..."
                                className="min-h-[80px]"
                                value={overallComment}
                                onChange={e => setOverallComment(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> Private Notes <span className="text-xs text-muted-foreground">(only visible to you)</span></Label>
                            <Textarea
                                placeholder="Personal notes about this evaluation..."
                                className="min-h-[60px]"
                                value={privateNotes}
                                onChange={e => setPrivateNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setScoringProject(null)}>Cancel</Button>
                        <Button onClick={handleSubmitScore}>
                            <Send className="mr-2 h-4 w-4" /> Submit Evaluation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
