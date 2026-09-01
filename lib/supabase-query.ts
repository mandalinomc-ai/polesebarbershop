import type { PostgrestError } from "@supabase/supabase-js";

export const SUPABASE_PAGE_SIZE = 1000;

type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/** Load every row from a Supabase query, bypassing PostgREST max-rows (often 200 or 1000). */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: rows, error };
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  return { data: rows, error: null };
}
