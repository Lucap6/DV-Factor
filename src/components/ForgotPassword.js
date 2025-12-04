// ============================================
// FORGOT PASSWORD - Richiesta recupero password
// ============================================
// L'utente inserisce la sua email e riceve un link
// per resettare la password

import { useState } from 'react'
import { supabase } from '../supabaseClient'

function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // ============================================
  // FUNZIONE: Invia email di recupero
  // ============================================
  const handleResetRequest = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Determina l'URL di redirect in base all'ambiente
      const redirectUrl = window.location.origin + '/reset-password'

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      // Mostra sempre il messaggio generico per sicurezza
      // (non rivela se l'email esiste o no)
      setEmailSent(true)
      setMessage('✅ Se esiste un account con questa email, riceverai le istruzioni per il reset della password.')

    } catch (error) {
      console.error('Errore nel reset password:', error)
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px' }}>
      {/* HEADER */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={onBack}
          style={{ 
            padding: '8px 15px',
            marginBottom: '20px',
            cursor: 'pointer',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '14px'
          }}
        >
          ← Torna al Login
        </button>
        <h1>🔒 Recupero Password</h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Inserisci la tua email per ricevere le istruzioni per resettare la password.
        </p>
      </div>

      {/* FORM O MESSAGGIO DI SUCCESSO */}
      {!emailSent ? (
        <form onSubmit={handleResetRequest}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tua-email@esempio.com"
              required
              style={{ 
                width: '100%', 
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Invio in corso...' : 'Invia email di recupero'}
          </button>
        </form>
      ) : (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          border: '1px solid #4caf50'
        }}>
          <h3 style={{ color: '#2e7d32', marginBottom: '15px' }}>
            ✅ Email inviata!
          </h3>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#333' }}>
            Se esiste un account associato a <strong>{email}</strong>, 
            riceverai un'email con le istruzioni per resettare la password.
          </p>
          <p style={{ fontSize: '14px', marginTop: '15px', color: '#666' }}>
            💡 Controlla anche la cartella spam se non vedi l'email.
          </p>
          <button 
            onClick={() => {
              setEmailSent(false)
              setEmail('')
              setMessage('')
            }}
            style={{ 
              width: '100%', 
              marginTop: '20px',
              padding: '10px', 
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Invia a un'altra email
          </button>
        </div>
      )}

      {/* Messaggio di errore */}
      {message && !emailSent && (
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

      {/* INFO BOX */}
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#666'
      }}>
        <p style={{ marginBottom: '10px' }}>
          <strong>Come funziona:</strong>
        </p>
        <ol style={{ marginLeft: '20px', lineHeight: '1.6' }}>
          <li>Inserisci la tua email</li>
          <li>Riceverai un'email con un link</li>
          <li>Clicca sul link nell'email</li>
          <li>Imposta la nuova password</li>
        </ol>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Il link scade dopo 1 ora per motivi di sicurezza.
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword