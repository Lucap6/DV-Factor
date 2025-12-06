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

// ============================================
// APP.JS - Con creazione profilo lato client
// ============================================

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
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [loadingError, setLoadingError] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isReset = window.location.pathname === '/reset-password' || params.get('type') === 'recovery'
    
    if (isReset) {
      setIsResettingPassword(true)
      setLoading(false)
      return
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event)
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true)
          setLoading(false)
          return
        }

        if (session?.user) {
          setUser(session.user)
          await ensureProfileExists(session.user)
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

  const checkSession = async () => {
    try {
      console.log('🔍 Controllo sessione...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) throw error
      
      if (session?.user) {
        console.log('✅ Sessione trovata:', session.user.email)
        setUser(session.user)
        await ensureProfileExists(session.user)
      } else {
        console.log('ℹ️ Nessuna sessione attiva')
      }
    } catch (error) {
      console.error('❌ Errore nel checkSession:', error)
      setLoadingError('check_session_failed')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE CHIAVE: Assicura che il profilo esista
  // ============================================
  const ensureProfileExists = async (user) => {
    try {
      console.log('👤 Controllo profilo per:', user.email)
      
      // Controlla se il profilo esiste
      let { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      // Se il profilo NON esiste, crealo
      if (!existingProfile) {
        console.log('⚠️ Profilo non trovato, creazione in corso...')
        
        const nickname = generateNickname(user.email)
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
            nickname: nickname
          })
          .select()
          .single()

        if (createError) {
          console.error('❌ Errore creazione profilo:', createError)
          // Se fallisce, prova senza nickname
          const { data: retryProfile, error: retryError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || null,
              nickname: null
            })
            .select()
            .single()
          
          if (retryError) throw retryError
          setProfile(retryProfile)
          console.log('✅ Profilo creato (senza nickname)')
        } else {
          setProfile(newProfile)
          console.log('✅ Profilo creato con successo')
        }
      } else {
        setProfile(existingProfile)
        console.log('✅ Profilo esistente caricato')
      }
    } catch (error) {
      console.error('❌ Errore in ensureProfileExists:', error)
      // Non blocchiamo l'app, l'utente può comunque accedere
      setProfile({ id: user.id, email: user.email })
    }
  }

  // Genera nickname semplice
  const generateNickname = (email) => {
    const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    const random = Math.floor(Math.random() * 1000)
    return base.substring(0, 15) + random
  }

  const handleLogin = async (user) => {
    setUser(user)
    await ensureProfileExists(user)
  }

  const handleLogout = () => {
    setUser(null)
    setProfile(null)
  }

  const handleResetSuccess = () => {
    setIsResettingPassword(false)
    window.history.replaceState({}, document.title, '/')
    window.location.reload()
  }

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
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #e0e0e0',
          borderTop: '5px solid #007bff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '20px'
        }} />
        
        <p style={{ fontSize: '20px', color: '#333' }}>
          ⏳ Caricamento...
        </p>

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
          
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 30px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            🔄 Riprova
          </button>
        </div>
      </div>
    )
  }

  if (isResettingPassword) {
    return <ResetPassword onSuccess={handleResetSuccess} />
  }

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  if (profile?.is_admin) {
    return <AdminPanel user={user} onLogout={handleLogout} />
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}

export default App