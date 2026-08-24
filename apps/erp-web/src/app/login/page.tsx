"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  EmployeeApiError,
  requestOtp,
  storeSession,
  verifyOtp,
} from "@/lib/employee-api";

export default function LoginPage() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault();
    if (mobileNumber.trim().length < 10) {
      setError("Enter a valid mobile number.");
      return;
    }
    setBusy(true);
    setError(null);
    setDebugCode(null);
    try {
      const challenge = await requestOtp(mobileNumber.trim());
      setChallengeId(challenge.challengeId);
      if (
        typeof challenge.debugCode === "string" &&
        challenge.debugCode.length > 0
      ) {
        setDebugCode(challenge.debugCode);
        setOtpCode(challenge.debugCode);
      }
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Could not reach the platform API. Is the backend running?",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (challengeId === null || !/^\d{6}$/.test(otpCode.trim())) {
      setError("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await verifyOtp(challengeId, otpCode.trim());
      storeSession(session);
      router.replace("/leads");
    } catch (cause) {
      setError(
        cause instanceof EmployeeApiError
          ? cause.message
          : "Verification failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const awaitingOtp = challengeId !== null;

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="brand-mark" aria-hidden="true">
          ME
        </span>
        <h1>Employee portal login</h1>
        <p className="auth-subtitle">
          {awaitingOtp
            ? "Enter the 6-digit code sent to your phone."
            : "Log in with your registered employee mobile number."}
        </p>

        <form onSubmit={awaitingOtp ? handleVerifyOtp : handleRequestOtp}>
          {!awaitingOtp ? (
            <label className="auth-field">
              Mobile number
              <input
                autoComplete="tel"
                inputMode="tel"
                name="mobileNumber"
                onChange={(event) => setMobileNumber(event.target.value)}
                placeholder="+91 90000 00001"
                type="tel"
                value={mobileNumber}
              />
            </label>
          ) : (
            <label className="auth-field">
              One-time code
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                name="otpCode"
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="000000"
                type="text"
                value={otpCode}
              />
            </label>
          )}

          {debugCode !== null ? (
            <p className="auth-debug-otp" role="status">
              Local development OTP: <strong>{debugCode}</strong>
            </p>
          ) : null}

          {error !== null ? <p className="auth-error">{error}</p> : null}

          <button className="auth-submit" disabled={busy} type="submit">
            {busy
              ? "Please wait…"
              : awaitingOtp
                ? "Verify and continue"
                : "Send code"}
          </button>

          {awaitingOtp ? (
            <button
              className="auth-secondary"
              disabled={busy}
              onClick={() => {
                setChallengeId(null);
                setOtpCode("");
                setDebugCode(null);
                setError(null);
              }}
              type="button"
            >
              Use a different number
            </button>
          ) : null}
        </form>

        <p className="auth-footnote">
          Access is limited to registered Mee Events employees. Every login is
          recorded in the audit history. Local seed: +919000000001.
        </p>
      </section>
    </main>
  );
}
