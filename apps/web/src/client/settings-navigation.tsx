import type { ReactNode } from "react";

export type SettingsSection = { id: string; label: string; icon: ReactNode };

export function SettingsNavigation({
  sections,
  label,
  selected,
  onSelect,
}: {
  sections: SettingsSection[];
  label: string;
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <nav className="section-navigation" aria-label={label}>
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={selected === section.id ? "true" : undefined}
          onClick={
            onSelect
              ? (event) => {
                  event.preventDefault();
                  onSelect(section.id);
                }
              : undefined
          }
        >
          {section.icon}
          {section.label}
        </a>
      ))}
    </nav>
  );
}
