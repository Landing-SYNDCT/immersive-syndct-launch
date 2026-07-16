import { CenterState, PageShell } from "@/components/chrome";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Landing spot after the payment provider redirects back (success_url = /order).
 * The order id was stashed in localStorage before the redirect — read it and
 * forward to the polling status page. Direct visits with no pending order just
 * get a friendly nudge back to the agenda.
 */
export const Route = createFileRoute("/order/")({
  component: OrderBridge,
});

function OrderBridge() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let orderId: string | null = null;
    try {
      orderId = window.localStorage.getItem("up:lastOrder");
    } catch {
      /* ignore */
    }
    if (orderId) {
      navigate({ to: "/order/$orderId", params: { orderId }, replace: true });
    } else {
      setChecked(true);
    }
  }, [navigate]);

  if (!checked) {
    return (
      <PageShell>
        <CenterState title="Abriendo tu compra…" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <CenterState title="No hay ninguna compra en curso">
        <div className="mt-6">
          <Link to="/sessions" className="text-foreground underline underline-offset-4">
            Ver las sesiones
          </Link>
        </div>
      </CenterState>
    </PageShell>
  );
}
