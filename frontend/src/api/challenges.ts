import { api } from './client'

export interface ChallengeUser {
  id: string
  name: string
  avatar: string
}

export interface CheckIn {
  id: string
  userId: string
  serverTime: string
  photoUrl: string
  hash: string
}

export interface Challenge {
  id: string
  code: string
  type: 'checkin' | 'versus' | 'both'
  status: 'pending' | 'active' | 'finished'
  durationDays: number
  creatorId: string
  opponentId: string | null
  startDate: string | null
  endDate: string | null
  creator: ChallengeUser
  opponent: ChallengeUser | null
  checkIns: CheckIn[]
  stats?: {
    creator:  { checkInDays: number; dates: string[] }
    opponent: { checkInDays: number; dates: string[] }
  }
}

export interface VersusData {
  challengeId: string
  period: { start: string | null; end: string | null }
  creatorSessions: number
  opponentSessions: number
  versus: Array<{
    exercise: string
    creator:  { name: string; weight: number; reps: number; oneRM: number } | null
    opponent: { name: string; weight: number; reps: number; oneRM: number } | null
  }>
}

export const challengesApi = {
  list: () =>
    api.get<Challenge[]>('/challenges').then(r => r.data),

  create: (type: 'checkin' | 'versus' | 'both', durationDays = 30) =>
    api.post<{ challenge: Challenge; code: string }>('/challenges', { type, durationDays }).then(r => r.data),

  join: (code: string) =>
    api.post<Challenge>('/challenges/join', { code }).then(r => r.data),

  get: (id: string) =>
    api.get<Challenge>(`/challenges/${id}`).then(r => r.data),

  checkin: (challengeId: string, photoBase64: string, lat?: number, lng?: number) =>
    api.post<{ checkIn: CheckIn; hash: string }>(`/challenges/${challengeId}/checkin`, {
      challengeId, photoBase64, lat, lng,
    }).then(r => r.data),

  versus: (id: string) =>
    api.get<VersusData>(`/challenges/${id}/versus`).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/challenges/${id}`).then(r => r.data),
}
