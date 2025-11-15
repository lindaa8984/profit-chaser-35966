import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { email, password, fullName, sourceUserId } = await req.json();

    // Verify the requesting user is admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser } } = await supabaseAdmin.auth.getUser(token);

    if (!requestingUser) {
      throw new Error('Unauthorized');
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Only admins can create admin users');
    }

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (createError) throw createError;
    if (!newUser.user) throw new Error('Failed to create user');

    // Update role to admin (handle_new_user trigger creates guest role by default)
    await supabaseAdmin
      .from('user_roles')
      .update({ role: 'admin' })
      .eq('user_id', newUser.user.id);

    // Update subscription to premium (10 years)
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        plan_type: 'premium',
        end_date: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('user_id', newUser.user.id);

    // Copy data from source user if provided
    if (sourceUserId) {
      // Copy properties
      const { data: properties } = await supabaseAdmin
        .from('properties')
        .select('*')
        .eq('user_id', sourceUserId);

      if (properties && properties.length > 0) {
        const newProperties = properties.map(p => ({
          ...p,
          id: undefined,
          user_id: newUser.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { data: insertedProps } = await supabaseAdmin
          .from('properties')
          .insert(newProperties)
          .select();

        // Create property ID mapping
        const propertyIdMap = new Map();
        properties.forEach((oldProp, idx) => {
          if (insertedProps && insertedProps[idx]) {
            propertyIdMap.set(oldProp.id, insertedProps[idx].id);
          }
        });

        // Copy units
        const { data: units } = await supabaseAdmin
          .from('units')
          .select('*')
          .in('property_id', properties.map(p => p.id));

        if (units && units.length > 0) {
          const newUnits = units.map(u => ({
            ...u,
            id: undefined,
            property_id: propertyIdMap.get(u.property_id),
            created_at: new Date().toISOString()
          }));
          
          await supabaseAdmin
            .from('units')
            .insert(newUnits);
        }
      }

      // Copy clients
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('user_id', sourceUserId);

      if (clients && clients.length > 0) {
        const newClients = clients.map(c => ({
          ...c,
          id: undefined,
          user_id: newUser.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        const { data: insertedClients } = await supabaseAdmin
          .from('clients')
          .insert(newClients)
          .select();

        // Create client ID mapping
        const clientIdMap = new Map();
        clients.forEach((oldClient, idx) => {
          if (insertedClients && insertedClients[idx]) {
            clientIdMap.set(oldClient.id, insertedClients[idx].id);
          }
        });

        // Copy contracts
        const { data: contracts } = await supabaseAdmin
          .from('contracts')
          .select('*')
          .eq('user_id', sourceUserId);

        if (contracts && contracts.length > 0) {
          const propertyIdMap = new Map();
          const { data: oldProps } = await supabaseAdmin
            .from('properties')
            .select('id, name')
            .eq('user_id', sourceUserId);
          const { data: newProps } = await supabaseAdmin
            .from('properties')
            .select('id, name')
            .eq('user_id', newUser.user.id);
          
          oldProps?.forEach(op => {
            const matchingNew = newProps?.find(np => np.name === op.name);
            if (matchingNew) {
              propertyIdMap.set(op.id, matchingNew.id);
            }
          });

          const newContracts = contracts.map(c => ({
            ...c,
            id: undefined,
            user_id: newUser.user.id,
            client_id: clientIdMap.get(c.client_id),
            property_id: propertyIdMap.get(c.property_id),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          
          const { data: insertedContracts } = await supabaseAdmin
            .from('contracts')
            .insert(newContracts)
            .select();

          // Create contract ID mapping
          const contractIdMap = new Map();
          contracts.forEach((oldContract, idx) => {
            if (insertedContracts && insertedContracts[idx]) {
              contractIdMap.set(oldContract.id, insertedContracts[idx].id);
            }
          });

          // Copy payments
          const { data: payments } = await supabaseAdmin
            .from('payments')
            .select('*')
            .in('contract_id', contracts.map(c => c.id));

          if (payments && payments.length > 0) {
            const newPayments = payments.map(p => ({
              ...p,
              id: undefined,
              user_id: newUser.user.id,
              contract_id: contractIdMap.get(p.contract_id),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));
            
            await supabaseAdmin
              .from('payments')
              .insert(newPayments);
          }
        }
      }

      // Copy maintenance requests
      const { data: maintenance } = await supabaseAdmin
        .from('maintenance_requests')
        .select('*')
        .eq('user_id', sourceUserId);

      if (maintenance && maintenance.length > 0) {
        const { data: oldProps } = await supabaseAdmin
          .from('properties')
          .select('id, name')
          .eq('user_id', sourceUserId);
        const { data: newProps } = await supabaseAdmin
          .from('properties')
          .select('id, name')
          .eq('user_id', newUser.user.id);
        
        const propertyIdMap = new Map();
        oldProps?.forEach(op => {
          const matchingNew = newProps?.find(np => np.name === op.name);
          if (matchingNew) {
            propertyIdMap.set(op.id, matchingNew.id);
          }
        });

        const newMaintenance = maintenance.map(m => ({
          ...m,
          id: undefined,
          user_id: newUser.user.id,
          property_id: propertyIdMap.get(m.property_id),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        await supabaseAdmin
          .from('maintenance_requests')
          .insert(newMaintenance);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: newUser.user.id,
        message: 'تم إنشاء المستخدم ونسخ البيانات بنجاح'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'حدث خطأ غير متوقع' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
