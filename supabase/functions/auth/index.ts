import { createClient } from 'npm:@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { create, verify } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface LoginRequest {
  phone: string;
  password: string;
}

interface User {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'KARYAWAN' | 'CUSTOMER';
  created_at: string;
  updated_at: string;
}

const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-secret-key-change-in-production';

async function generateJWT(user: User): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const jwt = await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      sub: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    },
    key
  );

  return jwt;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const path = url.pathname;

    // Login endpoint
    if (path.endsWith('/login') && req.method === 'POST') {
      const { phone, password }: LoginRequest = await req.json();

      if (!phone || !password) {
        return new Response(
          JSON.stringify({ message: 'Phone and password are required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Query user by phone
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (error || !user) {
        return new Response(
          JSON.stringify({ message: 'Invalid phone or password' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        return new Response(
          JSON.stringify({ message: 'Invalid phone or password' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Generate JWT
      const token = await generateJWT(user);

      // Return user without password_hash
      const { password_hash, ...userWithoutPassword } = user;

      return new Response(
        JSON.stringify({
          token,
          user: userWithoutPassword,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify token endpoint
    if (path.endsWith('/verify') && req.method === 'GET') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ message: 'No token provided' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const token = authHeader.substring(7);

      try {
        const key = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode(JWT_SECRET),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify']
        );

        const payload = await verify(token, key);

        // Get fresh user data
        const { data: user, error } = await supabase
          .from('users')
          .select('id, name, phone, role, created_at, updated_at')
          .eq('id', payload.sub)
          .maybeSingle();

        if (error || !user) {
          return new Response(
            JSON.stringify({ message: 'User not found' }),
            {
              status: 404,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({ user }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } catch {
        return new Response(
          JSON.stringify({ message: 'Invalid or expired token' }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ message: 'Not found' }),
      {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ message: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
