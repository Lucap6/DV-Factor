// ============================================
// LOGIN COMPONENT - Homepage con fix errori
// ============================================
// Fix: Mostra errori dettagliati durante registrazione

import { useState } from 'react'
import { supabase } from '../supabaseClient'
import ForgotPassword from './ForgotPassword'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (showForgotPassword) {
    return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isSignUp) {
        // REGISTRAZIONE
        console.log('🔵 Inizio registrazione per:', email)
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: window.location.origin,
          },
        })

        console.log('🔵 Risposta Supabase:', { data, error })

        if (error) {
          console.error('❌ Errore Supabase:', error)
          throw error
        }

        // Verifica se l'utente è stato creato
        if (data?.user) {
          console.log('✅ Utente creato:', data.user.id)
          
          // Controlla se email confirmation è richiesta
          if (data.user.identities && data.user.identities.length === 0) {
            // Email già in uso
            setMessage('⚠️ Questa email è già registrata. Prova a fare login.')
          } else if (data.user.confirmed_at) {
            // Email già confermata (auto-confirm attivo)
            setMessage('✅ Registrazione completata! Puoi effettuare il login.')
          } else {
            // Email confirmation richiesta
            setMessage('✅ Registrazione completata! Controlla la tua email (anche spam) per confermare l\'account.')
          }
        } else {
          console.warn('⚠️ Nessun utente restituito da Supabase')
          setMessage('⚠️ Registrazione in corso. Controlla la tua email.')
        }

      } else {
        // LOGIN
        console.log('🔵 Tentativo login per:', email)
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        console.log('🔵 Risposta login:', { data, error })

        if (error) {
          console.error('❌ Errore login:', error)
          throw error
        }
        
        if (data.user) {
          console.log('✅ Login effettuato:', data.user.email)
          onLogin(data.user)
        }
      }
    } catch (error) {
      console.error('❌ Errore completo:', error)
      
      // Mostra messaggi di errore più chiari
      let errorMessage = '❌ '
      
      if (error.message.includes('User already registered')) {
        errorMessage += 'Questa email è già registrata. Prova a fare login.'
      } else if (error.message.includes('Invalid login credentials')) {
        errorMessage += 'Email o password non corretti.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage += 'Devi confermare la tua email prima di accedere. Controlla la tua casella email.'
      } else if (error.message.includes('rate limit')) {
        errorMessage += 'Troppi tentativi. Riprova tra qualche minuto.'
      } else {
        errorMessage += error.message
      }
      
      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#f5f5f5'
    }}>
      {/* SEZIONE LOGIN */}
      <div style={{ 
        flex: '0 0 auto',
        backgroundColor: 'white',
        padding: '40px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '42px', 
            marginBottom: '10px',
            color: '#007bff'
          }}>
            🏖️ DV-Factor
          </h1>
          <h2 style={{ 
            fontSize: '24px', 
            marginBottom: '30px',
            color: '#333',
            fontWeight: 'normal'
          }}>
            {isSignUp ? 'Crea il tuo account' : 'Accedi al gioco'}
          </h2>

          <form onSubmit={handleAuth}>
            {/* Campo EMAIL */}
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: '600',
                color: '#555',
                textAlign: 'center'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua-email@esempio.com"
                required
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  textAlign: 'center',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Campo NOME COMPLETO */}
            {isSignUp && (
              <div style={{ marginBottom: '15px', textAlign: 'center' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px',
                  fontWeight: '600',
                  color: '#555',
                  textAlign: 'center'
                }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  required
                  style={{ 
                    width: '100%', 
                    padding: '12px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '16px',
                    textAlign: 'center',
                    transition: 'border-color 0.3s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#007bff'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            )}

            {/* Campo PASSWORD */}
            <div style={{ marginBottom: '15px', textAlign: 'center' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px',
                fontWeight: '600',
                color: '#555',
                textAlign: 'center'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength="6"
                style={{ 
                  width: '100%', 
                  padding: '12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  textAlign: 'center',
                  transition: 'border-color 0.3s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#007bff'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
              {isSignUp && (
                <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Minimo 6 caratteri
                </p>
              )}
            </div>

            {/* Link password dimenticata */}
            {!isSignUp && (
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
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
                  Password dimenticata?
                </button>
              </div>
            )}

            {/* Pulsante INVIA */}
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '14px',
                backgroundColor: loading ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
                marginBottom: '15px'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#0056b3')}
              onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#007bff')}
            >
              {loading ? 'Caricamento...' : (isSignUp ? 'Registrati' : 'Accedi')}
            </button>
          </form>

          {/* Messaggio di successo/errore */}
          {message && (
            <div style={{ 
              marginTop: '15px',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: message.includes('❌') ? '#ffebee' : message.includes('⚠️') ? '#fff3cd' : '#e8f5e9',
              color: message.includes('❌') ? '#c62828' : message.includes('⚠️') ? '#856404' : '#2e7d32',
              fontSize: '14px',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              {message}
            </div>
          )}

          {/* Link per cambiare tra Login e Registrazione */}
          <p style={{ 
            marginTop: '25px', 
            textAlign: 'center',
            fontSize: '15px',
            color: '#666'
          }}>
            {isSignUp ? 'Hai già un account?' : 'Non hai un account?'}
            <button 
              onClick={() => {
                setIsSignUp(!isSignUp)
                setMessage('')
              }}
              style={{ 
                marginLeft: '8px', 
                background: 'none', 
                border: 'none', 
                color: '#007bff', 
                cursor: 'pointer', 
                textDecoration: 'underline',
                fontWeight: '600',
                fontSize: '15px'
              }}
            >
              {isSignUp ? 'Accedi' : 'Registrati'}
            </button>
          </p>
        </div>
      </div>

      {/* SEZIONE INFORMATIVA CON CHIRINGUITO */}
      <div style={{ 
        flex: '1',
        backgroundImage: 'url(/images/chiringuito-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1
        }} />

        <div style={{ 
          position: 'relative',
          zIndex: 2,
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px 20px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h2 style={{ 
            fontSize: '36px', 
            marginBottom: '20px',
            fontWeight: 'bold',
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
          }}>
            🏖️ Il Fantasy Game che nessuno ha mai osato creare!
          </h2>
          
          <p style={{ 
            fontSize: '20px', 
            lineHeight: '1.8',
            marginBottom: '30px',
            textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
          }}>
            Scegli 3 dipendenti che secondo te daranno le dimissioni entro fine 2026. 
            Attiva il <strong>Bonus "Chiringuito a Fuerteventura"</strong> e vinci il jackpot 
            se indovini chi mollerà tutto per aprire un baretto sulla spiaggia! 🍹
          </p>

          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '30px',
            marginTop: '30px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ 
              fontSize: '24px', 
              marginBottom: '20px',
              color: '#333'
            }}>
              📜 Come funziona
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              textAlign: 'center'
            }}>
              <div>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎯</div>
                <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#007bff' }}>
                  Scegli 3 dipendenti
                </h4>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Seleziona chi pensi darà le dimissioni
                </p>
              </div>

              <div>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>🏖️</div>
                <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#007bff' }}>
                  Attiva il Bonus
                </h4>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Punta forte su uno: 60% del montepremi!
                </p>
              </div>

              <div>
                <div style={{ fontSize: '40px', marginBottom: '10px' }}>💰</div>
                <h4 style={{ fontSize: '18px', marginBottom: '8px', color: '#007bff' }}>
                  Vinci il jackpot
                </h4>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  Prima dimissione = 70% del payout
                </p>
              </div>
            </div>

            <div style={{ 
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#fff3cd',
              borderRadius: '8px',
              border: '2px solid #ffc107'
            }}>
              <p style={{ 
                fontSize: '16px', 
                color: '#856404',
                margin: 0,
                fontWeight: '600'
              }}>
                💡 Niente analisi psicologiche, solo istinto e gossip da macchinetta del caffè!
              </p>
            </div>
          </div>

          <p style={{ 
            marginTop: '30px',
            fontSize: '16px',
            textShadow: '1px 1px 3px rgba(0,0,0,0.5)'
          }}>
            Registrati ora e inizia a giocare! Quota di partecipazione: <strong>€3,00</strong>
          </p>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        backgroundColor: '#333',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontSize: '14px'
      }}>
        <p style={{ margin: 0 }}>
          🎮 DV-Factor - Il fantasy game sulle dimissioni volontarie
        </p>
        <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#999' }}>
          Gioco privato tra amici, a scopo ricreativo • Art. 1933 C.C.
        </p>
      </div>
    </div>
  )
}

export default Login