'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Github, ExternalLink, Clock, CheckCircle2, X, Link2, Unlink } from 'lucide-react';

export default function WorkspacePage() {
    const [repoUrl, setRepoUrl] = useState('');
    const [linkedRepo, setLinkedRepo] = useState<string | null>(null);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [repoError, setRepoError] = useState('');

    const validateGithubUrl = (url: string): boolean => {
        const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\/.*)?$/;
        return githubRegex.test(url.trim());
    };

    const handleLinkRepo = () => {
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
    };

    const handleUnlinkRepo = () => {
        setLinkedRepo(null);
        setRepoUrl('');
        setRepoError('');
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workspace</h2>
                    <p className="text-muted-foreground">Manage your project submission and resources.</p>
                </div>
                <Button>
                    <Upload className="mr-2 h-4 w-4" /> Submit Project
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
                            Your project has not been submitted yet. Start working on it!
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-0 h-auto mt-2 text-destructive hover:text-destructive"
                                    onClick={handleUnlinkRepo}
                                >
                                    <Unlink className="mr-1 h-3.5 w-3.5" /> Unlink repository
                                </Button>
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
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                </div>
                                {repoError && (
                                    <p className="text-xs text-destructive">{repoError}</p>
                                )}
                                <div className="flex items-center gap-2">
                                    <Button size="sm" onClick={handleLinkRepo}>
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
                                    <span className="font-semibold">Not linked yet</span>
                                </div>
                                <Button
                                    variant="link"
                                    className="px-0 h-auto mt-2 text-primary"
                                    onClick={() => setShowLinkForm(true)}
                                >
                                    Link GitHub repo &rarr;
                                </Button>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Submission Deadline</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 text-red-500">
                            <Clock className="h-5 w-5" />
                            <span className="font-semibold">5 days remaining</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Make sure to submit before the deadline.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Fill in your project information for the judges.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Project Name</label>
                        <input
                            type="text"
                            placeholder="Enter your project name"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                            placeholder="Describe your project, the problem it solves, and the technologies used..."
                            rows={4}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Demo Link</label>
                        <input
                            type="url"
                            placeholder="https://your-demo-link.com"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Project name and description added</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        {linkedRepo ? (
                            <>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                <span className="text-sm">GitHub repository linked</span>
                            </>
                        ) : (
                            <>
                                <Clock className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">GitHub repository linked</span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Demo link provided</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Final submission uploaded</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
