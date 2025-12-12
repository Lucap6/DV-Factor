// ============================================
// USER PROFILE - Gestione profilo utente
// ============================================

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

function UserProfile({ user, onBack }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const loadingTimeoutRef = useRef(null) // NUOVO: timeout di sicurezza

  const [nickname, setNickname] = useState('')
  const [fullName, setFullName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    // NUOVO: Timeout di sicurezza - sblocca dopo 5 secondi
    loadingTimeoutRef.current = setTimeout(() => {
      if (loading) {
        console.error('⏱️ TIMEOUT: Caricamento profilo bloccato')
        setLoading(false)
        setMessage('⚠️ Caricamento lento. Se il problema persiste, ricarica la pagina.')
      }
    }, 5000)

    fetchProfile()

    // Cleanup
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
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
      console.error('Errore:', error)
      setMessage('❌ Errore nel caricamento del profilo')
    } finally {
      setLoading(false)
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }

  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true)
      setMessage('')

      const file = event.target.files[0]
      if (!file) return

      if (!file.type.startsWith('image/')) {
        setMessage('❌ Carica solo immagini')
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        setMessage('❌ Massimo 2MB')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setMessage('✅ Foto aggiornata!')
      fetchProfile()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setMessage('')

    try {
      setLoading(true)

      if (nickname.length < 3) {
        setMessage('❌ Nickname minimo 3 caratteri')
        return
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
        setMessage('❌ Nickname: solo lettere, numeri, - e _')
        return
      }

      if (nickname !== profile.nickname) {
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('nickname', nickname)
          .single()

        if (existingUser) {
          setMessage('❌ Nickname già in uso!')
          return
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({ nickname, full_name: fullName })
        .eq('id', user.id)

      if (error) throw error

      setMessage('✅ Profilo aggiornato!')
      fetchProfile()
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setMessage('')

    if (newPassword.length < 6) {
      setMessage('❌ Password minimo 6 caratteri')
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

      setMessage('✅ Password cambiata!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMessage('❌ Errore: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !profile) return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '50vh'
    }}>
      <p style={{ fontSize: '18px', marginBottom: '20px' }}>Caricamento profilo...</p>
      
      {/* NUOVO: Pulsante di emergenza dopo 3 secondi */}
      <div id="emergency-profile-button" style={{ opacity: 0, transition: 'opacity 0.5s' }}>
        <button
          onClick={() => {
            setLoading(false)
            setMessage('⚠️ Caricamento interrotto. Puoi comunque modificare il profilo.')
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          🚨 Sblocca
        </button>
      </div>

      <script dangerouslySetInnerHTML={{
        __html: `
          setTimeout(() => {
            const btn = document.getElementById('emergency-profile-button');
            if (btn) btn.style.opacity = '1';
          }, 3000);
        `
      }} />
    </div>
  )

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', padding: '20px' }}>
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

      {/* FOTO PROFILO */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h3>📸 Foto Profilo</h3>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: '15px' }}>
          <div style={{ marginRight: '20px' }}>
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #007bff' }}
              />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                👤
              </div>
            )}
          </div>
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
              style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', borderRadius: '5px', cursor: uploading ? 'not-allowed' : 'pointer', display: 'inline-block' }}
            >
              {uploading ? 'Caricamento...' : 'Carica nuova foto'}
            </label>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
              JPG, PNG, GIF (max 2MB)
            </p>
          </div>
        </div>
      </div>

      {/* INFORMAZIONI PERSONALI */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h3>📝 Informazioni Personali</h3>
        <form onSubmit={handleUpdateProfile}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
            <input type="email" value={user.email} disabled style={{ width: '100%', padding: '8px', backgroundColor: '#f0f0f0', cursor: 'not-allowed' }} />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>L'email non può essere modificata</p>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nome completo:</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" style={{ width: '100%', padding: '8px' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nickname: <span style={{ color: 'red' }}>*</span></label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value.toLowerCase().trim())} placeholder="mario_rossi" required pattern="[a-zA-Z0-9_-]+" minLength="3" style={{ width: '100%', padding: '8px' }} />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Solo lettere, numeri, - e _ (min. 3 caratteri)</p>
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
        </form>
      </div>

      {/* CAMBIO PASSWORD */}
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h3>🔒 Cambia Password</h3>
        <form onSubmit={handleChangePassword}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nuova password:</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimo 6 caratteri" minLength="6" style={{ width: '100%', padding: '8px' }} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Conferma password:</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ripeti la password" minLength="6" style={{ width: '100%', padding: '8px' }} />
          </div>

          <button type="submit" disabled={loading || !newPassword || !confirmPassword} style={{ width: '100%', padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', fontSize: '16px', fontWeight: 'bold', cursor: (loading || !newPassword || !confirmPassword) ? 'not-allowed' : 'pointer', opacity: (loading || !newPassword || !confirmPassword) ? 0.6 : 1 }}>
            {loading ? 'Aggiornamento...' : 'Cambia password'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f0f0', borderRadius: '8px', fontSize: '14px', color: '#666' }}>
        <p><strong>Account creato il:</strong> {new Date(profile?.created_at).toLocaleDateString('it-IT')}</p>
        <p><strong>Stato admin:</strong> {profile?.is_admin ? '👑 Amministratore' : '👤 Giocatore'}</p>
      </div>
    </div>
  )
}

export default UserProfile