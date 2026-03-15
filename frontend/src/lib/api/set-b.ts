/**
 * Set B API Client — Participant Dashboard & Event Flow Control
 *
 * Targets the unified backend (backend/app) on the default API_URL.
 * Phases:        /api/phases/*
 * Announcements: /api/announcements/*
 */

import { fetchApi } from '../api';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface FeatureFlags {
  allowEdits: boolean;
  allowSubmission: boolean;
  allowJudging: boolean;
}

export interface Phase {
  id: string;
  name: string;
  order: number;
  description?: string;
  isActive: boolean;
  featureFlags: FeatureFlags;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetTrack: string;
  /** Firestore Timestamp shape when read directly from Firestore */
  timestamp: { seconds: number; nanoseconds: number } | null;
}

// ──────────────────────────────────────────────
// API
// ──────────────────────────────────────────────

export const setBApi = {
  // Phases
  listPhases: () =>
    fetchApi<Phase[]>('/api/phases/'),

  getCurrentPhase: () =>
    fetchApi<Phase | { message: string; phase: null }>('/api/phases/current'),

  createPhase: (payload: {
    name: string;
    order: number;
    description?: string;
    featureFlags?: Partial<FeatureFlags>;
  }) =>
    fetchApi<Phase>('/api/phases/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  setActivePhase: (phaseId: string) =>
    fetchApi<{ message: string; phase: Phase }>('/api/phases/set-active', {
      method: 'POST',
      body: JSON.stringify({ phaseId }),
    }),

  updateFeatureFlags: (phaseId: string, featureFlags: Partial<FeatureFlags>) =>
    fetchApi<{ message: string; phase: Phase }>('/api/phases/flags', {
      method: 'PATCH',
      body: JSON.stringify({ phaseId, featureFlags }),
    }),

  deletePhase: (phaseId: string) =>
    fetchApi<{ message: string }>(`/api/phases/${phaseId}`, {
      method: 'DELETE',
    }),

  // Announcements
  listAnnouncements: (track?: string) =>
    fetchApi<Announcement[]>(
      `/api/announcements/${track ? `?track=${encodeURIComponent(track)}` : ''}`
    ),

  createAnnouncement: (payload: { title: string; body: string; targetTrack?: string }) =>
    fetchApi<Announcement>('/api/announcements/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAnnouncement: (announcementId: string) =>
    fetchApi<{ message: string }>(`/api/announcements/${announcementId}`, {
      method: 'DELETE',
    }),
};
