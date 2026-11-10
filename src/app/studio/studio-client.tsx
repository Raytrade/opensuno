"use client";

import { useEffect, useMemo, useState } from "react";

type Draft = { id: string; title: string; prompt: string; style: string; lyrics: string; createdAt: string };

const starter = [
  { title: "Afro-fusion", prompt: "Warm, melodic Afro-fusion with organic percussion, deep bass, intimate vocals and a memorable chorus.", style: "Afro-fusion, Afrobeats, soulful, melodic" },
  { title: "Afro-R&B", prompt: "Smooth Afro-R&B with soft guitar, airy keys, gentle groove and emotional lead vocals.", style: "Afro-R&B, mellow, romantic, soulful" },
  { title: "Amapiano", prompt: "Danceable Amapiano groove with log drums, bright keys, rolling percussion and catchy vocal phrases.", style: "Amapiano, log drums, dance, upbeat" },
];

export default function StudioClient() {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try { setDrafts(JSON.parse(localStorage.getItem("opensuno-studio-drafts") || "[]")); } catch { setDrafts([]); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("opensuno-studio-drafts", JSON.stringify(drafts));
  }, [drafts, ready]);

  const promptText = useMemo(() => [prompt.trim(), style.trim() ? "Style: " + style.trim() : "", lyrics.trim() ? "Lyrics:\n" + lyrics.trim() : ""].filter(Boolean).join("\n\n"), [prompt, style, lyrics]);

  function saveDraft() {
    const draft: Draft = { id: crypto.randomUUID(), title: title.trim() || "Untitled idea", prompt, style, lyrics, createdAt: new Date().toISOString() };
    setDrafts(current => [draft, ...current]);
    setNotice("Draft saved on this device.");
  }
  function copyPrompt() {
    if (!promptText) { setNotice("Add a description or lyrics first."); return; }
    navigator.clipboard.writeText(promptText).then(() => setNotice("Prompt copied. Paste it into Suno Create."));
  }
  function loadDraft(d: Draft) {
    setTitle(d.title); setPrompt(d.prompt); setStyle(d.style); setLyrics(d.lyrics); setNotice("Draft loaded.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="min-h-screen w-full bg-[#080b12] px-4 py-8 text-white sm:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-[.35em] text-violet-300">Personal workspace</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Suno Studio<span className="text-violet-400">.</span></h1><p className="mt-2 max-w-xl text-sm text-slate-400">Prepare ideas, keep your drafts, then continue securely in your own Suno account.</p></div>
        <a href="https://suno.com/create" target="_blank" rel="noreferrer" className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-950/50 hover:bg-violet-400">Open Suno Create ↗</a>
      </div>
      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-widest text-slate-500">Account connection</p><p className="mt-2 font-semibold text-amber-300">Use Suno sign-in</p><p className="mt-1 text-xs text-slate-400">Your session stays on Suno. This app never asks for your password or session cookie.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-widest text-slate-500">Saved ideas</p><p className="mt-2 text-2xl font-bold">{drafts.length}</p><p className="mt-1 text-xs text-slate-400">Stored locally in this browser.</p></div>
        <div className="rounded-2xl border border-white/10 bg-white/[.04] p-4"><p className="text-xs uppercase tracking-widest text-slate-500">Integration status</p><p className="mt-2 font-semibold text-emerald-300">Workspace ready</p><p className="mt-1 text-xs text-slate-400">Direct generation requires an officially supported Suno integration.</p></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
        <section className="rounded-3xl border border-white/10 bg-[#111723] p-5 sm:p-7">
          <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-bold">Create an idea</h2><p className="mt-1 text-xs text-slate-400">Build a prompt and take it into Suno.</p></div><span className="rounded-full border border-violet-400/30 px-3 py-1 text-[10px] uppercase tracking-widest text-violet-300">Draft mode</span></div>
          <label className="mb-2 block text-xs font-semibold text-slate-300">Track title</label><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Give your idea a name" className="mb-5 w-full rounded-xl border border-white/10 bg-[#090e17] px-4 py-3 text-sm outline-none focus:border-violet-400"/>
          <label className="mb-2 block text-xs font-semibold text-slate-300">Music description</label><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} rows={5} placeholder="Describe the sound, mood, instruments, groove, vocal character and emotion..." className="mb-5 w-full resize-y rounded-xl border border-white/10 bg-[#090e17] px-4 py-3 text-sm leading-6 outline-none focus:border-violet-400"/>
          <label className="mb-2 block text-xs font-semibold text-slate-300">Style tags</label><input value={style} onChange={e=>setStyle(e.target.value)} placeholder="Afro-fusion, soulful, melodic, 108 BPM..." className="mb-5 w-full rounded-xl border border-white/10 bg-[#090e17] px-4 py-3 text-sm outline-none focus:border-violet-400"/>
          <label className="mb-2 block text-xs font-semibold text-slate-300">Lyrics (optional)</label><textarea value={lyrics} onChange={e=>setLyrics(e.target.value)} rows={7} placeholder="Paste your original lyrics here..." className="mb-5 w-full resize-y rounded-xl border border-white/10 bg-[#090e17] px-4 py-3 text-sm leading-6 outline-none focus:border-violet-400"/>
          <div className="flex flex-wrap gap-3"><button onClick={saveDraft} className="rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold hover:bg-white/10">Save draft</button><button onClick={copyPrompt} className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-bold hover:bg-violet-400">Copy prompt</button><a href="https://suno.com/create" target="_blank" rel="noreferrer" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-slate-200">Continue in Suno ↗</a></div>
          {notice && <p role="status" className="mt-4 text-xs text-emerald-300">{notice}</p>}
        </section>
        <aside className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-[#111723] p-5"><h2 className="font-bold">Quick-start styles</h2><p className="mb-4 mt-1 text-xs text-slate-400">Load a starting point into your editor.</p><div className="space-y-2">{starter.map(s=><button key={s.title} onClick={()=>{setPrompt(s.prompt);setStyle(s.style);setNotice(s.title+" starter loaded.");}} className="w-full rounded-xl border border-white/10 bg-white/[.03] p-3 text-left hover:border-violet-400/50"><span className="block text-sm font-semibold">{s.title}</span><span className="mt-1 block text-xs text-slate-400">{s.style}</span></button>)}</div></section>
          <section className="rounded-3xl border border-white/10 bg-[#111723] p-5"><h2 className="font-bold">Your saved drafts</h2><p className="mb-4 mt-1 text-xs text-slate-400">Only available in this browser on this device.</p>{drafts.length===0?<p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-slate-500">No drafts saved yet.</p>:<div className="space-y-2">{drafts.map(d=><div key={d.id} className="flex items-center gap-2 rounded-xl border border-white/10 p-3"><button onClick={()=>loadDraft(d)} className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{d.title}</span><span className="text-[10px] text-slate-500">{new Date(d.createdAt).toLocaleString()}</span></button><button aria-label="Delete draft" onClick={()=>setDrafts(ds=>ds.filter(x=>x.id!==d.id))} className="rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-400/10">Delete</button></div>)}</div>}</section>
          <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[.06] p-4"><p className="text-xs font-bold text-amber-200">Security note</p><p className="mt-2 text-xs leading-5 text-slate-300">Never put Suno passwords, browser cookies, Clerk tokens or session values in GitHub files, prompts, or public deployments. Sign in only on the official Suno website.</p></section>
        </aside>
      </div>
    </div>
  </div>;
}
