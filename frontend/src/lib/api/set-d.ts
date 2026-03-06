import { fetchApi } from '../api';

// --- Types ---

export type UserRole = 'super_admin' | 'organizer' | 'judge' | 'mentor' | 'volunteer' | 'participant';

export type TicketStatus = 'open' | 'in_progress' | 'resolved';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AttendanceRecord {
    uid: string;
    phase_id: string;
    status: 'present' | 'absent';
    timestamp: string;
    recorded_by: string;
}

export interface SupportTicket {
    ticket_id?: string;
    raised_by_uid: string;
    title: string;
    description: string;
    category: string;
    priority: TicketPriority;
    status: TicketStatus;
    assigned_to_uid?: string;
    created_at: string;
    updated_at: string;
}

export interface MentorProfile {
    uid: string;
    display_name: string;
    expertise: string[];
    availability: { start: string; end: string; booked: boolean; booked_by_team_id?: string }[];
    bio?: string;
}

export interface Track {
    track_id: string;
    name: string;
    description: string;
    problem_statements?: string[];
    sponsor?: string;
    sponsor_id?: string;
    eligibility_rules?: string;
    enrolled_teams?: number;
}

export interface Sponsor {
    sponsor_id?: string;
    name: string;
    tier: string;
    industry?: string;
    logo_url?: string;
    website_url?: string;
    metrics?: Record<string, any>;
}

export interface AnalyticsOverview {
    total_registrations: number;
    teams_formed: number;
    attendance_rate: number;
    tickets_resolved: number;
    top_tracks: { name: string; count: number }[];
}

// --- API Functions ---

const BASE_PATH = ''; // The individual routers have their own prefixes

export const setDApi = {
    // Attendance
    checkIn: (qrData: string, phaseId: string) =>
        fetchApi<AttendanceRecord>('/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify({ qr_data: qrData, phase_id: phaseId }),
        }),

    getAttendanceStats: (phaseId: string) =>
        fetchApi<{ phase_id: string; total_present: number; records: AttendanceRecord[] }>(`/attendance/stats/${phaseId}`),

    // Helpdesk
    createTicket: (ticket: Partial<SupportTicket>) =>
        fetchApi<SupportTicket>('/helpdesk', {
            method: 'POST',
            body: JSON.stringify(ticket),
        }),

    listTickets: () =>
        fetchApi<SupportTicket[]>('/helpdesk'),

    updateTicket: (ticketId: string, update: Partial<SupportTicket>) =>
        fetchApi<{ message: string }>(`/helpdesk/${ticketId}`, {
            method: 'PATCH',
            body: JSON.stringify(update),
        }),

    // Mentors
    listMentors: () =>
        fetchApi<MentorProfile[]>('/mentors'),

    bookMentorSlot: (mentorUid: string, slotIndex: number, teamId: string) =>
        fetchApi<{ message: string }>('/mentors/book', {
            method: 'POST',
            body: JSON.stringify({ mentor_uid: mentorUid, slot_index: slotIndex, team_id: teamId }),
        }),

    updateMentorProfile: (profile: MentorProfile) =>
        fetchApi<{ message: string }>('/mentors/profile', {
            method: 'PATCH',
            body: JSON.stringify(profile),
        }),

    // Sponsors & Tracks
    createTrack: (track: Track) =>
        fetchApi<Track>('/sponsors/tracks', {
            method: 'POST',
            body: JSON.stringify(track),
        }),

    listTracks: () =>
        fetchApi<Track[]>('/sponsors/tracks'),

    addSponsor: (sponsor: Sponsor) =>
        fetchApi<Sponsor>('/sponsors', {
            method: 'POST',
            body: JSON.stringify(sponsor),
        }),

    listSponsors: () =>
        fetchApi<Sponsor[]>('/sponsors'),

    // Admin
    updateUserRole: (uid: string, newRole: UserRole) =>
        fetchApi<{ message: string }>('/admin/roles', {
            method: 'PATCH',
            body: JSON.stringify({ uid, new_role: newRole }),
        }),

    listUsers: () =>
        fetchApi<(any & { uid: string })[]>('/admin/users'),

    // Analytics
    getOverview: () =>
        fetchApi<AnalyticsOverview>('/analytics/overview'),
};
