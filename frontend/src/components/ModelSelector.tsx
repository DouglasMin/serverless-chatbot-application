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
      <span className="inline-flex items-center rounded-md bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-300">
        {model?.name ?? value}
      </span>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as GptModelId)}
      className="rounded-lg border border-surface-700 bg-surface-850 px-3 py-1.5 text-sm text-white outline-none transition focus:border-primary-500"
    >
      {GPT_MODELS.map((model) => (
        <option key={model.id} value={model.id}>
          {model.name} — {model.description}
        </option>
      ))}
    </select>
  );
}
