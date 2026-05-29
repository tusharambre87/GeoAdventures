import { useState } from "react";

type ResubStatus = "idle" | "loading" | "success" | "error";

export default function GuideUnsubscribed() {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");
  const emailFromUrl = params.get("email") ?? "";

  const isSuccess = status === "success";
  const isInvalid = status === "invalid";

  const [resubStatus, setResubStatus] = useState<ResubStatus>("idle");

  const handleResubscribe = async () => {
    if (!emailFromUrl) return;
    setResubStatus("loading");
    try {
      const res = await fetch("/api/free-guide/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromUrl }),
      });
      if (res.ok) {
        setResubStatus("success");
      } else {
        setResubStatus("error");
      }
    } catch {
      setResubStatus("error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFAF6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 24 }}>
          {resubStatus === "success" ? "✓" : isSuccess ? "✓" : "✕"}
        </div>

        {resubStatus === "success" ? (
          <>
            <h1
              data-testid="text-unsubscribe-heading"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1C1917",
                marginBottom: 16,
              }}
            >
              You're back on the list.
            </h1>
            <p style={{ color: "#78716C", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              Welcome back — you'll receive the next email in the sequence shortly.
            </p>
          </>
        ) : isSuccess ? (
          <>
            <h1
              data-testid="text-unsubscribe-heading"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1C1917",
                marginBottom: 16,
              }}
            >
              You've been removed from the email sequence.
            </h1>
            <p style={{ color: "#78716C", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              No more drip emails from us. You'll keep your guide — that's yours to keep.
            </p>

            {emailFromUrl && (
              <div style={{ marginBottom: 32 }}>
                <p style={{ color: "#78716C", fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
                  Changed your mind? You can re-subscribe with one click.
                </p>
                <button
                  data-testid="button-resubscribe"
                  onClick={handleResubscribe}
                  disabled={resubStatus === "loading"}
                  style={{
                    display: "inline-block",
                    background: resubStatus === "error" ? "#DC2626" : "#E8541A",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 28px",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "Arial, sans-serif",
                    cursor: resubStatus === "loading" ? "not-allowed" : "pointer",
                    opacity: resubStatus === "loading" ? 0.7 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {resubStatus === "loading"
                    ? "Resubscribing…"
                    : resubStatus === "error"
                    ? "Something went wrong — try again"
                    : "Re-subscribe me"}
                </button>
              </div>
            )}

            <p style={{ color: "#78716C", fontSize: 14, lineHeight: 1.7 }}>
              If you ever want to plan a family trip, GeoAdventures is still here at{" "}
              <a
                href="https://geoquestgame.live/geoadventures"
                style={{ color: "#E8541A", textDecoration: "none", fontWeight: 700 }}
              >
                geoquestgame.live
              </a>
              .
            </p>
          </>
        ) : isInvalid ? (
          <>
            <h1
              data-testid="text-unsubscribe-heading"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1C1917",
                marginBottom: 16,
              }}
            >
              This link isn't valid.
            </h1>
            <p style={{ color: "#78716C", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              The unsubscribe link may have expired or already been used. If you'd like to stop receiving emails, reply to any email in the sequence with "unsubscribe" and we'll handle it right away.
            </p>
          </>
        ) : (
          <>
            <h1
              data-testid="text-unsubscribe-heading"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1C1917",
                marginBottom: 16,
              }}
            >
              Something went wrong.
            </h1>
            <p style={{ color: "#78716C", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
              We couldn't process your request. Please reply to any email in the sequence with "unsubscribe" and we'll sort it out.
            </p>
          </>
        )}

        <a
          href="/free-guide"
          data-testid="link-back-to-guide"
          style={{
            display: "inline-block",
            marginTop: 24,
            color: "#A8A29E",
            fontSize: 13,
            textDecoration: "underline",
            fontFamily: "Arial, sans-serif",
          }}
        >
          ← Back to the guide page
        </a>
      </div>
    </div>
  );
}
