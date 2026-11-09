import Link from "next/link";
import Section from "./components/Section";
import Markdown from "react-markdown";

export default function Home() {
  const markdown = `
---
## 👋 Introduction

OpenSuno gives you two ways to create with Suno:

- **Music Studio** — create tracks from a prompt or bring your own lyrics, title and style.
- **Developer API** — connect your own apps, workflows and AI tools to the same generation backend.

It supports Bridge Mode (Chrome extension + local bridge server) and hosted Cookie Mode (Vercel environment variable).

## 🌟 Features

- Browser-based music creation with Simple and Custom modes
- REST API compatible with the original suno-api format
- OpenAI-compatible \`/v1/chat/completions\` endpoint
- MCP server for compatible AI clients
- Track status, audio playback and direct audio links
- Supported Suno models: V3.5 / V4 / V4.5+ / V4.5 Pro / V5

## 🔌 Connect your Suno account

For hosted Cookie Mode, add your private \`SUNO_COOKIE\` value in Vercel Project Settings → Environment Variables. Never paste session cookies into this website or a public chat.

## 🧰 Developers

Use the API documentation to integrate music generation into your own applications.
`;

  return (
    <>
      <Section>
        <div className="my-8 flex flex-col items-center justify-center gap-5 rounded-2xl border bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-5 py-16 text-center shadow-2xl duration-200 hover:shadow-none lg:px-20">
          <span className="rounded-full border border-white/20 px-5 py-1 text-xs font-light uppercase text-white/60">Open source music creation</span>
          <h1 className="text-6xl font-bold tracking-tight text-white/95 sm:text-7xl">OpenSuno</h1>
          <p className="max-w-2xl text-lg text-white/80">Create music in your browser. Connect your Suno account. Build with the API.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/create" className="rounded-full bg-white px-7 py-3 text-sm font-bold text-indigo-950 transition hover:bg-indigo-100">Open Music Studio →</Link>
            <Link href="/docs" className="rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Explore API Docs</Link>
          </div>
        </div>
      </Section>
      <Section className="my-10">
        <article className="prose max-w-3xl lg:prose-lg">
          <Markdown>{markdown}</Markdown>
        </article>
      </Section>
    </>
  );
}
