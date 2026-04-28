/**
 * Smoove client — adds donors to a marketing list after a successful donation.
 *
 * Fail-safe: if SMOOVE_API_KEY is missing, or the email is empty, or the
 * request itself fails, we log and return — never throw. The donation flow
 * must complete regardless of whether Smoove sync works.
 */

const SMOOVE_BASE = "https://rest.smoove.io/v1";

interface SubscribeArgs {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  listIds?: number[];
}

export async function subscribeToSmoove({
  email,
  firstName,
  lastName,
  phone,
  listIds,
}: SubscribeArgs): Promise<{ ok: boolean; reason?: string }> {
  const apiKey = process.env.SMOOVE_API_KEY;
  if (!apiKey) {
    console.log("[smoove] SMOOVE_API_KEY missing — skipping subscribe");
    return { ok: false, reason: "no-api-key" };
  }

  if (!email) {
    return { ok: false, reason: "no-email" };
  }

  const lists = listIds && listIds.length > 0
    ? listIds
    : (process.env.SMOOVE_DEFAULT_LIST_ID
        ? [Number(process.env.SMOOVE_DEFAULT_LIST_ID)]
        : []);

  const body: Record<string, unknown> = {
    Email: email.trim(),
    ...(firstName ? { FirstName: firstName.trim() } : {}),
    ...(lastName ? { LastName: lastName.trim() } : {}),
    ...(phone ? { CellPhone: phone.trim() } : {}),
    ...(lists.length > 0 ? { Lists_ToAdd_ById: lists } : {}),
  };

  try {
    const res = await fetch(`${SMOOVE_BASE}/Contacts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[smoove] subscribe failed: ${res.status} ${text.slice(0, 200)}`);
      return { ok: false, reason: `http-${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error("[smoove] subscribe threw:", err);
    return { ok: false, reason: "exception" };
  }
}

export function splitFullName(fullName: string | undefined | null): {
  firstName?: string;
  lastName?: string;
} {
  if (!fullName) return {};
  const trimmed = fullName.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
