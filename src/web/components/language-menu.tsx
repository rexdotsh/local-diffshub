import type { SupportedLanguages } from "@pierre/diffs";
import { IconCheck, IconCode } from "@pierre/icons";
import { useMemo, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

const COMMON_LANGUAGES: readonly SupportedLanguages[] = [
  "text",
  "ansi",
  "bash",
  "c",
  "cpp",
  "csharp",
  "css",
  "dart",
  "diff",
  "dockerfile",
  "elixir",
  "go",
  "graphql",
  "haskell",
  "html",
  "ini",
  "java",
  "javascript",
  "json",
  "jsx",
  "kotlin",
  "lua",
  "markdown",
  "nix",
  "objective-c",
  "php",
  "powershell",
  "python",
  "ruby",
  "rust",
  "scala",
  "scss",
  "shellscript",
  "sql",
  "swift",
  "toml",
  "tsx",
  "typescript",
  "vue",
  "xml",
  "yaml",
  "zig",
];

type LanguageMenuProps = {
  fileName: string;
  language: SupportedLanguages | null;
  onClear(): void;
  onSelect(language: SupportedLanguages): void;
};

export function LanguageMenu({
  fileName,
  language,
  onClear,
  onSelect,
}: LanguageMenuProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return COMMON_LANGUAGES;
    const matches = COMMON_LANGUAGES.filter((l) =>
      l.toLowerCase().includes(needle)
    );
    return matches.length > 0 ? matches : [needle as SupportedLanguages];
  }, [query]);

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger
        aria-label={`Set language for ${fileName}`}
        className="inline-flex h-5 items-center gap-1 rounded-sm border border-border/60 bg-card/40 px-1.5 text-[10px] text-muted-foreground hover:bg-input/40 hover:text-foreground aria-expanded:bg-muted"
      >
        <IconCode aria-hidden className="size-2.5" />
        {language ?? "auto"}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="p-1">
          <Input
            autoFocus
            className="h-6 text-xs"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search languages…"
            value={query}
          />
        </div>
        <DropdownMenuItem className="justify-between gap-2" onClick={onClear}>
          <span>Auto-detect</span>
          {language == null && <IconCheck aria-hidden className="size-3" />}
        </DropdownMenuItem>
        <div className="max-h-72 overflow-y-auto">
          {filtered.map((lang) => (
            <DropdownMenuItem
              className="justify-between gap-2"
              key={lang}
              onClick={() => onSelect(lang)}
            >
              <span className="truncate">{lang}</span>
              {language === lang && (
                <IconCheck aria-hidden className="size-3" />
              )}
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
