// ==============================================================================
// SUPABASE CONFIGURATION
// ==============================================================================

const SUPABASE_URL = "https://txvdnnymkjkmgimxhadx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dmRubnlta2prbWdpbXhoYWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMTMyNzEsImV4cCI6MjEwODU4OTI3MX0.K5WDBfn7EK5GMQelbxfaTfU_JdGWR73LCtmf--eELCg";

// Initialize Supabase Client
const dbClient = (typeof window !== 'undefined' && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
