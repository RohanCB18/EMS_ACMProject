/**
 * Judging API Client (SET C)
 * Communicates with the judging backend (now unified on port 8000).
 * All endpoints require Firebase auth token.
 */

import { getAuth } from 'firebase/auth';

const JUDGING_API = process.env.NEXT_PUBLIC_JUDGING_API_URL || 'http://localhost:8000';

/**
 * Make an authenticated request to the judging backend.
 * Automatically attaches the Firebase ID token as Bearer auth.
 */
export async function judgingFetch<T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${JUDGING_API}${endpoint}`;
    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
    }

    // Attach Firebase auth token if user is logged in
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            headers.set('Authorization', `Bearer ${token}`);
        }
    } catch (e) {
        console.warn('Could not get auth token:', e);
    }

    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
}

// ─── Types ────────────────────────────────────────────

export interface Judge {
    judge_id: string;
    email: string;
    name: string;
    expertise_tags: string[];
    organization?: string;
    coi_flags: { project_id: string; reason: string; flagged_at: string }[];
    assigned_count: number;
    reviewed_count: number;
    created_at?: string;
}

export interface RubricCriteria {
    id: string;
    name: string;
    weight: number;
    max_score: number;
    description?: string;
}

export interface Rubric {
    rubric_id: string;
    event_id: string;
    name: string;
    criteria: RubricCriteria[];
    round: string;
    total_weight: number;
    created_at?: string;
    updated_at?: string;
}

export interface Allocation {
    allocation_id: string;
    judge_id: string;
    judge_name: string;
    project_id: string;
    project_title: string;
    track?: string;
    status: 'assigned' | 'pending' | 'reviewed';
    round: string;
    assigned_at?: string;
}

export interface ProjectRanking {
    project_id: string;
    project_title: string;
    team_name?: string;
    track?: string;
    avg_weighted_score: number;
    total_evaluations: number;
    rank: number;
    shortlisted: boolean;
}

export interface RankingResponse {
    event_id: string;
    round: string;
    rankings: ProjectRanking[];
    total_projects: number;
    total_evaluated: number;
}

export interface CriteriaScore {
    criteria_id: string;
    score: number;
    comment?: string;
}

export interface ScoreResponse {
    score_id: string;
    judge_id: string;
    judge_name: string;
    project_id: string;
    project_title: string;
    event_id: string;
    round: string;
    criteria_scores: CriteriaScore[];
    weighted_total: number;
    overall_comment?: string;
    private_notes?: string;
    submitted_at?: string;
}

// ─── API Functions ────────────────────────────────────

export const judgingApi = {
    // ── Judges ──
    inviteJudge: (data: { email: string; name: string; expertise_tags: string[]; organization?: string }) =>
        judgingFetch<Judge>('/api/judging/judges/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    listJudges: () =>
        judgingFetch<Judge[]>('/api/judging/judges/'),

    removeJudge: (judgeId: string) =>
        judgingFetch<{ message: string }>(`/api/judging/judges/${judgeId}`, { method: 'DELETE' }),

    // ── Teams ──
    listTeams: () =>
        judgingFetch<{ team_id: string; name: string; track: string; member_details: any[] }[]>('/api/teams/'),

    // ── Rubrics ──
    createRubric: (data: { event_id: string; name: string; criteria: RubricCriteria[]; round: string }) =>
        judgingFetch<Rubric>('/api/judging/rubrics/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getRubrics: (eventId: string) =>
        judgingFetch<Rubric[]>(`/api/judging/rubrics/${eventId}`),

    // ── Allocations ──
    autoAllocate: (data: { event_id: string; round?: string; projects_per_judge?: number; judges_per_project?: number }) =>
        judgingFetch<{ message: string; total_allocations: number }>('/api/judging/allocations/auto', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    manualAllocate: (data: { judge_id: string; project_id: string; action: 'assign' | 'remove'; round?: string; allocation_id?: string }) =>
        judgingFetch<Allocation>(`/api/judging/allocations/${data.action === 'remove' ? data.allocation_id : 'new'}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    listAllocations: (eventId?: string) =>
        judgingFetch<Allocation[]>(`/api/judging/allocations/${eventId ? `?event_id=${eventId}` : ''}`),

    getJudgeAllocations: (judgeId: string) =>
        judgingFetch<Allocation[]>(`/api/judging/allocations/judge/${judgeId}`),

    // ── Scoring ──
    submitScore: (data: {
        event_id: string;
        project_id: string;
        round: string;
        criteria_scores: CriteriaScore[];
        overall_comment?: string;
        private_notes?: string;
    }) =>
        judgingFetch<ScoreResponse>('/api/judging/scores/', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getJudgeScores: (judgeId: string) =>
        judgingFetch<ScoreResponse[]>(`/api/judging/scores/judge/${judgeId}`),

    // ── Rankings ──
    getRankings: (eventId: string, round: string = 'round_1') =>
        judgingFetch<RankingResponse>(`/api/judging/rankings/${eventId}?round=${round}`),

    exportWinners: (eventId: string, round: string = 'finals', topN: number = 10) =>
        judgingFetch<any>(`/api/judging/rankings/${eventId}/export?round=${round}&top_n=${topN}`),
};
