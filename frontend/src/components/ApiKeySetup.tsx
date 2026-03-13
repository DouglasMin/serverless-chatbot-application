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
      <div className="w-full max-w-md rounded-2xl bg-surface-900 p-8 shadow-2xl">
        <h1 className="mb-2 text-2xl font-semibold text-white">Welcome</h1>
        <p className="mb-6 text-sm text-surface-300">
          Enter your OpenAI API key to get started. Your key is stored locally
          and never saved on our servers.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-surface-700 bg-surface-850 px-4 py-3 text-sm text-white placeholder-surface-500 outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Validating..." : "Get Started"}
          </button>
        </form>
      </div>
    </div>
  );
}
