// ============================================
// SUPABASE CLIENT - Connessione al database
// ============================================
// Questo file crea il "ponte" tra la nostra app e Supabase
// Prende le chiavi dal file .env.local che hai creato prima

import { createClient } from '@supabase/supabase-js'

// Prendiamo l'URL e la chiave dal file .env.local
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// Creiamo il "client" - è come aprire una connessione telefonica con il database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)