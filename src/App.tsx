import { useEffect } from 'react'
import { AppProvider, useApp } from './app-context'
import { useRoute, navigate, type Route } from './router'
import { AppLayout, Toast, Dialog } from './shell'
import { EmptyState } from './components'
import SignIn from './screens/SignIn'
import SignUp from './screens/SignUp'
import ProfileSetup from './screens/ProfileSetup'
import Home from './screens/Home'
import TournamentList from './screens/TournamentList'
import TournamentDetails from './screens/TournamentDetails'
import CourseDetails from './screens/CourseDetails'
import Profile from './screens/Profile'
import EditProfile from './screens/EditProfile'

const AUTH_ROUTES: Route['name'][] = ['signin', 'signup', 'setup']

function Routes() {
  const { route } = useRoute()
  const { isAuthenticated } = useApp()
  const isAuthRoute = AUTH_ROUTES.includes(route.name)

  // Guard: signed-out users only see auth pages; signed-in users skip them
  useEffect(() => {
    if (!isAuthenticated && !isAuthRoute) navigate('/signin', { replace: true })
    if (isAuthenticated && isAuthRoute) navigate('/home', { replace: true })
  }, [isAuthenticated, isAuthRoute])

  if (!isAuthenticated) {
    if (route.name === 'signup') return <SignUp />
    if (route.name === 'setup') return <ProfileSetup />
    return <SignIn />
  }
  if (isAuthRoute) return null

  // Key on the full route so each page mounts fresh (loading states, scroll, animation)
  const key = JSON.stringify(route)
  const page = (() => {
    switch (route.name) {
      case 'home':         return <Home key={key} />
      case 'tournaments':  return <TournamentList key={key} />
      case 'tournament':   return <TournamentDetails key={key} id={route.id} />
      case 'course':       return <CourseDetails key={key} id={route.id} />
      case 'profile':      return <Profile key={key} />
      case 'edit-profile': return <EditProfile key={key} />
      default:
        return (
          <div className="bg-white rounded-[32px] shadow-card">
            <EmptyState title="Page not found" subtitle="The page you're looking for doesn't exist."
              action={{ label: 'Go home', onClick: () => navigate('/home') }} />
          </div>
        )
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
