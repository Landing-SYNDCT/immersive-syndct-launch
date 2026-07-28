import { PageShell } from "@/components/chrome";
import { trackPurchase } from "@/lib/pixels";
import { formatCOP, getCheckoutStatus } from "@/lib/underpass";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

export const Route = createFileRoute("/order/$orderId")({
  head: () => ({
    meta: [{ title: "Estado de tu compra — Immersive" }, { name: "robots", content: "noindex" }],
  }),
  component: OrderStatusPage,
});

function OrderStatusPage() {
  const { orderId } = Route.useParams();
  const purchaseFired = useRef(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["order-status", orderId],
    queryFn: () => getCheckoutStatus(orderId),
    // Poll every 2s until the order reaches a terminal state.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return !status || status === "PENDING" ? 2000 : false;
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (data?.status === "CONFIRMED" && !purchaseFired.current) {
      purchaseFired.current = true;
      trackPurchase(data.total_amount, orderId);
    }
  }, [data?.status, data?.total_amount, orderId]);

  if (isLoading || (isError && !data)) {
    return (
      <PageShell>
        <StateBlock
          icon={<Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />}
          title="Consultando tu compra…"
          body="Un momento mientras confirmamos el estado de tu orden."
        />
      </PageShell>
    );
  }

  const status = data?.status ?? "PENDING";

  if (status === "PENDING") {
    return (
      <PageShell>
        <StateBlock
          icon={<Clock className="h-10 w-10 text-[var(--prism-blue)]" />}
          title="Estamos confirmando tu pago"
          body="Esto puede tardar unos segundos. No cierres esta ventana — se actualizará automáticamente en cuanto tu pago quede confirmado."
          spinner
        />
      </PageShell>
    );
  }

  if (status === "CONFIRMED") {
    const count = data?.tickets?.length ?? 0;
    return (
      <PageShell>
        <StateBlock
          icon={<CheckCircle2 className="h-12 w-12 text-[var(--prism-green)]" />}
          title="¡Tu compra está confirmada!"
          body={
            <>
              {count > 0
                ? `Generamos ${count} ${count === 1 ? "entrada" : "entradas"}.`
                : "Tu orden quedó confirmada."}{" "}
              Te enviamos los detalles y tus entradas al correo registrado.
            </>
          }
        >
          <p className="mt-2 text-sm text-muted-foreground">
            Total pagado:{" "}
            <span className="text-foreground">
              {formatCOP(data?.paid_amount ?? data?.total_amount ?? 0)}
            </span>
          </p>
          <div className="mt-8">
            <Link
              to="/sessions"
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
            >
              Ver más sesiones
            </Link>
          </div>
        </StateBlock>
      </PageShell>
    );
  }

  // CANCELLED / EXPIRED (or payment failed).
  const expired = status === "EXPIRED";
  return (
    <PageShell>
      <StateBlock
        icon={<XCircle className="h-12 w-12 text-destructive" />}
        title={expired ? "La orden expiró" : "El pago no se completó"}
        body={
          expired
            ? "El tiempo para pagar esta orden terminó. Puedes iniciar una nueva compra."
            : "Tu pago fue cancelado o no pudo procesarse. No se te ha cobrado."
        }
      >
        <div className="mt-8">
          <Link
            to="/sessions"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
          >
            Volver a las sesiones
          </Link>
        </div>
      </StateBlock>
    </PageShell>
  );
}

function StateBlock({
  icon,
  title,
  body,
  spinner,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: ReactNode;
  spinner?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <div className="surface-card ring-prism mx-auto rounded-[2rem] p-10 md:p-14">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
          {icon}
        </div>
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        <p className="mt-4 text-muted-foreground">{body}</p>
        {spinner ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
