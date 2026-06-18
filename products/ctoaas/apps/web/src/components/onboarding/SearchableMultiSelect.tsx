"use client";

import { useState, useRef, useEffect, useCallback, useId } from "react";
import { cn } from "@/lib/utils";

interface SearchableMultiSelectProps {
  label: string;
  options: readonly string[] | string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function SearchableMultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Search...",
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const inputId = `${id}-input`;
  const listboxId = `${id}-listbox`;

  const filteredOptions = query
    ? options.filter(
        (opt) =>
          opt.toLowerCase().includes(query.toLowerCase()) &&
          !selected.includes(opt)
      )
    : [];

  const handleSelect = useCallback(
    (option: string) => {
      onChange([...selected, option]);
      setQuery("");
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    },
    [selected, onChange]
  );

  const handleRemove = useCallback(
    (option: string) => {
      onChange(selected.filter((s) => s !== option));
    },
    [selected, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!isOpen || filteredOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredOptions[activeIndex]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((item) => (
            <span
              key={item}
              data-testid={`chip-${item}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                aria-label={`Remove ${item}`}
                className="ml-0.5 rounded-full hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 p-0.5"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        ref={inputRef}
        id={inputId}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={
          activeIndex >= 0
            ? `${id}-option-${activeIndex}`
            : undefined
        }
        aria-autocomplete="list"
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(e.target.value.length > 0);
          setActiveIndex(-1);
        }}
        onFocus={() => {
          if (query.length > 0) setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[48px]"
      />

      {/* Dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={`${label} options`}
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              className={cn(
                "px-3 py-2 cursor-pointer text-sm",
                activeIndex === index
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => handleSelect(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
