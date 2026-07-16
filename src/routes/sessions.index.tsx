import { CenterState, PageShell } from "@/components/chrome";
import {
  eventCoverUrl,
  formatEventDate,
  listPublicEvents,
  UNDERPASS_ACCOUNT_ID,
  type EventSummary,
} from "@/lib/underpass";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

export const Route = createFileRoute("/sessions/")({
  head: () => ({
    meta: [
      { title: "Sesiones — Immersive by SYNDCT & TechnoSur" },
      {
        name: "description",
        content: "Agenda de sesiones y experiencias inmersivas del domo. Consigue tus entradas.",
      },
    ],
  }),
  component: Sessions,
});

function Sessions() {
  const { data: events, isLoading, isError, error } = useQuery({
    queryKey: ["public-events", UNDERPASS_ACCOUNT_ID],
    queryFn: () => listPublicEvents(),
    enabled: Boolean(UNDERPASS_ACCOUNT_ID),
  });

  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-6 pt-6 pb-4">
        <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">La agenda</p>
        <h1 className="font-display text-4xl leading-tight md:text-6xl">
          Próximas <span className="text-prism">sesiones</span>
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Experiencias audiovisuales concebidas para el domo. Elige una sesión y asegura tu acceso.
        </p>
      </div>

      {!UNDERPASS_ACCOUNT_ID ? (
        <CenterState title="Agenda en configuración">
          Estamos preparando las próximas sesiones. Vuelve pronto.
        </CenterState>
      ) : isLoading ? (
        <SessionsSkeleton />
      ) : isError ? (
        <CenterState title="No pudimos cargar la agenda">
          {(error as Error)?.message ?? "Intenta de nuevo en unos minutos."}
        </CenterState>
      ) : !events || events.length === 0 ? (
        <CenterState title="Aún no hay sesiones publicadas">
          Suscríbete para enterarte cuando abramos la próxima edición.
        </CenterState>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-5 px-6 pb-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <SessionCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

function SessionCard({ event }: { event: EventSummary }) {
  const cover = eventCoverUrl(event);
  return (
    <Link
      to="/sessions/$slug"
      params={{ slug: event.slug }}
      className="surface-card group flex flex-col overflow-hidden rounded-3xl transition-transform duration-500 hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.03]">
        {cover ? (
          <img
            src={cover}
            alt={event.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-prism opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl leading-tight">{event.name}</h3>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {formatEventDate(event.start_date)}
          </p>
          {event.location?.venue ? (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {event.location.venue}
              {event.location.city ? `, ${event.location.city}` : ""}
            </p>
          ) : null}
        </div>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
          Ver entradas
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

function SessionsSkeleton() {
  return (
    <div className="mx-auto grid max-w-6xl gap-5 px-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-card h-80 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}
