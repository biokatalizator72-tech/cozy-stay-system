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
    const { check_in, check_out, adults, children } = await req.json();

    if (!check_in || !check_out) {
      return new Response(
        JSON.stringify({ error: "check_in és check_out dátum megadása kötelező" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const totalGuests = (adults || 2) + (children || 0);

    // Fetch active room types that can fit the guests
    const { data: roomTypes, error: rtError } = await supabase
      .from("room_types")
      .select("id, name, description, base_price, base_capacity, capacity, extra_beds, amenities")
      .eq("is_active", true)
      .gte("capacity", totalGuests)
      .order("sort_order");

    if (rtError) throw rtError;

    if (!roomTypes || roomTypes.length === 0) {
      return new Response(
        JSON.stringify({ available: false, room_types: [], message: "Nincs megfelelő szobatípus a megadott létszámra." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check availability for each room type across the date range
    // Get all dates between check_in and check_out (exclusive of check_out)
    const { data: availability, error: avError } = await supabase
      .from("room_type_availability")
      .select("room_type_id, date, available_count")
      .in("room_type_id", roomTypes.map((rt) => rt.id))
      .gte("date", check_in)
      .lt("date", check_out);

    if (avError) throw avError;

    // Also check bookings that overlap with the requested period
    const { data: existingBookings, error: bkError } = await supabase
      .from("bookings")
      .select("room_type_id")
      .in("room_type_id", roomTypes.map((rt) => rt.id))
      .in("status", ["pending", "confirmed"])
      .lt("check_in", check_out)
      .gte("check_out", check_in);

    if (bkError) throw bkError;

    // Count bookings per room type
    const bookingCounts: Record<string, number> = {};
    for (const b of existingBookings || []) {
      if (b.room_type_id) {
        bookingCounts[b.room_type_id] = (bookingCounts[b.room_type_id] || 0) + 1;
      }
    }

    // Count rooms per room type
    const { data: rooms, error: rmError } = await supabase
      .from("rooms")
      .select("room_type_id")
      .eq("is_active", true)
      .in("room_type_id", roomTypes.map((rt) => rt.id));

    if (rmError) throw rmError;

    const roomCounts: Record<string, number> = {};
    for (const r of rooms || []) {
      if (r.room_type_id) {
        roomCounts[r.room_type_id] = (roomCounts[r.room_type_id] || 0) + 1;
      }
    }

    // Determine available room types
    const availableRoomTypes = roomTypes
      .filter((rt) => {
        const totalRooms = roomCounts[rt.id] || 0;
        const booked = bookingCounts[rt.id] || 0;
        return totalRooms - booked > 0;
      })
      .map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        base_price: rt.base_price,
        capacity: rt.capacity,
        base_capacity: rt.base_capacity,
        amenities: rt.amenities,
        available_rooms: (roomCounts[rt.id] || 0) - (bookingCounts[rt.id] || 0),
      }));

    return new Response(
      JSON.stringify({
        available: availableRoomTypes.length > 0,
        check_in,
        check_out,
        guests: { adults: adults || 2, children: children || 0 },
        room_types: availableRoomTypes,
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
