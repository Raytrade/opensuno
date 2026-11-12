import Link from "next/link";
import Section from "../components/Section";

export default function Docs() {
  return (
    <Section className="my-10">
      <article className="prose max-w-3xl lg:prose-lg">
        <h1 className="text-center text-indigo-900">OpenSuno Workspace Guide</h1>
        <p>
          OpenSuno is currently a personal songwriting workspace. It helps you prepare
          music descriptions, original lyrics, and prompts, then continue in your own
          official Suno account.
        </p>
        <h2>What this website currently supports</h2>
        <ul>
          <li>Preparing and editing music prompts.</li>
          <li>Adding style tags and original lyrics.</li>
          <li>Copying a combined prompt for use in Suno.</li>
          <li>Saving and reopening drafts in the current browser on this device.</li>
        </ul>
        <h2>Music generation</h2>
        <p>
          Generation, voice selection, credits, and account management take place on
          Suno. This website does not provide unsupported private API access or claim
          to generate tracks itself.
        </p>
        <p>
          <Link href="/studio">Open My Studio</Link>{" "}
          or{" "}
          <a href="https://suno.com/create" target="_blank" rel="noopener noreferrer">
            continue to official Suno Create
          </a>.
        </p>
        <h2>Account security</h2>
        <p>
          Sign in only on the official Suno website. Never share your password,
          browser cookie, JWT, or session token with this workspace.
        </p>
      </article>
    </Section>
  );
}
