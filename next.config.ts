import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["node:sqlite", "unpdf"],
  async headers() { return [{source:"/:path*",headers:[
    {key:"X-Content-Type-Options",value:"nosniff"},
    {key:"Referrer-Policy",value:"same-origin"},
    {key:"X-Frame-Options",value:"DENY"},
    {key:"Permissions-Policy",value:"microphone=(self), camera=(), geolocation=()"},
  ]}, {source:"/auth/confirm",headers:[
    // Next preserves configured headers when sending a Route Handler response.
    // This rule must follow the global referrer policy for email-token links.
    {key:"Referrer-Policy",value:"no-referrer"},
    {key:"Cache-Control",value:"private, no-store, max-age=0"},
    {key:"Pragma",value:"no-cache"},
    {key:"Expires",value:"0"},
  ]}]; },
};
export default config;
