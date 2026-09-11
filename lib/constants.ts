// Cap must stay at or under the Supabase project's global file size limit.
// Pro plan allows up to 500MB+; keep this in sync with Storage Settings.
export const MAX_AUDIO_UPLOAD_MB = 500;
export const MAX_AUDIO_UPLOAD_BYTES = MAX_AUDIO_UPLOAD_MB * 1024 * 1024;

export const AUDIO_UPLOAD_HINT = `Upload MP3 or WAV (max ${MAX_AUDIO_UPLOAD_MB}MB)`;

/** Explicit extensions + MIME types so WAV works across browsers. */
export const AUDIO_FILE_ACCEPT =
  ".mp3,.wav,.m4a,.aac,.flac,audio/mpeg,audio/wav,audio/x-wav,audio/wave,audio/mp4,audio/aac,audio/flac,audio/*";
