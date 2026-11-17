"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase";

export default function SetStaffPasswordPage() {
  const [ready, setReady] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let active = true;
    let verificationFinished = false;
    const timeout = window.setTimeout(() => {
      if (active && !verificationFinished) {
        setVerificationError(
          "Password link verification is taking too long. Refresh the page or request a new link.",
        );
      }
    }, 10000);

    void (async () => {
      try {
        const auth = supabaseBrowser().auth;
        const { data, error: sessionError } = await auth.getSession();
        if (!active) return;
        if (sessionError) throw sessionError;
        let session = data.session;
        if (!session) {
          const hashParams = new URLSearchParams(window.location.hash.slice(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const linkType = hashParams.get("type");
          if (
            accessToken &&
            refreshToken &&
            (linkType === "recovery" || linkType === "invite")
          ) {
            const { data: sessionData, error: setSessionError } =
              await auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            if (setSessionError) throw setSessionError;
            session = sessionData.session;
            window.history.replaceState(
              null,
              document.title,
              `${window.location.pathname}${window.location.search}`,
            );
          }
        }
        if (!session) {
          verificationFinished = true;
          window.clearTimeout(timeout);
          setVerificationError(
            "This password link is invalid or expired. Return to staff login and request a new password reset link.",
          );
          return;
        }
        verificationFinished = true;
        window.clearTimeout(timeout);
        setReady(true);
        setVerificationError("");
      } catch (sessionError) {
        verificationFinished = true;
        window.clearTimeout(timeout);
        if (!active) return;
        console.error("Could not verify staff password link", sessionError);
        setVerificationError(
          "Could not verify this password link. Refresh the page or request a new link from staff login.",
        );
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      const { error: updateError } = await supabaseBrowser().auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      const { error: signOutError } = await supabaseBrowser().auth.signOut();
      if (signOutError) throw new Error(signOutError.message);
      setComplete(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not set your password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen app-bg-dark flex items-center justify-center px-4 py-10 text-stone-100">
      <div className="w-full max-w-md rounded-3xl border border-[#2B1810] bg-[#3A241A] p-6 shadow-2xl sm:p-8">
        <h1 className="font-serif text-2xl font-bold text-white">
          {complete ? "Password set" : "Set your staff password"}
        </h1>
        {complete ? (
          <>
            <p className="mt-3 text-sm text-stone-300">
              Your password has been updated. You can now sign in to the Staff Portal.
            </p>
            <Link
              href="/admin/login"
              className="mt-6 block rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-bold text-stone-950 hover:bg-amber-400"
            >
              Return to staff login
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            {!ready && (
              <div
                role={verificationError ? "alert" : "status"}
                className={`rounded-xl p-3 text-sm ${
                  verificationError
                    ? "border border-rose-700 bg-rose-950/60 text-rose-200"
                    : "text-stone-400"
                }`}
              >
                {verificationError || "Verifying secure link…"}
                {verificationError && (
                  <Link
                    href="/admin/login"
                    className="mt-2 block font-semibold text-amber-300 underline"
                  >
                    Return to staff login to request a new link
                  </Link>
                )}
              </div>
            )}
            {error && <p className="rounded-xl border border-rose-700 bg-rose-950/60 p-3 text-sm text-rose-200">{error}</p>}
            {ready && (
              <>
                <label className="block text-xs font-semibold text-stone-300">
                  New password
                  <input
                    type="password"
                    name="new-password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#2B1810] bg-[#38210F] px-4 py-3 text-base text-white outline-none focus:border-amber-500"
                  />
                </label>
                <label className="block text-xs font-semibold text-stone-300">
                  Confirm password
                  <input
                    type="password"
                    name="confirm-password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#2B1810] bg-[#38210F] px-4 py-3 text-base text-white outline-none focus:border-amber-500"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-stone-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Set password"}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
