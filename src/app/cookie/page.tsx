"use client";

import { useCallback, useEffect, useState } from "react";
import Section from "../components/Section";

type CookieStatus = {
  has_cookie: boolean;
  has_session_token: boolean;
  has_client_id: boolean;
  message: string;
};

type VerifyResult = {
  success: boolean;
  error?: string;
  data?: { credits_left: number; monthly_limit: number };
};

export default function CookiePage() {
  const [status, setStatus] = useState<CookieStatus | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/cookie", { cache: "no-store" });
      const data = await response.json();
      setStatus(data);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  async function verifyCookie() {
    setLoading(true);
    setVerifyResult(null);
    try {
      const response = await fetch("/api/get_limit", { cache: "no-store" });
      const data = await response.json();
      if (response.ok && data.credits_left !== undefined) {
        setVerifyResult({ success: true, data });
      } else {
        setVerifyResult({ success: false, error: data.error || "Suno did not accept the configured session." });
      }
    } catch (error) {
      setVerifyResult({ success: false, error: String(error) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Section>
        <div className="my-8 rounded-2xl border bg-indigo-900/90 px-4 py-12 text-center text-white shadow-2xl lg:px-20">
          <span className="rounded-full border border-white/20 px-5 py-1 text-xs uppercase text-white/60">
            Account connection
          </span>
          <h1 className="mt-3 text-4xl font-bold lg:text-5xl">Suno Authentication</h1>
          <p className="mt-3 text-white/75">
            Connect your own Suno account securely to this hosted OpenSuno instance.
          </p>
        </div>
      </Section>

      <Section className="mb-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-800">Connection status</h2>
            <button onClick={() => void checkStatus()} className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
              Refresh status
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${status?.has_cookie ? "bg-green-500" : "bg-amber-400"}`} />
            <span className="text-gray-700">
              {status ? (status.has_cookie ? "SUNO_COOKIE is configured" : "Suno account is not connected yet") : "Checking configuration…"}
            </span>
          </div>

          {status?.has_cookie && (
            <div className="mt-3 space-y-1 pl-6 text-sm text-gray-600">
              <p>JWT session: {status.has_session_token ? "Detected" : "Not detected"}</p>
              <p>Clerk client: {status.has_client_id ? "Detected" : "Not detected"}</p>
            </div>
          )}

          {status?.has_cookie && (
            <div className="mt-5 border-t pt-5">
              <button onClick={() => void verifyCookie()} disabled={loading} className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                {loading ? "Checking Suno…" : "Verify Suno connection"}
              </button>
              {verifyResult && (
                <div className={`mt-4 rounded-lg border p-4 text-sm ${verifyResult.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                  {verifyResult.success
                    ? `Connected. Credits remaining: ${verifyResult.data?.credits_left} / ${verifyResult.data?.monthly_limit}.`
                    : `Connection check failed: ${verifyResult.error}`}
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {!status?.has_cookie && (
        <Section className="mb-12">
          <div className="rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800">Connect your Suno account</h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              This website is hosted on Vercel. For security, it does not collect or store your Suno password, browser cookie, or JWT token in this public page.
            </p>

            <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-700">
              <li>Open Suno in your own browser and sign in to your account.</li>
              <li>In Vercel, open this project’s <strong>Settings → Environment Variables</strong>.</li>
              <li>Add a variable named <code className="rounded bg-gray-100 px-1.5 py-0.5">SUNO_COOKIE</code>.</li>
              <li>Paste your Suno cookie value into the Vercel value field. Keep it private; do not paste it into this page or a chat.</li>
              <li>Save it for the <strong>Production</strong> environment, then redeploy the project.</li>
              <li>Return here and press <strong>Refresh status</strong>, then verify the connection.</li>
            </ol>

            <a
              href="https://vercel.com/raypop/opensuno/settings/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700"
            >
              Open Vercel Environment Variables
            </a>

            <p className="mt-4 text-xs leading-5 text-amber-700">
              Suno session tokens expire. If the connection later stops working, update SUNO_COOKIE in Vercel and redeploy. Music generation also depends on your Suno account access, available credits, and Suno’s current authentication or CAPTCHA checks.
            </p>
          </div>
        </Section>
      )}
    </>
  );
}
