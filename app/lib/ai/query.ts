export interface QueryConstraints {
  /** Text to embed. Structured ratings are removed; everything else stays. */
  text: string;
  /** A title the prompt compares against, if one was named. */
  reference: string | null;
  /** Minimum IMDb score, 0 when absent. */
  minRating: number;
  kind?: "movie" | "series";
  decade?: number;
}

const RATING_PATTERNS = [
  /(?:^|\s)(?:at\s+least|minimum|min)\s*(\d(?:\.\d)?)\s*(?:(?:on|at|from)\s+)?imdb\b/i,
  /(?:^|\s)imdb\s*(\d(?:\.\d)?)\s*(?:or\s+(?:higher|better|more))\b/i,
  /(?:^|\s)(\d(?:\.\d)?)\s*(?:on|at)\s+imdb\b/i,
  /(?:^|\s)(\d(?:\.\d)?)\s*stars?\b/i,
  /(?:^|\s)imdb\s*(?:rating\s*)?(?:of\s*)?(\d(?:\.\d)?)\s*\+?(?=\s|$|[,.;])/i,
  /(?:^|\s)\+\s*(\d(?:\.\d)?)\s*(?:imdb|rating)\b/i,
  /(?:^|\s)(\d(?:\.\d)?)\s*\+?\s*(?:imdb|rating)\b/i,
  /(?:^|\s)(\d(?:\.\d)?)\s*\/\s*10\b/i,
  /(?:^|\s)(?:rating|rated)\s*(?:of\s*)?(\d(?:\.\d)?)\s*\+?/i,
];

const REFERENCE_PATTERNS = [
  /\b(?:similar to|same as|in the vein of|reminiscent of|reminds me of|something like|anything like|(?:a\s+)?(?:film|movie|series|show)s?\s+like)\s+(.+)/i,
  /^like\s+(.+)/i,
];

const REFERENCE_STOP =
  /\s+(?:but|with|that|which|where|who|about|starring|set in|and not|excluding|except)\b/i;

function clean(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+(?:and|but|or|with|from|at|on|of)\s*$/i, "")
    .replace(/^[\s,.;:!?\-]+|[\s,.;:!?\-]+$/g, "")
    .trim();
}

function extractRating(input: string): { text: string; minRating: number } {
  for (const pattern of RATING_PATTERNS) {
    const match = input.match(pattern);
    if (!match) continue;

    const value = Number(match[1]);
    if (!Number.isFinite(value) || value < 0 || value > 10) continue;

    return {
      text: clean(input.replace(match[0], " ")),
      minRating: Math.min(10, Math.max(0, value)),
    };
  }

  return { text: clean(input), minRating: 0 };
}

function extractReference(text: string): string | null {
  let match: RegExpMatchArray | null = null;
  for (const pattern of REFERENCE_PATTERNS) {
    match = text.match(pattern);
    if (match) break;
  }
  if (!match) return null;

  const raw = match[1].trim();
  const stop = raw.search(REFERENCE_STOP);
  const phrase = (stop >= 0 ? raw.slice(0, stop) : raw).trim();

  const cleaned = phrase
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim();

  if (!cleaned) return null;
  return cleaned.slice(0, 80).trim();
}

function extractKind(text: string): QueryConstraints["kind"] {
  if (/\b(?:tv\s+series|series|tv\s+show|sitcom)\b/i.test(text)) {
    return "series";
  }
  if (/\b(?:film|movie)\b/i.test(text)) {
    return "movie";
  }
  return undefined;
}

function extractDecade(text: string): number | undefined {
  const four = text.match(/\b(19\d{2}|20\d{2})['’]?s\b/i);
  if (four) return Number(four[1]);

  const two = text.match(/\b(\d{2})['’]?s\b/i);
  if (!two) return undefined;

  const value = Number(two[1]);
  return value >= 50 ? 1900 + value : 2000 + value;
}

export function parseQueryConstraints(input: string): QueryConstraints {
  const trimmed = input.trim();
  if (!trimmed) {
    return { text: "", reference: null, minRating: 0 };
  }

  const { text, minRating } = extractRating(trimmed);
  const semanticText = text.length >= 3 ? text : trimmed;

  return {
    text: semanticText,
    reference: extractReference(semanticText),
    minRating,
    kind: extractKind(semanticText),
    decade: extractDecade(semanticText),
  };
}
