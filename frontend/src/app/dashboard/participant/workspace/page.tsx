'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Github, ExternalLink, Clock, CheckCircle2, X, Link2, Unlink, Loader2, Lock } from 'lucide-react';
import { setBApi, type Phase } from '@/lib/api/set-b';
import { toast } from 'sonner';

export default function WorkspacePage() {
    const [repoUrl, setRepoUrl] = useState('');
    const [linkedRepo, setLinkedRepo] = useState<string | null>(null);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [repoError, setRepoError] = useState('');
    const [currentPhase, setCurrentPhase] = useState<Phase | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPhase = async () => {
            try {
                const phaseRes = await setBApi.getCurrentPhase();
                if ('phase' in phaseRes && phaseRes.phase) {
                    setCurrentPhase(phaseRes.phase);
                } else if ('id' in phaseRes) {
                    setCurrentPhase(phaseRes as Phase);
                }
            } catch (error) {
                console.error('Failed to fetch current phase:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPhase();
    }, []);

    const validateGithubUrl = (url: string): boolean => {
        const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/.*)?$/;
        return githubRegex.test(url.trim());
    };

    const handleLinkRepo = () => {
        if (currentPhase?.featureFlags?.allowEdits === false) {
            toast.error('Linking repository is locked in this phase.');
            return;
        }
        const trimmed = repoUrl.trim();
        if (!trimmed) {
            setRepoError('Please enter a repository URL.');
            return;
        }
        if (!validateGithubUrl(trimmed)) {
            setRepoError('Please enter a valid GitHub URL (e.g. https://github.com/user/repo).');
            return;
        }
        setLinkedRepo(trimmed);
        setRepoUrl('');
        setRepoError('');
        setShowLinkForm(false);
        toast.success('Repository linked successfully!');
    };

    const handleUnlinkRepo = () => {
        if (currentPhase?.featureFlags?.allowEdits === false) {
            toast.error('Unlinking repository is locked in this phase.');
            return;
        }
        setLinkedRepo(null);
        setRepoUrl('');
        setRepoError('');
        toast.info('Repository unlinked.');
    };

    const handleProjectSubmit = () => {
        if (currentPhase?.featureFlags?.allowSubmission === false) {
            toast.error('Submissions are currently closed.');
            return;
        }
        toast.success('Project submitted successfully!');
    };

    // Extract owner/repo from GitHub URL for display
    const getRepoName = (url: string): string => {
        try {
            const parts = url.replace(/\/$/, '').split('/');
            const repo = parts.pop() || '';
            const owner = parts.pop() || '';
            return `${owner}/${repo}`;
        } catch {
            return url;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const canEdit = currentPhase?.featureFlags?.allowEdits ?? true;
    const canSubmit = currentPhase?.featureFlags?.allowSubmission ?? false;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workspace</h2>
                    <p className="text-muted-foreground">Manage your project submission and resources.</p>
                </div>
                <Button onClick={handleProjectSubmit} disabled={!canSubmit}>
                    {canSubmit ? <Upload className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" />}
                    {canSubmit ? 'Submit Project' : 'Submissions Closed'}
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Project Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-amber-500">
                            <Clock className="h-5 w-5" />
                            <span className="font-semibold">In Progress</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Phase: <span className="font-medium">{currentPhase?.name || 'Unknown'}</span>
                        </p>
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
                                {canEdit && (
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
                                <div className="flex items-center gap-2">
                                    <input
                                        type="url"
                                        value={repoUrl}
                                        onChange={(e) => {
                                            setRepoUrl(e.target.value);
                                            setRepoError('');
                                        }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleLinkRepo()}
                                        placeholder="https://github.com/user/repo"
                                        autoFocus
                                        disabled={!canEdit}
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>
                                {repoError && (
                                    <p className="text-xs text-destructive">{repoError}</p>
                                )}
                                <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={handleLinkRepo} disabled={!canEdit}>
                                        <Link2 className="mr-1 h-3.5 w-3.5" /> Link
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            setShowLinkForm(false);
                                            setRepoUrl('');
                                            setRepoError('');
                                        }}
                                    >
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
                                    <Button
                                        variant="link"
                                        className="px-0 h-auto mt-2 text-primary"
                                        onClick={() => setShowLinkForm(true)}
                                    >
                                        Link GitHub repo &rarr;
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Feature Gating</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Team Edits:</span>
                            {canEdit ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Open</Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Locked</Badge>
                            )}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Submissions:</span>
                            {canSubmit ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">Active</Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20">Closed</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className={!canEdit ? 'opacity-80' : ''}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        Project Details
                        {!canEdit && <Lock className="h-4 w-4 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription>
                        {canEdit ? 'Fill in your project information for the judges.' : 'Project details are locked for editing in this phase.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Project Name</label>
                        <input
                            type="text"
                            placeholder="Enter your project name"
                            disabled={!canEdit}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            placeholder="Describe your project..."
                            rows={4}
                            disabled={!canEdit}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </CardContent>
            </Card>

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
                        {canSubmit ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                        <span className={`text-sm ${!canSubmit ? 'text-muted-foreground' : ''}`}>Submission window active</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
