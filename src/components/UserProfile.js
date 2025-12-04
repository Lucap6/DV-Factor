// ============================================
// USER PROFILE - Gestione profilo utente
// ============================================
// Permette all'utente di:
// - Cambiare foto profilo
// - Modificare nickname (con controllo unicità)
// - Cambiare password

import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function UserProfile({ user, onBack }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  // Form states
  const [nickname, setNickname] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // ============================================
  // CARICAMENTO PROFILO
  // ============================================
  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setNickname(data.nickname || '')
      setFullName(data.full_name || '')
    } catch (error) {
      console.error('Errore nel caricamento del profilo:', error)
      setMessage('❌ Errore nel caricamento del profilo')
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE: Carica foto profilo
  // ============================================
  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true)
      setMessage('')

      const file = event.target.files[0]
      
      if (!file) return

      // Validazione: solo immagini
      if (!file.type.startsWith('image/')) {
        setMessage('❌ Per favore carica solo immagini')
        return
      }

      // Validazione: max 2MB
      if (file.size > 2 * 1024 * 1024) {
        setMessage('❌ L\'immagine deve essere massimo 2MB')
        return
      }

      // Nome file univoco
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      // Carica su Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        })

      if (uploadError) throw uploadError

      // Ottieni URL pubblico
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Aggiorna profilo con nuovo URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setMessage('✅ Foto profilo aggiornata!')
      fetchProfile()

    } catch (error) {
      console.error('Errore nel caricamento:', error)
      setMessage('❌ Errore nel caricamento della foto: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // ============================================
  // FUNZIONE: Aggiorna nickname e nome
  // ============================================
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      setLoading(true)

      // Validazione nickname
      if (nickname.length < 3) {
        setMessage('❌ Il nickname deve essere almeno 3 caratteri')
        return
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
        setMessage('❌ Il nickname può contenere solo lettere, numeri, - e _')
        return
      }

      // Controlla se il nickname esiste già (se diverso dal corrente)
      if (nickname !== profile.nickname) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('nickname', nickname)
          .single()

        if (existingUser) {
          setMessage('❌ Questo nickname è già in uso!')
          return
        }
      }

      // Aggiorna profilo
      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: nickname,
          full_name: fullName
        })
        .eq('id', user.id)

      if (error) throw error

      setMessage('✅ Profilo aggiornato con successo!')
      fetchProfile()

    } catch (error) {
      console.error('Errore nell\'aggiornamento:', error)
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // FUNZIONE: Cambia password
  // ============================================
  const handleChangePassword = async (e) => {
    e.preventDefault()
    setMessage('')

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

      setMessage('✅ Password cambiata con successo!')
      setNewPassword('')
      setConfirmPassword('')

    } catch (error) {
      console.error('Errore nel cambio password:', error)
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !profile) return <p>Caricamento profilo...</p>

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <button 
          onClick={onBack}
          style={{ 
            padding: '10px 20px', 
            marginRight: '20px',
            cursor: 'pointer',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px'
          }}
        >
          ← Torna alla Dashboard
        </button>
        <h1>👤 Il mio Profilo</h1>
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

      {/* ============================================ */}
      {/* SEZIONE: FOTO PROFILO */}
      {/* ============================================ */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #ddd',
        marginBottom: '20px'
      }}>
        <h3>📸 Foto Profilo</h3>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
          {/* Avatar preview */}
          <div style={{ marginRight: '20px' }}>
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar"
                style={{ 
                  width: '100px', 
                  height: '100px', 
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #007bff'
                }}
              />
            ) : (
              <div style={{ 
                width: '100px', 
                height: '100px', 
                borderRadius: '50%',
                backgroundColor: '#e0e0e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                color: '#999'
              }}>
                👤
              </div>
            )}
          </div>

          {/* Upload button */}
          <div>
            <input
              type="file"
              id="avatar-upload"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor="avatar-upload"
              style={{ 
                padding: '10px 20px',
                backgroundColor: '#007bff',
                color: 'white',
                borderRadius: '5px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'inline-block'
              }}
            >
              {uploading ? 'Caricamento...' : 'Carica nuova foto'}
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              Formati: JPG, PNG, GIF (max 2MB)
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* SEZIONE: INFORMAZIONI PERSONALI */}
      {/* ============================================ */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #ddd',
        marginBottom: '20px'
      }}>
        <h3>📝 Informazioni Personali</h3>
        <form onSubmit={handleUpdateProfile}>
          {/* Email (non modificabile) */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Email:
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              style={{ 
                width: '100%', 
                padding: '8px',
                backgroundColor: '#f0f0f0',
                cursor: 'not-allowed'
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              L'email non può essere modificata
            </p>
          </div>

          {/* Nome completo */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nome completo:
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Mario Rossi"
              style={{ width: '100%', padding: '8px' }}
            />
          </div>

          {/* Nickname */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nickname: <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.toLowerCase().trim())}
              placeholder="mario_rossi"
              required
              pattern="[a-zA-Z0-9_-]+"
              minLength="3"
              style={{ width: '100%', padding: '8px' }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
              Solo lettere, numeri, - e _ (min. 3 caratteri). Deve essere univoco.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </form>
      </div>

      {/* ============================================ */}
      {/* SEZIONE: CAMBIO PASSWORD */}
      {/* ============================================ */}
      <div style={{ 
        backgroundColor: '#fff', 
        padding: '20px', 
        borderRadius: '8px', 
        border: '1px solid #ddd'
      }}>
        <h3>🔒 Cambia Password</h3>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Nuova password:
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimo 6 caratteri"
              minLength="6"
              style={{ width: '100%', padding: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Conferma password:
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la password"
              minLength="6"
              style={{ width: '100%', padding: '8px' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !newPassword || !confirmPassword}
            style={{ 
              width: '100%', 
              padding: '12px', 
              backgroundColor: '#dc3545',
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
      </div>

      {/* Info account */}
      <div style={{ 
        marginTop: '20px', 
        padding: '15px', 
        backgroundColor: '#f0f0f0', 
        borderRadius: '8px',
        fontSize: '14px',
        color: '#666'
      }}>
        <p><strong>Account creato il:</strong> {new Date(profile?.created_at).toLocaleDateString('it-IT')}</p>
        <p><strong>Stato admin:</strong> {profile?.is_admin ? '👑 Amministratore' : '👤 Utente'}</p>
      </div>
    </div>
  )
}

export default UserProfile