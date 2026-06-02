export type { UserRepository, UserWithSettings } from './UserRepository'
export type { RoutineRepository } from './RoutineRepository'
export type { SessionRepository } from './SessionRepository'
export type { NutritionRepository } from './NutritionRepository'
export type { NoteRepository } from './NoteRepository'
export type { ChallengeRepository, ChallengeWithRelations, ChallengeDetail } from './ChallengeRepository'

import type { UserRepository } from './UserRepository'
import type { RoutineRepository } from './RoutineRepository'
import type { SessionRepository } from './SessionRepository'
import type { NutritionRepository } from './NutritionRepository'
import type { NoteRepository } from './NoteRepository'
import type { ChallengeRepository } from './ChallengeRepository'

export interface Repositories {
  users: UserRepository
  routines: RoutineRepository
  sessions: SessionRepository
  nutrition: NutritionRepository
  notes: NoteRepository
  challenges: ChallengeRepository
}
