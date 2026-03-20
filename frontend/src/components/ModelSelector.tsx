import { GPT_MODELS, type GptModelId } from "@chatbot/shared";

interface Props {
  value: GptModelId;
  onChange: (model: GptModelId) => void;
  disabled?: boolean;
}

export default function ModelSelector({ value, onChange, disabled }: Props) {
  if (disabled) {
    const model = GPT_MODELS.find((m) => m.id === value);
    return (
      <span className="inline-flex items-center rounded-lg bg-surface-800/60 px-2.5 py-1 font-mono text-[11px] font-500 text-surface-400">
        {model?.name ?? value}
      </span>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as GptModelId)}
      className="rounded-lg border border-surface-700/50 bg-surface-850 px-3 py-1.5 text-sm text-surface-200 outline-none transition-colors duration-150 focus:border-primary-500/50"
    >
      {GPT_MODELS.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name}
        </option>
      ))}
    </select>
  );
}
