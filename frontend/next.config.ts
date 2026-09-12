import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    APPWRITE_PROJECT_ID:
      process.env.APPWRITE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ||
      "6aa054e6000f7a0f3af1",
    APPWRITE_PROJECT_NAME:
      process.env.APPWRITE_PROJECT_NAME ||
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_NAME ||
      "cool",
    APPWRITE_ENDPOINT:
      process.env.APPWRITE_ENDPOINT ||
      process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ||
      "https://nyc.cloud.appwrite.io/v1",
  },
};

export default nextConfig;
