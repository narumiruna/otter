import { ChevronDownIcon } from "@radix-ui/react-icons";
import { TextField } from "@radix-ui/themes";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };

export function AiCombobox({
  disabled,
  id,
  label,
  noResults,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled: boolean;
  id: string;
  label: string;
  noResults: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder: string;
  value: string;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.id === value);
  const filtered = options.filter((option) =>
    `${option.name} ${option.id}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const expanded = open && !disabled;
  const active = filtered[activeIndex];

  useEffect(() => {
    if (expanded) {
      listRef.current?.children[activeIndex]?.scrollIntoView?.({
        block: "nearest",
      });
    }
  }, [expanded, activeIndex]);

  function choose(option: Option) {
    onChange(option.id);
    setOpen(false);
    setQuery("");
  }

  function showOptions() {
    setQuery("");
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((option) => option.id === value),
      ),
    );
    setOpen(true);
  }

  return (
    <div className="ai-combobox">
      <label htmlFor={id}>{label}</label>
      <Input
        id={id}
        role="combobox"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={
          expanded && active ? `${listId}-${activeIndex}` : undefined
        }
        disabled={disabled}
        placeholder={placeholder}
        value={expanded ? query : (selected?.name ?? value)}
        onFocus={showOptions}
        onClick={() => {
          if (!open) showOptions();
        }}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (!expanded) {
              showOptions();
            } else {
              const direction = event.key === "ArrowDown" ? 1 : -1;
              setActiveIndex((index) =>
                Math.max(0, Math.min(filtered.length - 1, index + direction)),
              );
            }
          } else if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            if (expanded && active) choose(active);
          } else if (expanded && event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === "Tab") {
            setOpen(false);
          }
        }}
      >
        <TextField.Slot side="right" className="ai-combobox-indicator">
          <ChevronDownIcon aria-hidden="true" />
        </TextField.Slot>
      </Input>
      {expanded ? (
        <div className="ai-combobox-popup">
          <div id={listId} role="listbox" aria-label={label} ref={listRef}>
            {filtered.map((option, index) => (
              <div
                id={`${listId}-${index}`}
                key={option.id}
                role="option"
                tabIndex={-1}
                aria-selected={value === option.id}
                aria-label={
                  option.name === option.id
                    ? option.name
                    : `${option.name} ${option.id}`
                }
                data-active={index === activeIndex}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    choose(option);
                  }
                }}
              >
                <span>{option.name}</span>
                {option.name !== option.id ? <small>{option.id}</small> : null}
              </div>
            ))}
          </div>
          {filtered.length === 0 ? <p role="status">{noResults}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
