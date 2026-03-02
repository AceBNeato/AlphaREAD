import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-f3736f45/health", (c) => {
  return c.json({ status: "ok" });
});

// Test endpoint to verify API key is configured
app.get("/make-server-f3736f45/test-api-key", async (c) => {
  const apiKey = Deno.env.get("ELEVENLABS_API_KEY")?.trim();
  
  if (!apiKey) {
    return c.json({ 
      configured: false,
      message: "API key is NOT set in environment variables"
    });
  }

  // Test the API key with ElevenLabs
  try {
    const testResponse = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: {
        "xi-api-key": apiKey,
      },
    });

    const isValid = testResponse.ok;
    let userInfo = null;
    
    if (isValid) {
      userInfo = await testResponse.json();
    } else {
      const errorText = await testResponse.text();
      console.error("API key validation failed:", errorText);
    }

    return c.json({ 
      configured: true,
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 8),
      isValid,
      statusCode: testResponse.status,
      userInfo: isValid ? { 
        subscription: userInfo?.subscription?.tier,
        characterCount: userInfo?.subscription?.character_count,
        characterLimit: userInfo?.subscription?.character_limit
      } : null,
      message: isValid 
        ? "✅ API key is valid and working!" 
        : "❌ API key is configured but INVALID. Please check your key at https://elevenlabs.io/app/settings/api-keys"
    });
  } catch (error) {
    return c.json({
      error: "Failed to validate API key",
      details: error.message
    }, 500);
  }
});

// TTS endpoint
app.post("/make-server-f3736f45/tts", async (c) => {
  try {
    const { text } = await c.req.json();
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");

    if (!apiKey) {
      return c.json(
        { error: "ELEVENLABS_API_KEY not configured" },
        500
      );
    }

    console.log(`[TTS] Generating speech for: "${text}"`);

    // Use the free-tier compatible model: eleven_turbo_v2_5
    // Other free options: eleven_turbo_v2, eleven_multilingual_v2
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
          model_id: "eleven_turbo_v2_5", // Free tier model
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