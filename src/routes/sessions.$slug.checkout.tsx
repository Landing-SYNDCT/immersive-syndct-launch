import { PageShell } from "@/components/chrome";
import { clearAttribution, readAttribution } from "@/lib/attribution";
import { initOrganizerPixels, trackInitiateCheckout } from "@/lib/pixels";
import {
  UnderpassError,
  formatCOP,
  readCookie,
  startCheckout,
  type DocumentType,
} from "@/lib/underpass";
import { useMutation } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CHECKOUT_DATA_KEY } from "./sessions.$slug.index";

export const Route = createFileRoute("/sessions/$slug/checkout")({
  head: () => ({
    meta: [{ title: "Checkout — Immersive" }, { name: "robots", content: "noindex" }],
  }),
  component: CheckoutPage,
});

type CheckoutItem = {
  ticketTypeId: string;
  sellingStageId: string;
  quantity: number;
  name: string;
  price: number;
};
type CheckoutData = {
  slug: string;
  eventId: string;
  eventName: string;
  items: CheckoutItem[];
  subtotal: number;
  discount: number;
  total: number;
  promoCode: string | null;
  allowsSplitPayment: boolean;
  minInitialPaymentPct: number;
  maxPaymentCount: number;
  ticketCommissionRate: number;
  organizerTermsUrl: string | null;
  pixelIntegration: { meta_pixel_id: string | null; tiktok_pixel_id: string | null } | null;
};

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: "CC", label: "Cédula de ciudadanía" },
  { value: "CE", label: "Cédula de extranjería" },
  { value: "PASSPORT", label: "Pasaporte" },
  { value: "NIT", label: "NIT" },
];

const LAST_ORDER_KEY = "up:lastOrder";

// Server-enforced purchase limits come back as machine codes; translate them
// instead of surfacing the API's English message.
function checkoutErrorMessage(error: unknown): string {
  if (error instanceof UnderpassError) {
    switch (error.code) {
      case "MAX_TICKETS_PER_ORDER_EXCEEDED":
        return "Superaste el máximo de entradas permitidas por orden para este evento.";
      case "MAX_TICKETS_PER_EMAIL_EXCEEDED":
        return "Este correo ya alcanzó el límite de entradas para este evento.";
      case "INSUFFICIENT_TICKETS":
        return "No hay suficientes entradas disponibles. Ajusta la cantidad e intenta de nuevo.";
    }
    if (error.message) return error.message;
  }
  return (error as Error)?.message ?? "No pudimos iniciar el pago. Intenta de nuevo.";
}

function CheckoutPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CheckoutData | null>(null);
  const [ready, setReady] = useState(false);

  // Rehydrate the cart from sessionStorage; bounce back if there's nothing.
  useEffect(() => {
    let parsed: CheckoutData | null = null;
    try {
      const raw = sessionStorage.getItem(CHECKOUT_DATA_KEY);
      parsed = raw ? (JSON.parse(raw) as CheckoutData) : null;
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.slug !== slug || parsed.items.length === 0) {
      navigate({ to: "/sessions/$slug", params: { slug }, replace: true });
      return;
    }
    setData(parsed);
    setReady(true);
    if (parsed.pixelIntegration) initOrganizerPixels(parsed.pixelIntegration);
  }, [slug, navigate]);

  if (!ready || !data) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl px-6 py-28 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      </PageShell>
    );
  }

  return <CheckoutForm data={data} slug={slug} />;
}

function CheckoutForm({ data, slug }: { data: CheckoutData; slug: string }) {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    document_type: "CC" as DocumentType,
    document_number: "",
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const canSplit = data.allowsSplitPayment && data.maxPaymentCount > 1;

  // Indicative installment schedule — the API returns the authoritative total
  // (financing fees are applied server-side per payment).
  const schedule = useMemo(() => {
    if (installments <= 1) return null;
    const firstPct = Math.max(data.minInitialPaymentPct, Math.ceil(100 / installments));
    const first = Math.round((data.total * firstPct) / 100);
    const rest = Math.round((data.total - first) / (installments - 1));
    return { first, rest, count: installments };
  }, [installments, data.total, data.minInitialPaymentPct]);

  const checkout = useMutation({
    mutationFn: async () => {
      trackInitiateCheckout(data.total);
      const origin = window.location.origin;
      const res = await startCheckout({
        event_id: data.eventId,
        items: data.items.map((i) => ({
          ticket_type_id: i.ticketTypeId,
          selling_stage_id: i.sellingStageId,
          quantity: i.quantity,
        })),
        customer: { ...customer, phone: customer.phone || undefined },
        accept_terms: acceptTerms,
        installment_count: installments,
        promo_code: data.promoCode || undefined,
        promoter_code: readAttribution("promoterCode", slug) || undefined,
        referral_code: readAttribution("referralCode", slug) || undefined,
        success_url: `${origin}/order`,
        cancel_url: `${origin}/sessions/${slug}`,
        tracking: {
          fbc: readCookie("_fbc"),
          fbp: readCookie("_fbp"),
          client_user_agent: navigator.userAgent,
        },
      });

      try {
        window.localStorage.setItem(LAST_ORDER_KEY, res.order_id);
      } catch {
        /* private mode — deep link still works */
      }
      // Free / zero-total orders skip the payment redirect (matches landing).
      if (res.payment_provider === "FREE" || res.total_amount === 0) {
        clearAttribution(slug);
        sessionStorage.removeItem(CHECKOUT_DATA_KEY);
        navigate({ to: "/order/$orderId", params: { orderId: res.order_id } });
        return;
      }
      clearAttribution(slug);
      sessionStorage.removeItem(CHECKOUT_DATA_KEY);
      window.location.href = res.redirect_url;
    },
  });

  function onPay() {
    setFormError(null);
    if (!customer.name.trim()) return setFormError("Ingresa tu nombre completo.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email))
      return setFormError("Ingresa un correo válido.");
    if (!customer.document_number.trim()) return setFormError("Ingresa tu número de documento.");
    if (!acceptTerms) return setFormError("Debes aceptar los términos para continuar.");
    checkout.mutate();
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-5xl px-6 pt-2">
        <Link
          to="/sessions/$slug"
          params={{ slug }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a las entradas
        </Link>
        <h1 className="mt-4 font-display text-3xl md:text-4xl">Finaliza tu compra</h1>
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-6 px-6 lg:grid-cols-5">
        {/* Buyer form */}
        <section className="lg:col-span-3">
          <div className="surface-card rounded-3xl p-6">
            <h2 className="font-display text-xl">Tus datos</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre completo" className="sm:col-span-2">
                <input
                  className={inputClass}
                  value={customer.name}
                  autoComplete="name"
                  onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                />
              </Field>
              <Field label="Correo electrónico">
                <input
                  className={inputClass}
                  type="email"
                  value={customer.email}
                  autoComplete="email"
                  onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                />
              </Field>
              <Field label="Teléfono (opcional)">
                <input
                  className={inputClass}
                  value={customer.phone}
                  autoComplete="tel"
                  onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                />
              </Field>
              <Field label="Tipo de documento">
                <select
                  className={inputClass}
                  value={customer.document_type}
                  onChange={(e) =>
                    setCustomer((c) => ({ ...c, document_type: e.target.value as DocumentType }))
                  }
                >
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value} className="bg-card">
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Número de documento">
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={customer.document_number}
                  onChange={(e) => setCustomer((c) => ({ ...c, document_number: e.target.value }))}
                />
              </Field>
            </div>

            {canSplit ? (
              <div className="mt-6 border-t border-white/10 pt-5">
                <h3 className="font-display text-lg">Pago en cuotas</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Divide tu compra. Se aplican cargos de financiación por cuota.
                </p>
                <select
                  className={`${inputClass} mt-3`}
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                >
                  {Array.from({ length: data.maxPaymentCount }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-card">
                      {n === 1 ? "Pago único" : `${n} cuotas`}
                    </option>
                  ))}
                </select>
                {schedule ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Primer pago ≈ {formatCOP(schedule.first)}, luego {schedule.count - 1}× ≈{" "}
                    {formatCOP(schedule.rest)} (aprox.)
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* Summary + pay */}
        <aside className="lg:col-span-2">
          <div className="surface-card sticky top-6 rounded-3xl p-6">
            <h2 className="font-display text-lg">Resumen</h2>
            <p className="mt-1 text-sm text-muted-foreground">{data.eventName}</p>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
              {data.items.map((i) => (
                <div key={`${i.ticketTypeId}-${i.sellingStageId}`} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {i.quantity}× {i.name}
                  </span>
                  <span>{formatCOP(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              {data.discount > 0 ? (
                <>
                  <div className="mb-1 flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCOP(data.subtotal)}</span>
                  </div>
                  <div className="mb-1 flex justify-between text-sm text-[var(--prism-green)]">
                    <span>Descuento {data.promoCode ? `(${data.promoCode})` : ""}</span>
                    <span>−{formatCOP(data.discount)}</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between font-display text-xl">
                <span>Total</span>
                <span>{formatCOP(data.total)}</span>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--prism-indigo)]"
              />
              <span>
                Acepto los términos y condiciones
                {data.organizerTermsUrl ? (
                  <>
                    {" "}
                    <a
                      href={data.organizerTermsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground underline underline-offset-2"
                    >
                      del organizador
                    </a>
                  </>
                ) : null}
                .
              </span>
            </label>

            {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}
            {checkout.isError ? (
              <p className="mt-3 text-sm text-destructive">
                {checkoutErrorMessage(checkout.error)}
              </p>
            ) : null}

            <button
              onClick={onPay}
              disabled={checkout.isPending}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:hover:scale-100"
            >
              {checkout.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Redirigiendo al pago…
                </>
              ) : (
                <>Pagar {formatCOP(data.total)}</>
              )}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Pago seguro procesado por UnderPass
            </p>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-white/30";

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
