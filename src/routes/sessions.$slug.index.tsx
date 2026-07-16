import { CenterState, PageShell } from "@/components/chrome";
import { captureAttribution, readAttribution } from "@/lib/attribution";
import { initOrganizerPixels } from "@/lib/pixels";
import {
  eventCoverUrl,
  formatCOP,
  formatEventDate,
  getEventWithDetails,
  validatePromoCode,
  type EventDetail,
  type Ticket,
  type ValidatePromoCodeResponse,
} from "@/lib/underpass";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Check, Loader2, MapPin, Minus, Plus, Tag, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/sessions/$slug/")({
  component: EventPage,
});

export const CHECKOUT_DATA_KEY = "up:checkoutData";

function EventPage() {
  const { slug } = Route.useParams();

  // Capture attribution (?promoter/?link/?ref/?promo) and remember the sales link.
  const [link, setLink] = useState<string | undefined>(undefined);
  useEffect(() => {
    captureAttribution(slug, new URLSearchParams(window.location.search));
    setLink(readAttribution("salesLink", slug) ?? undefined);
  }, [slug]);

  // Selling stages unlocked by a promo code — widens what the event fetch returns.
  const [unlockedStages, setUnlockedStages] = useState<string[]>([]);

  const { data: event, isLoading, isError, error } = useQuery({
    queryKey: ["event", slug, link, unlockedStages.join(",")],
    queryFn: () => getEventWithDetails(slug, link, unlockedStages),
  });

  useEffect(() => {
    if (event?.pixelIntegration) initOrganizerPixels(event.pixelIntegration);
  }, [event?.pixelIntegration]);

  if (isLoading) {
    return (
      <PageShell>
        <CenterState title="Cargando sesión…" />
      </PageShell>
    );
  }
  if (isError || !event) {
    return (
      <PageShell>
        <CenterState title="No encontramos esta sesión">
          {(error as Error)?.message ?? "Puede que ya no esté disponible."}
          <div className="mt-6">
            <Link to="/sessions" className="text-foreground underline underline-offset-4">
              Ver todas las sesiones
            </Link>
          </div>
        </CenterState>
      </PageShell>
    );
  }

  return <TicketSelection event={event} slug={slug} onUnlock={setUnlockedStages} />;
}

function TicketSelection({
  event,
  slug,
  onUnlock,
}: {
  event: EventDetail;
  slug: string;
  onUnlock: (stages: string[]) => void;
}) {
  const navigate = useNavigate();
  const cover = eventCoverUrl(event);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [navigating, setNavigating] = useState(false);

  // Promo code
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [applied, setApplied] = useState<ValidatePromoCodeResponse | null>(null);

  const ticketsById = useMemo(() => {
    const map: Record<string, Ticket> = {};
    for (const t of event.tickets) map[t.availabilityId] = t;
    return map;
  }, [event.tickets]);

  // Group by locality (matches landing).
  const byLocality = useMemo(() => {
    const groups: { name: string; description: string | null; tickets: Ticket[] }[] = [];
    for (const t of event.tickets) {
      let g = groups.find((x) => x.name === t.localityName);
      if (!g) {
        g = { name: t.localityName, description: t.localityDescription, tickets: [] };
        groups.push(g);
      }
      g.tickets.push(t);
    }
    return groups;
  }, [event.tickets]);

  const maxQuantity = useCallback(
    (t: Ticket): number => {
      const avail = t.available ?? 0;
      const base = Math.min(avail, t.maxPerOrder ?? avail);
      if (!applied?.effects) return base;
      // OVERRIDE_PRICE quantity_limit caps this ticket type.
      for (const e of applied.effects) {
        if (e.effect_type === "OVERRIDE_PRICE" && e.ticket_type_id === t.ticketTypeId && e.quantity_limit) {
          return Math.min(base, e.quantity_limit);
        }
      }
      // A stage unlocked by the promo caps at 1 (pair-aware).
      const pairs = applied.unlocked_pricings;
      const unlockedHere = pairs?.length
        ? pairs.some((u) => u.selling_stage_id === t.sellingStageId && (!u.ticket_type_id || u.ticket_type_id === t.ticketTypeId))
        : applied.unlocked_stages?.includes(t.sellingStageId);
      return unlockedHere ? Math.min(base, 1) : base;
    },
    [applied],
  );

  const setQuantity = (t: Ticket, change: number) =>
    setQty((prev) => {
      const cur = prev[t.availabilityId] ?? 0;
      const next = Math.max(0, Math.min(maxQuantity(t), cur + change));
      return { ...prev, [t.availabilityId]: next };
    });

  const totalTickets = useMemo(() => Object.values(qty).reduce((s, n) => s + n, 0), [qty]);
  const totalEntries = useMemo(
    () => Object.entries(qty).reduce((s, [id, n]) => s + n * (ticketsById[id]?.groupSize ?? 1), 0),
    [qty, ticketsById],
  );
  const subtotal = useMemo(
    () => Object.entries(qty).reduce((s, [id, n]) => s + n * (ticketsById[id]?.price ?? 0), 0),
    [qty, ticketsById],
  );

  const discount = useMemo(() => {
    if (!applied?.effects) return 0;
    let d = 0;
    for (const e of applied.effects) {
      if (e.effect_type === "PERCENTAGE_DISCOUNT" && e.discount_value) {
        for (const [id, n] of Object.entries(qty)) {
          const t = ticketsById[id];
          if (!t || n <= 0) continue;
          if (e.ticket_type_id && e.ticket_type_id !== t.ticketTypeId) continue;
          d += Math.round(t.price * n * (e.discount_value / 100));
        }
      } else if (e.effect_type === "FIXED_AMOUNT_DISCOUNT" && e.discount_value) {
        d += e.discount_value;
      } else if (e.effect_type === "OVERRIDE_PRICE" && e.ticket_type_id && e.override_price != null) {
        let remaining = e.quantity_limit ?? Infinity;
        for (const [id, n] of Object.entries(qty)) {
          const t = ticketsById[id];
          if (!t || n <= 0 || t.ticketTypeId !== e.ticket_type_id || remaining <= 0) continue;
          const applicable = Math.min(n, remaining);
          d += (t.price - e.override_price) * applicable;
          remaining -= applicable;
        }
      }
    }
    return Math.min(Math.max(0, d), subtotal);
  }, [applied, qty, ticketsById, subtotal]);

  const total = subtotal - discount;

  const applyPromo = useCallback(
    async (codeArg?: string) => {
      const code = (codeArg ?? promoInput).trim().toUpperCase();
      if (!code) return;
      setPromoLoading(true);
      setPromoError(null);
      try {
        const result = await validatePromoCode({ event_id: event.id, code });
        if (result.valid && result.promo_code) {
          setApplied(result);
          setPromoInput("");
          try {
            sessionStorage.setItem(`promoCode-${slug}`, code);
          } catch {
            /* ignore */
          }
          const tokens = result.unlocked_pricings?.length
            ? result.unlocked_pricings.map((u) => (u.ticket_type_id ? `${u.selling_stage_id}:${u.ticket_type_id}` : u.selling_stage_id))
            : result.unlocked_stages;
          if (tokens?.length) onUnlock(tokens);
        } else {
          setPromoError(result.error_message || "Código inválido");
        }
      } catch {
        setPromoError("Error al validar el código");
      } finally {
        setPromoLoading(false);
      }
    },
    [promoInput, event.id, slug, onUnlock],
  );

  // Auto-apply a promo code arriving via ?promo / sessionStorage.
  useEffect(() => {
    if (applied) return;
    const stored = readAttribution("promoCode", slug);
    if (stored) applyPromo(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const removePromo = () => {
    const hadUnlock = (applied?.unlocked_stages?.length ?? 0) > 0 || (applied?.unlocked_pricings?.length ?? 0) > 0;
    setApplied(null);
    setPromoError(null);
    try {
      sessionStorage.removeItem(`promoCode-${slug}`);
    } catch {
      /* ignore */
    }
    if (hadUnlock) {
      onUnlock([]);
      setQty({});
    }
  };

  const proceed = () => {
    if (navigating || totalTickets < 1) return;
    setNavigating(true);
    const items = Object.entries(qty)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => {
        const t = ticketsById[id];
        return { ticketTypeId: t.ticketTypeId, sellingStageId: t.sellingStageId, quantity: n, name: t.name, price: t.price };
      });
    const payload = {
      slug,
      eventId: event.id,
      eventName: event.name,
      items,
      subtotal,
      discount,
      total,
      promoCode: applied?.promo_code?.code ?? null,
      allowsSplitPayment: event.allowsSplitPayment,
      minInitialPaymentPct: event.minInitialPaymentPct,
      maxPaymentCount: event.maxPaymentCount,
      ticketCommissionRate: event.ticketCommissionRate,
      organizerTermsUrl: event.organizerTermsUrl,
      pixelIntegration: event.pixelIntegration ?? null,
    };
    try {
      sessionStorage.setItem(CHECKOUT_DATA_KEY, JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    navigate({ to: "/sessions/$slug/checkout", params: { slug } });
  };

  return (
    <PageShell>
      {/* Event header */}
      <div className="mx-auto max-w-6xl px-6 pt-2">
        <Link to="/sessions" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Todas las sesiones
        </Link>
      </div>
      <div className="mx-auto mt-4 grid max-w-6xl gap-8 px-6 md:grid-cols-2 md:items-center">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl ring-prism">
          {cover ? <img src={cover} alt={event.name} className="h-full w-full object-cover" /> : <div className="h-full w-full bg-prism opacity-30" />}
        </div>
        <div>
          <h1 className="font-display text-3xl leading-tight md:text-5xl">{event.name}</h1>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" strokeWidth={1.5} />
              {formatEventDate(event.start_date)}
            </p>
            {event.location?.venue ? (
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" strokeWidth={1.5} />
                {event.location.venue}
                {event.location.city ? `, ${event.location.city}` : ""}
              </p>
            ) : null}
          </div>
          {event.description ? <p className="mt-5 whitespace-pre-line text-sm text-muted-foreground">{event.description}</p> : null}
        </div>
      </div>

      {/* Tickets + summary */}
      <div className="mx-auto mt-14 grid max-w-6xl gap-6 px-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="font-display text-2xl">Tipos de entrada</h2>
          {event.tickets.length === 0 ? (
            <div className="surface-card mt-5 rounded-2xl p-6 text-muted-foreground">No hay entradas disponibles para esta sesión por ahora.</div>
          ) : (
            <div className="mt-5 space-y-8">
              {byLocality.map((group) => (
                <div key={group.name} className="space-y-4">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-2">
                    <span className="h-2 w-2 rounded-full bg-prism" />
                    <h3 className="font-display text-lg">{group.name}</h3>
                    {group.description ? <span className="text-sm text-muted-foreground">— {group.description}</span> : null}
                  </div>
                  <div className="space-y-3">
                    {group.tickets.map((t) => (
                      <TicketCard
                        key={t.availabilityId}
                        ticket={t}
                        qty={qty[t.availabilityId] ?? 0}
                        max={maxQuantity(t)}
                        showExact={event.showExactAvailability}
                        onAdd={() => setQuantity(t, 1)}
                        onRemove={() => setQuantity(t, -1)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Order summary */}
        <aside className="lg:col-span-1">
          <div className="surface-card sticky top-6 rounded-3xl p-6">
            <h2 className="font-display text-lg">Resumen</h2>

            {/* Promo code */}
            <div className="mt-4">
              {applied ? (
                <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-[var(--prism-green)]" />
                    {applied.promo_code?.code}
                  </span>
                  <button onClick={removePromo} className="text-muted-foreground hover:text-foreground" aria-label="Quitar código">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            applyPromo();
                          }
                        }}
                        placeholder="Código promocional"
                        className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-white/30"
                      />
                    </div>
                    <button
                      onClick={() => applyPromo()}
                      disabled={!promoInput.trim() || promoLoading}
                      className="rounded-xl border border-white/15 px-4 text-sm transition-colors hover:bg-white/5 disabled:opacity-40"
                    >
                      {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </button>
                  </div>
                  {promoError ? <p className="mt-2 text-xs text-destructive">{promoError}</p> : null}
                </div>
              )}
            </div>

            {totalTickets > 0 ? (
              <>
                <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                  {Object.entries(qty)
                    .filter(([, n]) => n > 0)
                    .map(([id, n]) => {
                      const t = ticketsById[id];
                      return (
                        <div key={id} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {n}× {t?.name}
                            {t && t.groupSize > 1 ? <span className="block text-xs text-[var(--prism-violet)]">= {n * t.groupSize} entradas</span> : null}
                          </span>
                          <span>{formatCOP((t?.price ?? 0) * n)}</span>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-4 border-t border-white/10 pt-4">
                  {discount > 0 ? (
                    <>
                      <div className="mb-1 flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{formatCOP(subtotal)}</span>
                      </div>
                      <div className="mb-1 flex justify-between text-sm text-[var(--prism-green)]">
                        <span>Descuento</span>
                        <span>−{formatCOP(discount)}</span>
                      </div>
                    </>
                  ) : null}
                  <div className="flex justify-between font-display text-xl">
                    <span>Total</span>
                    <span>{formatCOP(total)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalEntries} entrada{totalEntries !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={proceed}
                  disabled={navigating}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-60"
                >
                  {navigating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar al checkout"}
                </button>
              </>
            ) : (
              <div className="mt-5 border-t border-white/10 py-6 text-center">
                <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
                <p className="mt-1 text-xs text-muted-foreground/70">Toca una entrada para agregarla</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Sticky mobile bar */}
      {totalTickets > 0 ? (
        <>
          <div className="h-24 lg:hidden" />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-background/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
            <div className="mx-auto flex max-w-6xl items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">
                  {totalEntries} entrada{totalEntries !== 1 ? "s" : ""}
                </p>
                <p className="truncate font-display text-lg">{formatCOP(total)}</p>
              </div>
              <button
                onClick={proceed}
                disabled={navigating}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black disabled:opacity-60"
              >
                {navigating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </PageShell>
  );
}

function TicketCard({
  ticket,
  qty,
  max,
  showExact,
  onAdd,
  onRemove,
}: {
  ticket: Ticket;
  qty: number;
  max: number;
  showExact: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const soldOut = (ticket.available ?? 0) <= 0;
  const selected = qty > 0;
  const atMax = qty >= max;
  const clickable = !soldOut && !atMax;

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-pressed={selected}
      onClick={() => clickable && onAdd()}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onAdd();
        }
      }}
      className={`surface-card rounded-2xl border p-5 transition-all duration-150 ${
        soldOut
          ? "cursor-not-allowed border-white/5 opacity-60"
          : selected
            ? "border-white/40 bg-white/[0.05]"
            : "border-white/10 hover:border-white/25"
      } ${clickable ? "cursor-pointer select-none active:scale-[0.99]" : ""}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 lg:pr-6">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h4 className={`font-display text-lg ${soldOut ? "text-muted-foreground" : ""}`}>{ticket.name}</h4>
            {selected ? (
              <span className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-xs font-semibold">
                <Check className="h-3 w-3" />
                {qty}
              </span>
            ) : null}
            {soldOut ? <span className="rounded bg-destructive/20 px-2 py-0.5 text-xs font-semibold text-destructive">Agotado</span> : null}
            <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-muted-foreground">{ticket.sellingStageName}</span>
            {ticket.groupSize > 1 ? (
              <span className="rounded bg-[var(--prism-violet)]/25 px-2 py-0.5 text-xs font-semibold">Incluye {ticket.groupSize} entradas</span>
            ) : null}
          </div>
          {ticket.description ? <p className="mb-1 text-sm text-muted-foreground">{ticket.description}</p> : null}
          {!soldOut ? <p className="text-xs text-muted-foreground">{showExact ? `${ticket.available} disponibles` : "Disponible"}</p> : null}
        </div>
        <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-end">
          <p className={`font-display text-2xl ${soldOut ? "text-muted-foreground line-through" : ""}`}>{formatCOP(ticket.price)}</p>
          {!soldOut ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={`Quitar una ${ticket.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                disabled={qty <= 0}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/5 disabled:opacity-30"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center font-display text-lg tabular-nums">{qty}</span>
              <button
                type="button"
                aria-label={`Agregar una ${ticket.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd();
                }}
                disabled={atMax}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 transition-colors hover:bg-white/5 disabled:opacity-30"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
