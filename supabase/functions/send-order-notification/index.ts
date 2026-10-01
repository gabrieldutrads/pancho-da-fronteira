import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceKey) return json({ error: "Supabase function secrets are not configured." }, 503);

  const authHeader = request.headers.get("Authorization") || "";
  const authClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: "Authentication required." }, 401);

  const db = createClient(url, serviceKey);
  const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "manager"].includes(profile.role)) return json({ error: "Administrator access required." }, 403);

  let orderId: string;
  try { orderId = (await request.json()).orderId; } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return json({ error: "Invalid order id." }, 400);

  const { data: order, error: orderError } = await db.from("orders")
    .select("id,order_number,status,user_id,customer_phone,whatsapp_opt_in")
    .eq("id", orderId).maybeSingle();
  if (orderError || !order) return json({ error: "Order not found." }, 404);

  const { data: log } = await db.from("notification_logs").select("id,status,provider_message_id")
    .eq("order_id", orderId).eq("event_type", order.status).maybeSingle();
  if (!log) return json({ status: "no_notification", sent: false });
  if (log.status === "sent") return json({ status: "sent", sent: false, duplicate: true });

  const { data: settings } = await db.from("store_settings").select("whatsapp_settings").limit(1).maybeSingle();
  const whatsapp = settings?.whatsapp_settings || {};
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const apiVersion = Deno.env.get("WHATSAPP_API_VERSION");
  const template = whatsapp.templates?.[order.status];
  const failClosed = async (status: string, reason: string) => {
    await db.from("notification_logs").update({ status, error_message: reason }).eq("id", log.id);
    return json({ status, sent: false, reason });
  };

  if (!order.whatsapp_opt_in || !order.customer_phone) return await failClosed("not_configured", "Customer has not opted in or no phone is available.");
  if (!whatsapp.enabled || whatsapp.events?.[order.status] === false || whatsapp.provider !== "meta" || !template || !token || !phoneNumberId || !apiVersion) {
    return await failClosed("not_configured", "Official WhatsApp provider, approved template, or server secrets are not configured.");
  }

  const { data: claimed } = await db.from("notification_logs").update({ status: "processing", error_message: null })
    .eq("id", log.id).eq("status", "pending").select("id").maybeSingle();
  if (!claimed) return json({ status: log.status, sent: false, duplicate: true });

  const phone = order.customer_phone.replace(/\D/g, "");
  const recipient = phone.startsWith("55") ? phone : `55${phone}`;
  const graphResponse = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "template",
      template: {
        name: template,
        language: { code: whatsapp.language || "pt_BR" },
        components: [{ type: "body", parameters: [{ type: "text", text: order.order_number }] }],
      },
    }),
  });
  const provider = await graphResponse.json().catch(() => ({}));
  if (!graphResponse.ok) {
    const reason = provider.error?.message || `WhatsApp API returned ${graphResponse.status}.`;
    await db.from("notification_logs").update({ status: "failed", error_message: reason }).eq("id", log.id);
    return json({ status: "failed", sent: false, reason }, 502);
  }

  const providerMessageId = provider.messages?.[0]?.id || null;
  await db.from("notification_logs").update({ status: "sent", provider_message_id: providerMessageId, sent_at: new Date().toISOString(), error_message: null }).eq("id", log.id);
  return json({ status: "sent", sent: true });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
