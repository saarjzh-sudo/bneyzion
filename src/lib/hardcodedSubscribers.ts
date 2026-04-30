/**
 * hardcodedSubscribers.ts
 *
 * Interim solution (Option A) — hardcoded list of subscriber email addresses.
 * Used by useUserAccess as a fallback while the Supabase migration
 * (20260430_weekly_program_foundation.sql) is not yet applied.
 *
 * Once the migration is applied and user_access_tags is populated,
 * this list becomes irrelevant — the RPC `has_access_tag` takes precedence.
 *
 * To add a subscriber here (before DB migration): add their email to the list.
 * After DB migration: use the admin panel or import script instead.
 */

export const HARDCODED_SUBSCRIBERS: string[] = [
  "saar.j.z.h@gmail.com",
  // Add more pre-approved subscribers here until DB migration is applied
];

/**
 * Returns true if the given email is in the hardcoded subscriber list.
 * Case-insensitive.
 */
export function isHardcodedSubscriber(email: string | null | undefined): boolean {
  if (!email) return false;
  return HARDCODED_SUBSCRIBERS.includes(email.toLowerCase().trim());
}
