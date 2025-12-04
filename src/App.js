// ============================================
// APP.JS - File principale (AGGIORNATO)
// ============================================
// Gestisce autenticazione e routing
// Include gestione reset password

// ============================================
// APP.JS - VERSIONE CON FIX CARICAMENTO INFINITO
// ============================================
// Aggiunte:
// - Timeout automatico dopo 5 secondi
// - Pulsante di emergenza per sbloccare
// - Gestione errori migliorata
// - Pulizia cache

import { useEffect, useState, useRef } from 'react'
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
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [loadingError, setLoadingError] = useState(null) // NUOVO: traccia errori
  
  const loadingTimeoutRef = useRef(null) // NUOVO: riferimento al timeout

  // ============================================
  // CARICAMENTO INIZIALE
  // ============================================
  useEffect(() => {
    // NUOVO: Timeout di sicurezza - dopo 5 secondi sblocca
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.error('⏱️ TIMEOUT: Caricamento bloccato, sblocco forzato')
        setLoadingError('timeout')
        setLoading(false)
      }
    }, 5000) // 5 secondi

    // Controlla se siamo nella pagina di reset password
    const params = new URLSearchParams(window.location.search)
    const isReset = window.location.pathname === '/reset-password' || params.get('type') === 'recovery'
    
    if (isReset) {
      setIsResettingPassword(true)
      setLoading(false)
      clearTimeout(loadingTimeoutRef.current)
      return
    }

    // Altrimenti procedi con il controllo sessione normale
    checkSession()

    // Listener per cambiamenti di autenticazione
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event)
        
        // Se l'evento è PASSWORD_RECOVERY, mostra la pagina di reset
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true)
          setLoading(false)
          clearTimeout(loadingTimeoutRef.current)
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
        clearTimeout(loadingTimeoutRef.current)
      }
    )

    // Cleanup
    return () => {
      authListener.subscription.unsubscribe()
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  // ============================================
  // FUNZIONE: Controlla sessione
  // ============================================
  const checkSession = async () => {
    try {
      console.log('🔍 Controllo sessione...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('❌ Errore nel controllare la sessione:', error)
        setLoadingError('session_error')
        throw error
      }
      
      if (session?.user) {
        console.log('✅ Sessione trovata per:', session.user.email)
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        console.log('ℹ️ Nessuna sessione attiva')
      }
    } catch (error) {
      console.error('❌ Errore nel checkSession:', error)
      setLoadingError('check_session_failed')
      // Non bloccare l'app, mostra comunque il login
    } finally {
      setLoading(false)
      clearTimeout(loadingTimeoutRef.current)
    }
  }

  // ============================================
  // FUNZIONE: Carica profilo
  // ============================================
  const fetchProfile = async (userId) => {
    try {
      console.log('👤 Carico profilo per user:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('❌ Errore nel caricare il profilo:', error)
        throw error
      }
      
      console.log('✅ Profilo caricato:', data.email)
      setProfile(data)
    } catch (error) {
      console.error('❌ Errore nel fetchProfile:', error)
      setLoadingError('profile_fetch_failed')
      // Non bloccare, l'utente può comunque usare l'app
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
    window.history.replaceState({}, document.title, '/')
    window.location.reload()
  }

  // ============================================
  // NUOVO: Funzione per forzare lo sblocco
  // ============================================
  const handleForceUnblock = () => {
    console.log('🔓 Sblocco forzato dall\'utente')
    setLoading(false)
    setLoadingError(null)
    setUser(null)
    setProfile(null)
    // Pulisci la cache di Supabase
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
  }

  // ============================================
  // LOADING CON PULSANTE DI EMERGENZA
  // ============================================
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        {/* Spinner animato */}
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #e0e0e0',
          borderTop: '5px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        
        <p style={{ fontSize: '20px', color: '#333', marginBottom: '10px' }}>
          ⏳ Caricamento...
        </p>
        
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '30px' }}>
          Attendere prego
        </p>

        {/* NUOVO: Pulsante di emergenza (appare dopo 3 secondi) */}
        <div id="emergency-button" style={{ opacity: 0, transition: 'opacity 0.5s' }}>
          <button
            onClick={handleForceUnblock}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🚨 Sblocca e vai al Login
          </button>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '10px', textAlign: 'center' }}>
            Clicca se il caricamento è bloccato
          </p>
        </div>

        {/* Script per mostrare il pulsante dopo 3 secondi */}
        <script dangerouslySetInnerHTML={{
          __html: `
            setTimeout(() => {
              const btn = document.getElementById('emergency-button');
              if (btn) btn.style.opacity = '1';
            }, 3000);
          `
        }} />

        {/* CSS per l'animazione */}
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `
        }} />
      </div>
    )
  }

  // ============================================
  // MESSAGGIO DI ERRORE (se c'è stato un problema)
  // ============================================
  if (loadingError && !user) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>
            ⚠️ Problema di Caricamento
          </h2>
          
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
            Si è verificato un problema durante il caricamento dell'applicazione.
            {loadingError === 'timeout' && ' Il caricamento ha impiegato troppo tempo.'}
          </p>

          <button
            onClick={() => {
              handleForceUnblock()
              window.location.reload()
            }}
            style={{
              padding: '12px 30px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '15px',
              width: '100%'
            }}
          >
            🔄 Riprova
          </button>

          <button
            onClick={handleForceUnblock}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            Vai al Login (pulisci cache)
          </button>

          <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
            Codice errore: {loadingError}
          </p>
        </div>
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
  // LOGICA DI RENDERING NORMALE
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