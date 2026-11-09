export interface Participant {
  id: number;
  name: string;
  created_at?: string;
}

export interface Exclusion {
  id: number;
  participant_a_id: number;
  participant_b_id: number;
  participantA?: Participant;
  participantB?: Participant;
}

export interface Assignment {
  id?: number;
  giver_id: number;
  recipient_id: number;
  giver?: Participant;
  recipient?: Participant;
}

export interface DrawResult {
  drawId: number;
  assignments: Assignment[];
  valid: boolean;
  message: string;
}

export interface AccessCode {
  id: number;
  participant_id: number;
  participantName?: string;
  code: string; // plain code, only shown once to admin
}

export interface Settings {
  preventReciprocal: boolean;
}

export interface AdminUser {
  username: string;
}

export interface ApiError {
  message: string;
  status?: number;
}
