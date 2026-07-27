import { createServerFn } from "@tanstack/react-start";

const AI_GATEWAY_BASE = "https://ai.gateway.lovable.dev";
const BUCKET = "weekly-banners";

function gatewayKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI Gateway key is not configured");
  return key;
}

export const generateWeeklyBanner = createServerFn({ method: "POST" })
  .validator((data: { prompt: string; userId: string }) => data)
  .handler(async ({ data }) => {
    const prompt = data.prompt.trim();
    if (!prompt) throw new Error("Prompt is required");

    const key = gatewayKey();
    const res = await fetch(`${AI_GATEWAY_BASE}/v1/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        prompt,
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Image generation failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    // Gateway image responses can come in a few shapes; try known fields.
    const b64: string | undefined =
      json.data?.[0]?.b64_json ??
      json.choices?.[0]?.message?.images?.[0]?.image_url?.url ??
      json.choices?.[0]?.message?.images?.[0]?.b64_json;
    const urlField: string | undefined = json.data?.[0]?.url;
    if (!b64 && !urlField) {
      throw new Error(`No image returned: ${JSON.stringify(json).slice(0, 400)}`);
    }

    let buffer: ArrayBuffer;
    if (b64) {
      const base64 = b64.startsWith("data:") ? b64.split(",")[1] : b64;
      const bytes = Buffer.from(base64, "base64");
      buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } else {
      const imageRes = await fetch(urlField!);
      if (!imageRes.ok) throw new Error("Could not download generated image");
      buffer = await imageRes.arrayBuffer();
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fileName = `${data.userId}/${globalThis.crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, buffer, { contentType: "image/png" });
    if (uploadError) throw uploadError;

    const { data: signed } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);

    return { url: signed?.signedUrl ?? "" };
  });
