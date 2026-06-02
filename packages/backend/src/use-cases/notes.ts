import type { GlobalNote } from '@prisma/client'
import type { NoteRepository } from '../repositories/NoteRepository'
import { ucErr, UCError } from './errors'

export async function listNotes(
  notes: NoteRepository,
  userId: string
): Promise<GlobalNote[]> {
  return notes.findAll(userId)
}

export async function createNote(
  notes: NoteRepository,
  userId: string,
  text: string
): Promise<GlobalNote> {
  const count = await notes.count(userId)
  return notes.create(userId, text, count)
}

export async function updateNote(
  notes: NoteRepository,
  userId: string,
  id: string,
  data: { text?: string; done?: boolean; position?: number }
): Promise<GlobalNote | UCError> {
  const note = await notes.findById(userId, id)
  if (!note) return ucErr('No encontrado', 404)
  return notes.update(id, data)
}

export async function deleteNote(
  notes: NoteRepository,
  userId: string,
  id: string
): Promise<void> {
  await notes.delete(userId, id)
}

export async function reorderNotes(
  notes: NoteRepository,
  userId: string,
  ids: string[]
): Promise<void> {
  await notes.reorder(userId, ids)
}

export { UCError }
