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