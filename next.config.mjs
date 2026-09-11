/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the ffmpeg binary out of the webpack bundle on Vercel/serverless.
  serverExternalPackages: ["ffmpeg-static"],
};

export default nextConfig;
