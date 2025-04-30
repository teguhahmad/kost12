import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { format } from 'npm:date-fns@3.3.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');

    // Get all active tenants with their settings and rooms
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        email,
        end_date,
        room_id,
        property_id,
        user_id,
        rooms!tenants_room_id_fkey (
          name,
          price
        ),
        properties!tenants_property_id_fkey (
          name,
          user_settings (
            payment_reminder_days,
            email_notifications
          )
        )
      `)
      .eq('status', 'active');

    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
      throw new Error(`Failed to fetch tenants: ${tenantsError.message}`);
    }

    if (!tenants || tenants.length === 0) {
      console.log('No active tenants found');
      return new Response(
        JSON.stringify({ success: true, processed: 0, tenants: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Processing ${tenants.length} active tenants`);
    const today = new Date();
    const processedTenants = [];
    const errors = [];

    for (const tenant of tenants) {
      try {
        if (!tenant.properties) {
          console.log(`Skipping tenant ${tenant.id}: No property information found`);
          continue;
        }

        const settings = tenant.properties?.user_settings?.[0];
        if (!settings?.email_notifications || !settings?.payment_reminder_days) {
          console.log(`Skipping tenant ${tenant.id}: Missing user settings`);
          continue;
        }

        if (!tenant.end_date) {
          console.log(`Skipping tenant ${tenant.id}: No end date specified`);
          continue;
        }

        const dueDate = new Date(tenant.end_date);
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - settings.payment_reminder_days);

        // Check if we should create a payment reminder
        if (today >= reminderDate && today < dueDate) {
          console.log(`Processing payment reminder for tenant ${tenant.id}`);

          // Create payment record
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .insert({
              tenant_id: tenant.id,
              room_id: tenant.room_id,
              property_id: tenant.property_id,
              amount: tenant.rooms?.price || 0,
              status: 'pending',
              date: null,
              dueDate: tenant.end_date
            })
            .select()
            .single();

          if (paymentError) {
            throw new Error(`Failed to create payment: ${paymentError.message}`);
          }

          // Create notification
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              title: 'Pengingat Pembayaran',
              message: `Pembayaran untuk Kamar ${tenant.rooms?.name} akan jatuh tempo pada ${format(dueDate, 'dd MMMM yyyy')}`,
              type: 'payment',
              target_user_id: tenant.user_id,
              status: 'unread'
            });

          if (notificationError) {
            throw new Error(`Failed to create notification: ${notificationError.message}`);
          }

          // Send email using Supabase's Email service
          const emailContent = `
            <h2>Pengingat Pembayaran Sewa Kamar</h2>
            <p>Yth. ${tenant.name},</p>
            <p>Ini adalah pengingat untuk pembayaran sewa kamar Anda:</p>
            <ul>
              <li>Properti: ${tenant.properties?.name}</li>
              <li>Kamar: ${tenant.rooms?.name}</li>
              <li>Jumlah: Rp ${tenant.rooms?.price?.toLocaleString('id-ID')}</li>
              <li>Jatuh Tempo: ${format(dueDate, 'dd MMMM yyyy')}</li>
            </ul>
            <p>Mohon segera lakukan pembayaran sebelum tanggal jatuh tempo untuk menghindari denda keterlambatan.</p>
            <p>Terima kasih atas perhatiannya.</p>
          `;

          const { error: emailError } = await supabase.auth.admin.sendEmail(
            tenant.email,
            {
              subject: `Pengingat Pembayaran Sewa - Kamar ${tenant.rooms?.name}`,
              html: emailContent,
            }
          );

          if (emailError) {
            throw new Error(`Failed to send email: ${emailError.message}`);
          }

          processedTenants.push({
            tenant_id: tenant.id,
            email: tenant.email,
            due_date: tenant.end_date
          });
          
          console.log(`Successfully processed tenant ${tenant.id}`);
        }
      } catch (tenantError) {
        console.error(`Error processing tenant ${tenant.id}:`, tenantError);
        errors.push({
          tenant_id: tenant.id,
          error: tenantError.message
        });
      }
    }

    // Return response with both successful and failed operations
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedTenants.length,
        tenants: processedTenants,
        errors: errors
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Auto-billing function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});