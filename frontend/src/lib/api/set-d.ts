import { fetchApi } from '../api';
import { API_URL } from '../firebase';

// --- Types ---

export type UserRole = 'super_admin' | 'organizer' | 'admin' | 'judge' | 'mentor' | 'volunteer' | 'participant';

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
    projects_submitted: number;
    finance_reconciled: number;
    top_tracks: { name: string; count: number }[];
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    targetTrack: string;
    timestamp: any;
}

export interface QRBlastRequest {
    usns: string[];
    event_id?: string;
    expiry_hours?: number;
    include_certificate?: boolean;
}

export interface QRBlastResponse {
    message: string;
    expires_at: string;
    include_certificate: boolean;
    users_processed: string[];
}

export interface QRCodeResult {
    usn: string;
    qr_base64: string;
    expires_at: string;
    event_id: string;
}

// --- API Functions ---

export const setDApi = {
    // ── Attendance / Check-In ─────────────────────────────────────
    checkIn: (qrData: string, phaseId: string) =>
        fetchApi<AttendanceRecord>('/api/checkin/attendance/check-in', {
            method: 'POST',
            body: JSON.stringify({ qr_data: qrData, phase_id: phaseId }),
        }),

    getAttendanceStats: (phaseId: string) =>
        fetchApi<{ phase_id: string; total_present: number; records: AttendanceRecord[] }>(`/api/checkin/attendance/stats/${phaseId}`),

    // ── QR Code Generation & Blast ───────────────────────────────
    generateQR: (usn: string, eventId: string = 'hackodyssey2026', expiryHours: number = 24) =>
        fetchApi<QRCodeResult>(`/api/checkin/attendance/qr/${usn}?event_id=${eventId}&expiry_hours=${expiryHours}`),

    blastQRCodes: (request: QRBlastRequest) =>
        fetchApi<QRBlastResponse>('/api/checkin/attendance/qr-blast', {
            method: 'POST',
            body: JSON.stringify({
                usns: request.usns,
                event_id: request.event_id || 'hackodyssey2026',
                expiry_hours: request.expiry_hours || 24,
                include_certificate: request.include_certificate || false,
            }),
        }),

    // ── Helpdesk ─────────────────────────────────────────────────
    createTicket: (ticket: Partial<SupportTicket>) =>
        fetchApi<SupportTicket>('/api/helpdesk/helpdesk/', {
            method: 'POST',
            body: JSON.stringify(ticket),
        }),

    listTickets: () =>
        fetchApi<SupportTicket[]>('/api/helpdesk/helpdesk/'),

    updateTicket: (ticketId: string, update: Partial<SupportTicket>) =>
        fetchApi<{ message: string }>(`/api/helpdesk/helpdesk/${ticketId}`, {
            method: 'PATCH',
            body: JSON.stringify(update),
        }),

    // ── Mentors ──────────────────────────────────────────────────
    listMentors: () =>
        fetchApi<MentorProfile[]>('/api/mentors/mentors/'),

    bookMentorSlot: (mentorUid: string, slotIndex: number, teamId: string) =>
        fetchApi<{ message: string }>('/api/mentors/mentors/book', {
            method: 'POST',
            body: JSON.stringify({ mentor_uid: mentorUid, slot_index: slotIndex, team_id: teamId }),
        }),

    updateMentorProfile: (profile: MentorProfile) =>
        fetchApi<{ message: string }>('/api/mentors/mentors/profile', {
            method: 'PATCH',
            body: JSON.stringify(profile),
        }),

    createMentor: (profile: Partial<MentorProfile>) =>
        fetchApi<MentorProfile>('/api/mentors/mentors/', {
            method: 'POST',
            body: JSON.stringify(profile),
        }),

    deleteMentor: (uid: string) =>
        fetchApi<{ message: string }>(`/api/mentors/mentors/${uid}`, {
            method: 'DELETE',
        }),

    // ── Sponsors & Tracks ────────────────────────────────────────
    createTrack: (track: Track) =>
        fetchApi<Track>('/api/sponsors/sponsors/tracks', {
            method: 'POST',
            body: JSON.stringify(track),
        }),

    listTracks: () =>
        fetchApi<Track[]>('/api/sponsors/sponsors/tracks'),

    addSponsor: (sponsor: Sponsor) =>
        fetchApi<Sponsor>('/api/sponsors/sponsors/', {
            method: 'POST',
            body: JSON.stringify(sponsor),
        }),

    listSponsors: () =>
        fetchApi<Sponsor[]>('/api/sponsors/sponsors/'),

    // ── Admin RBAC ───────────────────────────────────────────────
    updateUserRole: (uid: string, newRole: UserRole) =>
        fetchApi<{ message: string }>('/api/admin/roles', {
            method: 'PATCH',
            body: JSON.stringify({ uid, new_role: newRole }),
        }),

    listUsers: () =>
        fetchApi<(any & { uid: string })[]>('/api/admin/users'),

    // ── Analytics ────────────────────────────────────────────────
    getOverview: () =>
        fetchApi<AnalyticsOverview>('/api/analytics/overview'),

    exportCsv: (collectionName: string) => {
        // Direct download — open in new tab
        const url = `${API_URL}/api/analytics/export?collection_name=${encodeURIComponent(collectionName)}`;
        window.open(url, '_blank');
    },

    // ── Finance (proxied through unified API) ────────────────────
    financeUpload: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`${API_URL}/api/finance/upload`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Failed to upload bank statement');
        return response.json();
    },

    // ── Automation / Certificates ────────────────────────────────
    generateCertificate: async (data: { name: string; role: string; track: string; project_name?: string }) => {
        const response = await fetch(`${API_URL}/api/automation/certificates/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to generate certificate');
        return response.blob();
    },

    emailBlast: (data: { to_emails: string[]; subject: string; body: string; include_certificate_for?: string | null }) =>
        fetchApi<{ message: string }>('/api/automation/email/blast', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // ── Announcements (centralized) ──────────────────────────────
    listAnnouncements: () =>
        fetchApi<Announcement[]>('/api/announcements'),

    createAnnouncement: (ann: Partial<Announcement>) =>
        fetchApi<Announcement>('/api/announcements', {
            method: 'POST',
            body: JSON.stringify(ann),
        }),

    deleteAnnouncement: (id: string) =>
        fetchApi<{ message: string }>(`/api/announcements/${id}`, {
            method: 'DELETE',
        }),
};
