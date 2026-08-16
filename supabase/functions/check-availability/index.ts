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

    // Valódi, konkrét szoba-szintű elérhetőség számítása típusonként:
    // egy szoba akkor számít szabadnak, ha NINCS rá pending/confirmed
    // foglalás, ami átfedi a kért időszakot. Ez nem aggregált darabszám-
    // különbség, hanem tényleges room_id-k alapján történő számítás.

    // Az érintett típusokhoz tartozó összes aktív, konkrét szoba
    const { data: rooms, error: rmError } = await supabase
      .from("rooms")
      .select("id, room_type_id")
      .eq("is_active", true)
      .in("room_type_id", roomTypes.map((rt) => rt.id));

    if (rmError) throw rmError;

    const roomIds = (rooms || []).map((r) => r.id);

    // Ezek közül melyik room_id-kra van átfedő, aktív foglalás
    const { data: overlappingBookings, error: bkError } = await supabase
      .from("bookings")
      .select("room_id")
      .in("room_id", roomIds.length > 0 ? roomIds : ["00000000-0000-0000-0000-000000000000"])
      .in("status", ["pending", "confirmed"])
      .lt("check_in", check_out)
      .gte("check_out", check_in);

    if (bkError) throw bkError;

    const bookedRoomIds = new Set((overlappingBookings || []).map((b) => b.room_id));

    // Ténylegesen szabad room_id-k típusonkénti csoportosítása
    const freeRoomsByType: Record<string, string[]> = {};
    for (const r of rooms || []) {
      if (!r.room_type_id) continue;
      if (bookedRoomIds.has(r.id)) continue;
      (freeRoomsByType[r.room_type_id] ||= []).push(r.id);
    }

    // Determine available room types based on actual free rooms
    const availableRoomTypes = roomTypes
      .filter((rt) => (freeRoomsByType[rt.id]?.length || 0) > 0)
      .map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        base_price: rt.base_price,
        capacity: rt.capacity,
        base_capacity: rt.base_capacity,
        amenities: rt.amenities,
        available_rooms: freeRoomsByType[rt.id]?.length || 0,
        available_room_ids: freeRoomsByType[rt.id] || [],
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
