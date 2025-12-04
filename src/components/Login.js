// ============================================
// LOGIN COMPONENT - Pagina di accesso (AGGIORNATO)
// ============================================
// Permette agli utenti di registrarsi o fare login
// Include link per recupero password

import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ForgotPassword from './ForgotPassword'

function Login({ onLogin }) {
  // "Stati" per salvare cosa scrive l'utente nei campi
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false) // true = registrazione, false = login
  const [showForgotPassword, setShowForgotPassword] = useState(false) // NUOVO
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ============================================
  // Se l'utente vuole recuperare la password
  // ============================================
  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
  }

  // ============================================
  // FUNZIONE: Gestisce il login o la registrazione
  // ============================================
  const handleAuth = async (e) => {
    e.preventDefault() // Impedisce il refresh della pagina
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        // REGISTRAZIONE: crea un nuovo utente
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) throw error
        setMessage('✅ Registrazione completata! Controlla la tua email per confermare.')
      } else {
        // LOGIN: accede con email e password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error
        
        // Se il login ha successo, chiama la funzione onLogin
        if (data.user) {
          onLogin(data.user)
        }
      }
    } catch (error) {
      setMessage('❌ ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <h1>🏄🏻 DV-Factor</h1>
      <h2>{isSignUp ? 'Registrazione' : 'Login'}</h2>

      <form onSubmit={handleAuth}>
        {/* Campo EMAIL */}
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* Campo NOME COMPLETO (solo in registrazione) */}
        {isSignUp && (
          <div style={{ marginBottom: '15px' }}>
            <label>Nome Completo:</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
        )}

        {/* Campo PASSWORD */}
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        {/* NUOVO: Link password dimenticata (solo in login) */}
        {!isSignUp && (
          <div style={{ marginBottom: '15px', textAlign: 'right' }}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#007bff', 
                cursor: 'pointer', 
                textDecoration: 'underline',
                fontSize: '14px'
              }}
            >
              Password dimenticata? 😔
            </button>
          </div>
        )}

        {/* Pulsante INVIA */}
        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '10px', cursor: 'pointer' }}
        >
          {loading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
        </button>
      </form>

      {/* Messaggio di successo/errore */}
      {message && <p style={{ marginTop: '15px', color: message.includes('❌') ? 'red' : 'green' }}>{message}</p>}

      {/* Link per cambiare tra Login e Registrazione */}
      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        {isSignUp ? 'Hai già un account?' : 'Non hai un account?'}
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          style={{ marginLeft: '5px', background: 'none', border: 'none', color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {isSignUp ? 'Accedi' : 'Registrati'}
        </button>
      </p>
    </div>
  )
}

export default Login