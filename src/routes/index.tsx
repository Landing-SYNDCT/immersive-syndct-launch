import textureImage from "@/assets/immersive-texture.jpg";
import { SiteFooter, SiteHeader } from "@/components/chrome";
import { HeroDome } from "@/components/hero-dome";
import { UNDERPASS_ACCOUNT_ID, listPublicEvents } from "@/lib/underpass";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  Cpu,
  GraduationCap,
  Headphones,
  Mic,
  Music,
  Palette,
  Radio,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Immersive — Música, arte & tecnología en el domo de YAWA, Cali" },
      {
        name: "description",
        content:
          "Sesiones inmersivas, paneles y experiencias audiovisuales en 360° bajo el domo del Centro Cultural y Tecnológico YAWA, en Cali. Por SYNDCT & TechnoSur.",
      },
      { property: "og:title", content: "Immersive — el domo de YAWA, Cali" },
      {
        property: "og:description",
        content:
          "Música, arte & tecnología en un mismo pulso: experiencias inmersivas en 360° en el Centro Cultural y Tecnológico YAWA, Cali.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const benefits = [
  {
    icon: GraduationCap,
    title: "Ciencia",
    desc: "Astronomía, inteligencia artificial y tecnología contadas bajo una proyección de cielo completo. El conocimiento se siente distinto cuando te rodea.",
  },
  {
    icon: Mic,
    title: "Paneles & charlas",
    desc: "Artistas, investigadores y líderes de la industria conversando sobre el futuro de la música y la cultura — en vivo, a metros de ti.",
  },
  {
    icon: Music,
    title: "Live experiences",
    desc: "Sesiones audiovisuales creadas para el domo: el sonido te envuelve y los visuales evolucionan con la música, en 360° a tu alrededor.",
  },
  {
    icon: Palette,
    title: "Arte & tecnología",
    desc: "Visuales generativos e inteligencia artificial expandiendo la creación contemporánea sobre una pantalla que no termina.",
  },
];

const WEB3FORMS_ACCESS_KEY = "8fe78b09-9d6d-4da5-a7ed-2e2e3990da2a";

const inputStyles =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 text-sm text-left outline-none placeholder:text-muted-foreground focus:border-white/30";

/**
 * Contact / join form submitted to Web3Forms via fetch so the visitor gets an
 * inline confirmation instead of being redirected to web3forms.com. Includes
 * their `botcheck` honeypot; submissions land in the inbox configured for the
 * access key.
 */
function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (data.botcheck) return;
    setStatus("sending");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          ...data,
          access_key: WEB3FORMS_ACCESS_KEY,
          subject: "Nuevo mensaje desde immersivelive.co",
          from_name: "Immersive Landing",
        }),
      });
      const json = (await res.json()) as { success?: boolean };
      if (json.success) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-white/5 px-6 py-5 text-sm text-foreground">
        Mensaje recibido. Te escribiremos pronto — bienvenido al espectro.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-10 flex max-w-md flex-col gap-3">
      <input type="checkbox" name="botcheck" tabIndex={-1} className="hidden" aria-hidden />
      <div className="flex flex-col gap-3 sm:flex-row">
        <input type="text" name="name" required placeholder="Tu nombre" className={inputStyles} />
        <input
          type="email"
          name="email"
          required
          placeholder="tu@correo.com"
          className={inputStyles}
        />
      </div>
      <textarea
        name="message"
        required
        rows={3}
        placeholder="Cuéntanos quién eres y qué te interesa del domo"
        className={`${inputStyles} resize-none`}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {status === "sending" ? "Enviando…" : "Unirme"} <ArrowUpRight className="h-4 w-4" />
      </button>
      {status === "error" ? (
        <p className="text-sm text-destructive">
          No pudimos enviar tu mensaje. Intenta de nuevo en unos minutos.
        </p>
      ) : null}
    </form>
  );
}

/**
 * Pulls the next published session from UnderPass and deep-links to it.
 * The strongest hook the landing has is a real upcoming date — renders
 * nothing when there is no future event, so it never shows stale promises.
 */
function NextSessionPill() {
  const { data: events } = useQuery({
    queryKey: ["public-events", UNDERPASS_ACCOUNT_ID],
    queryFn: () => listPublicEvents(),
    staleTime: 60_000,
  });
  const next = (events ?? [])
    .filter((e) => new Date(e.start_date).getTime() > Date.now())
    .sort((a, b) => +new Date(a.start_date) - +new Date(b.start_date))[0];
  if (!next) return null;

  const date = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  }).format(new Date(next.start_date));

  return (
    <Link
      to="/sessions/$slug"
      params={{ slug: next.slug }}
      className="group mt-8 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm text-foreground backdrop-blur transition-colors hover:bg-white/10"
    >
      <span className="text-xs uppercase tracking-[0.2em] text-prism animate-shimmer">
        Próxima sesión
      </span>
      <span className="font-medium">{next.name}</span>
      <span className="text-muted-foreground">· {date}</span>
      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

const formats = [
  { icon: Users, label: "Paneles" },
  { icon: Radio, label: "Streaming" },
  { icon: Headphones, label: "Live Sessions" },
  { icon: Mic, label: "Charlas" },
  { icon: Video, label: "Laboratorios" },
  { icon: Calendar, label: "Ediciones Especiales" },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient glow orbs */}
      <div
        className="glow-orb top-[-10%] left-[-10%] h-[500px] w-[500px]"
        style={{ background: "var(--prism-indigo)" }}
      />
      <div
        className="glow-orb top-[20%] right-[-15%] h-[600px] w-[600px]"
        style={{ background: "var(--prism-blue)" }}
      />
      <div
        className="glow-orb top-[70%] left-[10%] h-[500px] w-[500px]"
        style={{ background: "var(--prism-violet)", opacity: 0.35 }}
      />

      <SiteHeader />

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 pt-10 pb-24 md:grid-cols-12 md:pt-16 md:pb-32">
          <div className="md:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-prism animate-shimmer" />
              Domo YAWA · Cali, Colombia
            </div>

            <h1 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Música, arte & tecnología
              <br />
              <span className="text-prism animate-shimmer">en un mismo pulso</span>.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Immersive es la serie de experiencias del domo del Centro Cultural y Tecnológico YAWA:
              sesiones audiovisuales, paneles y laboratorios donde el sonido te envuelve, los
              visuales giran a tu alrededor y la ciencia se vive en primera persona.
            </p>

            <NextSessionPill />

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to="/sessions"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
              >
                Ver próximas sesiones
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
              <a
                href="#experiencia"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
              >
                Qué se vive en el domo
              </a>
            </div>

            <div className="mt-14 flex flex-wrap items-center gap-x-4 gap-y-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:gap-x-6 md:text-xs md:tracking-[0.25em]">
              <span>Ciencia</span>
              <span className="h-px w-6 bg-white/20" />
              <span>Música</span>
              <span className="h-px w-6 bg-white/20" />
              <span>Tecnología</span>
            </div>
          </div>

          {/* Hero visual — isometric iridescent dome (three.js) */}
          <div className="relative md:col-span-5">
            <div className="relative mx-auto aspect-square w-full max-w-[420px] md:max-w-none">
              {/* Soft glow the dome floats on (also the no-WebGL fallback) */}
              <div
                className="pointer-events-none absolute inset-[8%] rounded-full opacity-70 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle at 50% 45%, color-mix(in oklab, var(--prism-indigo) 55%, transparent) 0%, transparent 70%)",
                }}
              />

              <HeroDome className="absolute inset-0" />

              {/* Slow-rotating outer ring accent */}
              <div className="pointer-events-none absolute inset-[-4%] rounded-full border border-white/10 animate-spin-slow" />

              <div className="pointer-events-none absolute -top-3 -left-3 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground backdrop-blur">
                Live · Domo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Prism spectrum divider */}
      <div className="relative z-10 mx-auto max-w-7xl px-6">
        <div className="h-px w-full bg-prism opacity-70" />
      </div>

      {/* Benefits */}
      <section id="experiencia" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Qué vas a vivir
            </p>
            <h2 className="font-display text-4xl leading-tight md:text-6xl">
              Qué se vive <span className="text-prism">bajo el domo</span>.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="surface-card group relative flex flex-col justify-between rounded-3xl p-6 transition-transform duration-500 hover:-translate-y-1"
              >
                <div
                  className="mb-10 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, var(--prism-${["indigo", "blue", "violet", "red"][i]}) 0%, transparent 130%)`,
                  }}
                >
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="mb-2 font-display text-xl">{title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Formats */}
      <section id="formatos" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-12 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Formatos
              </p>
              <h2 className="font-display text-4xl leading-tight md:text-6xl">
                Contenido diseñado
                <br />
                para el <span className="text-prism">domo</span>.
              </h2>
              <p className="mt-6 max-w-md text-muted-foreground">
                Cada formato es una superficie perceptiva: luz, sonido y datos convergen en
                experiencias que se sienten espaciales.
              </p>
            </div>

            <div className="md:col-span-7">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {formats.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="surface-card flex aspect-square flex-col justify-between rounded-3xl p-5 transition-colors hover:bg-white/[0.06]"
                  >
                    <Icon className="h-6 w-6 text-foreground/80" strokeWidth={1.5} />
                    <span className="font-display text-lg leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Iridescent banner */}
      <section className="relative z-10 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-white/10">
            <img
              src={textureImage}
              alt=""
              aria-hidden
              className="h-64 w-full object-cover md:h-72"
              loading="lazy"
              width={1920}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/25 to-transparent md:bg-gradient-to-r md:from-background md:via-background/30 md:to-transparent" />
            <div className="absolute inset-0 flex items-center px-8 md:px-14">
              <div className="max-w-xl">
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Immersive · Live
                </p>
                <h3 className="font-display text-3xl md:text-5xl">
                  Una plataforma que <span className="text-prism">refracta</span> cultura.
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Behind the experience */}
      <section id="equipo" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-2xl">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Quiénes lo hacen posible
            </p>
            <h2 className="font-display text-4xl leading-tight md:text-6xl">
              Un equipo detrás de <span className="text-prism">cada detalle</span>.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="surface-card rounded-3xl p-6">
              <h3 className="mb-2 font-display text-xl">SYNDCT</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Consultoría y operación de eventos. Su equipo en sitio opera barra, taquilla y
                accesos para que cada experiencia fluya sin fricción — tú solo llegas a vivirla.
              </p>
            </div>
            <div className="surface-card rounded-3xl p-6">
              <h3 className="mb-2 font-display text-xl">TechnoSur</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                La marca de música electrónica del sur: curaduría de line-ups y sesiones que
                conectan la escena local con el sonido global.
              </p>
            </div>
            <div className="surface-card rounded-3xl p-6">
              <h3 className="mb-2 font-display text-xl">Entradas seguras</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Ticketing por UnderPass: compra en línea en minutos, tu entrada llega al correo y
                entras con QR el día de la sesión.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section id="comunidad" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Comunidad
              </p>
              <h2 className="font-display text-4xl leading-tight md:text-6xl">
                Un mismo proyecto,
                <br />
                <span className="text-prism">múltiples frecuencias</span>.
              </h2>
            </div>
            <p className="max-w-sm text-muted-foreground">
              Immersive conecta creadores, artistas, tecnólogos, marcas y audiencias alrededor de
              una misma convicción: las mejores experiencias nacen cuando distintas disciplinas
              deciden crear juntas.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            {[
              { label: "Creadores", icon: Sparkles },
              { label: "Artistas", icon: Palette },
              { label: "Tecnólogos", icon: Cpu },
              { label: "Marcas", icon: Radio },
              { label: "Audiencias", icon: Users },
            ].map(({ label, icon: Icon }, i) => (
              <div
                key={label}
                className="surface-card group relative flex items-center gap-4 rounded-2xl p-5"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `color-mix(in oklab, var(--prism-${["red", "yellow", "green", "blue", "violet"][i]}) 30%, transparent)`,
                  }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <span className="font-display text-lg">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="cta" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <div className="surface-card ring-prism relative overflow-hidden rounded-[2rem] p-10 text-center md:p-16">
            <div
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{ background: "var(--gradient-radial-glow)" }}
            />
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Únete a Immersive
            </p>
            <h2 className="mx-auto max-w-3xl font-display text-4xl leading-tight md:text-6xl">
              Entra al <span className="text-prism">espectro</span>. Sé parte del próximo capítulo.
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
              ¿Público, artista, marca u organizador? Escríbenos y entérate primero de estrenos,
              sesiones y accesos anticipados a experiencias del domo.
            </p>

            <ContactForm />
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
