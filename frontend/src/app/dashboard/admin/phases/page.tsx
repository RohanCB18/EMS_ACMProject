'use client';

/**
 * Sub-Module 3 (Admin): Phase Control Panel
 * Route: /dashboard/admin/phases
 *
 * Features:
 *  - Real-time phase stepper overview
 *  - Set active phase button
 *  - Feature flag toggles per phase (allowEdits, allowSubmission, allowJudging)
 *  - Redirects non-admins to /dashboard
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, API_URL } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { PhaseStepper, type Phase } from '@/components/PhaseStepper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, Zap } from 'lucide-react';
import { toast } from 'sonner';

// ──────────────────────────────────────────────
// Feature Flag Row
// ──────────────────────────────────────────────

function FeatureFlagRow({
    label,
    checked,
    onChange,
    disabled,
}: {
    label: string;
    checked: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-normal cursor-pointer">{label}</Label>
            <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </div>
    );
}

// ──────────────────────────────────────────────
// Phase Card
// ──────────────────────────────────────────────

function PhaseCard({
    phase,
    isActive,
    onSetActive,
    onFlagChange,
    settingActive,
    updatingFlags,
}: {
    phase: Phase;
    isActive: boolean;
    onSetActive: (id: string) => void;
    onFlagChange: (phaseId: string, flag: string, value: boolean) => void;
    settingActive: string | null;
    updatingFlags: string | null;
}) {
    const flags = phase.featureFlags ?? { allowEdits: false, allowSubmission: false, allowJudging: false };
    const isBusy = settingActive === phase.id || updatingFlags === phase.id;

    return (
        <Card className={`transition-all ${isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="text-muted-foreground text-sm font-normal">Phase {phase.order}</span>
                            {phase.name}
                        </CardTitle>
                        {isActive && (
                            <Badge className="mt-1 bg-primary/10 text-primary border border-primary/20 text-xs">
                                ⚡ Currently Active
                            </Badge>
                        )}
                    </div>
                    <Button
                        size="sm"
                        variant={isActive ? 'outline' : 'default'}
                        disabled={isActive || !!settingActive}
                        onClick={() => onSetActive(phase.id)}
                        className="flex-shrink-0"
                    >
                        {settingActive === phase.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Zap className="h-4 w-4 mr-2" />
                        )}
                        {isActive ? 'Active' : 'Set Active'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Feature Flags</p>
                <div className="divide-y divide-border">
                    <FeatureFlagRow
                        label="Allow Team Edits"
                        checked={flags.allowEdits}
                        onChange={(v) => onFlagChange(phase.id, 'allowEdits', v)}
                        disabled={isBusy}
                    />
                    <FeatureFlagRow
                        label="Allow Submissions"
                        checked={flags.allowSubmission}
                        onChange={(v) => onFlagChange(phase.id, 'allowSubmission', v)}
                        disabled={isBusy}
                    />
                    <FeatureFlagRow
                        label="Allow Judging"
                        checked={flags.allowJudging}
                        onChange={(v) => onFlagChange(phase.id, 'allowJudging', v)}
                        disabled={isBusy}
                    />
                </div>
                {updatingFlags === phase.id && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Saving flags...
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ──────────────────────────────────────────────
// Main Admin Phases Page
// ──────────────────────────────────────────────

export default function AdminPhasesPage() {
    const { profile, user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [phases, setPhases] = useState<Phase[]>([]);
    const [currentPhaseId, setCurrentPhaseId] = useState<string | null>(null);
    const [settingActive, setSettingActive] = useState<string | null>(null);
    const [updatingFlags, setUpdatingFlags] = useState<string | null>(null);

    // Auth guard
    useEffect(() => {
        if (!authLoading && profile?.role !== 'admin' && profile?.role !== 'super_admin') {
            router.replace('/dashboard');
        }
    }, [authLoading, profile, router]);

    // Real-time phases
    useEffect(() => {
        const phasesQ = query(collection(db, 'phases'), orderBy('order'));
        const unsub = onSnapshot(phasesQ, (snap) => {
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Phase));
            setPhases(data);
            setCurrentPhaseId(data.find((p) => p.isActive)?.id ?? null);
        });
        return () => unsub();
    }, []);

    const getAuthHeader = async (): Promise<Record<string, string>> => {
        if (!user) return {};
        const token = await user.getIdToken();
        return { Authorization: `Bearer ${token}` };
    };

    const handleSetActive = async (phaseId: string) => {
        setSettingActive(phaseId);
        try {
            const headers = await getAuthHeader();
            const res = await fetch(`${API_URL.replace('8002', '8004')}/phases/set-active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({ phaseId }),
            });
            if (!res.ok) throw new Error((await res.json()).detail ?? 'Failed');
            toast.success('Phase activated successfully!');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            toast.error(`Failed to set active phase: ${msg}`);
        } finally {
            setSettingActive(null);
        }
    };

    const handleFlagChange = async (phaseId: string, flag: string, value: boolean) => {
        setUpdatingFlags(phaseId);
        try {
            const headers = await getAuthHeader();
            const phase = phases.find((p) => p.id === phaseId);
            const currentFlags = phase?.featureFlags ?? { allowEdits: false, allowSubmission: false, allowJudging: false };
            const updatedFlags = { ...currentFlags, [flag]: value };

            const res = await fetch(`${API_URL.replace('8002', '8004')}/phases/flags`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify({ phaseId, featureFlags: updatedFlags }),
            });
            if (!res.ok) throw new Error((await res.json()).detail ?? 'Failed');
            toast.success('Feature flag updated!');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            toast.error(`Failed to update flag: ${msg}`);
        } finally {
            setUpdatingFlags(null);
        }
    };

    if (authLoading || (!authLoading && profile?.role !== 'admin' && profile?.role !== 'super_admin')) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                {authLoading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ShieldAlert className="h-8 w-8" />
                        <p className="text-sm">Access denied. Redirecting...</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Phase Control Panel</h2>
                <p className="text-muted-foreground mt-1">Manage the event lifecycle and feature availability per phase.</p>
            </div>

            {/* Phase Stepper Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Event Progress</CardTitle>
                    <CardDescription>
                        {currentPhaseId
                            ? `Active: ${phases.find((p) => p.id === currentPhaseId)?.name ?? '—'}`
                            : 'No phase is currently active'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {phases.length > 0 ? (
                        <PhaseStepper phases={phases} currentPhaseId={currentPhaseId} />
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Loading phases...</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Phase Cards */}
            {phases.length === 0 ? (
                <Card>
                    <CardContent className="py-8 text-center text-sm text-muted-foreground">
                        No phases found. Add phases to the Firestore <code>phases</code> collection to get started.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {phases.map((phase) => (
                        <PhaseCard
                            key={phase.id}
                            phase={phase}
                            isActive={phase.id === currentPhaseId}
                            onSetActive={handleSetActive}
                            onFlagChange={handleFlagChange}
                            settingActive={settingActive}
                            updatingFlags={updatingFlags}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
