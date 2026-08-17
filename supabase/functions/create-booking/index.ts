import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // Try generic parse
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("create-booking request body:", JSON.stringify(body));

    // --- Vapi wrapper kicsomagolasa ---
    let payload = body;
    if (body.message?.toolCalls?.[0]?.function?.arguments) {
      payload = body.message.toolCalls[0].function.arguments;
      console.log("create-booking: unwrapped Vapi message format");
    }

    let {
      room_type_id,
      check_in,
      check_out,
      guest_name,
      guest_email,
      guest_phone,
      total_price,
      special_requests,
      guest_data,
    } = payload;

    // --- Input sanitization & length limits ---
    const maxLen = (val: unknown, max: number): string | undefined => {
      if (!val || typeof val !== "string") return undefined;
      return val.trim().slice(0, max);
    };

    guest_name = maxLen(guest_name, 200);
    guest_email = maxLen(guest_email, 254);
    guest_phone = maxLen(guest_phone, 30);
    special_requests = maxLen(special_requests, 1000);

    // Validate email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (guest_email && !emailRegex.test(guest_email)) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen email cím formátum." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate total_price if provided
    if (total_price != null && (typeof total_price !== "number" || total_price < 0 || total_price > 100_000_000)) {
      return new Response(
        JSON.stringify({ error: "Érvénytelen ár." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit guest_data size
    if (guest_data) {
      const gdStr = JSON.stringify(guest_data);
      if (gdStr.length > 5000) {
        return new Response(
          JSON.stringify({ error: "A vendég adatok túl nagyok." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Resolve non-UUID room_type_id by name ---
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (room_type_id && !uuidRegex.test(room_type_id)) {
      console.log(`create-booking: room_type_id is not UUID: "${room_type_id}", searching by name`);
      const { data: matchedRT } = await supabase
        .from("room_types")
        .select("id")
        .eq("is_active", true)
        .ilike("name", `%${room_type_id.replace(/_/g, " ")}%`)
        .limit(1)
        .maybeSingle();
      room_type_id = matchedRT?.id || null;
    }

    // --- Default room_type_id ---
    if (!room_type_id) {
      const { data: defaultRT } = await supabase
        .from("room_types")
        .select("id")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .single();
      room_type_id = defaultRT?.id;
    }

    // --- Default optional fields ---
    guest_email = guest_email || "nincs@megadva.hu";
    guest_phone = guest_phone || "nem megadott";

    // --- Date validation ---
    check_in = parseDate(check_in);
    check_out = parseDate(check_out);

    // --- Validate required fields ---
    const missing: string[] = [];
    if (!room_type_id) missing.push("room_type_id");
    if (!check_in) missing.push("check_in");
    if (!check_out) missing.push("check_out");
    if (!guest_name) missing.push("guest_name");

    if (missing.length > 0) {
      console.log("create-booking missing fields:", missing.join(", "));
      return new Response(
        JSON.stringify({ error: `Hiányzó mezők: ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify room type exists and is active
    const { data: roomType, error: rtError } = await supabase
      .from("room_types")
      .select("id, name, capacity, base_price")
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

    // --- Default total_price ---
    if (total_price == null || total_price === undefined) {
      const nights = Math.max(
        1,
        (new Date(check_out!).getTime() - new Date(check_in!).getTime()) / 86400000
      );
      total_price = roomType.base_price * nights;
      console.log(`create-booking calculated total_price: ${total_price} (${nights} nights × ${roomType.base_price})`);
    }

    // Atomi szoba-kiválasztás + foglalás létrehozása egyetlen tranzakcióban.
    // A create_booking_with_room DB function FOR UPDATE SKIP LOCKED
    // zárolással választ konkrét, szabad room_id-t, és egy adatbázis-szintű
    // EXCLUDE constraint is védi a dupla foglalás ellen (lásd migráció:
    // room_level_booking_and_race_protection).
    const { data: booking, error: insertError } = await supabase.rpc(
      "create_booking_with_room",
      {
        p_room_type_id: room_type_id,
        p_check_in: check_in,
        p_check_out: check_out,
        p_guest_name: guest_name,
        p_guest_email: guest_email,
        p_guest_phone: guest_phone,
        p_total_price: total_price,
        p_special_requests: special_requests || null,
        p_guest_data: guest_data || {},
      }
    );

    if (insertError) {
      if (insertError.message?.includes("NO_ROOM_AVAILABLE")) {
        return new Response(
          JSON.stringify({ error: "Sajnos a kiválasztott szobatípus a megadott időszakban már nem elérhető." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw insertError;
    }

    console.log("create-booking success:", booking.id);

    // --- Visszaigazolás küldése (vendégnek ÉS adminnak) ---
    // Ez minden foglalási csatornán fut (weboldal, telefonos Vapi asszisztens,
    // stb.), mert itt, a create-booking function-ben történik, nem a
    // frontend felelőssége — így nem lehet elfelejteni meghívni.
    //
    // A küldés egy Google Apps Script webhookon keresztül megy (GmailApp),
    // a valódi siralyhotel.hu@gmail.com fiókból, NEM Resend-en keresztül —
    // mert a siralyhotel.hu domain nincs hitelesítve a Resend-nél, és a
    // Tominak nincs hozzáférése a domain DNS beállításaihoz, hogy ezt
    // megoldja.
    try {
      const gasWebhookUrl = Deno.env.get("GAS_EMAIL_WEBHOOK_URL");
      const { data: propSettings } = await supabase
        .from("property_settings")
        .select("deposit_percent, admin_email")
        .limit(1)
        .single();

      // Csak akkor küldünk a vendégnek, ha valódi email címet adott meg
      // (nem a "nincs megadva" placeholdert, ami telefonos hívásnál
      // előfordulhat, ha valamiért mégis email nélkül futott le a foglalás).
      const hasRealGuestEmail = guest_email && guest_email !== "nincs@megadva.hu";

      if (gasWebhookUrl && hasRealGuestEmail) {
        const webhookRes = await fetch(gasWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "booking_confirmation",
            guest_name,
            guest_email,
            room_name: roomType.name,
            check_in,
            check_out,
            total_price,
            deposit_percent: propSettings?.deposit_percent ?? 30,
            admin_email: propSettings?.admin_email || "siralyhotel.hu@gmail.com",
          }),
        });
        const webhookJson = await webhookRes.json().catch(() => null);
        console.log("Confirmation webhook response:", webhookJson);
      } else if (!gasWebhookUrl) {
        console.log("GAS_EMAIL_WEBHOOK_URL nincs beállítva, visszaigazolás nem került elküldésre.");
      } else {
        console.log("Skipping confirmation email: no real guest_email provided");
      }
    } catch (emailErr) {
      console.error("Confirmation email error:", emailErr.message);
    }
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
    console.error("create-booking error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
