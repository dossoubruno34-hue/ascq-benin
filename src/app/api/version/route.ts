import { NextResponse } from "next/server";
import { APP_VERSION, APP_BUILD_TIMESTAMP, APP_BUILD_DATE, APP_RELEASE_NOTES } from "@/lib/version";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      version: APP_VERSION,
      buildTimestamp: APP_BUILD_TIMESTAMP,
      buildDate: APP_BUILD_DATE,
      releaseNotes: APP_RELEASE_NOTES,
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    }
  );
}
