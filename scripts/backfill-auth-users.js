import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Create a .env file (not committed) with:');
  console.error('SUPABASE_URL=...');
  console.error('SUPABASE_SERVICE_ROLE_KEY=...');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fetchAllUsers() {
  const { data, error } = await admin
    .from('users')
    .select('email,name,role,department');
  if (error) throw error;
  return data || [];
}

async function fetchAllStudents() {
  const { data, error } = await admin
    .from('students')
    .select('email,name,department');
  if (error) throw error;
  return (data || []).filter(s => !!s.email);
}

async function ensureAuthUser(email, name, role, department) {
  // Try to create; if exists, send recovery link
  const res = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: 'ChangeMe@123',
    user_metadata: { name, role, department }
  });

  if (res.error) {
    // If already exists, issue password recovery link
    if (String(res.error.message || '').toLowerCase().includes('already registered')) {
      console.log(`↪️ Auth user already exists for ${email}. Sending recovery link...`);
      await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: 'http://localhost:5173' }
      });
      return { status: 'exists' };
    } else {
      console.warn(`⚠️ Failed to create auth user for ${email}:`, res.error.message);
      return { status: 'error', error: res.error };
    }
  }

  console.log(`✅ Created auth user for ${email}`);
  return { status: 'created' };
}

async function main() {
  console.log('🔎 Loading DB users...');
  const users = await fetchAllUsers();
  const userEmails = new Set(users.map(u => (u.email || '').toLowerCase()));

  console.log(`👤 Found ${users.length} users in DB`);

  // Backfill app users into Auth
  for (const u of users) {
    if (!u.email) continue;
    await ensureAuthUser(u.email, u.name || u.email, u.role || 'STUDENT', u.department);
  }

  // Backfill students that are not in users
  console.log('🔎 Loading DB students to backfill missing Auth accounts...');
  const students = await fetchAllStudents();
  let backfilledStudents = 0;
  for (const s of students) {
    if (!s.email) continue;
    if (userEmails.has((s.email || '').toLowerCase())) continue; // already handled via users table
    const res = await ensureAuthUser(s.email, s.name || s.email, 'STUDENT', s.department);
    if (res.status === 'created' || res.status === 'exists') backfilledStudents++;
  }

  console.log(`🎉 Backfill complete. Users processed: ${users.length}. Students backfilled/exists: ${backfilledStudents}.`);
}

main().catch(err => {
  console.error('💥 Backfill failed:', err);
  process.exit(1);
});









