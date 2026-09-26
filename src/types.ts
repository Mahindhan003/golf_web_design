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
  | 'published'
  | 'registration-open'
  | 'registration-closed'
  | 'upcoming'
  | 'completed'
  | 'cancelled'

export type RegistrationStatus = 'open' | 'closed' | 'coming-soon' | 'registered'

export type TournamentFormat = 'Stroke Play' | 'Stableford' | 'Four-Ball' | 'Scramble'

export interface Tournament {
  id: string
  name: string
  dateRange: string
  startDate: string
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
  players: number
  maxPlayers: number
  entryFee: string
  prize: string
  imageUrl: string
}

export interface HoleData {
  hole: number
  par: number
  yards: number
  handicap: number
}

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
