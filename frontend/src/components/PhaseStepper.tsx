'use client';

/**
 * PhaseStepper — Reusable phase progress indicator.
 *
 * Props:
 *   phases: Phase[]      — all phases in order
 *   currentPhaseId: string | null — the ID of the currently active phase
 */

import React from 'react';
import { CheckCircle2, Circle, Dot } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Phase {
    id: string;
    name: string;
    order: number;
    isActive: boolean;
    featureFlags?: {
        allowEdits: boolean;
        allowSubmission: boolean;
        allowJudging: boolean;
    };
}

interface PhaseStepperProps {
    phases: Phase[];
    currentPhaseId: string | null;
    className?: string;
}

export function PhaseStepper({ phases, currentPhaseId, className }: PhaseStepperProps) {
    const sorted = [...phases].sort((a, b) => a.order - b.order);

    // Determine status relative to active phase
    const activeIndex = sorted.findIndex((p) => p.id === currentPhaseId);

    const getStatus = (index: number): 'completed' | 'active' | 'upcoming' => {
        if (activeIndex === -1) return 'upcoming';
        if (index < activeIndex) return 'completed';
        if (index === activeIndex) return 'active';
        return 'upcoming';
    };

    return (
        <div className={cn('w-full', className)}>
            {/* Desktop: horizontal stepper */}
            <div className="hidden sm:flex items-center w-full">
                {sorted.map((phase, index) => {
                    const status = getStatus(index);
                    const isLast = index === sorted.length - 1;

                    return (
                        <React.Fragment key={phase.id}>
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                {/* Icon */}
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all',
                                        status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                                        status === 'active' && 'border-primary bg-primary/10 text-primary shadow-[0_0_0_4px_oklch(var(--primary)/0.15)]',
                                        status === 'upcoming' && 'border-muted-foreground/30 text-muted-foreground bg-background',
                                    )}
                                >
                                    {status === 'completed' ? (
                                        <CheckCircle2 className="h-4 w-4" />
                                    ) : status === 'active' ? (
                                        <Dot className="h-6 w-6 animate-pulse" />
                                    ) : (
                                        <span className="text-xs font-semibold">{index + 1}</span>
                                    )}
                                </div>
                                {/* Label */}
                                <span
                                    className={cn(
                                        'text-xs font-medium text-center max-w-[80px] leading-tight',
                                        status === 'active' && 'text-primary font-semibold',
                                        status === 'completed' && 'text-muted-foreground',
                                        status === 'upcoming' && 'text-muted-foreground/60',
                                    )}
                                >
                                    {phase.name}
                                </span>
                            </div>

                            {/* Connector line */}
                            {!isLast && (
                                <div
                                    className={cn(
                                        'flex-1 h-0.5 mx-1 rounded-full transition-all',
                                        status === 'completed' ? 'bg-primary' : 'bg-muted-foreground/20',
                                    )}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Mobile: vertical list */}
            <div className="flex sm:hidden flex-col gap-3">
                {sorted.map((phase, index) => {
                    const status = getStatus(index);
                    const isLast = index === sorted.length - 1;
                    return (
                        <div key={phase.id} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                                <div
                                    className={cn(
                                        'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all flex-shrink-0',
                                        status === 'completed' && 'bg-primary border-primary text-primary-foreground',
                                        status === 'active' && 'border-primary bg-primary/10 text-primary',
                                        status === 'upcoming' && 'border-muted-foreground/30 text-muted-foreground',
                                    )}
                                >
                                    {status === 'completed' ? (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    ) : (
                                        <span className="text-xs font-semibold">{index + 1}</span>
                                    )}
                                </div>
                                {!isLast && <div className="w-0.5 h-6 bg-muted-foreground/20 mt-1" />}
                            </div>
                            <div className="pt-1">
                                <span
                                    className={cn(
                                        'text-sm font-medium',
                                        status === 'active' && 'text-primary font-semibold',
                                        status === 'upcoming' && 'text-muted-foreground/60',
                                    )}
                                >
                                    {phase.name}
                                    {status === 'active' && (
                                        <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                                            Active
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
