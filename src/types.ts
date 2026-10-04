export type ScreenName =
  | 'signin'
  | 'home'
  | 'tournaments'
  | 'tournament-details'
  | 'course-details'
  | 'profile'
  | 'edit-profile'

export interface NavEntry {
  screen: ScreenName
  params?: Record<string, string>
  direction?: 'push' | 'pop'
}

export interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

export interface DialogData {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel?: () => void
}

export type TournamentStatus =
  | 'draft'
  | 'published'
  | 'registration-open'
  | 'registration-closed'
  | 'upcoming'
  | 'in-progress'
  | 'completed'
  | 'cancelled'

export type RegistrationStatus = 'open' | 'closed' | 'coming-soon' | 'registered'

export type TournamentFormat = 'Stroke Play' | 'Stableford' | 'Four-Ball' | 'Scramble'

export interface Tournament {
  id: string
  name: string
  dateRange: string
  startDate: string
  endDate?: string
  time: string
  venue: string
  location: string
  city: string
  country: string
  status: TournamentStatus
  format: TournamentFormat
  category: string
  description: string
  courseId: string
  registrationStatus: RegistrationStatus
  /** Organisation that runs it; undefined = run by the platform itself */
  organizerId?: string
  players: number
  maxPlayers: number
  entryFee: string
  prize: string
  imageUrl: string

  /* ── Full tournament set-up (optional so older saved data still loads) ── */
  rounds?: TournamentRound[]
  scoring?: ScoringRules
  eligibility?: Eligibility
  divisions?: Division[]
  registration?: RegistrationWindow
  fees?: TournamentFees
  prizes?: Prize[]
  teeSheet?: TeeSheetSettings
  officials?: Official[]
  contactEmail?: string
  contactPhone?: string
  localRules?: string
  /** Final results are visible to golfers */
  resultsPublished?: boolean
}

export interface TournamentRound {
  number: number
  date: string
  /** Which holes the round is played over */
  holes: 'all' | 'front' | 'back'
}

export type ScoringBasis = 'gross' | 'net' | 'gross-and-net'
export type TieBreak = 'countback' | 'playoff' | 'shared'

export interface ScoringRules {
  basis: ScoringBasis
  /** Handicap allowance applied to course handicap, e.g. 95 */
  allowancePct: number
  /** Highest handicap index accepted for net scoring */
  maxHandicap: number
  tieBreak: TieBreak
  /** Cut after this round (0 = no cut) */
  cutAfterRound: number
  /** Number of players (and ties) who make the cut */
  cutSize: number
}

export interface Eligibility {
  minHandicap?: number
  maxHandicap?: number
  minAge?: number
  maxAge?: number
  gender: 'open' | 'men' | 'women'
  membersOnly: boolean
  officialHandicapRequired: boolean
}

export interface Division {
  id: string
  name: string
  minHandicap: number
  maxHandicap: number
  /** Tee set (Course.teeSets[].id) this division plays from */
  teeSetId: string
}

export interface RegistrationWindow {
  /** ISO date-times (local) */
  opensAt: string
  closesAt: string
  waitlist: boolean
  withdrawBy: string
  refundPolicy: string
}

export interface TournamentFees {
  currency: string
  /** Standard entry */
  amount: number
  memberAmount?: number
  earlyBirdAmount?: number
  earlyBirdUntil?: string
  perTeam: boolean
  includes: string[]
}

export interface Prize {
  id: string
  label: string
  /** Division id, or empty for overall */
  divisionId?: string
  value: string
}

export interface TeeSheetSettings {
  startType: 'tee-times' | 'shotgun'
  /** "HH:MM" 24h */
  firstTeeTime: string
  intervalMinutes: number
  groupSize: 2 | 3 | 4
  /** Tee times off the 1st only, or the 1st and 10th */
  startingTees: 'first' | 'first-and-tenth'
}

export interface Official {
  name: string
  role: string
  phone: string
}

export interface HoleData {
  hole: number
  par: number
  yards: number
  handicap: number
  /** Women's par / stroke index when they differ from the men's */
  parWomen?: number
  handicapWomen?: number
  name?: string
  notes?: string
  map?: HoleMap
}

/**
 * Hole geometry in yards on a local grid: the tee sits at (0, 0) and +y points down the hole.
 * The real backend stores latitude/longitude per point; the prototype uses yards so it can
 * draw holes without map tiles. Distances are straight-line yards.
 */
export interface Point { x: number; y: number }

export interface HoleHazard {
  id: string
  type: 'bunker' | 'water' | 'trees'
  at: Point
  /** Radius in yards */
  size: number
}

export interface HoleMap {
  tee: Point
  /** Centre line from tee to green (dogleg points in between) */
  path: Point[]
  greenFront: Point
  greenCentre: Point
  greenBack: Point
  hazards: HoleHazard[]
}

export interface TeeSet {
  id: string
  name: string
  /** Tee marker colour (data, shown as a swatch) */
  color: string
  menRating?: number
  menSlope?: number
  womenRating?: number
  womenSlope?: number
  /** Yards per hole from these tees, in hole order */
  yards: number[]
}

export type CourseStatus = 'open' | 'closed' | 'maintenance'

export interface Course {
  id: string
  name: string
  imageUrl: string
  location: string
  address: string
  city: string
  region: string
  country: string
  description: string
  holes: number
  par: number
  yardage: number
  rating: number
  slope: number
  established: string
  designer: string
  tournamentId?: string
  holeData: HoleData[]
  /** Organisation that added it; undefined = platform-managed course */
  organizerId?: string

  /* ── Full course details (optional so older saved data still loads) ── */
  geo?: { lat: number; lng: number }
  teeSets?: TeeSet[]
  phone?: string
  email?: string
  website?: string
  bookingUrl?: string
  facilities?: string[]
  dressCode?: string
  status?: CourseStatus
  statusNote?: string
}

export interface GolferProfile {
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  city: string
  dob: string
  gender: string
  handicapIndex: number
  memberSince: string
  tournamentsPlayed: number
  wins: number
  avatarInitials: string
  emergencyContactName: string
  emergencyContactPhone: string
  handicapBody: string
  handicapNumber: string
  homeClub: string
  preferredTee: string
  dietary: string[]
  shirtSize: string
  membership: 'Member' | 'Guest'
}

/** What the sign-up + profile-setup flow collects before the account is created */
export interface NewAccount {
  fullName: string
  email: string
  phone: string
  dob: string
  gender: string
  emergencyContactName: string
  emergencyContactPhone: string
  handicapIndex: string
  handicapBody: string
  handicapNumber: string
  homeClub: string
  preferredTee: string
  dietary: string[]
  shirtSize: string
  membership: 'Member' | 'Guest'
}

export interface SharedNavProps {
  push: (screen: ScreenName, params?: Record<string, string>) => void
  pop: () => void
  showToast: (message: string, type?: ToastData['type']) => void
  showDialog: (dialog: DialogData) => void
  canGoBack: boolean
}
