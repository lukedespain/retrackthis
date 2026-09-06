// Cap must stay at or under the Supabase project's global file size limit
// (Free plan = 50MB). Higher values make updateBucket fail and block uploads.
export const MAX_AUDIO_UPLOAD_MB = 50;
export const MAX_AUDIO_UPLOAD_BYTES = MAX_AUDIO_UPLOAD_MB * 1024 * 1024;

export const AUDIO_UPLOAD_HINT = `MP3 or WAV welcome — full songs are fine (max ${MAX_AUDIO_UPLOAD_MB}MB). For bigger WAVs, export MP3 or a shorter stem.`;

/** Explicit extensions + MIME types so WAV works across browsers. */
export const AUDIO_FILE_ACCEPT =
  ".mp3,.wav,.m4a,.aac,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/wave,audio/mp4,audio/aac,audio/flac,audio/*";
