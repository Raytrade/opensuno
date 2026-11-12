"use client";

import { FormEvent, useEffect, useState } from "react";
import Section from "../components/Section";

type Song = {
  id: string;
  title?: string;
  image_url?: string;
  audio_url?: string;
  status?: string;
  error_message?: string;
  lyric?: string;
  prompt?: string;
};

const models = [
  { value: "chirp-crow", label: "V5" },
  { value: "chirp-auk", label: "V4.5 Pro" },
  { value: "chirp-bluejay", label: "V4.5+" },
  { value: "chirp-v4", label: "V4" },
  { value: "chirp-v3-5", label: "V3.5" },
];

export default function CreatePage() {
  const [mode, setMode] = useState<"simple" | "custom">("simple");
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("Afrobeats, soulful, melodic");
  const [model, setModel] = useState("chirp-crow");
  const [instrumental, setInstrumental] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [credits, setCredits] = useState<string>("—");
  const [songs, setSongs] = useState<Song[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/cookie", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (active) setConnected(Boolean(d.has_cookie)); })
      .catch(() => { if (active) setConnected(false); });
    fetch("/api/get_limit", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (active && d?.credits_left !== undefined) setCredits(String(d.credits_left)); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  async function pollSongs(ids: string[]) {
    for (let attempt = 0; attempt < 36; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      const response = await fetch("/api/get?ids=" + encodeURIComponent(ids.join(",")), { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check generation status.");
      if (Array.isArray(data)) {
        setSongs(data);
        const finished = data.length > 0 && data.every((song: Song) =>
          song.status === "complete" || song.status === "streaming" || song.status === "error"
        );
        if (finished) return data as Song[];
      }
    }
    return null;
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSongs([]);
    if (connected === false) {
      setMessage("Connect Suno first from the Cookie page, then return here.");
      return;
    }
    const text = mode === "simple" ? prompt.trim() : lyrics.trim();
    if (!text && !instrumental) {
      setMessage(mode === "simple" ? "Describe the song you want to create." : "Add lyrics, or choose instrumental.");
      return;
    }
    if (mode === "custom" && !style.trim()) {
      setMessage("Add a music style so Suno knows how the track should sound.");
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "simple" ? "/api/generate" : "/api/custom_generate";
      const body = mode === "simple"
        ? { prompt: text || "Instrumental music", make_instrumental: instrumental, model, wait_audio: false }
        : { prompt: text, tags: style, title: title.trim() || "Untitled", make_instrumental: instrumental, model, wait_audio: false };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Suno could not start generation.");
      if (!Array.isArray(data) || data.length === 0) throw new Error("Suno did not return any song clips.");
      setSongs(data);
      const ids = data.map((song: Song) => song.id).filter(Boolean);
      if (ids.length) {
        setMessage("Generation started. Your tracks will appear below as Suno finishes them.");
        const completed = await pollSongs(ids);
        if (completed?.every((song) => song.status === "error")) {
          throw new Error(completed.map((song) => song.error_message || "Generation failed").join(" · "));
        }
        setMessage(completed ? "Your generation results are ready." : "Still processing. Refresh the page or check your songs again shortly.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
      fetch("/api/get_limit", { cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d?.credits_left !== undefined) setCredits(String(d.credits_left)); })
        .catch(() => undefined);
    }
  }

  return (
    <div className="w-full">
      <Section className="my-8">
        <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-5 py-10 text-white shadow-xl sm:px-10">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-indigo-200">OpenSuno Studio</div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Make something you’ve never heard.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">Create songs with your connected Suno account. Use a simple idea or bring your own lyrics, style and title.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Model: {models.find((item) => item.value === model)?.label}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2">Credits: {credits}</span>
            <span className={"rounded-full px-4 py-2 " + (connected ? "bg-emerald-400/20 text-emerald-100" : "bg-amber-300/20 text-amber-100")}>{connected === null ? "Checking Suno…" : connected ? "Suno configured" : "Suno not connected"}</span>
          </div>
        </div>
      </Section>

      <Section className="mb-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={handleGenerate} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-5">
              <button type="button" onClick={() => setMode("simple")} className={"rounded-full px-5 py-2 text-sm font-semibold " + (mode === "simple" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600")}>Simple create</button>
              <button type="button" onClick={() => setMode("custom")} className={"rounded-full px-5 py-2 text-sm font-semibold " + (mode === "custom" ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600")}>Custom lyrics</button>
            </div>

            {mode === "simple" ? (
              <label className="mt-6 block">
                <span className="text-sm font-semibold text-slate-800">Describe your song</span>
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6} maxLength={3000} placeholder="A warm Afrobeats record with soft guitar, rich percussion, heartfelt male vocals and a memorable chorus…" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                <span className="mt-1 block text-right text-xs text-slate-400">{prompt.length}/3000</span>
              </label>
            ) : (
              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Song title</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Give your song a name" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Music style</span>
                  <input value={style} onChange={(e) => setStyle(e.target.value)} maxLength={500} placeholder="Afrobeats, Afro-soul, mellow guitar…" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-800">Lyrics</span>
                  <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={9} maxLength={5000} placeholder="[Verse 1]&#10;Write or paste your lyrics here…&#10;&#10;[Chorus]&#10;Your hook goes here…" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                </label>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-800">Suno model</span>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500">
                  {models.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                <input type="checkbox" checked={instrumental} onChange={(e) => setInstrumental(e.target.checked)} className="h-4 w-4 accent-indigo-700" />
                <span><span className="block text-sm font-semibold text-slate-800">Instrumental</span><span className="block text-xs text-slate-500">Generate without vocals</span></span>
              </label>
            </div>

            {message && <div role="status" className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">{message}</div>}

            <button type="submit" disabled={busy || connected === null} className="mt-6 flex w-full items-center justify-center rounded-xl bg-indigo-700 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-900/10 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? "Creating your music…" : "Generate music"}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-400">Generation uses your own Suno account and credits. Results depend on Suno availability and account permissions.</p>
          </form>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Your workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Create with a short idea, or switch to Custom lyrics to control the title, lyrics and style.</p>
              <a href="/cookie" className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900">Manage Suno connection →</a>
            </div>
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <h2 className="font-semibold text-slate-900">Add Voice</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Open your Suno voice library to add or choose your saved voice profile. Your WHITYRAY profile is available there as Vwhity.</p>
              <a href="https://suno.com/voice/3d0ecb16-01fe-45e8-b8d5-7034308b2c85" target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800">Open Vwhity voice profile ↗</a>
              <p className="mt-3 text-xs leading-5 text-slate-500">Compatibility note: this preserved legacy OpenSuno generation endpoint currently sends no voice/persona selection. Choosing a profile here would not reliably apply it to generated tracks, so voice attachment remains in Suno until a supported legacy API field is confirmed.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-900">API access</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">The same backend is available to your own apps and AI tools.</p>
              <a href="/docs" className="mt-4 inline-flex text-sm font-semibold text-indigo-700 hover:text-indigo-900">Explore API docs →</a>
            </div>
          </aside>
        </div>
      </Section>

      {songs.length > 0 && (
        <Section className="mb-14">
          <h2 className="mb-5 text-2xl font-bold text-slate-900">Your tracks</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {songs.map((song) => (
              <article key={song.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-4 p-4">
                  {song.image_url ? <img src={song.image_url} alt="" className="h-24 w-24 rounded-xl object-cover" /> : <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-indigo-100 text-3xl">♫</div>}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-slate-900">{song.title || "Untitled track"}</h3>
                    <p className="mt-1 text-xs capitalize text-slate-500">Status: {song.status || "processing"}</p>
                    <p className="mt-2 break-all text-xs text-slate-400">ID: {song.id}</p>
                  </div>
                </div>
                {song.audio_url ? (
                  <div className="border-t border-slate-100 p-4">
                    <audio controls preload="none" src={song.audio_url} className="w-full" />
                    <a href={song.audio_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-indigo-700">Open audio file ↗</a>
                  </div>
                ) : <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">{song.error_message || "Suno is preparing this track. It will appear here when ready."}</div>}
              </article>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
