// A plain text input for comma-separated tags that suggests existing tags
// from the library as the user types the current (last, unfinished) tag —
// tapping a suggestion completes it and moves on to the next.
import React, { useEffect, useMemo, useState } from "react";
import { getAllTags } from "../db/repository";

let tagCache: string[] | null = null;
let tagCachePromise: Promise<string[]> | null = null;

async function loadTags(): Promise<string[]> {
  if (tagCache) return tagCache;
  if (!tagCachePromise) tagCachePromise = getAllTags();
  tagCache = await tagCachePromise;
  return tagCache;
}

/** Call after a memory's tags change so the next TagInput sees fresh suggestions. */
export function invalidateTagCache() {
  tagCache = null;
  tagCachePromise = null;
}

export function TagInput({
  value,
  onChange,
  onBlur,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  onBlur?: () => void;
  placeholder?: string;
}) {
  const [allTags, setAllTags] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    loadTags().then(setAllTags);
  }, []);

  const parts = value.split(",");
  const current = parts[parts.length - 1].trim().toLowerCase();
  const already = new Set(
    parts.slice(0, -1).map((t) => t.trim().toLowerCase()).filter(Boolean)
  );

  const suggestions = useMemo(() => {
    if (!current) return [];
    return allTags
      .filter((t) => t.toLowerCase().includes(current) && !already.has(t.toLowerCase()))
      .slice(0, 5);
  }, [allTags, current, value]);

  function applySuggestion(tag: string) {
    const prefix = parts.slice(0, -1);
    const next = [...prefix, ` ${tag}`].join(",").replace(/^,\s*/, "");
    onChange(next.replace(/^,/, "").trim().length ? [...prefix.map((p) => p.trim()), tag].join(", ") + ", " : tag + ", ");
  }

  return (
    <div className="tag-suggest-wrap">
      <input
        className="field-input"
        placeholder={placeholder ?? "Tags (comma separated)"}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // slight delay so a suggestion tap registers before the list unmounts
          setTimeout(() => setFocused(false), 120);
          onBlur?.();
        }}
      />
      {focused && suggestions.length > 0 && (
        <div className="tag-suggest-list">
          {suggestions.map((tag) => (
            <div
              key={tag}
              className="tag-suggest-item"
              onMouseDown={(e: any) => {
                e.preventDefault();
                applySuggestion(tag);
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
