import { createClient } from 'npm:@supabase/supabase-js@2';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    if (path.endsWith('/create') && req.method === 'POST') {
      const { name, phone, password, role } = await req.json();

      if (!name || !phone || !password || !role) {
        return new Response(
          JSON.stringify({ message: 'Missing required fields' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const passwordHash = await bcrypt.hash(password);

      const { data, error } = await supabase
        .from('users')
        .insert({
          name,
          phone,
          password_hash: passwordHash,
          role,
        })
        .select('id, name, phone, role, created_at, updated_at')
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ message: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (path.includes('/reset-password') && req.method === 'PUT') {
      const pathParts = path.split('/');
      const resetIndex = pathParts.indexOf('reset-password');
      const userId = pathParts[resetIndex - 1];
      const { password } = await req.json();

      if (!password) {
        return new Response(
          JSON.stringify({ message: 'Password is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const passwordHash = await bcrypt.hash(password);

      const { data, error } = await supabase
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('id', userId)
        .select('id, name, phone, role, created_at, updated_at')
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ message: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify(data),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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
