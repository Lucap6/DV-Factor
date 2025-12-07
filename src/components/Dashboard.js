// ============================================
// DASHBOARD - Completa e corretta
// ============================================
// Fix:
// 1. Aggiunto pulsante "Gestisci Profilo"
// 2. Visualizzazione completa della giocata
// 3. Logout funzionante

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import PayoutTable from './PayoutTable'
import UserProfile from './UserProfile'

function Dashboard({ user, onLogout }) {
  // ============================================
  // STATI
  // ============================================
  const [showProfile, setShowProfile] = useState(false)
  const [profile, setProfile] = useState(null)
  const [employees, setEmployees] = useState([])
  const [gameEdition, setGameEdition] = useState(null)
  const [participation, setParticipation] = useState(null)
  const [bet, setBet] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [selectedEmployees, setSelectedEmployees] = useState({
    employee1: '',
    employee2: '',
    employee3: '',
    chiringuito: ''
  })

  const [message, setMessage] = useState('')

  // ============================================
  // CARICAMENTO INIZIALE
  // ============================================
  useEffect(() => {
    fetchData()
  }, [user])

  // ============================================
  // FUNZIONE: Carica tutti i dati
  // ============================================
  const fetchData = async () => {
    try {
      // 1. Carica il profilo
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // 2. Carica l'edizione corrente (2026)
      const { data: editionData, error: editionError } = await supabase
        .from('game_editions')
        .select('*')
        .eq('year', 2026)
        .eq('status', 'open')
        .single()

      if (editionError) {
        console.log('Nessuna edizione attiva')
        setLoading(false)
        return
      }
      
      setGameEdition(editionData)

      // 3. Carica o crea la partecipazione
      let { data: participationData, error: participationError } = await supabase
        .from('edition_participants')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_edition_id', editionData.id)
        .maybeSingle()

      if (!participationData) {
        const { data: newParticipation, error: insertError } = await supabase
          .from('edition_participants')
          .insert({
            user_id: user.id,
            game_edition_id: editionData.id,
            payment_amount: editionData.entry_fee,
            payment_status: false
          })
          .select()
          .single()

        if (insertError) {
          console.error('Errore nella creazione della partecipazione:', insertError)
        } else {
          participationData = newParticipation
        }
      }

      setParticipation(participationData)

      // 4. Carica la puntata CON I NOMI DEI DIPENDENTI
      const { data: betData, error: betError } = await supabase
        .from('bets')
        .select(`
          *,
          employee_1:employee_1_id(id, first_name, last_name),
          employee_2:employee_2_id(id, first_name, last_name),
          employee_3:employee_3_id(id, first_name, last_name),
          chiringuito:chiringuito_employee_id(id, first_name, last_name)
        `)
        .eq('user_id', user.id)
        .eq('game_edition_id', editionData.id)
        .maybeSingle()

      if (betData) {
        setBet(betData)
        
        if (participationData && !participationData.has_bet) {
          await supabase
            .from('edition_participants')
            .update({ has_bet: true })
            .eq('id', participationData.id)
        }
      }

      // 5. Carica dipendenti
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('last_name')

      if (employeesError) throw employeesError
      setEmployees(employeesData)

    } catch (error) {
      console.error('Errore nel caricamento:', error)
      setMessage('❌ Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE: Salva la puntata
  // ============================================
  const handleSubmitBet = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!participation?.payment_status) {
      setMessage('❌ Devi prima effettuare il pagamento per giocare!')
      return
    }

    if (!gameEdition) {
      setMessage('❌ Nessuna edizione del gioco attiva!')
      return
    }

    if (!selectedEmployees.employee1 || !selectedEmployees.employee2 || !selectedEmployees.employee3) {
      setMessage('❌ Devi selezionare 3 dipendenti!')
      return
    }

    const employeesList = [selectedEmployees.employee1, selectedEmployees.employee2, selectedEmployees.employee3]
    const uniqueEmployees = new Set(employeesList)
    if (uniqueEmployees.size !== 3) {
      setMessage('❌ Non puoi scegliere lo stesso dipendente più volte!')
      return
    }

    if (selectedEmployees.chiringuito && !employeesList.includes(selectedEmployees.chiringuito)) {
      setMessage('❌ Il bonus Chiringuito deve essere attivato su uno dei 3 dipendenti selezionati!')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('bets')
        .upsert({
          user_id: user.id,
          game_edition_id: gameEdition.id,
          employee_1_id: selectedEmployees.employee1,
          employee_2_id: selectedEmployees.employee2,
          employee_3_id: selectedEmployees.employee3,
          chiringuito_employee_id: selectedEmployees.chiringuito || null
        }, {
          onConflict: 'user_id,game_edition_id'
        })

      if (error) throw error

      setMessage('✅ Puntata salvata con successo!')
      await fetchData()

    } catch (error) {
      console.error('Errore nel salvare la puntata:', error)
      setMessage('❌ Errore nel salvare la puntata: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE: Logout (CORRETTA)
  // ============================================
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      // Chiama la funzione onLogout passata da App.js
      onLogout()
      
      // Pulisci lo stato locale
      setProfile(null)
      setGameEdition(null)
      setParticipation(null)
      setBet(null)
      
    } catch (error) {
      console.error('Errore durante il logout:', error)
      alert('Errore durante il logout. Riprova.')
    }
  }

  if (loading) return <p>Caricamento...</p>

  // ============================================
  // Se l'utente vuole gestire il profilo
  // ============================================
  if (showProfile) {
    return <UserProfile user={user} onBack={() => {
      setShowProfile(false)
      fetchData() // Ricarica i dati dopo aver modificato il profilo
    }} />
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '20px' }}>
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '30px',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Avatar */}
          {profile?.avatar_url && (
            <img 
              src={profile.avatar_url} 
              alt="Avatar"
              style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #007bff',
                cursor: 'pointer'
              }}
              onClick={() => setShowProfile(true)}
              title="Clicca per modificare"
            />
          )}
          <div>
            <h1 style={{ marginBottom: '5px' }}>🎮 DV-Factor Dashboard</h1>
            <p style={{ margin: '5px 0' }}>
              Benvenuto, <strong>{profile?.nickname || profile?.full_name || user.email}</strong>
            </p>
            {participation && (
              <p style={{ 
                fontSize: '14px', 
                color: participation.payment_status ? 'green' : 'red',
                margin: '5px 0'
              }}>
                {participation.payment_status 
                  ? `✅ Pagamento effettuato (€${parseFloat(participation.payment_amount).toFixed(2)})` 
                  : '❌ Pagamento NON effettuato'}
              </p>
            )}
          </div>
        </div>

        {/* Pulsanti azione */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={() => setShowProfile(true)}
            style={{ 
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            ⚙️ Gestisci Profilo
          </button>
          <button 
            onClick={handleLogout}
            style={{ 
              padding: '10px 20px',
              cursor: 'pointer',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* INFORMAZIONI EDIZIONE */}
      {/* ============================================ */}
      {gameEdition ? (
        <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>📅 Edizione {gameEdition.year}</h3>
          <p><strong>Scadenza puntate:</strong> {new Date(gameEdition.betting_deadline).toLocaleDateString('it-IT')}</p>
          <p><strong>Fine gioco:</strong> {new Date(gameEdition.end_date).toLocaleDateString('it-IT')}</p>
          <p><strong>Quota partecipazione:</strong> €{parseFloat(gameEdition.entry_fee).toFixed(2)}</p>
          <p><strong>Jackpot iniziale:</strong> €{parseFloat(gameEdition.jackpot).toFixed(2)}</p>
          <p><strong>💰 Montepremi totale:</strong> <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>€{parseFloat(gameEdition.total_pool).toFixed(2)}</span></p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            (Aggiornato in tempo reale con i pagamenti confermati)
          </p>
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffe6e6', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <p>⚠️ Nessuna edizione del gioco attiva al momento.</p>
        </div>
      )}

      {/* ============================================ */}
      {/* VISUALIZZA PUNTATA (SEMPRE VISIBILE) */}
      {/* ============================================ */}
      {bet && (
        <div style={{ 
          backgroundColor: '#e6f7ff', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '2px solid #007bff'
        }}>
          <h3 style={{ marginBottom: '15px' }}>📝 La tua puntata</h3>
          
          {/* SEMPRE visibile, anche se is_revealed è false */}
          <div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Dipendente 1:</strong> {bet.employee_1 ? `${bet.employee_1.first_name} ${bet.employee_1.last_name}` : 'N/A'}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Dipendente 2:</strong> {bet.employee_2 ? `${bet.employee_2.first_name} ${bet.employee_2.last_name}` : 'N/A'}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Dipendente 3:</strong> {bet.employee_3 ? `${bet.employee_3.first_name} ${bet.employee_3.last_name}` : 'N/A'}
            </div>
            {bet.chiringuito && (
              <div style={{ 
                marginTop: '15px',
                padding: '15px',
                backgroundColor: '#fff3cd',
                borderRadius: '5px',
                border: '2px solid #ffc107'
              }}>
                <p style={{ color: '#856404', fontWeight: 'bold', margin: 0 }}>
                  🏖️ Bonus "Chiringuito a Fuerteventura" attivato su:<br/>
                  <span style={{ fontSize: '18px' }}>
                    {bet.chiringuito.first_name} {bet.chiringuito.last_name}
                  </span>
                </p>
              </div>
            )}
          </div>

          <p style={{ fontSize: '12px', color: '#666', marginTop: '15px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
            Puntata inserita il: {new Date(bet.created_at).toLocaleString('it-IT')}
          </p>

          {!bet.is_revealed && (
            <p style={{ fontSize: '13px', color: '#007bff', marginTop: '10px', fontStyle: 'italic' }}>
              ℹ️ Le puntate degli altri partecipanti verranno rivelate solo a fine gioco.
            </p>
          )}
        </div>
      )}

      {/* ============================================ */}
      {/* FORM INSERIMENTO PUNTATA */}
      {/* ============================================ */}
      {!bet && gameEdition && participation?.payment_status && (
        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
          <h3>🎯 Inserisci la tua puntata</h3>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Scegli 3 dipendenti che secondo te daranno le dimissioni entro il 31/12/2026
          </p>

          <form onSubmit={handleSubmitBet}>
            {/* DIPENDENTE 1 */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Dipendente 1:
              </label>
              <select
                value={selectedEmployees.employee1}
                onChange={(e) => setSelectedEmployees({...selectedEmployees, employee1: e.target.value})}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">-- Seleziona --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name}
                  </option>
                ))}
              </select>
            </div>

            {/* DIPENDENTE 2 */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Dipendente 2:
              </label>
              <select
                value={selectedEmployees.employee2}
                onChange={(e) => setSelectedEmployees({...selectedEmployees, employee2: e.target.value})}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">-- Seleziona --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name}
                  </option>
                ))}
              </select>
            </div>

            {/* DIPENDENTE 3 */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Dipendente 3:
              </label>
              <select
                value={selectedEmployees.employee3}
                onChange={(e) => setSelectedEmployees({...selectedEmployees, employee3: e.target.value})}
                required
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">-- Seleziona --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name} {emp.first_name}
                  </option>
                ))}
              </select>
            </div>

            {/* BONUS CHIRINGUITO */}
            <div style={{ marginBottom: '20px', backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                🏖️ Bonus "Chiringuito a Fuerteventura" (opzionale):
              </label>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                Attiva il bonus su UNO dei 3 dipendenti scelti. Se indovini, vinci il 60% del montepremi!
              </p>
              <select
                value={selectedEmployees.chiringuito}
                onChange={(e) => setSelectedEmployees({...selectedEmployees, chiringuito: e.target.value})}
                style={{ width: '100%', padding: '8px' }}
              >
                <option value="">-- Nessun bonus --</option>
                {selectedEmployees.employee1 && (
                  <option value={selectedEmployees.employee1}>
                    {employees.find(e => e.id === selectedEmployees.employee1)?.last_name} {employees.find(e => e.id === selectedEmployees.employee1)?.first_name}
                  </option>
                )}
                {selectedEmployees.employee2 && (
                  <option value={selectedEmployees.employee2}>
                    {employees.find(e => e.id === selectedEmployees.employee2)?.last_name} {employees.find(e => e.id === selectedEmployees.employee2)?.first_name}
                  </option>
                )}
                {selectedEmployees.employee3 && (
                  <option value={selectedEmployees.employee3}>
                    {employees.find(e => e.id === selectedEmployees.employee3)?.last_name} {employees.find(e => e.id === selectedEmployees.employee3)?.first_name}
                  </option>
                )}
              </select>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '15px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              {loading ? 'Salvataggio...' : 'Conferma puntata'}
            </button>
          </form>

          {message && (
            <p style={{ 
              marginTop: '15px', 
              padding: '10px', 
              backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e9',
              color: message.includes('❌') ? '#c62828' : '#2e7d32',
              borderRadius: '5px'
            }}>
              {message}
            </p>
          )}
        </div>
      )}

      {/* MESSAGGIO SE NON HA PAGATO */}
      {!participation?.payment_status && gameEdition && (
        <div style={{ backgroundColor: '#ffe6e6', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
          <h3>⚠️ Pagamento richiesto</h3>
          <p>Per inserire la tua puntata devi prima effettuare il pagamento di €{parseFloat(gameEdition.entry_fee).toFixed(2)}.</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Contatta l'amministratore per confermare il pagamento.
          </p>
        </div>
      )}

      {/* TABELLA QUOTAZIONI */}
      <PayoutTable />

      {/* REGOLAMENTO */}
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h3>📜 Regolamento in breve</h3>
        <ul style={{ lineHeight: '1.8' }}>
          <li>Scegli 3 dipendenti che daranno le dimissioni entro il 31/12/2026</li>
          <li>Puoi attivare il bonus Chiringuito su uno: se indovini, prendi il 60% del montepremi!</li>
          <li>Prima dimissione = 70% del payout, seconda = 25%, terza = 5%</li>
          <li>Più tardi arrivano le dimissioni, minore è la percentuale</li>
          <li>Più persone scelgono lo stesso dipendente, minore è il payout</li>
        </ul>
      </div>
    </div>
  )
}

export default Dashboard