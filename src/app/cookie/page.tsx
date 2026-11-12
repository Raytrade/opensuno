import Section from "../components/Section";

export default function ConnectPage() {
  return (
    <>
      <Section>
        <div className="my-8 rounded-2xl border bg-indigo-900/90 px-4 py-12 text-center text-white shadow-2xl lg:px-20">
          <span className="rounded-full border border-white/20 px-5 py-1 text-xs uppercase text-white/60">
            Secure account access
          </span>
          <h1 className="mt-3 text-4xl font-bold lg:text-5xl">Connect with Suno</h1>
          <p className="mt-3 text-white/75">
            Your password and account session must stay on Suno.
          </p>
        </div>
      </Section>
      <Section className="mb-12">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Sign in directly with Suno</h2>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Open the official Suno website and sign in there. This workspace does not collect,
            store, or proxy Suno passwords, browser cookies, JWTs, or private session tokens.
          </p>
          <a
            href="https://suno.com"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
          >
            Open official Suno ↗
          </a>
          <p className="mt-5 text-xs leading-5 text-amber-700">
            Never paste a Suno password, cookie, or session token into this app, GitHub, Vercel
            source files, or a chat. Use Suno's own account and security settings.
          </p>
        </div>
      </Section>
    </>
  );
}
