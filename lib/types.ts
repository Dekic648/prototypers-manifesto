export type SuggestionKind = "edit" | "new_principle";
export type SuggestionStatus = "pending" | "approved" | "rejected";

export type Suggestion = {
  id: string;
  kind: SuggestionKind;
  status: SuggestionStatus;
  /** Null for `new_principle`. Matches a slug in the PRINCIPLES array. */
  principle_id: string | null;
  /** Null for `new_principle`. The principle's wording when the suggestion was made. */
  original_text: string | null;
  proposed_text: string;
  rationale: string | null;
  author_id: string;
  /** Null for email sign-ups. Always render a fallback. */
  author_github_login: string | null;
  /** Null for email sign-ups. Always render a fallback. */
  author_avatar_url: string | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
};

/** What the user typed, before it becomes a row. Survives the OAuth redirect. */
export type SuggestionDraft = {
  kind: SuggestionKind;
  principleId: string | null;
  originalText: string | null;
  proposedText: string;
  rationale: string;
  /** True when they pressed Submit while signed out — resume by submitting. */
  submitOnReturn?: boolean;
};

export const MAX_PROPOSED_TEXT = 500;
export const MAX_RATIONALE = 1000;
