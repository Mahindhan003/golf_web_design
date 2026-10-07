import { useSyncExternalStore } from 'react'
import type { Course, HoleData, Point, Tournament } from './types'
import { MOCK_PROFILE, MOCK_TOURNAMENTS, getCourse } from './data'
import { ratingsGenderOf } from './account-rules'
import { playingHandicap, stablefordPoints, strokesOnHole, teeTimeFor, uid } from './golf'
import { upsertTournament } from './store'

/*
 * Tournament-day data for the prototype: entries (the field), tee groups, hole-by-hole
 * scorecards and marked shots. Saved to localStorage like the admin store. A real backend
 * would own all of this and push changes over WebSocket/SSE; here `simulateTick` moves the
 * rest of the field along so the leaderboard feels live.
 */

export interface Entry {
  id: string
  tournamentId: string
  name: string
  handicapIndex: number
  gender: 'men' | 'women'
  divisionId: string
  status: 'registered' | 'waitlist' | 'withdrawn'
  /** The signed-in golfer */
  isMe?: boolean
}

export interface TeeGroup {
  id: string
  tournamentId: string
  round: number
  time: string
  startHole: number
  entryIds: string[]
}

export interface Shot {
  at: Point
  club?: string
  ts: number
}

export type CardState = 'in-progress' | 'submitted' | 'verified'

interface LiveData {
  entries: Entry[]
  groups: TeeGroup[]
  /** scores[tournamentId][entryId][round] = strokes per hole index (null = not played) */
  scores: Record<string, Record<string, Record<number, (number | null)[]>>>
  cardState: Record<string, Record<string, Record<number, CardState>>>
  /** shots[tournamentId][entryId][round][holeNumber] */
  shots: Record<string, Record<string, Record<number, Record<number, Shot[]>>>>
}

const STORAGE_KEY = 'gtp-live-v1'

const FIRST = ['James', 'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Lucas', 'Mia', 'Mason', 'Isla', 'Logan', 'Grace', 'Owen', 'Chloe', 'Caleb', 'Zoe', 'Ryan', 'Nora', 'Henry', 'Ella', 'Jack', 'Lily']
const LAST = ['Carter', 'Nguyen', 'Patel', 'Walsh', 'Brennan', 'Okafor', 'Lindqvist', 'Moreno', 'Fraser', 'Kim', 'Duarte', 'Shaw', 'Hughes', 'Rossi', 'Tanaka', 'Murphy', 'Becker', 'Lopez', 'Reid', 'Silva', 'Ahmed', 'Grant', 'Cole', 'Price']

/** Deterministic pseudo-random 0..1 from a string, so seeded scores don't change on reload. */
function rand(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10_000) / 10_000
}

/** A believable score for a hole from par, stroke index and handicap. */
function simulatedScore(seed: string, hole: HoleData, handicapIndex: number) {
  const r = rand(seed)
  const extra = handicapIndex / 18 + (19 - hole.handicap) / 40
  const delta = r < 0.08 ? -1 : r < 0.5 ? 0 : r < 0.8 ? 1 : r < 0.95 ? 2 : 3
  return Math.max(2, hole.par + Math.round(delta * (0.6 + extra / 2)))
}

let data: LiveData = { entries: [], groups: [], scores: {}, cardState: {}, shots: {} }
let version = 0
const listeners = new Set<() => void>()

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* private mode: session only */ }
  version++
  listeners.forEach(l => l())
}

export function useLiveVersion() {
  return useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb) }, () => version)
}

/* ───────── Seed ───────── */

function seedField(t: Tournament, count: number, includeMe: boolean) {
  const division = (index: number) => {
    const divisions = t.divisions ?? []
    return divisions.find(d => index >= d.minHandicap && index <= d.maxHandicap)?.id ?? divisions[0]?.id ?? 'div-open'
  }
  const entries: Entry[] = []
  for (let i = 0; i < count; i++) {
    const index = Math.round((rand(`${t.id}-hcp-${i}`) * 26 + 0.4) * 10) / 10
    entries.push({
      id: `${t.id}-e${i}`,
      tournamentId: t.id,
      name: `${FIRST[(i * 7 + t.id.length) % FIRST.length]} ${LAST[(i * 5 + 3) % LAST.length]}`,
      handicapIndex: index,
      gender: i % 4 === 3 ? 'women' : 'men',
      divisionId: division(index),
      status: 'registered',
    })
  }
  if (includeMe) {
    entries.splice(2, 0, {
      id: `${t.id}-me`,
      tournamentId: t.id,
      name: `${MOCK_PROFILE.firstName} ${MOCK_PROFILE.lastName}`,
      handicapIndex: MOCK_PROFILE.handicapIndex,
      gender: ratingsGenderOf(MOCK_PROFILE),
      divisionId: division(MOCK_PROFILE.handicapIndex),
      status: 'registered',
      isMe: true,
    })
  }
  return entries
}

function seed(): LiveData {
  const fresh: LiveData = { entries: [], groups: [], scores: {}, cardState: {}, shots: {} }
  data = fresh
  for (const t of MOCK_TOURNAMENTS) {
    if (!t.players || t.status === 'draft') continue
    const live = t.status === 'in-progress' || t.status === 'completed'
    const fieldSize = Math.min(t.players, live ? 16 : 24)
    const includeMe = t.registrationStatus === 'registered' || t.status === 'in-progress'
    fresh.entries.push(...seedField(t, fieldSize - (includeMe ? 1 : 0), includeMe))
    if (live) {
      generateTeeSheet(t, 1, false)
      const course = getCourse(t.courseId)
      if (!course) continue
      const holes = roundHoles(t, course, 1)
      for (const e of entriesFor(t.id)) {
        // Completed events are fully scored; live ones are part-way round. The golfer is on hole 5.
        const played = t.status === 'completed' ? holes.length : e.isMe ? 4 : 3 + Math.floor(rand(`${e.id}-thru`) * 9)
        const card = holes.map((h, i) => (i < played ? simulatedScore(`${e.id}-${h.hole}`, h, e.handicapIndex) : null))
        ;((fresh.scores[t.id] ??= {})[e.id] ??= {})[1] = card
        if (t.status === 'completed') ((fresh.cardState[t.id] ??= {})[e.id] ??= {})[1] = 'verified'
      }
    }
  }
  return fresh
}


export function resetLiveData() {
  data = seed()
  save()
}

/* ───────── Field and registration ───────── */

export const entriesFor = (tournamentId: string) => data.entries.filter(e => e.tournamentId === tournamentId && e.status !== 'withdrawn')

export const myEntry = (tournamentId: string) => entriesFor(tournamentId).find(e => e.isMe)

/** The tournament's player count covers the whole field; the seeded entries are only a sample of it. */
function adjustPlayers(tournamentId: string, delta: number) {
  const t = MOCK_TOURNAMENTS.find(x => x.id === tournamentId)
  if (t) upsertTournament({ ...t, players: Math.max(0, t.players + delta) })
}

export function registerMe(t: Tournament, divisionId: string, waitlist = false) {
  const existing = data.entries.find(e => e.tournamentId === t.id && e.isMe)
  const wasRegistered = existing?.status === 'registered'
  if (existing) Object.assign(existing, { status: waitlist ? 'waitlist' : 'registered', divisionId })
  else {
    data.entries.push({
      id: `${t.id}-me`,
      tournamentId: t.id,
      name: `${MOCK_PROFILE.firstName} ${MOCK_PROFILE.lastName}`,
      handicapIndex: MOCK_PROFILE.handicapIndex,
      gender: ratingsGenderOf(MOCK_PROFILE),
      divisionId,
      status: waitlist ? 'waitlist' : 'registered',
      isMe: true,
    })
  }
  save()
  if (!waitlist && !wasRegistered) adjustPlayers(t.id, 1)
}

export function withdrawMe(tournamentId: string) {
  const me = data.entries.find(e => e.tournamentId === tournamentId && e.isMe)
  const wasRegistered = me?.status === 'registered'
  if (me) me.status = 'withdrawn'
  save()
  if (wasRegistered) adjustPlayers(tournamentId, -1)
}

/* ───────── Rounds, tee sheet ───────── */

export function roundHoles(t: Tournament, course: Course, round: number): HoleData[] {
  const which = t.rounds?.find(r => r.number === round)?.holes ?? 'all'
  if (which === 'front') return course.holeData.slice(0, 9)
  if (which === 'back') return course.holeData.slice(9, 18)
  return course.holeData
}

export const groupsFor = (tournamentId: string, round: number) =>
  data.groups.filter(g => g.tournamentId === tournamentId && g.round === round)

/** Builds groups from the registered field (similar handicaps together) and assigns tee times. */
export function generateTeeSheet(t: Tournament, round: number, persist = true) {
  const course = getCourse(t.courseId)
  const sheet = t.teeSheet
  if (!course || !sheet) return
  const players = entriesFor(t.id).filter(e => e.status === 'registered').sort((a, b) => a.handicapIndex - b.handicapIndex)
  data.groups = data.groups.filter(g => !(g.tournamentId === t.id && g.round === round))
  for (let i = 0; i * sheet.groupSize < players.length; i++) {
    const { time, startHole } = teeTimeFor(sheet, i, roundHoles(t, course, round).length)
    data.groups.push({
      id: uid('g'),
      tournamentId: t.id,
      round,
      time,
      startHole,
      entryIds: players.slice(i * sheet.groupSize, (i + 1) * sheet.groupSize).map(e => e.id),
    })
  }
  if (persist) save()
}

export const groupOf = (tournamentId: string, round: number, entryId: string) =>
  groupsFor(tournamentId, round).find(g => g.entryIds.includes(entryId))

/* ───────── Scorecards ───────── */

export function cardFor(t: Tournament, entryId: string, round: number): (number | null)[] {
  const course = getCourse(t.courseId)
  const length = course ? roundHoles(t, course, round).length : 18
  const card = data.scores[t.id]?.[entryId]?.[round] ?? []
  return Array.from({ length }, (_, i) => card[i] ?? null)
}

export const cardState = (tournamentId: string, entryId: string, round: number): CardState =>
  data.cardState[tournamentId]?.[entryId]?.[round] ?? 'in-progress'

export function setStrokes(t: Tournament, entryId: string, round: number, holeIndex: number, strokes: number | null) {
  const card = cardFor(t, entryId, round)
  card[holeIndex] = strokes
  ;((data.scores[t.id] ??= {})[entryId] ??= {})[round] = card
  save()
}

export function setCardState(tournamentId: string, entryId: string, round: number, state: CardState) {
  ;((data.cardState[tournamentId] ??= {})[entryId] ??= {})[round] = state
  save()
}

/** Plays the next hole for everyone still on the course except the signed-in golfer. */
export function simulateTick(t: Tournament, round = 1) {
  const course = getCourse(t.courseId)
  if (!course || t.status !== 'in-progress') return
  const holes = roundHoles(t, course, round)
  let changed = false
  for (const e of entriesFor(t.id)) {
    if (e.isMe || cardState(t.id, e.id, round) !== 'in-progress') continue
    const card = cardFor(t, e.id, round)
    const next = card.findIndex(s => s === null)
    if (next < 0 || rand(`${e.id}-${next}-${Date.now() >> 14}`) < 0.35) continue
    card[next] = simulatedScore(`${e.id}-${holes[next].hole}-live`, holes[next], e.handicapIndex)
    ;((data.scores[t.id] ??= {})[e.id] ??= {})[round] = card
    changed = true
  }
  if (changed) save()
}

/* ───────── Shots (ball positions) ───────── */

export const shotsFor = (tournamentId: string, entryId: string, round: number, hole: number): Shot[] =>
  data.shots[tournamentId]?.[entryId]?.[round]?.[hole] ?? []

export function addShot(tournamentId: string, entryId: string, round: number, hole: number, shot: Shot) {
  const list = (((data.shots[tournamentId] ??= {})[entryId] ??= {})[round] ??= {})[hole] ??= []
  list.push(shot)
  save()
}

export function undoShot(tournamentId: string, entryId: string, round: number, hole: number) {
  data.shots[tournamentId]?.[entryId]?.[round]?.[hole]?.pop()
  save()
}

/* ───────── Leaderboard ───────── */

export interface LeaderboardRow {
  entry: Entry
  position: string
  thru: number
  holes: number
  gross: number
  grossToPar: number
  net: number
  netToPar: number
  points: number
  playing: number
  state: CardState
}

export function leaderboard(t: Tournament, round = 1, divisionId?: string): LeaderboardRow[] {
  const course = getCourse(t.courseId)
  if (!course) return []
  const holes = roundHoles(t, course, round)
  const allowance = t.scoring?.allowancePct ?? 100
  const coursePar = course.holeData.reduce((s, h) => s + h.par, 0)

  const rows = entriesFor(t.id)
    .filter(e => e.status === 'registered' && (!divisionId || e.divisionId === divisionId))
    .map(entry => {
      const tee = course.teeSets?.find(ts => ts.id === t.divisions?.find(d => d.id === entry.divisionId)?.teeSetId)
      const fullPlaying = playingHandicap(entry.handicapIndex, tee, coursePar, allowance, entry.gender)
      // Nine-hole rounds get half the strokes
      const playing = holes.length === 9 ? Math.round(fullPlaying / 2) : fullPlaying
      const card = cardFor(t, entry.id, round)
      let gross = 0, par = 0, received = 0, points = 0, thru = 0
      card.forEach((strokes, i) => {
        if (strokes === null) return
        const hole = holes[i]
        const r = strokesOnHole(playing, holes.length === 9 ? Math.ceil(hole.handicap / 2) : hole.handicap, holes.length)
        gross += strokes; par += hole.par; received += r; thru++
        points += stablefordPoints(strokes, hole.par, r)
      })
      return {
        entry, position: '', thru, holes: holes.length, gross, grossToPar: gross - par,
        net: gross - received, netToPar: gross - received - par, points, playing,
        state: cardState(t.id, entry.id, round),
      }
    })

  const stableford = t.format === 'Stableford'
  const useNet = !stableford && t.scoring?.basis === 'net'
  const key = (r: LeaderboardRow) => (stableford ? -r.points : useNet ? r.netToPar : r.grossToPar)
  rows.sort((a, b) => (a.thru === 0 ? 1 : 0) - (b.thru === 0 ? 1 : 0) || key(a) - key(b) || b.thru - a.thru)

  rows.forEach((row, i) => {
    if (row.thru === 0) { row.position = '–'; return }
    const same = rows.filter(r => r.thru > 0 && key(r) === key(row)).length
    const first = rows.findIndex(r => r.thru > 0 && key(r) === key(row))
    row.position = `${same > 1 ? 'T' : ''}${first + 1}`
    void i
  })
  return rows
}

/* ───────── Load (last, so every helper above is initialised) ───────── */

;(function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { data = JSON.parse(raw); return }
  } catch { /* fall through to seed */ }
  data = seed()
})()
