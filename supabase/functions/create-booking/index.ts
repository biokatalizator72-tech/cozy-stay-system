import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      room_type_id,
      check_in,
      check_out,
      guest_name,
      guest_email,
      guest_phone,
      total_price,
      special_requests,
      guest_data,
    } = await req.json();

    // Validate required fields
    const missing: string[] = [];
    if (!room_type_id) missing.push("room_type_id");
    if (!check_in) missing.push("check_in");
    if (!check_out) missing.push("check_out");
    if (!guest_name) missing.push("guest_name");
    if (!guest_email) missing.push("guest_email");
    if (!guest_phone) missing.push("guest_phone");
    if (total_price == null) missing.push("total_price");

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ error: `Hiányzó mezők: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify room type exists and is active
    const { data: roomType, error: rtError } = await supabase
      .from("room_types")
      .select("id, name, capacity")
      .eq("id", room_type_id)
      .eq("is_active", true)
      .maybeSingle();

    if (rtError) throw rtError;

    if (!roomType) {
      return new Response(
        JSON.stringify({ error: "A megadott szobatípus nem található vagy nem aktív." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Quick availability check - count existing overlapping bookings
    const { data: rooms } = await supabase
      .from("rooms")
      .select("id")
      .eq("room_type_id", room_type_id)
      .eq("is_active", true);

    const totalRooms = rooms?.length || 0;

    const { data: overlapping } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_type_id", room_type_id)
      .in("status", ["pending", "confirmed"])
      .lt("check_in", check_out)
      .gte("check_out", check_in);

    const bookedCount = overlapping?.length || 0;

    if (bookedCount >= totalRooms) {
      return new Response(
        JSON.stringify({ error: "Sajnos a kiválasztott szobatípus a megadott időszakban már nem elérhető." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the booking
    const { data: booking, error: insertError } = await supabase
      .from("bookings")
      .insert({
        room_type_id,
        check_in,
        check_out,
        guest_name,
        guest_email,
        guest_phone,
        total_price,
        special_requests: special_requests || null,
        guest_data: guest_data || {},
        status: "pending",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        booking: {
          id: booking.id,
          room_type: roomType.name,
          check_in: booking.check_in,
          check_out: booking.check_out,
          guest_name: booking.guest_name,
          total_price: booking.total_price,
          status: booking.status,
        },
        message: `Foglalás sikeresen létrehozva! Foglalási azonosító: ${booking.id}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
