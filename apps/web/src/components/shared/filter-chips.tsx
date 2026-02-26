"use client";

interface FilterOption {
  key: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  options: FilterOption[];
  active: string;
  onChange: (key: string) => void;
}

export function FilterChips({ options, active, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = opt.key === active;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200"
            style={{
              background: isActive ? "var(--primary-color)" : "var(--bg-card)",
              color: isActive ? "#ffffff" : "var(--text-secondary)",
              border: `1px solid ${isActive ? "var(--primary-color)" : "var(--glass-border)"}`,
            }}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]"
                style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : "var(--bg-tertiary)",
                  color: isActive ? "#ffffff" : "var(--text-muted)",
                }}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
