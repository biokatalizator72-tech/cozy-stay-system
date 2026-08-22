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
      .select("room_id, check_in, check_out")
      .in("room_id", roomIds.length > 0 ? roomIds : ["00000000-0000-0000-0000-000000000000"])
      .in("status", ["pending", "confirmed"])
      .lt("check_in", check_out)
      .gte("check_out", check_in);

    if (bkError) throw bkError;

    const bookedRoomIds = new Set((overlappingBookings || []).map((b) => b.room_id));

    // Ténylegesen szabad room_id-k típusonkénti csoportosítása
    const freeRoomsByType: Record<string, string[]> = {};
    const roomCountByType: Record<string, number> = {};
    const roomIdToType = new Map<string, string>();
    for (const r of rooms || []) {
      if (!r.room_type_id) continue;
      roomIdToType.set(r.id, r.room_type_id);
      roomCountByType[r.room_type_id] = (roomCountByType[r.room_type_id] || 0) + 1;
      if (bookedRoomIds.has(r.id)) continue;
      (freeRoomsByType[r.room_type_id] ||= []).push(r.id);
    }

    // Kontingens (allotment): hány szobát szabad ELADNI ezen a csatornán
    // (web + Vapi telefon) egy adott napra egy szobatípusból - ez lehet
    // alacsonyabb, mint a fizikai szobaszám, ha Tomi szobát tartalékol
    // más csatornáknak (pl. Booking.com), amik nincsenek élő szinkronban
    // ezzel a rendszerrel. Ha nincs explicit kontingens-sor egy napra,
    // a teljes fizikai szobaszám a felső határ.
    const nightDates: string[] = [];
    {
      let d = new Date(check_in + "T00:00:00Z");
      const end = new Date(check_out + "T00:00:00Z");
      while (d < end) {
        nightDates.push(d.toISOString().slice(0, 10));
        d = new Date(d.getTime() + 86400000);
      }
    }

    const { data: contingentRows } = await supabase
      .from("room_type_contingent")
      .select("room_type_id, date, contingent")
      .in("room_type_id", roomTypes.map((rt) => rt.id))
      .in("date", nightDates);

    const contingentByTypeDate = new Map<string, number>();
    (contingentRows || []).forEach((c) => {
      contingentByTypeDate.set(`${c.room_type_id}|${c.date}`, c.contingent);
    });

    const bookedCountByTypeDate = new Map<string, number>();
    for (const b of overlappingBookings || []) {
      const typeId = roomIdToType.get(b.room_id);
      if (!typeId) continue;
      for (const d of nightDates) {
        if (b.check_in <= d && b.check_out > d) {
          const key = `${typeId}|${d}`;
          bookedCountByTypeDate.set(key, (bookedCountByTypeDate.get(key) || 0) + 1);
        }
      }
    }

    const remainingContingent = (typeId: string): number => {
      let min = Infinity;
      for (const d of nightDates) {
        const cap = contingentByTypeDate.get(`${typeId}|${d}`) ?? (roomCountByType[typeId] || 0);
        const booked = bookedCountByTypeDate.get(`${typeId}|${d}`) || 0;
        min = Math.min(min, cap - booked);
      }
      return min === Infinity ? (roomCountByType[typeId] || 0) : min;
    };

    // Korlátozások (Ártábla admin oldal "Korlátozások" nézete): minimum
    // éjszakaszám az érkezési naphoz kötve, "Nem érkezési nap" az érkezési
    // naphoz, "Nem távozási nap" a távozási naphoz. A pricing_rules
    // egy-egy sora mindig egyetlen napot fed le (start_date = end_date),
    // ezért elég a check_in és a check_out dátumra rákeresni.
    const nights = Math.round(
      (new Date(check_out).getTime() - new Date(check_in).getTime()) / 86400000
    );

    const { data: restrictionRules } = await supabase
      .from("pricing_rules")
      .select("room_type_id, start_date, min_nights, closed_to_arrival, closed_to_departure")
      .in("room_type_id", roomTypes.map((rt) => rt.id))
      .in("start_date", [check_in, check_out]);

    const arrivalRuleByType = new Map<string, { min_nights: number; closed_to_arrival: boolean }>();
    const departureRuleByType = new Map<string, { closed_to_departure: boolean }>();
    (restrictionRules || []).forEach((r) => {
      if (r.start_date === check_in) {
        arrivalRuleByType.set(r.room_type_id, { min_nights: r.min_nights, closed_to_arrival: r.closed_to_arrival });
      }
      if (r.start_date === check_out) {
        departureRuleByType.set(r.room_type_id, { closed_to_departure: r.closed_to_departure });
      }
    });

    // Determine available room types based on actual free rooms + korlátozások + kontingens
    const availableRoomTypes = roomTypes
      .filter((rt) => (freeRoomsByType[rt.id]?.length || 0) > 0)
      .filter((rt) => {
        const arrivalRule = arrivalRuleByType.get(rt.id);
        if (arrivalRule?.closed_to_arrival) return false;
        if (arrivalRule?.min_nights && nights < arrivalRule.min_nights) return false;
        const departureRule = departureRuleByType.get(rt.id);
        if (departureRule?.closed_to_departure) return false;
        return true;
      })
      .filter((rt) => remainingContingent(rt.id) > 0)
      .map((rt) => ({
        id: rt.id,
        name: rt.name,
        description: rt.description,
        base_price: rt.base_price,
        capacity: rt.capacity,
        base_capacity: rt.base_capacity,
        amenities: rt.amenities,
        available_rooms: Math.min(freeRoomsByType[rt.id]?.length || 0, remainingContingent(rt.id)),
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
