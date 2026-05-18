import { supabase } from "../../lib/supabase";

export interface PhonemeAttempt {
  student_id?: string;
  letter: string;
  recognized_ipa: string;
  score: number;
  is_match: boolean;
  audio_url?: string;
  timestamp: string;
}

/**
 * DataCollector Utility
 * Handles saving phoneme recognition attempts and audio clips to Supabase.
 */
export const dataCollector = {
  /**
   * Saves an attempt to the database and uploads the audio file.
   */
  async collectAttempt(
    letter: string,
    audioBlob: Blob,
    isMatch: boolean,
    score: number,
    recognized: string
  ) {
    try {
      const profileStr = localStorage.getItem("userProfile");
      const profile = profileStr ? JSON.parse(profileStr) : null;
      const studentId = profile?.id || 'anonymous';
      
      const timestamp = new Date().toISOString();
      const fileName = `${studentId}/${letter}_${Date.now()}.webm`;

      // 1. Upload Audio to Supabase Storage
      // (Requires a bucket named 'phoneme-recordings' with public access or appropriate policies)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('phoneme-recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      let audioUrl = undefined;
      if (uploadError) {
        console.error('[DataCollector] ❌ Audio upload failed:', uploadError.message);
        console.error('[DataCollector] Attempted Path:', fileName);
      } else {
        console.log('[DataCollector] ✅ Audio uploaded to:', fileName);
        const { data: urlData } = supabase.storage
          .from('phoneme-recordings')
          .getPublicUrl(fileName);
        audioUrl = urlData.publicUrl;
      }

      // 2. Save Metadata to Supabase Table
      // (Requires a table named 'phoneme_attempts')
      const { error: dbError } = await supabase
        .from('phoneme_attempts')
        .insert({
          student_id: studentId === 'anonymous' ? null : studentId,
          letter: letter,
          recognized_ipa: recognized,
          score: score,
          is_match: isMatch,
          audio_url: audioUrl,
          created_at: timestamp
        });

      if (dbError) {
        console.error('[DataCollector] Database save failed:', dbError.message);
      } else {
        console.log('[DataCollector] Attempt saved successfully!');
      }

    } catch (err) {
      console.error('[DataCollector] General error:', err);
    }
  }
};
