// ============================================
// APP.JS - File principale dell'applicazione
// ============================================
// Questo file:
// - Gestisce l'autenticazione (chi è loggato)
// - Decide quale componente mostrare (Login, Dashboard, AdminPanel)
// - Mantiene lo stato dell'utente

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminPanel from './components/AdminPanel'
import './App.css'

function App() {
  // ============================================
  // STATI - Variabili globali dell'app
  // ============================================
  const [user, setUser] = useState(null) // Utente loggato (null = nessuno)
  const [profile, setProfile] = useState(null) // Profilo dell'utente dal database
  const [loading, setLoading] = useState(true) // Stiamo caricando?

  // ============================================
  // CARICAMENTO INIZIALE - Controlla se c'è un utente loggato
  // ============================================
  useEffect(() => {
    // Controlla se c'è già una sessione attiva
    checkSession()

    // Ascolta i cambiamenti di autenticazione (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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

    // Pulizia quando il componente viene distrutto
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // ============================================
  // FUNZIONE: Controlla se c'è una sessione attiva
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
  // FUNZIONE: Carica il profilo dell'utente dal database
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
  // FUNZIONE: Gestisce il login
  // ============================================
  const handleLogin = async (user) => {
    setUser(user)
    await fetchProfile(user.id)
  }

  // ============================================
  // FUNZIONE: Gestisce il logout
  // ============================================
  const handleLogout = () => {
    setUser(null)
    setProfile(null)
  }

  // ============================================
  // SCHERMATA DI CARICAMENTO
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
  // LOGICA DI RENDERING - Quale pagina mostrare?
  // ============================================
  
  // Se non c'è un utente loggato → mostra il LOGIN
  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  // Se l'utente è un ADMIN → mostra il PANNELLO ADMIN
  if (profile?.is_admin) {
    return <AdminPanel user={user} onLogout={handleLogout} />
  }

  // Altrimenti → mostra la DASHBOARD UTENTE
  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App