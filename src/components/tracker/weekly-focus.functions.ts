import { createServerFn } from "@tanstack/react-start";

const AI_GATEWAY_BASE = "https://ai-gateway.lovable.app";
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
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-image-2",
        prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("AI Gateway error:", res.status, text.slice(0, 500));
      throw new Error(`Image generation failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const imageUrl = json.data?.[0]?.url ?? json.data?.[0]?.b64_json;
    if (!imageUrl) throw new Error("No image returned from generator");

    let buffer: ArrayBuffer;
    if (imageUrl.startsWith("data:")) {
      const base64 = imageUrl.split(",")[1];
      const bytes = Buffer.from(base64, "base64");
      buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    } else {
      const imageRes = await fetch(imageUrl);
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
