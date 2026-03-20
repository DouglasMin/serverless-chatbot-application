import { useState } from "react";

interface Props {
  onSubmit: (key: string) => void;
}

export default function ApiKeySetup({ onSubmit }: Props) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!key.startsWith("sk-")) {
      setError("API key should start with 'sk-'");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) {
        setError("Invalid API key. Please check and try again.");
        return;
      }
      onSubmit(key);
    } catch {
      setError("Failed to validate key. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-dvh items-center justify-center bg-surface-950 p-4">
      <div
        className="w-full max-w-md rounded-3xl border border-surface-800/60 bg-surface-900/80 p-10 shadow-2xl backdrop-blur-sm"
        style={{ animation: "slide-up 0.5s ease-out both" }}
      >
        {/* Decorative accent line */}
        <div className="mb-8 h-1 w-10 rounded-full bg-primary-500" />

        <h1 className="mb-2 font-display text-3xl font-600 tracking-tight text-surface-100">
          Welcome
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-surface-400">
          Enter your OpenAI API key to get started.
          <br />
          <span className="text-surface-500">
            Stored locally in your browser, never on our servers.
          </span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-500 uppercase tracking-widest text-surface-500">
              API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-..."
              autoFocus
              className="w-full rounded-xl border border-surface-700/60 bg-surface-850 px-4 py-3.5 font-mono text-sm text-surface-100 placeholder-surface-600 outline-none transition-all duration-200 focus:border-primary-500/60 focus:ring-2 focus:ring-primary-500/15"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950/30 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !key}
            className="w-full rounded-xl bg-primary-600 px-4 py-3.5 text-sm font-600 text-white transition-all duration-200 hover:bg-primary-500 hover:shadow-lg hover:shadow-primary-600/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Validating..." : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}
