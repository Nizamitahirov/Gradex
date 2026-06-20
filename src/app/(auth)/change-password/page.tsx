"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertCircle, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { GradexMark } from "@/components/logo";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px 11px 40px",
  borderRadius: 12,
  border: "1.5px solid var(--border)",
  fontSize: 14,
  fontWeight: 500,
  fontFamily: "var(--font-montserrat), sans-serif",
  outline: "none",
  boxSizing: "border-box",
  color: "var(--foreground)",
  background: "var(--card)",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  color: "var(--muted-foreground)",
  marginBottom: 7,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
};

export default function ChangePasswordPage() {
  const { user, loading: authLoading, refresh } = useAuth();
  const router = useRouter();

  const forced = user?.mustChangePassword === true;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await refresh();
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--background)" }}>
        <Loader2 size={32} style={{ color: "var(--primary)", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .cp-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 3px var(--primary-soft) !important; }
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, background: "var(--background)" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ borderRadius: 24, padding: "36px 32px 32px", background: "var(--card)", border: "1px solid var(--border)", boxShadow: "0 24px 64px rgba(15,17,41,0.14), 0 4px 16px rgba(15,17,41,0.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26, textAlign: "center" }}>
              <GradexMark className="mb-3.5" style={{ width: 48, height: 48 }} />
              <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--foreground)", letterSpacing: "-0.02em", margin: 0 }}>
                {forced ? "Set a new password" : "Change password"}
              </h1>
              <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginTop: 6 }}>
                {forced
                  ? "Your account uses a temporary password. Choose a new one to continue."
                  : "Update the password you use to sign in."}
              </p>
            </div>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!forced && (
                <div>
                  <label style={LABEL_STYLE}>Current password</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                    <input type={show ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" className="cp-input" style={INPUT_STYLE} />
                  </div>
                </div>
              )}
              <div>
                <label style={LABEL_STYLE}>New password</label>
                <div style={{ position: "relative" }}>
                  <ShieldCheck size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input type={show ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" className="cp-input" style={{ ...INPUT_STYLE, paddingRight: 44 }} />
                  <button type="button" onClick={() => setShow((v) => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: 4, display: "flex" }}>
                    {show ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Confirm new password</label>
                <div style={{ position: "relative" }}>
                  <ShieldCheck size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
                  <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" className="cp-input" style={INPUT_STYLE} />
                </div>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#EF4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !next || !confirm}
                style={{
                  width: "100%", padding: "12px 20px", borderRadius: 12,
                  background: loading || !next || !confirm ? "var(--secondary)" : "linear-gradient(135deg, #5B5BF5 0%, #8B5CF6 100%)",
                  color: loading || !next || !confirm ? "var(--muted-foreground)" : "#fff",
                  border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  fontFamily: "var(--font-montserrat), sans-serif", marginTop: 4,
                }}
              >
                {loading ? <><Loader2 size={15} style={{ animation: "spin .8s linear infinite" }} /> Saving…</> : "Update password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
