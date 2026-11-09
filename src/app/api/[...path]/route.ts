import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODEL, sunoApi } from "@/lib/SunoApi";
import { corsHeaders } from "@/lib/utils";
import * as cookie from "cookie";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = { params: { path: string[] } };

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

function failure(error: any, fallback = "Suno API request failed") {
  const status = Number(error?.response?.status) || 500;
  const message =
    error?.response?.data?.detail ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;
  console.error("[OpenSuno API]", status, message);
  return json({ error: String(message) }, status);
}

async function getApi(req: NextRequest) {
  return sunoApi(req.headers.get("cookie") || "");
}

/**
 * A single catch-all handler keeps OpenSuno within Vercel Hobby's
 * Serverless Function limit while preserving the documented /api/* URLs.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const route = (context.params.path || []).join("/");
  const url = req.nextUrl;

  try {
    if (route === "cookie") {
      const configured = process.env.SUNO_COOKIE || "";
      const parsed = cookie.parse(configured);
      const hasSession = Boolean(parsed.__session && parsed.__session.length > 100);
      const hasClient = Boolean(parsed.__client);
      return json({
        has_cookie: Boolean(configured),
        has_session_token: hasSession,
        has_client_id: hasClient,
        message: configured ? "SUNO_COOKIE is configured in the server environment" : "SUNO_COOKIE is not configured"
      });
    }

    const api = await getApi(req);

    if (route === "clip") {
      const id = url.searchParams.get("id");
      if (!id) return json({ error: "Missing parameter id" }, 400);
      return json(await api.getClip(id));
    }

    if (route === "get") {
      const ids = url.searchParams.get("ids");
      const page = url.searchParams.get("page");
      return json(await api.get(ids ? ids.split(",").filter(Boolean) : undefined, page));
    }

    if (route === "get_limit") {
      return json(await api.get_credits());
    }

    if (route === "get_aligned_lyrics") {
      const songId = url.searchParams.get("song_id");
      if (!songId) return json({ error: "Song ID is required" }, 400);
      return json(await api.getLyricAlignment(songId));
    }

    if (route === "persona") {
      const personaId = url.searchParams.get("id");
      if (!personaId) return json({ error: "Missing parameter id" }, 400);
      const page = Number.parseInt(url.searchParams.get("page") || "1", 10);
      return json(await api.getPersonaPaginated(personaId, Number.isFinite(page) ? page : 1));
    }

    return json({ error: "API endpoint not found" }, 404);
  } catch (error: any) {
    return failure(error);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const route = (context.params.path || []).join("/");

  // Never accept or persist Suno session cookies through a public endpoint.
  // Configure SUNO_COOKIE in Vercel Project Settings instead.
  if (route === "cookie") {
    return json({
      error: "For hosted deployments, add SUNO_COOKIE in Vercel Project Settings → Environment Variables. This public endpoint does not store authentication secrets."
    }, 403);
  }

  try {
    const body = await req.json();
    const api = await getApi(req);

    if (route === "generate") {
      const result = await api.generate(
        body.prompt,
        Boolean(body.make_instrumental),
        body.model || DEFAULT_MODEL,
        Boolean(body.wait_audio)
      );
      return json(result);
    }

    if (route === "custom_generate") {
      const result = await api.custom_generate(
        body.prompt,
        body.tags,
        body.title,
        Boolean(body.make_instrumental),
        body.model || DEFAULT_MODEL,
        Boolean(body.wait_audio),
        body.negative_tags
      );
      return json(result);
    }

    if (route === "generate_lyrics") {
      if (!body.prompt) return json({ error: "Prompt is required" }, 400);
      return json(await api.generateLyrics(body.prompt));
    }

    if (route === "extend_audio") {
      if (!body.audio_id) return json({ error: "Audio ID is required" }, 400);
      return json(await api.extendAudio(
        body.audio_id,
        body.prompt,
        body.continue_at,
        body.tags || "",
        body.negative_tags || "",
        body.title,
        body.model || DEFAULT_MODEL,
        Boolean(body.wait_audio)
      ));
    }

    if (route === "generate_stems") {
      if (!body.audio_id) return json({ error: "Audio ID is required" }, 400);
      return json(await api.generateStems(body.audio_id));
    }

    if (route === "concat") {
      if (!body.clip_id) return json({ error: "Clip id is required" }, 400);
      return json(await api.concatenate(body.clip_id));
    }

    return json({ error: "API endpoint not found" }, 404);
  } catch (error: any) {
    return failure(error);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}
