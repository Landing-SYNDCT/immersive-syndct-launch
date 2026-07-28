/**
 * UnderPass public API client.
 *
 * Immersive is hosted by UnderPass but is a standalone app — it can't import the
 * platform SDK, so this is a thin typed wrapper over the public HTTP API
 * (https://docs.underpass.com.co). All endpoints are unauthenticated; responses
 * are wrapped in a `{ data }` envelope which `request()` unwraps.
 *
 * The checkout mirrors our own `landing` app: tap-to-add cart keyed by a
 * composite `availabilityId` (ticketType × sellingStage), promo codes, private
 * sales links, promoter/referral attribution, and split-payment installments.
 * Unlike `landing` (which proxies through Next server actions), Immersive calls
 * the API straight from the browser — so the API sees the real client IP and we
 * don't need to forward it.
 */

// Build-time config. VITE_ vars are inlined into the client bundle — these are
// public values (the SYNDCT organizer id + the public API host), safe to expose.
export const UNDERPASS_API_BASE =
  import.meta.env.VITE_UNDERPASS_API_BASE ?? "https://api.underpass.com.co/api";

// SYNDCT's organizer account id — required to list their published events.
// Overridable via VITE_UNDERPASS_ACCOUNT_ID in the repo/CI env.
export const UNDERPASS_ACCOUNT_ID =
  import.meta.env.VITE_UNDERPASS_ACCOUNT_ID ?? "1dc00aaf-2c5b-461f-a37f-7d0a0a1444cd";

// ---------------------------------------------------------------------------
// Raw API types (subset of the OpenAPI spec — only fields we use).
// ---------------------------------------------------------------------------

export type EventMedia = {
  id: string;
  type: "IMAGE" | "VIDEO";
  url: string;
  is_primary: boolean;
  is_secondary: boolean;
  position: number | null;
};

export type PixelIntegration = {
  meta_pixel_id: string | null; // single id or comma-separated
  tiktok_pixel_id: string | null;
};

type RawLocality = { id: string; name: string; description: string | null };
type RawTicketType = {
  id: string;
  name: string;
  description: string | null;
  group_size: number;
  max_per_order: number | null;
  entry_cutoff: string | null;
  min_consumption: number | null;
  locality?: RawLocality | null;
};
type RawStagePricing = {
  id: string;
  selling_stage_id: string;
  ticket_type_id: string;
  price: string; // integer COP units, no decimals
  currency: "COP";
  is_courtesy: boolean;
  visibility: "PUBLIC" | "PRIVATE";
};
type RawAvailability = {
  ticketType: RawTicketType;
  sellingStage: { id: string; name: string };
  available: number;
  maxQuantity: number | null;
  stagePricing: RawStagePricing;
};

export type EventSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ONGOING" | "COMPLETED";
  start_date: string;
  end_date: string;
  location?: { venue: string; city: string; state: string } | null;
  media?: EventMedia[];
};

type RawEventDetail = EventSummary & {
  account_id: string;
  organizer_terms_url?: string | null;
  show_exact_availability?: boolean;
  allows_split_payment?: boolean;
  min_initial_payment_pct?: number;
  max_payment_count?: number;
  require_individual_data?: boolean;
  ticket_commission_rate?: number | string | null;
  organizer?: { collective: string };
  ticketAvailability?: RawAvailability[];
  pixelIntegration?: PixelIntegration | null;
};

// ---------------------------------------------------------------------------
// Flattened model the UI works with (mirrors landing's getEventWithDetails).
// ---------------------------------------------------------------------------

/** One purchasable line = a ticket type within a selling stage. */
export type Ticket = {
  availabilityId: string; // `${ticketTypeId}-${sellingStageId}`
  ticketTypeId: string;
  sellingStageId: string;
  name: string;
  description: string | null;
  price: number;
  available: number;
  maxPerOrder: number | null;
  groupSize: number;
  entryCutoff: string | null;
  minConsumption: number | null;
  sellingStageName: string;
  localityName: string;
  localityDescription: string | null;
  isCourtesy: boolean;
};

export type EventDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  start_date: string;
  end_date: string;
  location?: { venue: string; city: string; state: string } | null;
  media?: EventMedia[];
  organizerTermsUrl: string | null;
  showExactAvailability: boolean;
  allowsSplitPayment: boolean;
  minInitialPaymentPct: number;
  maxPaymentCount: number;
  ticketCommissionRate: number;
  pixelIntegration?: PixelIntegration | null;
  tickets: Ticket[];
};

export type DocumentType = "CC" | "NIT" | "CE" | "PASSPORT";

export type CheckoutItem = {
  ticket_type_id: string;
  selling_stage_id: string;
  quantity: number;
  discount_code?: string;
};

export type CheckoutCustomer = {
  email: string;
  name: string;
  phone?: string;
  document_type: DocumentType;
  document_number: string;
};

export type StartCheckoutInput = {
  event_id: string;
  items: CheckoutItem[];
  customer: CheckoutCustomer;
  accept_terms: boolean;
  success_url?: string;
  cancel_url?: string;
  installment_count?: number;
  promo_code?: string;
  promoter_code?: string;
  referral_code?: string;
  tracking?: { fbc?: string; fbp?: string; client_user_agent?: string };
};

export type CheckoutResponse = {
  order_id: string;
  checkout_session_id?: string | null;
  payment_provider: "bold" | "FREE";
  redirect_url: string;
  total_amount: number;
  currency: string;
  expires_at?: string | null;
};

export type OrderStatus = "PENDING" | "CONFIRMED" | "EXPIRED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export type CheckoutStatus = {
  order_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_amount: number;
  paid_amount: number;
  currency: string;
  tickets: string[];
};

// Promo-code validation (mirrors landing's ValidatePromoCodeResponse).
export type PromoEffect = {
  effect_type:
    | "PERCENTAGE_DISCOUNT"
    | "FIXED_AMOUNT_DISCOUNT"
    | "OVERRIDE_PRICE"
    | "UNLOCK_STAGE"
    | "QUANTITY_LIMIT";
  discount_value?: number;
  override_price?: number;
  quantity_limit?: number;
  ticket_type_id?: string | null;
};
export type ValidatePromoCodeResponse = {
  valid: boolean;
  error_message?: string | null;
  promo_code?: { id: string; code: string } | null;
  effects?: PromoEffect[];
  unlocked_stages?: string[];
  unlocked_pricings?: { selling_stage_id: string; ticket_type_id?: string | null }[];
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class UnderpassError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UnderpassError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${UNDERPASS_API_BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (body && (body.message || body.error)) || `Request failed (${res.status})`;
    throw new UnderpassError(Array.isArray(message) ? message.join(", ") : message, res.status);
  }
  return (body?.data ?? body) as T;
}

export function listPublicEvents(accountId = UNDERPASS_ACCOUNT_ID) {
  return request<{ events: EventSummary[] }>(
    `/events/public?account_id=${encodeURIComponent(accountId)}&limit=50`,
  ).then((r) => r.events ?? []);
}

/**
 * Fetch a single event and flatten `ticketAvailability` into `tickets[]`.
 * `link` (private sales-link code) and `unlockedStages` widen what the backend
 * returns — the API is authoritative on visibility, so we render whatever it
 * hands back (no client-side PUBLIC/PRIVATE filtering).
 */
export async function getEventWithDetails(
  slug: string,
  link?: string,
  unlockedStages?: string[],
): Promise<EventDetail> {
  const qs = new URLSearchParams();
  if (link) qs.set("link", link);
  if (unlockedStages?.length) qs.set("unlocked_stages", unlockedStages.join(","));
  const query = qs.toString();
  const raw = await request<RawEventDetail>(
    `/events/public/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`,
  );

  const tickets: Ticket[] = (raw.ticketAvailability ?? []).map((a) => ({
    availabilityId: `${a.stagePricing.ticket_type_id}-${a.stagePricing.selling_stage_id}`,
    ticketTypeId: a.stagePricing.ticket_type_id,
    sellingStageId: a.stagePricing.selling_stage_id,
    name: a.ticketType.name,
    description: a.ticketType.description,
    price: Number(a.stagePricing.price),
    available: a.available,
    maxPerOrder: a.ticketType.max_per_order,
    groupSize: a.ticketType.group_size || 1,
    entryCutoff: a.ticketType.entry_cutoff,
    minConsumption: a.ticketType.min_consumption,
    sellingStageName: a.sellingStage.name,
    localityName: a.ticketType.locality?.name ?? "General",
    localityDescription: a.ticketType.locality?.description ?? null,
    isCourtesy: a.stagePricing.is_courtesy,
  }));

  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    start_date: raw.start_date,
    end_date: raw.end_date,
    location: raw.location,
    media: raw.media,
    organizerTermsUrl: raw.organizer_terms_url || null,
    showExactAvailability: raw.show_exact_availability !== false,
    allowsSplitPayment: Boolean(raw.allows_split_payment),
    minInitialPaymentPct: raw.min_initial_payment_pct ?? 0,
    maxPaymentCount: raw.max_payment_count ?? 1,
    ticketCommissionRate: Number(raw.ticket_commission_rate ?? 0),
    pixelIntegration: raw.pixelIntegration,
    tickets,
  };
}

export function validatePromoCode(input: { event_id: string; code: string }) {
  return request<ValidatePromoCodeResponse>(`/promo-codes/validate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function startCheckout(input: StartCheckoutInput) {
  return request<CheckoutResponse>(`/checkout/start`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCheckoutStatus(orderId: string) {
  return request<CheckoutStatus>(`/checkout/status/${encodeURIComponent(orderId)}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Prices come as integer COP with no decimals. */
export function formatCOP(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? COP.format(n) : "—";
}

/** Banner (is_primary) — wide art, used for OG/social previews. */
export function eventCoverUrl(e: EventSummary | EventDetail): string | null {
  const media = e.media ?? [];
  const primary = media.find((m) => m.is_primary && m.type === "IMAGE");
  const anyImage = media.find((m) => m.type === "IMAGE");
  return (primary ?? anyImage)?.url ?? null;
}

/** Flyer (is_secondary) — portrait art, used for on-page event visuals. */
export function eventFlyerUrl(e: EventSummary | EventDetail): string | null {
  const media = e.media ?? [];
  const secondary = media.find((m) => m.is_secondary && m.type === "IMAGE");
  return secondary?.url ?? eventCoverUrl(e);
}

export function formatEventDate(iso: string): string {
  try {
    return (
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "America/Bogota",
      })
        .format(new Date(iso))
        // Node and browsers disagree on narrow/no-break spaces around "p. m."
        // — normalize so SSR and client render byte-identical text.
        .replace(/[  ]/g, " ")
    );
  } catch {
    return iso;
  }
}

/** Read a browser cookie (for Meta fbc/fbp click ids passed as tracking). */
export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}
