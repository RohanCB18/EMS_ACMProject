'use client';

/**
 * Sub-Module 2: Team Workspace
 * Route: /dashboard/workspace
 *
 * Tabs:
 *  1. Shared Notes   — real-time Firestore note, any member can edit
 *  2. Problem Statement — one-time fetch, selection gated to Ideation phase
 *  3. Project Details  — form saved to submissions/{teamId}
 *  4. Submission History — subcollection log of past saves
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    doc, getDoc, getDocs, setDoc, onSnapshot,
    collection, addDoc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    FileText, StickyNote, Layers, History, Loader2, Save,
    CheckCircle2, X, Plus
} from 'lucide-react';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ProblemStatement {
    id: string;
    title: string;
    description: string;
    track?: string;
}

interface SubmissionData {
    projectTitle: string;
    abstract: string;
    techStack: string[];
    githubUrl: string;
    demoUrl: string;
    lastSavedAt?: { seconds: number; nanoseconds: number } | null;
    lastSavedBy?: string;
}

interface HistoryEntry {
    id: string;
    savedAt: { seconds: number; nanoseconds: number } | null;
    savedBy: string;
    projectTitle: string;
}

// ──────────────────────────────────────────────
// Tab 1: Shared Notes
// ──────────────────────────────────────────────

function SharedNotesTab({ teamId, profile }: { teamId: string; profile: { display_name: string } | null }) {
    const [noteContent, setNoteContent] = useState('');
    const [lastEditedBy, setLastEditedBy] = useState('');
    const [lastEditedAt, setLastEditedAt] = useState<{ seconds: number } | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const noteRef = doc(db, 'teams', teamId, 'notes', 'shared');
        const unsub = onSnapshot(noteRef, (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                setNoteContent(d.content ?? '');
                setLastEditedBy(d.lastEditedBy ?? '');
                setLastEditedAt(d.lastEditedAt ?? null);
            }
        });
        return () => unsub();
    }, [teamId]);

    const saveNote = async () => {
        setSaving(true);
        try {
            const noteRef = doc(db, 'teams', teamId, 'notes', 'shared');
            await setDoc(noteRef, {
                content: noteContent,
                lastEditedBy: profile?.display_name ?? 'Unknown',
                lastEditedAt: serverTimestamp(),
            }, { merge: true });
            toast.success('Note saved successfully!');
        } catch {
            toast.error('Failed to save note.');
        } finally {
            setSaving(false);
        }
    };

    const formatTime = (ts: { seconds: number } | null) => {
        if (!ts) return null;
        return new Date(ts.seconds * 1000).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">Team Shared Notes</h3>
                    {lastEditedBy && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Last edited by <span className="font-medium">{lastEditedBy}</span>
                            {lastEditedAt && ` · ${formatTime(lastEditedAt)}`}
                        </p>
                    )}
                </div>
                <Button onClick={saveNote} disabled={saving} size="sm">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                </Button>
            </div>
            <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm resize-y"
                placeholder="Use this space for team notes, ideas, links, meeting notes..."
            />
        </div>
    );
}

// ──────────────────────────────────────────────
// Tab 2: Problem Statement Selection
// ──────────────────────────────────────────────

function ProblemStatementTab({ teamId, isIdeationPhase }: { teamId: string; isIdeationPhase: boolean }) {
    const [problems, setProblems] = useState<ProblemStatement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getDocs(collection(db, 'problemStatements')).then((snap) => {
            setProblems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProblemStatement)));
            setLoading(false);
        }).catch(() => setLoading(false));

        // Load current selection
        getDoc(doc(db, 'teams', teamId, 'notes', 'problemStatement')).then((snap) => {
            if (snap.exists()) setSelectedId(snap.data().selectedId ?? null);
        });
    }, [teamId]);

    const saveSelection = async (id: string) => {
        if (!isIdeationPhase) return;
        setSaving(true);
        try {
            await setDoc(doc(db, 'teams', teamId, 'notes', 'problemStatement'), {
                selectedId: id,
                selectedAt: serverTimestamp(),
            }, { merge: true });
            setSelectedId(id);
            toast.success('Problem statement selected!');
        } catch {
            toast.error('Failed to save selection.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading problem statements...</span></div>;

    return (
        <div className="space-y-4">
            {!isIdeationPhase && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    Problem statement selection is only available during the Ideation phase.
                </div>
            )}
            {problems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No problem statements published yet.</p>
            ) : (
                <div className="grid gap-3">
                    {problems.map((ps) => (
                        <Card
                            key={ps.id}
                            className={`cursor-pointer transition-all ${!isIdeationPhase ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-md'}
                                ${selectedId === ps.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                            onClick={() => isIdeationPhase && !saving && saveSelection(ps.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-semibold text-sm">{ps.title}</h4>
                                            {ps.track && <Badge variant="outline" className="text-xs">{ps.track}</Badge>}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{ps.description}</p>
                                    </div>
                                    {selectedId === ps.id && (
                                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Tab 3: Project Details Form
// ──────────────────────────────────────────────

function ProjectDetailsTab({ teamId, isSubmissionAllowed, profile }: {
    teamId: string;
    isSubmissionAllowed: boolean;
    profile: { display_name: string } | null;
}) {
    const [form, setForm] = useState<SubmissionData>({
        projectTitle: '', abstract: '', techStack: [], githubUrl: '', demoUrl: '',
    });
    const [techInput, setTechInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDoc(doc(db, 'submissions', teamId)).then((snap) => {
            if (snap.exists()) {
                const d = snap.data() as SubmissionData;
                setForm({
                    projectTitle: d.projectTitle ?? '',
                    abstract: d.abstract ?? '',
                    techStack: d.techStack ?? [],
                    githubUrl: d.githubUrl ?? '',
                    demoUrl: d.demoUrl ?? '',
                });
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [teamId]);

    const addTag = () => {
        const tag = techInput.trim();
        if (tag && !form.techStack.includes(tag)) {
            setForm((f) => ({ ...f, techStack: [...f.techStack, tag] }));
        }
        setTechInput('');
    };

    const removeTag = (tag: string) => {
        setForm((f) => ({ ...f, techStack: f.techStack.filter((t) => t !== tag) }));
    };

    const handleSave = async () => {
        if (!isSubmissionAllowed) return;
        setSaving(true);
        try {
            const historyRef = collection(db, 'submissions', teamId, 'history');
            await Promise.all([
                setDoc(doc(db, 'submissions', teamId), {
                    ...form,
                    lastSavedAt: serverTimestamp(),
                    lastSavedBy: profile?.display_name ?? 'Unknown',
                }, { merge: true }),
                addDoc(historyRef, {
                    ...form,
                    savedAt: serverTimestamp(),
                    savedBy: profile?.display_name ?? 'Unknown',
                }),
            ]);
            toast.success('Project details saved successfully!');
        } catch {
            toast.error('Failed to save project details.');
        } finally {
            setSaving(false);
        }
    };

    const disabled = !isSubmissionAllowed || saving || loading;

    if (loading) return <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading...</span></div>;

    return (
        <div className="space-y-5">
            {!isSubmissionAllowed && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                    Submission editing is not available in the current phase.
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="projectTitle">Project Title</Label>
                    <Input id="projectTitle" value={form.projectTitle} onChange={(e) => setForm((f) => ({ ...f, projectTitle: e.target.value }))} disabled={disabled} placeholder="e.g. EcoTrack AI" />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="githubUrl">GitHub URL</Label>
                    <Input id="githubUrl" value={form.githubUrl} onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))} disabled={disabled} placeholder="https://github.com/..." />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="demoUrl">Demo / Drive URL</Label>
                <Input id="demoUrl" value={form.demoUrl} onChange={(e) => setForm((f) => ({ ...f, demoUrl: e.target.value }))} disabled={disabled} placeholder="https://drive.google.com/..." />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="abstract">Project Abstract</Label>
                <Textarea
                    id="abstract"
                    value={form.abstract}
                    onChange={(e) => setForm((f) => ({ ...f, abstract: e.target.value }))}
                    disabled={disabled}
                    className="min-h-[120px] resize-y"
                    placeholder="Briefly describe your project, the problem it solves, and your approach..."
                />
            </div>

            <div className="space-y-1.5">
                <Label>Tech Stack</Label>
                <div className="flex gap-2">
                    <Input
                        value={techInput}
                        onChange={(e) => setTechInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        disabled={disabled}
                        placeholder="e.g. Next.js, Python, Firebase"
                        className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={addTag} disabled={disabled}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
                {form.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.techStack.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                {tag}
                                {isSubmissionAllowed && (
                                    <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                )}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <Button onClick={handleSave} disabled={disabled} className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Project Details
            </Button>
        </div>
    );
}

// ──────────────────────────────────────────────
// Tab 4: Submission History
// ──────────────────────────────────────────────

function SubmissionHistoryTab({ teamId }: { teamId: string }) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDocs(query(collection(db, 'submissions', teamId, 'history'), orderBy('savedAt', 'desc')))
            .then((snap) => {
                setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() } as HistoryEntry)));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [teamId]);

    const formatTime = (ts: { seconds: number } | null) => {
        if (!ts) return '—';
        return new Date(ts.seconds * 1000).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return <div className="flex items-center gap-2 py-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">Loading history...</span></div>;

    return (
        <div className="space-y-3">
            {history.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No submissions saved yet. Save your project details to start tracking.</p>
            ) : (
                history.map((entry, i) => (
                    <div key={entry.id} className={`flex items-start justify-between p-3 rounded-lg border ${i === 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'}`}>
                        <div>
                            <p className="text-sm font-medium">{entry.projectTitle || 'Untitled Project'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Saved by <span className="font-medium">{entry.savedBy}</span>
                            </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-xs text-muted-foreground">{formatTime(entry.savedAt)}</p>
                            {i === 0 && <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Latest</span>}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

// ──────────────────────────────────────────────
// Main Workspace Page
// ──────────────────────────────────────────────

export default function WorkspacePage() {
    const { profile, loading: authLoading } = useAuth();
    const [currentPhase, setCurrentPhase] = useState<{ featureFlags?: { allowEdits: boolean; allowSubmission: boolean } } | null>(null);

    // Listen for current phase feature flags
    useEffect(() => {
        const phasesQ = query(collection(db, 'phases'), orderBy('order'));
        const unsub = onSnapshot(phasesQ, (snap) => {
            const active = snap.docs.find((d) => d.data().isActive);
            setCurrentPhase(active ? { ...active.data() } as typeof currentPhase : null);
        });
        return () => unsub();
    }, []);

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const teamId = profile?.team_id ?? 'demo-team';
    const isIdeationPhase = currentPhase?.featureFlags?.allowEdits ?? true;
    const isSubmissionAllowed = currentPhase?.featureFlags?.allowSubmission ?? true;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Team Workspace</h2>
                <p className="text-muted-foreground mt-1">Collaborate with your team, manage submissions, and track history.</p>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Tabs defaultValue="notes" className="w-full">
                        <TabsList className="w-full rounded-none rounded-t-xl border-b bg-transparent h-auto p-0 justify-start">
                            {[
                                { value: 'notes', label: 'Shared Notes', icon: StickyNote },
                                { value: 'problems', label: 'Problem Statement', icon: Layers },
                                { value: 'project', label: 'Project Details', icon: FileText },
                                { value: 'history', label: 'History', icon: History },
                            ].map(({ value, label, icon: Icon }) => (
                                <TabsTrigger
                                    key={value}
                                    value={value}
                                    className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm gap-2"
                                >
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{label}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="p-6">
                            <TabsContent value="notes" className="mt-0">
                                <SharedNotesTab teamId={teamId} profile={profile} />
                            </TabsContent>
                            <TabsContent value="problems" className="mt-0">
                                <ProblemStatementTab teamId={teamId} isIdeationPhase={isIdeationPhase} />
                            </TabsContent>
                            <TabsContent value="project" className="mt-0">
                                <ProjectDetailsTab teamId={teamId} isSubmissionAllowed={isSubmissionAllowed} profile={profile} />
                            </TabsContent>
                            <TabsContent value="history" className="mt-0">
                                <SubmissionHistoryTab teamId={teamId} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
