import type { BaseQueryFn } from "@reduxjs/toolkit/query"
import { PostgrestError } from "@supabase/supabase-js";

const _NEVER = /* @__PURE__ */ Symbol()
export type NEVER = typeof _NEVER

/**
 * Creates a "fake" baseQuery to be used if your api *only* uses the `queryFn` definition syntax.
 * This also allows you to specify a specific error type to be shared by all your `queryFn` definitions.
 */
export const supabaseBaseQuery = (): BaseQueryFn<
  void,
  NEVER,
  PostgrestError,
  {}
> => {
  return function () {
    throw new Error(
      'When using `supabaseBaseQuery`, all queries & mutations must use the `queryFn` definition syntax.',
    )
  }
}
