import { LucideIcon } from 'lucide-react';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
    is_admin: boolean;
    is_suspended: boolean;
    email_verified_at: string | null;
}

export interface Auth {
    user: AuthUser | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    auth: Auth;
    flash: { success: string | null; error: string | null };
    oauth: { google: boolean };
    [key: string]: unknown;
}

/** Mirrors App\Enums\ParticipantStatus. */
export type ParticipantStatus = 'UNPAID' | 'PENDING' | 'PAID' | 'WAIVED' | 'REFUNDED';

/** Mirrors App\Enums\PatunganStatus. */
export type PatunganStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';

/** Mirrors App\Enums\PaymentStatus. */
export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

export interface PatunganCard {
    uuid: string;
    title: string;
    category: string;
    category_label: string;
    status: PatunganStatus;
    status_label: string;
    target_amount: number;
    collected_amount: number;
    participant_count: number;
    paid_participant_count: number;
    public_url: string;
    event_date: string | null;
    expires_at: string | null;
    has_expired: boolean;
    created_at: string | null;
}

export interface OrganizerParticipant {
    uuid: string;
    name: string;
    note: string | null;
    amount_due: number;
    amount_paid: number;
    status: ParticipantStatus;
    status_label: string;
    paid_method: string | null;
    paid_at: string | null;
    invoice_number: string | null;
    invoice_url: string | null;
    /** Only present for the organizer of a private room. */
    access_pin: string | null;
}

export interface PatunganDetail extends PatunganCard {
    description: string | null;
    split_type: 'EQUAL' | 'CUSTOM';
    split_type_label: string;
    equal_amount: number | null;
    name_privacy: 'FULL' | 'MASKED';
    privacy_mode: 'OPEN' | 'PRIVATE_ROOM';
    privacy_label: string;
    is_private_room: boolean;
    public_token: string;
    completed_at: string | null;
    closed_at: string | null;
    participants: OrganizerParticipant[];
}

export interface PublicParticipant {
    uuid: string;
    name: string;
    note: string | null;
    amount_due: number;
    status: ParticipantStatus;
    status_label: string;
    is_paid: boolean;
    paid_at: string | null;
    invoice_number: string | null;
    invoice_url: string | null;
}

export interface PublicPatungan {
    title: string;
    description: string | null;
    category: string;
    category_label: string;
    status: PatunganStatus;
    status_label: string;
    split_type: 'EQUAL' | 'CUSTOM';
    equal_amount: number | null;
    target_amount: number;
    collected_amount: number;
    participant_count: number;
    paid_participant_count: number;
    event_date: string | null;
    expires_at: string | null;
    has_expired: boolean;
    accepts_payment: boolean;
    public_token: string;
    organizer_name: string;
    participants: PublicParticipant[];
}

export interface PublicPayment {
    uuid: string;
    status: PaymentStatus;
    status_label: string;
    amount: number;
    service_fee: number;
    charged_amount: number;
    qr_string: string | null;
    qr_url: string | null;
    expires_at: string | null;
    paid_at: string | null;
    simulated: boolean;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    total: number;
}

export interface Balance {
    available: number;
    pending: number;
    paid_out: number;
}
