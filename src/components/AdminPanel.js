// ============================================
// ADMIN PANEL - Pannello amministratore (AGGIORNATO)
// ============================================
// Modifiche:
// - Gestisce edition_participants per i pagamenti
// - Mostra montepremi calcolato in tempo reale
// - Tab dedicata ai partecipanti per edizione

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function AdminPanel({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('participants') // Tab attiva
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // ============================================
  // STATI
  // ============================================
  const [users, setUsers] = useState([])
  const [employees, setEmployees] = useState([])
  const [gameEditions, setGameEditions] = useState([])
  const [bets, setBets] = useState([])
  const [participants, setParticipants] = useState([]) // NUOVO

  // ============================================
  // FORM
  // ============================================
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    employee_code: '',
    hire_date: ''
  })

  const [newEdition, setNewEdition] = useState({
    year: 2026,
    start_date: '',
    end_date: '',
    betting_deadline: '',
    entry_fee: 3.00,
    jackpot: 0
  })

  // ============================================
  // CARICAMENTO INIZIALE
  // ============================================
  useEffect(() => {
    fetchAllData()
  }, [])

  // ============================================
  // FUNZIONE: Carica tutti i dati
  // ============================================
  const fetchAllData = async () => {
    setLoading(true)
    try {
      // Carica utenti
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setUsers(usersData || [])

      // Carica dipendenti
      const { data: employeesData } = await supabase
        .from('employees')
        .select('*')
        .order('last_name')
      setEmployees(employeesData || [])

      // Carica edizioni
      const { data: editionsData } = await supabase
        .from('game_editions')
        .select('*')
        .order('year', { ascending: false })
      setGameEditions(editionsData || [])

      // NUOVO: Carica partecipanti con dettagli
      const { data: participantsData } = await supabase
        .from('edition_participants')
        .select(`
          *,
          user:user_id(email, full_name),
          edition:game_edition_id(year)
        `)
        .order('created_at', { ascending: false })
      setParticipants(participantsData || [])

      // Carica puntate
      const { data: betsData } = await supabase
        .from('bets')
        .select(`
          *,
          user:user_id(email, full_name),
          employee_1:employee_1_id(first_name, last_name),
          employee_2:employee_2_id(first_name, last_name),
          employee_3:employee_3_id(first_name, last_name),
          chiringuito:chiringuito_employee_id(first_name, last_name)
        `)
        .order('created_at', { ascending: false })
      setBets(betsData || [])

    } catch (error) {
      console.error('Errore nel caricamento:', error)
      setMessage('❌ Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE: Aggiungi dipendente
  // ============================================
  const handleAddEmployee = async (e) => {
    e.preventDefault()
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('employees')
        .insert([newEmployee])

      if (error) throw error

      setMessage('✅ Dipendente aggiunto con successo!')
      setNewEmployee({ first_name: '', last_name: '', employee_code: '', hire_date: '' })
      fetchAllData()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  // ============================================
  // FUNZIONE: Crea nuova edizione
  // ============================================
  const handleCreateEdition = async (e) => {
    e.preventDefault()
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('game_editions')
        .insert([{
          ...newEdition,
          status: 'open',
          total_pool: parseFloat(newEdition.jackpot) // Inizialmente solo il jackpot
        }])

      if (error) throw error

      setMessage('✅ Edizione creata con successo!')
      setNewEdition({ year: 2027, start_date: '', end_date: '', betting_deadline: '', entry_fee: 3.00, jackpot: 0 })
      fetchAllData()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  // ============================================
  // FUNZIONE: Conferma pagamento partecipante
  // ============================================
  const handleConfirmPayment = async (participantId, paymentAmount) => {
    try {
      const { error } = await supabase
        .from('edition_participants')
        .update({ 
          payment_status: true,
          payment_date: new Date().toISOString()
        })
        .eq('id', participantId)

      if (error) throw error

      setMessage('✅ Pagamento confermato! Il montepremi si aggiornerà automaticamente.')
      
      // Aspetta un momento per il trigger
      setTimeout(() => {
        fetchAllData()
      }, 500)
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  // ============================================
  // FUNZIONE: Annulla pagamento partecipante
  // ============================================
  const handleCancelPayment = async (participantId) => {
    if (!window.confirm('Sei sicuro di voler annullare questo pagamento?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('edition_participants')
        .update({ 
          payment_status: false,
          payment_date: null
        })
        .eq('id', participantId)

      if (error) throw error

      setMessage('✅ Pagamento annullato! Il montepremi si aggiornerà automaticamente.')
      
      setTimeout(() => {
        fetchAllData()
      }, 500)
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  // ============================================
  // FUNZIONE: Registra dimissioni dipendente
  // ============================================
  const handleResignation = async (employeeId) => {
    const resignationDate = prompt('Inserisci la data di dimissioni (formato: YYYY-MM-DD):')
    if (!resignationDate) return

    try {
      const date = new Date(resignationDate)
      const month = date.getMonth() + 1

      const { error } = await supabase
        .from('employees')
        .update({
          resignation_date: resignationDate,
          resignation_month: month,
          resignation_notified_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', employeeId)

      if (error) throw error

      setMessage('✅ Dimissioni registrate!')
      fetchAllData()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  // ============================================
  // FUNZIONE: Rivela tutte le puntate
  // ============================================
  const handleRevealBets = async (editionId) => {
    if (!window.confirm('Sei sicuro di voler rivelare tutte le puntate? Questa azione non può essere annullata!')) {
      return
    }

    try {
      const { error } = await supabase
        .from('bets')
        .update({ is_revealed: true })
        .eq('game_edition_id', editionId)

      if (error) throw error

      setMessage('✅ Puntate rivelate!')
      fetchAllData()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  // ============================================
  // FUNZIONE: Aggiorna montepremi manualmente
  // ============================================
  const handleRefreshPool = async (editionId) => {
    try {
      // Chiama la funzione SQL che ricalcola il montepremi
      const { data, error } = await supabase.rpc('calculate_total_pool', {
        edition_id: editionId
      })

      if (error) throw error

      // Aggiorna l'edizione
      await supabase
        .from('game_editions')
        .update({ total_pool: data })
        .eq('id', editionId)

      setMessage('✅ Montepremi aggiornato!')
      fetchAllData()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onLogout()
  }

  if (loading) return <p>Caricamento pannello admin...</p>

  return (
    <div style={{ maxWidth: '1400px', margin: '20px auto', padding: '20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>👨‍💼 Pannello Amministratore</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>

      {/* Messaggio di feedback */}
      {message && (
        <div style={{ 
          padding: '15px', 
          marginBottom: '20px', 
          backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e9',
          color: message.includes('❌') ? '#c62828' : '#2e7d32',
          borderRadius: '5px'
        }}>
          {message}
        </div>
      )}

      {/* TABS DI NAVIGAZIONE */}
      <div style={{ borderBottom: '2px solid #ddd', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('participants')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '5px',
            backgroundColor: activeTab === 'participants' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'participants' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Partecipanti ({participants.length})
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '5px',
            backgroundColor: activeTab === 'users' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'users' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Utenti ({users.length})
        </button>
        <button 
          onClick={() => setActiveTab('employees')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '5px',
            backgroundColor: activeTab === 'employees' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'employees' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Dipendenti ({employees.length})
        </button>
        <button 
          onClick={() => setActiveTab('editions')}
          style={{ 
            padding: '10px 20px', 
            marginRight: '5px',
            backgroundColor: activeTab === 'editions' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'editions' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Edizioni ({gameEditions.length})
        </button>
        <button 
          onClick={() => setActiveTab('bets')}
          style={{ 
            padding: '10px 20px',
            backgroundColor: activeTab === 'bets' ? '#007bff' : '#f0f0f0',
            color: activeTab === 'bets' ? 'white' : 'black',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Puntate ({bets.length})
        </button>
      </div>

      {/* ============================================ */}
      {/* TAB: PARTECIPANTI (NUOVO) */}
      {/* ============================================ */}
      {activeTab === 'participants' && (
        <div>
          <h2>🎫 Gestione Partecipanti</h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
            Qui puoi confermare i pagamenti degli utenti per ciascuna edizione. Il montepremi si aggiorna automaticamente.
          </p>

          {/* Raggruppa per edizione */}
          {gameEditions.map(edition => {
            const editionParticipants = participants.filter(p => p.game_edition_id === edition.id)
            const paidCount = editionParticipants.filter(p => p.payment_status).length
            const totalPaid = editionParticipants
              .filter(p => p.payment_status)
              .reduce((sum, p) => sum + parseFloat(p.payment_amount), 0)

            return (
              <div key={edition.id} style={{ marginBottom: '40px' }}>
                <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                  <h3>📅 Edizione {edition.year}</h3>
                  <p><strong>Partecipanti totali:</strong> {editionParticipants.length}</p>
                  <p><strong>Pagamenti confermati:</strong> {paidCount} / {editionParticipants.length}</p>
                  <p><strong>💰 Montepremi:</strong> 
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#28a745', marginLeft: '10px' }}>
                      €{parseFloat(edition.total_pool).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '12px', color: '#666', marginLeft: '5px' }}>
                      (Jackpot: €{parseFloat(edition.jackpot).toFixed(2)} + Pagamenti: €{totalPaid.toFixed(2)})
                    </span>
                  </p>
                  <button 
                    onClick={() => handleRefreshPool(edition.id)}
                    style={{ padding: '5px 10px', fontSize: '12px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px' }}
                  >
                    🔄 Ricalcola montepremi
                  </button>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Utente</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Email</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Importo</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Pagamento</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Data pagamento</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Puntata</th>
                      <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editionParticipants.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ border: '1px solid #ddd', padding: '20px', textAlign: 'center', color: '#999' }}>
                          Nessun partecipante per questa edizione
                        </td>
                      </tr>
                    ) : (
                      editionParticipants.map(participant => (
                        <tr key={participant.id}>
                          <td style={{ border: '1px solid #ddd', padding: '10px' }}>
                            {participant.user?.full_name || '-'}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            {participant.user?.email}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            €{parseFloat(participant.payment_amount).toFixed(2)}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            {participant.payment_status ? '✅ Pagato' : '❌ Non pagato'}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            {participant.payment_date 
                              ? new Date(participant.payment_date).toLocaleDateString('it-IT')
                              : '-'
                            }
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            {participant.has_bet ? '✅' : '❌'}
                          </td>
                          <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                            {!participant.payment_status ? (
                              <button 
                                onClick={() => handleConfirmPayment(participant.id, participant.payment_amount)}
                                style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '3px' }}
                              >
                                Conferma pagamento
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleCancelPayment(participant.id)}
                                style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
                              >
                                Annulla pagamento
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: UTENTI */}
      {/* ============================================ */}
      {activeTab === 'users' && (
        <div>
          <h2>👥 Gestione Utenti</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Nome</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Email</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Admin</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Data registrazione</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.full_name || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{user.email}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {user.is_admin ? '👑' : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {new Date(user.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: DIPENDENTI */}
      {/* ============================================ */}
      {activeTab === 'employees' && (
        <div>
          <h2>👔 Gestione Dipendenti</h2>
          
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>➕ Aggiungi nuovo dipendente</h3>
            <form onSubmit={handleAddEmployee}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label>Nome:</label>
                  <input
                    type="text"
                    value={newEmployee.first_name}
                    onChange={(e) => setNewEmployee({...newEmployee, first_name: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Cognome:</label>
                  <input
                    type="text"
                    value={newEmployee.last_name}
                    onChange={(e) => setNewEmployee({...newEmployee, last_name: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Codice dipendente:</label>
                  <input
                    type="text"
                    value={newEmployee.employee_code}
                    onChange={(e) => setNewEmployee({...newEmployee, employee_code: e.target.value})}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Data assunzione:</label>
                  <input
                    type="date"
                    value={newEmployee.hire_date}
                    onChange={(e) => setNewEmployee({...newEmployee, hire_date: e.target.value})}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>
              <button type="submit" style={{ marginTop: '15px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
                Aggiungi dipendente
              </button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Cognome</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Nome</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Codice</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Stato</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Dimissioni</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{emp.last_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{emp.first_name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>{emp.employee_code || '-'}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {emp.is_active ? '✅ Attivo' : '❌ Dimesso'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {emp.resignation_date ? new Date(emp.resignation_date).toLocaleDateString('it-IT') : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {emp.is_active && (
                      <button 
                        onClick={() => handleResignation(emp.id)}
                        style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
                      >
                        Registra dimissioni
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: EDIZIONI */}
      {/* ============================================ */}
      {activeTab === 'editions' && (
        <div>
          <h2>📅 Gestione Edizioni</h2>
          
          <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>➕ Crea nuova edizione</h3>
            <form onSubmit={handleCreateEdition}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label>Anno:</label>
                  <input
                    type="number"
                    value={newEdition.year}
                    onChange={(e) => setNewEdition({...newEdition, year: parseInt(e.target.value)})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Quota partecipazione (€):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEdition.entry_fee}
                    onChange={(e) => setNewEdition({...newEdition, entry_fee: parseFloat(e.target.value)})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Jackpot iniziale (€):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEdition.jackpot}
                    onChange={(e) => setNewEdition({...newEdition, jackpot: parseFloat(e.target.value)})}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Data inizio:</label>
                  <input
                    type="date"
                    value={newEdition.start_date}
                    onChange={(e) => setNewEdition({...newEdition, start_date: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Scadenza puntate:</label>
                  <input
                    type="date"
                    value={newEdition.betting_deadline}
                    onChange={(e) => setNewEdition({...newEdition, betting_deadline: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
                <div>
                  <label>Data fine:</label>
                  <input
                    type="date"
                    value={newEdition.end_date}
                    onChange={(e) => setNewEdition({...newEdition, end_date: e.target.value})}
                    required
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>
              </div>
              <button type="submit" style={{ marginTop: '15px', padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
                Crea edizione
              </button>
            </form>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left' }}>Anno</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Stato</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Quota</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Scadenza puntate</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Fine gioco</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Jackpot</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Montepremi</th>
                <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {gameEditions.map(edition => (
                <tr key={edition.id}>
                  <td style={{ border: '1px solid #ddd', padding: '10px' }}>{edition.year}</td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {edition.status === 'open' ? '🟢 Aperta' : edition.status === 'closed' ? '🔴 Chiusa' : '✅ Finita'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    €{parseFloat(edition.entry_fee).toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {new Date(edition.betting_deadline).toLocaleDateString('it-IT')}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    {new Date(edition.end_date).toLocaleDateString('it-IT')}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    €{parseFloat(edition.jackpot).toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#28a745' }}>
                    €{parseFloat(edition.total_pool).toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleRevealBets(edition.id)}
                      style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '3px', marginRight: '5px' }}
                    >
                      Rivela puntate
                    </button>
                    <button 
                      onClick={() => handleRefreshPool(edition.id)}
                      style={{ padding: '5px 10px', cursor: 'pointer', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '3px' }}
                    >
                      🔄 Aggiorna pool
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================ */}
      {/* TAB: PUNTATE */}
      {/* ============================================ */}
      {activeTab === 'bets' && (
        <div>
          <h2>🎯 Puntate degli utenti</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Utente</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Edizione</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Dip. 1</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Dip. 2</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Dip. 3</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Chiringuito</th>
                <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {bets.map(bet => (
                <tr key={bet.id}>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {bet.user?.full_name || bet.user?.email || 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {gameEditions.find(e => e.id === bet.game_edition_id)?.year || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {bet.employee_1 ? `${bet.employee_1.last_name} ${bet.employee_1.first_name}` : 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {bet.employee_2 ? `${bet.employee_2.last_name} ${bet.employee_2.first_name}` : 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {bet.employee_3 ? `${bet.employee_3.last_name} ${bet.employee_3.first_name}` : 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold', color: 'orange' }}>
                    {bet.chiringuito ? `🏖️ ${bet.chiringuito.last_name} ${bet.chiringuito.first_name}` : '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                    {new Date(bet.created_at).toLocaleDateString('it-IT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminPanel