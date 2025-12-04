// ============================================
// RESET PASSWORD - Imposta nuova password
// ============================================
// Questa pagina viene aperta quando l'utente clicca
// sul link ricevuto via email

import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function ResetPassword({ onSuccess }) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isValidSession, setIsValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  // ============================================
  // VERIFICA: Controlla se il link è valido
  // ============================================
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        setIsValidSession(true)
      } else {
        setMessage('❌ Link non valido o scaduto. Richiedi un nuovo link di reset.')
      }
    } catch (error) {
      console.error('Errore nel controllo sessione:', error)
      setMessage('❌ Errore nel caricamento della pagina.')
    } finally {
      setCheckingSession(false)
    }
  }

  // ============================================
  // FUNZIONE: Imposta nuova password
  // ============================================
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setMessage('')

    // Validazioni
    if (newPassword.length < 6) {
      setMessage('❌ La password deve essere almeno 6 caratteri')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('❌ Le password non corrispondono')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setMessage('✅ Password cambiata con successo! Reindirizzamento in corso...')
      
      // Aspetta 2 secondi e poi chiama onSuccess
      setTimeout(() => {
        onSuccess()
      }, 2000)

    } catch (error) {
      console.error('Errore nel cambio password:', error)
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Loading state
  if (checkingSession) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '20px'
      }}>
        ⏳ Verifica in corso...
      </div>
    )
  }

  // Link non valido
  if (!isValidSession) {
    return (
      <div style={{ maxWidth: '500px', margin: '50px auto', padding: '20px' }}>
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          border: '1px solid #ef5350',
          textAlign: 'center'
        }}>
          <h2 style={{ color: '#c62828', marginBottom: '15px' }}>
            ⚠️ Link non valido
          </h2>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#333', marginBottom: '20px' }}>
            {message || 'Il link per il reset della password non è valido o è scaduto.'}
          </p>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Torna al Login
          </button>
        </div>
      </div>
    )
  }

  // Form per impostare nuova password
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1>🔐 Imposta Nuova Password</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Scegli una nuova password sicura per il tuo account.
        </p>
      </div>

      <form onSubmit={handleResetPassword}>
        {/* Nuova password */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Nuova password: <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimo 6 caratteri"
            required
            minLength="6"
            style={{ 
              width: '100%', 
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Conferma password */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Conferma password: <span style={{ color: 'red' }}>*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Ripeti la password"
            required
            minLength="6"
            style={{ 
              width: '100%', 
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Indicatore forza password */}
        {newPassword && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
              Forza password:
            </p>
            <div style={{ 
              height: '8px', 
              backgroundColor: '#e0e0e0', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                height: '100%',
                width: newPassword.length < 6 ? '33%' : newPassword.length < 10 ? '66%' : '100%',
                backgroundColor: newPassword.length < 6 ? '#ef5350' : newPassword.length < 10 ? '#ffa726' : '#66bb6a',
                transition: 'all 0.3s ease'
              }} />
            </div>
            <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>
              {newPassword.length < 6 ? 'Debole' : newPassword.length < 10 ? 'Media' : 'Forte'}
            </p>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading || !newPassword || !confirmPassword}
          style={{ 
            width: '100%', 
            padding: '12px', 
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: (loading || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer',
            opacity: (loading || !newPassword || !confirmPassword) ? 0.6 : 1
          }}
        >
          {loading ? 'Aggiornamento...' : 'Cambia password'}
        </button>
      </form>

      {/* Messaggio di feedback */}
      {message && (
        <div style={{ 
          marginTop: '15px', 
          padding: '12px', 
          backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e9',
          color: message.includes('❌') ? '#c62828' : '#2e7d32',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Suggerimenti per password sicura */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#666'
      }}>
        <p style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          💡 Consigli per una password sicura:
        </p>
        <ul style={{ marginLeft: '20px', lineHeight: '1.6' }}>
          <li>Almeno 8-10 caratteri</li>
          <li>Combina lettere maiuscole e minuscole</li>
          <li>Includi numeri e caratteri speciali</li>
          <li>Non usare informazioni personali</li>
          <li>Evita password comuni</li>
        </ul>
      </div>
    </div>
  )
}

export default ResetPassword