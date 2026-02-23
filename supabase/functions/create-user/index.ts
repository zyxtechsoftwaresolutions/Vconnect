// Supabase Edge Function to create users
// This runs server-side, so it can use the service role key safely

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const { email, password, name, role, department } = await req.json()

    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Check if user already exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    let existingUser = null
    
    if (!listError && existingUsers?.users) {
      existingUser = existingUsers.users.find((u: any) => u.email === email)
    }

    let userId: string
    let authUserCreated = false

    if (existingUser) {
      // User already exists, update password and metadata
      userId = existingUser.id
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name || email,
          role: role || 'STUDENT',
          department: department || null
        }
      })
      
      if (updateError) {
        throw new Error(`Failed to update user: ${updateError.message}`)
      }
      
      authUserCreated = true
    } else {
      // Create new user in auth.users
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          name: name || email,
          role: role || 'STUDENT',
          department: department || null
        }
      })

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`)
      }

      if (!authUser?.user) {
        throw new Error('Auth user creation returned no user data')
      }

      userId = authUser.user.id
      authUserCreated = true
    }

    // Create/update user in public.users
    const { data: dbUser, error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email: email,
        name: name || email,
        role: role || 'STUDENT',
        department: department || null,
        profile_picture: '',
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'email'
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Don't fail if database update fails - auth user is created
    }

    // If role is faculty-type, ensure a row exists in public.faculty
    const facultyRoles = ['FACULTY', 'HOD', 'COORDINATOR']
    if (dbUser && facultyRoles.includes(dbUser.role || '')) {
      const { data: existing } = await supabaseAdmin
        .from('faculty')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()
      if (!existing) {
        const employeeId = `EMP-${userId.replace(/-/g, '').slice(0, 12)}`
        await supabaseAdmin.from('faculty').insert([{
          user_id: userId,
          employee_id: employeeId,
          department: (department || 'CSE').toString(),
          is_active: true,
        }])
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        authUserCreated: authUserCreated,
        message: 'User created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})

