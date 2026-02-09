import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { guest_name, guest_email, room_name, check_in, check_out, total_price } = await req.json();

    if (!guest_email || !guest_name) {
      throw new Error("Missing required fields: guest_name, guest_email");
    }

    // Fetch email template and property name
    const { data: settings } = await supabase
      .from("property_settings")
      .select("booking_email_template, name")
      .limit(1)
      .single();

    const propertyName = settings?.name || "Szállás";
    let emailBody = settings?.booking_email_template || 
      `Kedves {guest_name},\n\nKöszönjük foglalását!\n\n- Szoba: {room_name}\n- Érkezés: {check_in}\n- Távozás: {check_out}\n- Végösszeg: {total_price} Ft\n\nÜdvözlettel,\n{property_name}`;

    // Replace placeholders
    emailBody = emailBody
      .replace(/{guest_name}/g, guest_name)
      .replace(/{room_name}/g, room_name || "")
      .replace(/{check_in}/g, check_in || "")
      .replace(/{check_out}/g, check_out || "")
      .replace(/{total_price}/g, total_price || "")
      .replace(/{property_name}/g, propertyName);

    const emailResponse = await resend.emails.send({
      from: `${propertyName} <onboarding@resend.dev>`,
      to: [guest_email],
      subject: `Foglalás visszaigazolás - ${propertyName}`,
      html: emailBody.replace(/\n/g, "<br>"),
    });

    console.log("Booking confirmation email sent:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending booking confirmation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
