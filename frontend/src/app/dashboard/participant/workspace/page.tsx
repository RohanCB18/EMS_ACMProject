'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Upload, Github, ExternalLink, Clock, CheckCircle2, X,
    Link2, Unlink, Loader2, Lock, Plus,
} from 'lucide-react';
import { setBApi, type Phase } from '@/lib/api/set-b';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthProvider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubmissionData {
    projectName: string;
    description: string;
    githubUrl: string;
    techStack: string[];
    submittedAt?: object | null;
    submittedBy?: string;
    isSubmitted?: boolean;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
    const { profile, user } = useAuth();

    // Phase
    const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
    const [loading, setLoading] = useState(true);

    // Repo
    const [repoUrl, setRepoUrl] = useState('');
    const [linkedRepo, setLinkedRepo] = useState<string | null>(null);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [repoError, setRepoError] = useState('');

    // Project form
    const [projectName, setProjectName] = useState('');
    const [description, setDescription] = useState('');
    const [techInput, setTechInput] = useState('');
    const [techStack, setTechStack] = useState<string[]>([]);

    // Submission state
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    // Use team_id if available, otherwise fall back to the user's own UID
    const teamId = profile?.team_id ?? user?.uid ?? null;

    // ── Load phase + existing submission from Firestore ──────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const phaseRes = await setBApi.getCurrentPhase();
                if ('phase' in phaseRes && phaseRes.phase) setCurrentPhase(phaseRes.phase);
                else if ('id' in phaseRes) setCurrentPhase(phaseRes as Phase);
            } catch { /* ignore */ }

            if (teamId) {
                try {
                    const snap = await getDoc(doc(db, 'submissions', teamId));
                    if (snap.exists()) {
                        const d = snap.data() as SubmissionData;
                        setProjectName(d.projectName ?? '');
                        setDescription(d.description ?? '');
                        setTechStack(d.techStack ?? []);
                        if (d.githubUrl) setLinkedRepo(d.githubUrl);
                        if (d.isSubmitted) setIsSubmitted(true);
                    }
                } catch { /* ignore */ }
            }

            setLoading(false);
        };
        init();
    }, [teamId]);

    // ── Helpers ──────────────────────────────────────────────────────────────

    const canEdit = currentPhase?.featureFlags?.allowEdits ?? true;
    const canSubmit = currentPhase?.featureFlags?.allowSubmission ?? true;

    const validateGithubUrl = (url: string) =>
        /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/.*)?$/.test(url.trim());

    const getRepoName = (url: string): string => {
        try {
            const parts = url.replace(/\/$/, '').split('/');
            return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        } catch { return url; }
    };

    const buildPayload = (extra: Partial<SubmissionData> = {}): SubmissionData => ({
        projectName,
        description,
        githubUrl: linkedRepo ?? '',
        techStack,
        ...extra,
    });

    // ── Save draft ────────────────────────────────────────────────────────────

    const handleSaveDraft = async () => {
        if (!teamId) return toast.error('Could not identify user. Please refresh.');
        setSavingDraft(true);
        try {
            await setDoc(
                doc(db, 'submissions', teamId),
                { ...buildPayload(), lastSavedAt: serverTimestamp(), isSubmitted: false },
                { merge: true }
            );
            toast.success('Draft saved!');
        } catch {
            toast.error('Failed to save draft.');
        } finally {
            setSavingDraft(false);
        }
    };

    // ── Submit project ────────────────────────────────────────────────────────

    const handleProjectSubmit = async () => {
        if (!teamId) return toast.error('Could not identify user — please refresh the page.');
        if (!projectName.trim()) return toast.error('Please fill in the project name.');
        if (!description.trim()) return toast.error('Please fill in the project description.');

        if (!canSubmit) {
            toast.warning('Submission window is not active, but saving anyway for testing...');
        }

        setSubmitting(true);
        try {
            await setDoc(
                doc(db, 'submissions', teamId),
                {
                    ...buildPayload(),
                    isSubmitted: true,
                    submittedAt: serverTimestamp(),
                    submittedBy: profile?.display_name ?? user?.email ?? 'Unknown',
                },
                { merge: true }
            );
            setIsSubmitted(true);
            toast.success('Project submitted! Judges can now see your details.');
        } catch (err: unknown) {
            console.error('Submission error:', err);
            const msg = err instanceof Error ? err.message : String(err);
            toast.error(`Submission failed: ${msg}`);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Repo actions ──────────────────────────────────────────────────────────

    const handleLinkRepo = () => {
        if (!canEdit) return toast.error('Linking is locked in this phase.');
        const trimmed = repoUrl.trim();
        if (!trimmed) { setRepoError('Please enter a repository URL.'); return; }
        if (!validateGithubUrl(trimmed)) {
            setRepoError('Please enter a valid GitHub URL (e.g. https://github.com/user/repo).');
            return;
        }
        setLinkedRepo(trimmed);
        setRepoUrl('');
        setRepoError('');
        setShowLinkForm(false);
        toast.success('Repository linked!');
    };

    const handleUnlinkRepo = () => {
        if (!canEdit) return toast.error('Unlinking is locked in this phase.');
        setLinkedRepo(null);
        setRepoUrl('');
        setRepoError('');
        toast.info('Repository unlinked.');
    };

    // ── Tech Stack ────────────────────────────────────────────────────────────

    const addTag = () => {
        const tag = techInput.trim();
        if (tag && !techStack.includes(tag)) setTechStack(prev => [...prev, tag]);
        setTechInput('');
    };

    const removeTag = (tag: string) => setTechStack(prev => prev.filter(t => t !== tag));

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workspace</h2>
                    <p className="text-muted-foreground">Manage your project submission and resources.</p>
                </div>

                {isSubmitted ? (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-600 font-medium text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Project Submitted
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSaveDraft}
                            disabled={!canEdit || savingDraft}
                        >
                            {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Draft
                        </Button>
                        <Button onClick={handleProjectSubmit} disabled={submitting}>
                            {submitting
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                : canSubmit
                                    ? <Upload className="mr-2 h-4 w-4" />
                                    : <Lock className="mr-2 h-4 w-4" />}
                            {canSubmit ? 'Submit Project' : 'Submissions Closed'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Status Cards Row */}
            <div className="grid gap-4 md:grid-cols-3">

                {/* Project Status */}
                <Card className={isSubmitted
                    ? 'border-green-500/30 bg-green-500/5'
                    : 'bg-primary/5 border-primary/20'}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Project Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isSubmitted ? (
                            <>
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-semibold">Submitted</span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Your project is visible to judges.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-amber-500">
                                    <Clock className="h-5 w-5" />
                                    <span className="font-semibold">In Progress</span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Phase: <span className="font-medium">{currentPhase?.name || 'Unknown'}</span>
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Repository Card */}
                <Card className={linkedRepo ? 'border-green-500/30 bg-green-500/5' : ''}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Repository</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {linkedRepo ? (
                            <>
                                <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-semibold">Linked</span>
                                </div>
                                <a
                                    href={linkedRepo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                                >
                                    <Github className="h-4 w-4" />
                                    {getRepoName(linkedRepo)}
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                                {canEdit && !isSubmitted && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="px-0 h-auto mt-2 text-destructive hover:text-destructive"
                                        onClick={handleUnlinkRepo}
                                    >
                                        <Unlink className="mr-1 h-3.5 w-3.5" /> Unlink repository
                                    </Button>
                                )}
                            </>
                        ) : showLinkForm ? (
                            <div className="space-y-2">
                                <input
                                    type="url"
                                    value={repoUrl}
                                    onChange={(e) => { setRepoUrl(e.target.value); setRepoError(''); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLinkRepo()}
                                    placeholder="https://github.com/user/repo"
                                    autoFocus
                                    disabled={!canEdit}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                {repoError && <p className="text-xs text-destructive">{repoError}</p>}
                                <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={handleLinkRepo} disabled={!canEdit}>
                                        <Link2 className="mr-1 h-3.5 w-3.5" /> Link
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => { setShowLinkForm(false); setRepoUrl(''); setRepoError(''); }}>
                                        <X className="mr-1 h-3.5 w-3.5" /> Cancel
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Github className="h-5 w-5" />
                                    <span className="font-semibold">{canEdit ? 'Not linked yet' : 'Linking locked'}</span>
                                </div>
                                {canEdit && (
                                    <Button variant="link" className="px-0 h-auto mt-2 text-primary" onClick={() => setShowLinkForm(true)}>
                                        Link GitHub repo &rarr;
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Feature Gating */}
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Feature Gating</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Team Edits:</span>
                            {canEdit
                                ? <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Open</Badge>
                                : <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Locked</Badge>}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Submissions:</span>
                            {canSubmit
                                ? <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                                : <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Closed</Badge>}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Project Details Form */}
            <Card className={!canEdit || isSubmitted ? 'opacity-80' : ''}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Project Details
                        {isSubmitted
                            ? <Badge className="bg-green-500/10 text-green-600 border-green-500/20 font-medium">Submitted</Badge>
                            : (!canEdit && <Lock className="h-4 w-4 text-muted-foreground" />)}
                    </CardTitle>
                    <CardDescription>
                        {isSubmitted
                            ? 'Your project details have been submitted and are visible to judges.'
                            : canEdit
                                ? 'Fill in your project information for the judges.'
                                : 'Project details are locked for editing in this phase.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Project Name <span className="text-destructive">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. EcoTrack AI"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                disabled={!canEdit || isSubmitted}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">GitHub URL</label>
                            <input
                                type="text"
                                value={linkedRepo ?? ''}
                                readOnly
                                disabled
                                placeholder="Link a repo above ↑"
                                className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Description <span className="text-destructive">*</span></label>
                        <textarea
                            placeholder="Briefly describe your project, the problem it solves, and your approach..."
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={!canEdit || isSubmitted}
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">Tech Stack</label>
                        {!isSubmitted && canEdit && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={techInput}
                                    onChange={(e) => setTechInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                    placeholder="e.g. Next.js, Python, Firebase"
                                    className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <Button type="button" variant="outline" size="icon" onClick={addTag}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        {techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {techStack.map((tag) => (
                                    <span key={tag} className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
                                        {tag}
                                        {canEdit && !isSubmitted && (
                                            <button onClick={() => removeTag(tag)} className="hover:text-destructive transition-colors">
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Submission Checklist */}
            <Card>
                <CardHeader>
                    <CardTitle>Submission Checklist</CardTitle>
                    <CardDescription>Complete all items before submitting your project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="text-sm">Team formed and registered</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {linkedRepo ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                        <span className={`text-sm ${!linkedRepo ? 'text-muted-foreground' : ''}`}>GitHub repository linked</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {projectName.trim() ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                        <span className={`text-sm ${!projectName.trim() ? 'text-muted-foreground' : ''}`}>Project name filled</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {description.trim() ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                        <span className={`text-sm ${!description.trim() ? 'text-muted-foreground' : ''}`}>Project description filled</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {isSubmitted
                            ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                            : canSubmit
                                ? <Clock className="h-5 w-5 text-amber-500" />
                                : <Lock className="h-5 w-5 text-muted-foreground" />}
                        <span className={`text-sm ${!canSubmit && !isSubmitted ? 'text-muted-foreground' : ''}`}>
                            {isSubmitted ? 'Project submitted ✓' : canSubmit ? 'Submission window active' : 'Submission window not open'}
                        </span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
