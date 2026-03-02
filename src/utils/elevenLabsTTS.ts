import { projectId, publicAnonKey } from '/utils/supabase/info';

// Audio cache to avoid redundant API calls
const audioCache = new Map<string, string>();

/**
 * Plays text using ElevenLabs API with caching
 * @param text - The text to speak
 * @param onStart - Callback when audio starts playing
 * @param onEnd - Callback when audio finishes playing
 * @returns Promise that resolves when audio completes
 */
export async function playElevenLabsAudio(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  try {
    // Check cache first
    let audioUrl = audioCache.get(text);

    if (!audioUrl) {
      // Call backend TTS endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3736f45/tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ text }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || 'Unknown error';
        
        console.error('TTS API Error Details:', {
          status: response.status,
          error: errorData,
        });
        
        // Show user-friendly error for 401
        if (response.status === 401) {
          alert('⚠️ Invalid ElevenLabs API Key\n\nPlease check your API key in the environment settings.\n\n1. Go to https://elevenlabs.io/app/settings/api-keys\n2. Copy your API key\n3. Update the ELEVENLABS_API_KEY environment variable');
        }
        
        throw new Error(
          `TTS API error: ${response.status} - ${errorMessage}`
        );
      }

      const audioBlob = await response.blob();
      audioUrl = URL.createObjectURL(audioBlob);
      
      // Cache the audio URL
      audioCache.set(text, audioUrl);
    }

    // Play the audio
    const audio = new Audio(audioUrl);
    
    if (onStart) {
      audio.addEventListener('play', onStart, { once: true });
    }
    
    if (onEnd) {
      audio.addEventListener('ended', onEnd, { once: true });
    }

    await audio.play();
  } catch (error) {
    console.error('Error playing ElevenLabs audio:', error);
    if (onEnd) onEnd(); // Still call onEnd to reset UI state
    throw error;
  }
}

/**
 * Clears the audio cache (useful for memory management)
 */
export function clearAudioCache(): void {
  audioCache.forEach((url) => URL.revokeObjectURL(url));
  audioCache.clear();
}