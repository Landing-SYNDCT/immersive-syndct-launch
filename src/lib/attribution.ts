/**
 * Attribution capture — mirrors our `landing` app. URL params are captured into
 * slug-scoped sessionStorage on the event page, then read back at checkout so
 * they survive the tickets → checkout navigation (and multi-event tabs don't
 * collide). Kept in sessionStorage (not localStorage) so they don't outlive the tab.
 *
 *   ?promoter={code} → promoterCode-{slug} → checkout `promoter_code`
 *   ?link={code}     → salesLink-{slug}    → event fetch `link` (unlocks private stages)
 *   ?ref={code}      → referralCode-{slug} → checkout `referral_code`
 *   ?promo={code}    → promoCode-{slug}    → auto-applied promo code
 */

type Key = "promoterCode" | "salesLink" | "referralCode" | "promoCode";

const PARAM: Record<Key, string> = {
  promoterCode: "promoter",
  salesLink: "link",
  referralCode: "ref",
  promoCode: "promo",
};

function storageKey(key: Key, slug: string) {
  return `${key}-${slug}`;
}

/** Persist any attribution params present in the current URL for this event. */
export function captureAttribution(slug: string, search: URLSearchParams): void {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(PARAM) as Key[]) {
    const value = search.get(PARAM[key]);
    if (value) {
      try {
        sessionStorage.setItem(storageKey(key, slug), value);
      } catch {
        /* private mode */
      }
    }
  }
}

export function readAttribution(key: Key, slug: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(storageKey(key, slug));
  } catch {
    return null;
  }
}

export function clearAttribution(slug: string): void {
  if (typeof window === "undefined") return;
  for (const key of Object.keys(PARAM) as Key[]) {
    try {
      sessionStorage.removeItem(storageKey(key, slug));
    } catch {
      /* ignore */
    }
  }
}
