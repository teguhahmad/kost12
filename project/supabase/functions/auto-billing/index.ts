import { createClient } from 'npm:@supabase/supabase-js@2.39.7';
import { format } from 'npm:date-fns@3.3.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active tenants with their settings and rooms
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select(`
        *,
        rooms (
          name,
          price
        ),
        properties (
          name,
          user_settings (
            payment_reminder_days,
            email_notifications
          )
        )
      `)
      .eq('status', 'active');

    if (tenantsError) throw tenantsError;

    const today = new Date();
    const processedTenants = [];

    for (const tenant of tenants) {
      const settings = tenant.properties?.user_settings?.[0];
      if (!settings?.email_notifications || !settings?.payment_reminder_days) continue;

      const dueDate = new Date(tenant.end_date);
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - settings.payment_reminder_days);

      // Check if we should create a payment reminder
      if (today >= reminderDate && today < dueDate) {
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
            due_date: tenant.end_date
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

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

        if (notificationError) throw notificationError;

        // Send email using Supabase's built-in email service
        const { error: emailError } = await supabase.auth.admin.sendEmail(
          tenant.email,
          'Pengingat Pembayaran Sewa',
          {
            template: 'payment-reminder',
            data: {
              tenant_name: tenant.name,
              room_name: tenant.rooms?.name,
              property_name: tenant.properties?.name,
              amount: tenant.rooms?.price,
              due_date: format(dueDate, 'dd MMMM yyyy')
            }
          }
        );

        if (emailError) throw emailError;

        processedTenants.push({
          tenant_id: tenant.id,
          email: tenant.email,
          due_date: tenant.end_date
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedTenants.length,
        tenants: processedTenants 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});