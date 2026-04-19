import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";

const app = new Hono();

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET\", \"POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// TTS endpoint
app.post("/make-server-f3736f45/tts", async (c) => {
  try {
    const { text } = await c.req.json();
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!apiKey) {
      console.error("[TTS] ELEVENLABS_API_KEY not configured");
      return c.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        500
      );
    }

    console.log(`[TTS] Generating speech for: "${text}"`);

    // Use Rachel voice with eleven_turbo_v2_5 model
    const response = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
      {
        method: "POST",
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
      return c.json(
        { 
          error: `ElevenLabs API error: ${response.status}`,
          details: errorText,
          message: response.status === 401 
            ? "Invalid API key. Please check your ELEVENLABS_API_KEY in environment settings."
            : "Failed to generate speech. Please try again."
        },
        response.status
      );
    }

    const audioBuffer = await response.arrayBuffer();
    console.log(`[TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio`);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[TTS] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);
