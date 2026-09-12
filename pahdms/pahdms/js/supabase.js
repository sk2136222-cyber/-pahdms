const SUPABASE_URL = "https://uubyhqdllkgcetqpjyos.supabase.co";

const SUPABASE_KEY = "sb_publishable_kfUw95VfSwVcrcXB-nC8Qw_5bnBa11j";

const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Make database available to other files
window.db = db;

console.log("✅ Supabase Connected Successfully");