// ============================================
// PAYOUT TABLE - Tabella quotazioni DV-Factor
// ============================================
// Mostra le percentuali di vincita in base a mese e numero di giocatori

import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

function PayoutTable() {
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)

  // ============================================
  // Carica i dati dalla tabella payout_table
  // ============================================
  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    const { data, error } = await supabase
      .from('payout_table')
      .select('*')
      .order('month')
      .order('bettors_count')

    if (error) {
      console.error('Errore nel caricare le quotazioni:', error)
    } else {
      setPayouts(data)
    }
    setLoading(false)
  }

  // Raggruppa i dati per mese
  const groupedByMonth = payouts.reduce((acc, item) => {
    if (!acc[item.month]) {
      acc[item.month] = []
    }
    acc[item.month].push(item)
    return acc
  }, {})

  if (loading) return <p>Caricamento tabella quotazioni...</p>

  return (
    <div style={{ margin: '20px 0' }}>
      <h2>📊 Tabella Quotazioni DV-Factor</h2>
      <p style={{ fontSize: '14px', color: '#666' }}>
        Percentuali di payout in base al mese di dimissione e numero di giocatori che hanno scelto quel dipendente
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>Mese</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>1 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>2 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>3 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>4 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>5 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>6 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>7 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>8 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>9 gioc.</th>
              <th style={{ border: '1px solid #ddd', padding: '10px' }}>10 gioc.</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedByMonth).map(month => {
              const monthName = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'][month - 1]
              return (
                <tr key={month}>
                  <td style={{ border: '1px solid #ddd', padding: '10px', fontWeight: 'bold' }}>
                    {monthName}
                  </td>
                  {groupedByMonth[month].map(item => (
                    <td 
                      key={item.bettors_count} 
                      style={{ 
                        border: '1px solid #ddd', 
                        padding: '10px', 
                        textAlign: 'center',
                        backgroundColor: item.percentage === 0 ? '#ffcccc' : 'white'
                      }}
                    >
                      {item.percentage}%
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default PayoutTable