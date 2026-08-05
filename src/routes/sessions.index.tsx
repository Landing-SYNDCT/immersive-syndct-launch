import { CenterState, PageShell } from "@/components/chrome";
import { SITE_URL } from "@/lib/seo";
import {
  eventCoverUrl,
  eventFlyerUrl,
  formatEventDate,
  listPublicEvents,
  type EventSummary,
} from "@/lib/underpass";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

export const Route = createFileRoute("/sessions/")({
  // Server-side loader so the agenda (and links to each session) is in the SSR
  // HTML — crawlers discover event pages from here.
  loader: () => listPublicEvents().catch(() => null),
  head: () => ({
    meta: [
      { title: "Sesiones — Immersive by SYNDCT & TechnoSur" },
      {
        name: "description",
        content:
          "Agenda de sesiones y experiencias inmersivas en el domo de YAWA, Cali. Consigue tus entradas.",
      },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/sessions` }],
  }),
  component: Sessions,
});

function Sessions() {
  const events = Route.useLoaderData();
  const isError = events === null;

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

      {isError ? (
        <CenterState title="No pudimos cargar la agenda">
          Intenta de nuevo en unos minutos.
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
          <SpecialSessionCard />
        </div>
      )}
    </PageShell>
  );
}

function SpecialSessionCard() {
  return (
    <a
      href="https://masboleteria.com/event/domo-live-inmersive-26-08-2026-447/register"
      target="_blank"
      rel="noopener noreferrer"
      className="surface-card group flex flex-col overflow-hidden rounded-3xl transition-transform duration-500 hover:-translate-y-1"
    >
      <SessionCardTop
        title="INNEXEN LIVE AND TOPIC VJ"
        banner="/Inmersive_live-1080x1080.jpg"
        flyer="/Inmersive_live-1080x1080.jpg"
      />
      <div className="flex flex-1 flex-col p-6 pt-14">
        <h3 className="font-display text-xl leading-tight">INNEXEN LIVE AND TOPIC VJ</h3>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            miércoles, 26 de agosto de 2026 · 07:00 p.m.
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            YAWA, Cali
          </p>
        </div>
        <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground">
          Ver entradas
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </a>
  );
}

function SessionCardTop({
  title,
  banner,
  flyer,
}: {
  title: string;
  banner?: string | null;
  flyer?: string | null;
}) {
  const hasLayeredArtwork = Boolean(banner && flyer);

  if (hasLayeredArtwork) {
    return (
      <div className="relative">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-white/[0.03]">
          <img
            src={banner!}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>
        <img
          src={flyer!}
          alt={`Flyer — ${title}`}
          className="absolute -bottom-10 left-5 aspect-[3/4] w-24 rounded-xl border border-white/15 object-cover shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7)]"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/[0.03]">
      {flyer ? (
        <img
          src={flyer}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-prism opacity-30" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
    </div>
  );
}

function SessionCard({ event }: { event: EventSummary }) {
  // Both artworks when the event has them: banner (is_primary) as the wide
  // card header, flyer (is_secondary) as a poster thumbnail overlapping it.
  // Falls back to a single portrait flyer when there's only one image.
  const banner = eventCoverUrl(event);
  const flyer = eventFlyerUrl(event);
  const hasLayeredArtwork = Boolean(banner && flyer && banner !== flyer);
  return (
    <Link
      to="/sessions/$slug"
      params={{ slug: event.slug }}
      className="surface-card group flex flex-col overflow-hidden rounded-3xl transition-transform duration-500 hover:-translate-y-1"
    >
      <SessionCardTop
        title={event.name}
        banner={hasLayeredArtwork ? banner : null}
        flyer={flyer}
      />
      <div className={`flex flex-1 flex-col p-6 ${hasLayeredArtwork ? "pt-14" : ""}`}>
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
