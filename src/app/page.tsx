import Link from "next/link";
import Section from "./components/Section";

export default function Home() {
  return (
    <>
      <Section>
        <div className="my-8 flex flex-col items-center justify-center gap-5 rounded-2xl border bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-5 py-16 text-center shadow-2xl lg:px-20">
          <span className="rounded-full border border-white/20 px-5 py-1 text-xs font-light uppercase text-white/60">
            Personal music workspace
          </span>
          <h1 className="text-6xl font-bold tracking-tight text-white/95 sm:text-7xl">OpenSuno</h1>
          <p className="max-w-2xl text-lg text-white/80">
            Shape your song ideas, keep your lyrics and prompts, then continue in your own
            official Suno account.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className="rounded-full bg-white px-7 py-3 text-sm font-bold text-indigo-950 transition hover:bg-indigo-100">
              Open My Studio →
            </Link>
            <a href="https://suno.com/create" target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/30 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Open Suno Create ↗
            </a>
          </div>
        </div>
      </Section>
      <Section className="my-10">
        <article className="prose max-w-3xl lg:prose-lg">
          <h2>Your ideas, your account</h2>
          <p>
            Use My Studio to write music descriptions, prepare original lyrics, copy prompts,
            and save drafts in this browser. When you are ready, continue on Suno and choose
            the voice, model, and generation options available to your account.
          </p>
          <h2>Account safety</h2>
          <p>
            Sign in only on the official Suno website. This workspace never asks for or stores
            your Suno password, session cookie, or private authentication token.
          </p>
          <h2>Generation status</h2>
          <p>
            Music generation happens on Suno. This workspace does not claim to generate,
            retrieve credits, or read private Suno account data through unsupported endpoints.
          </p>
        </article>
      </Section>
    </>
  );
}
