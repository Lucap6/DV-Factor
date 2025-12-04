// ============================================
// APP.JS - File principale (AGGIORNATO)
// ============================================
// Gestisce autenticazione e routing
// Include gestione reset password

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminPanel from './components/AdminPanel'
import ResetPassword from './components/ResetPassword'
import './App.css'

function App() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isResettingPassword, setIsResettingPassword] = useState(false) // NUOVO

  // ============================================
  // CARICAMENTO INIZIALE
  // ============================================
  useEffect(() => {
    // Controlla se siamo nella pagina di reset password
    const params = new URLSearchParams(window.location.search)
    const isReset = window.location.pathname === '/reset-password' || params.get('type') === 'recovery'
    
    if (isReset) {
      setIsResettingPassword(true)
      setLoading(false)
      return
    }

    // Altrimenti procedi con il controllo sessione normale
    checkSession()

    // Listener per cambiamenti di autenticazione
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        
        // Se l'evento è PASSWORD_RECOVERY, mostra la pagina di reset
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // ============================================
  // FUNZIONE: Controlla sessione
  // ============================================
  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
    } catch (error) {
      console.error('Errore nel controllare la sessione:', error)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE: Carica profilo
  // ============================================
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Errore nel caricare il profilo:', error)
    }
  }

  // ============================================
  // FUNZIONE: Gestisce login
  // ============================================
  const handleLogin = async (user) => {
    setUser(user)
    await fetchProfile(user.id)
  }

  // ============================================
  // FUNZIONE: Gestisce logout
  // ============================================
  const handleLogout = () => {
    setUser(null)
    setProfile(null)
  }

  // ============================================
  // FUNZIONE: Reset completato con successo
  // ============================================
  const handleResetSuccess = () => {
    setIsResettingPassword(false)
    // Pulisci l'URL
    window.history.replaceState({}, document.title, '/')
    // Ricarica la pagina per tornare al login
    window.location.reload()
  }

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '20px'
      }}>
        ⏳ Caricamento...
      </div>
    )
  }

  // ============================================
  // PAGINA RESET PASSWORD
  // ============================================
  if (isResettingPassword) {
    return <ResetPassword onSuccess={handleResetSuccess} />
  }

  // ============================================
  // LOGICA DI RENDERING
  // ============================================
  
  // Nessun utente → LOGIN
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  // Utente ADMIN → ADMIN PANEL
  if (profile?.is_admin) {
    return <AdminPanel user={user} onLogout={handleLogout} />
  }

  // Utente normale → DASHBOARD
  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App