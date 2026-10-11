/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep the ffmpeg binary out of the webpack bundle on Vercel/serverless.
  experimental: {
    serverComponentsExternalPackages: ["ffmpeg-static"],
    outputFileTracingIncludes: {
      "/api/jobs/[jobId]/lyrics/route": ["./node_modules/ffmpeg-static/ffmpeg"],
    },
  },
};

export default nextConfig;
