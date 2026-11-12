import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const message =
  "Direct generation through private Suno endpoints is not supported here. Sign in and create music on the official Suno website. Your OpenSuno Studio remains available for preparing and saving prompts.";

function unavailable() {
  return NextResponse.json(
    {
      error: "official_suno_access_required",
      message,
      official_url: "https://suno.com/create",
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

export async function GET() {
  return unavailable();
}

export async function POST() {
  return unavailable();
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
