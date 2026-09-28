import { useEffect } from 'react'
import './store' // load any saved admin edits before the first render
import { AppProvider, useApp, adminHomePath } from './app-context'
import { ALL_PERMISSIONS } from './admin/access'
import { useRoute, navigate, type Route } from './router'
import { AppLayout, Toast, Dialog } from './shell'
import { EmptyState } from './components'
import SignIn from './screens/SignIn'
import SignUp from './screens/SignUp'
import ProfileSetup from './screens/ProfileSetup'
import OrganizerSetup from './screens/OrganizerSetup'
import Home from './screens/Home'
import TournamentList from './screens/TournamentList'
import TournamentDetails from './screens/TournamentDetails'
import CourseDetails from './screens/CourseDetails'
import Profile from './screens/Profile'
import EditProfile from './screens/EditProfile'
import { AdminLogin, AdminLayout, NoAccess } from './admin/AdminShell'
import { AdminRoles, AdminRoleEditor } from './admin/ManageRoles'
import { AdminUsers } from './admin/ManageUsers'
import { AdminOrganisation, AdminOrganizers } from './admin/Organizations'
import AdminDashboard from './admin/Dashboard'
import { AdminTournaments, AdminTournamentEditor } from './admin/ManageTournaments'
import { AdminCourses, AdminCourseEditor } from './admin/ManageCourses'

const AUTH_ROUTES: Route['name'][] = ['signin', 'signup', 'setup', 'organizer-setup', 'admin-login']
const isAdminRoute = (r: Route) => r.name.startsWith('admin') && r.name !== 'admin-login'

function NotFound({ home }: { home: string }) {
  return (
    <div className="bg-white rounded-[32px] shadow-card">
      <EmptyState title="Page not found" subtitle="The page you're looking for doesn't exist."
        action={{ label: 'Go home', onClick: () => navigate(home) }} />
    </div>
  )
}

function Routes() {
  const { route } = useRoute()
  const { role, can } = useApp()
  const isAuthRoute = AUTH_ROUTES.includes(route.name)

  // Guards: signed-out users only see sign-in pages; each role stays in its own area
  useEffect(() => {
    if (!role && !isAuthRoute) navigate(isAdminRoute(route) ? '/admin/login' : '/signin', { replace: true })
    else if (role === 'golfer' && (isAuthRoute || isAdminRoute(route))) navigate('/home', { replace: true })
    else if (role === 'admin' && (isAuthRoute || !isAdminRoute(route))) navigate(adminHomePath(ALL_PERMISSIONS.filter(can)), { replace: true })
  }, [role, isAuthRoute, route, can])

  if (!role) {
    if (route.name === 'signup') return <SignUp />
    if (route.name === 'setup') return <ProfileSetup />
    if (route.name === 'organizer-setup') return <OrganizerSetup />
    if (route.name === 'admin-login' || isAdminRoute(route)) return <AdminLogin />
    return <SignIn />
  }

  const key = JSON.stringify(route)

  if (role === 'admin') {
    if (!isAdminRoute(route)) return null
    const page = (() => {
      switch (route.name) {
        case 'admin':                 return can('dashboard.view') ? <AdminDashboard key={key} /> : <NoAccess what="view the dashboard" />
        case 'admin-tournaments':     return can('tournaments.view') ? <AdminTournaments key={key} /> : <NoAccess what="view tournaments" />
        case 'admin-tournament-edit': return <AdminTournamentEditor key={key} id={route.id} />
        case 'admin-courses':         return can('courses.view') ? <AdminCourses key={key} /> : <NoAccess what="view courses" />
        case 'admin-course-edit':     return <AdminCourseEditor key={key} id={route.id} />
        case 'admin-roles':           return <AdminRoles key={key} />
        case 'admin-role-edit':       return <AdminRoleEditor key={key} id={route.id} />
        case 'admin-users':           return <AdminUsers key={key} />
        case 'admin-organisation':    return <AdminOrganisation key={key} />
        case 'admin-organizers':      return <AdminOrganizers key={key} />
        default:                      return <NotFound home="/admin" />
      }
    })()
    return <AdminLayout route={route}>{page}</AdminLayout>
  }

  if (isAuthRoute || isAdminRoute(route)) return null
  const page = (() => {
    switch (route.name) {
      case 'home':         return <Home key={key} />
      case 'tournaments':  return <TournamentList key={key} />
      case 'tournament':   return <TournamentDetails key={key} id={route.id} />
      case 'course':       return <CourseDetails key={key} id={route.id} />
      case 'profile':      return <Profile key={key} />
      case 'edit-profile': return <EditProfile key={key} />
      default:             return <NotFound home="/home" />
    }
  })()

  return <AppLayout route={route}>{page}</AppLayout>
}

export default function App() {
  return (
    <AppProvider>
      <Routes />
      <Toast />
      <Dialog />
    </AppProvider>
  )
}
