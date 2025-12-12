// ============================================
// APP.JS - Con creazione profilo lato client
// ============================================

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
  const [loadingError, setLoadingError] = useState(null)
  const loadingTimeoutRef = useRef(null) // NUOVO

  useEffect(() => {
    // NUOVO: Timeout aggressivo - 3 secondi
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.error('⏱️ TIMEOUT: Sblocco automatico dopo 3 secondi')
        setLoading(false)
        setLoadingError('timeout')
      }
    }, 3000) // 3 secondi invece di 5
    const params = new URLSearchParams(window.location.search)
    const isReset = window.location.pathname === '/reset-password' || params.get('type') === 'recovery'
    
    if (isReset) {
      setIsResettingPassword(true)
      setLoading(false)
      clearTimeout(loadingTimeoutRef.current)
      return
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event)
        
        // NUOVO: Se il token è scaduto, forza logout e pulisci tutto
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (!session) {
            console.log('🔄 Token scaduto o logout, pulizia completa...')
            setUser(null)
            setProfile(null)
            setLoading(false)
            clearTimeout(loadingTimeoutRef.current)
            
            // Pulisci completamente lo storage
            localStorage.clear()
            sessionStorage.clear()
            return
          }
        }
        
        if (event === 'PASSWORD_RECOVERY') {
          setIsResettingPassword(true)
          setLoading(false)
          clearTimeout(loadingTimeoutRef.current)
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
        clearTimeout(loadingTimeoutRef.current)
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  const checkSession = async () => {
    try {
      console.log('🔍 Controllo sessione...')
      
      const { data: { session }, error } = await supabase.auth.getSession()
      
      // NUOVO: Se c'è un errore di autenticazione, pulisci tutto
      if (error) {
        console.error('❌ Errore autenticazione:', error)
        
        if (error.message.includes('refresh_token') || error.message.includes('Invalid')) {
          console.log('🔄 Token invalido, pulizia e reindirizzamento al login...')
          await supabase.auth.signOut()
          localStorage.clear()
          sessionStorage.clear()
          setUser(null)
          setProfile(null)
          setLoadingError(null)
          setLoading(false)
          clearTimeout(loadingTimeoutRef.current)
          return
        }
        
        throw error
      }
      
      if (session?.user) {
        console.log('✅ Sessione trovata:', session.user.email)
        setUser(session.user)
        await ensureProfileExists(session.user)
      } else {
        console.log('ℹ️ Nessuna sessione attiva')
      }
    } catch (error) {
      console.error('❌ Errore nel checkSession:', error)
      
      // Invece di mostrare errore, forza logout pulito
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      setUser(null)
      setProfile(null)
      setLoadingError(null)
    } finally {
      setLoading(false)
      clearTimeout(loadingTimeoutRef.current)
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
        
        <p style={{ fontSize: '20px', color: '#333', marginBottom: '30px' }}>
          ⏳ Caricamento...
        </p>

        {/* NUOVO: Pulsante di emergenza visibile subito */}
        <button
          onClick={() => {
            console.log('🔓 Sblocco manuale')
            setLoading(false)
            setLoadingError(null)
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            opacity: 0.7
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.7'}
        >
          🚨 Sblocca (se bloccato)
        </button>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
          Clicca solo se il caricamento si blocca
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