import StudioClient from "./studio-client";

export const metadata = {
  title: "Suno Studio | OpenSuno",
  description: "Personal music idea workspace for preparing prompts and lyrics for Suno Create.",
};

export default function StudioPage() {
  return <StudioClient />;
}
