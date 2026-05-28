import type {
  CodeViewLineSelection,
  SelectedLineRange,
  SelectionSide,
} from "@pierre/diffs";

// URL hash format: #target=<id>&start=A12[&end=D9]  (A=additions, D=deletions)

export type LineHashTarget = {
  itemId: string;
  range: SelectedLineRange;
};

const POINT = /^([AD])(\d+)$/;

export function parseLineHash(hash: string): LineHashTarget | null {
  const params = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash
  );
  const itemId = params.get("target");
  if (itemId == null || itemId.length === 0) return null;

  const start = parsePoint(params.get("start"));
  if (start == null) return null;

  const endRaw = params.get("end");
  const end = endRaw == null ? start : parsePoint(endRaw);
  if (end == null) return null;

  return {
    itemId,
    range: {
      start: start.lineNumber,
      end: end.lineNumber,
      side: start.side,
      ...(start.side !== end.side ? { endSide: end.side } : {}),
    },
  };
}

export function formatLineHash(
  selection: CodeViewLineSelection
): string | null {
  if (selection.id.length === 0) return null;
  const { start, end, side, endSide } = selection.range;
  if (side == null || !validLine(start) || !validLine(end)) return null;
  const endActual = endSide ?? side;
  const parts = [
    `target=${encodeHashValue(selection.id)}`,
    `start=${formatPoint(start, side)}`,
  ];
  if (start !== end || side !== endActual) {
    parts.push(`end=${formatPoint(end, endActual)}`);
  }
  return `#${parts.join("&")}`;
}

export function replaceLocationHash(hash: string | null): void {
  const next = hash ?? "";
  if (window.location.hash === next) return;
  const { pathname, search } = window.location;
  window.history.replaceState(
    window.history.state,
    "",
    `${pathname}${search}${next}`
  );
}

type Point = { lineNumber: number; side: SelectionSide };

function parsePoint(value: string | null): Point | null {
  if (value == null) return null;
  const match = POINT.exec(value);
  if (match == null) return null;
  const side: SelectionSide = match[1] === "A" ? "additions" : "deletions";
  const lineNumber = Number.parseInt(match[2] as string, 10);
  return validLine(lineNumber) ? { lineNumber, side } : null;
}

function formatPoint(lineNumber: number, side: SelectionSide): string {
  return `${side === "deletions" ? "D" : "A"}${lineNumber}`;
}

function validLine(n: number): boolean {
  return Number.isSafeInteger(n) && n >= 1;
}

function encodeHashValue(value: string): string {
  return encodeURIComponent(value)
    .replaceAll("%2F", "/")
    .replaceAll("%3F", "?");
}
