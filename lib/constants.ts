// Jobs are for a short excerpt of a song, not a full track — this keeps
// the ask reasonable for musicians auditioning for free, and protects
// creators from effectively giving away an unreleased song. Enforced as a
// file-size cap (simple, no audio-duration parsing needed) rather than a
// strict duration check.
export const MAX_AUDIO_UPLOAD_MB = 20;
export const MAX_AUDIO_UPLOAD_BYTES = MAX_AUDIO_UPLOAD_MB * 1024 * 1024;
export const AUDIO_UPLOAD_HINT = `Keep it to a short excerpt, not the full track. Roughly 60–90 seconds is plenty (max ${MAX_AUDIO_UPLOAD_MB}MB).`;
