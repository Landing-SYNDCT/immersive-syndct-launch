import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Radio, Music, Palette, GraduationCap, Sparkles, Users, Mic, Video, Calendar, Headphones, Cpu } from "lucide-react";
import heroImage from "@/assets/immersive-hero.jpg";
import textureImage from "@/assets/immersive-texture.jpg";
import imagotipo from "@/assets/immersive-imagotipo.png";
import isotipo from "@/assets/immersive-isotipo.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Immersive by SYNDCT — Música, Arte & Tecnología" },
      {
        name: "description",
        content:
          "Immersive by SYNDCT es la plataforma de contenidos, paneles, streamings, sesiones musicales y experiencias que conecta arte, tecnología y cultura.",
      },
      { property: "og:title", content: "Immersive by SYNDCT" },
      {
        property: "og:description",
        content:
          "Plataforma de experiencias inmersivas: música, arte digital, tecnología y educación en un solo espacio.",
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
    title: "Contenido educativo",
    desc: "Cápsulas y masterclasses con expertos que expanden tu mirada cultural y tecnológica.",
  },
  {
    icon: Mic,
    title: "Conversaciones con expertos",
    desc: "Paneles y charlas con creadores, artistas y tecnólogos redefiniendo lo posible.",
  },
  {
    icon: Music,
    title: "Experiencias musicales",
    desc: "Sesiones en vivo, sets curados y ediciones sonoras pensadas para el domo.",
  },
  {
    icon: Palette,
    title: "Arte & entretenimiento",
    desc: "Arte digital, visuales generativos y piezas que borran los límites entre disciplinas.",
  },
];

const formats = [
  { icon: Users, label: "Paneles" },
  { icon: Radio, label: "Streamings" },
  { icon: Headphones, label: "Sesiones musicales" },
  { icon: Mic, label: "Charlas" },
  { icon: Video, label: "Cápsulas educativas" },
  { icon: Calendar, label: "Eventos especiales" },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient glow orbs */}
      <div className="glow-orb top-[-10%] left-[-10%] h-[500px] w-[500px]" style={{ background: "var(--prism-indigo)" }} />
      <div className="glow-orb top-[20%] right-[-15%] h-[600px] w-[600px]" style={{ background: "var(--prism-blue)" }} />
      <div className="glow-orb top-[70%] left-[10%] h-[500px] w-[500px]" style={{ background: "var(--prism-violet)", opacity: 0.35 }} />

      {/* Nav */}
      <header className="relative z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <img src={imagotipo} alt="Immersive by SYNDCT" className="h-20 w-auto md:h-28" />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#experiencia" className="transition-colors hover:text-foreground">Experiencia</a>
            <a href="#formatos" className="transition-colors hover:text-foreground">Formatos</a>
            <a href="#comunidad" className="transition-colors hover:text-foreground">Comunidad</a>
          </nav>
          <a
            href="#cta"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-white/10"
          >
            Unirme <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 pt-10 pb-24 md:grid-cols-12 md:pt-16 md:pb-32">
          <div className="md:col-span-7">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-prism animate-shimmer" />
              Nuevo · Plataforma inmersiva
            </div>

            <h1 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
              Immersive
              <br />
              <span className="text-prism animate-shimmer">by SYNDCT</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Plataforma de contenidos, experiencias, paneles, streamings, música, arte,
              tecnología y educación. Un espacio para habitar la cultura.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <a
                href="#experiencia"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
              >
                Explorar Immersive
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <a
                href="#cta"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
              >
                Recibir novedades
              </a>
            </div>

            <div className="mt-14 flex items-center gap-6 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <span>Música</span>
              <span className="h-px w-6 bg-white/20" />
              <span>Arte</span>
              <span className="h-px w-6 bg-white/20" />
              <span>Tecnología</span>
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative md:col-span-5">
            <div className="relative aspect-square w-full">
              {/* Domo backdrop */}
              <div className="absolute inset-0 rounded-full ring-prism overflow-hidden shadow-[0_40px_120px_-20px_rgba(83,61,186,0.6)]">
                <img
                  src={heroImage}
                  alt="Domo inmersivo con refracción de luz prisma"
                  className="h-full w-full object-cover opacity-70"
                  width={1536}
                  height={1536}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-background/40" />
              </div>

              {/* Isotipo protagonista */}
              <img
                src={isotipo}
                alt="Isotipo Immersive"
                className="absolute inset-0 m-auto h-[78%] w-[78%] object-contain drop-shadow-[0_0_60px_rgba(255,255,255,0.35)] animate-float"
              />

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
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Qué vas a vivir</p>
            <h2 className="font-display text-4xl leading-tight md:text-6xl">
              Una plataforma que <span className="text-prism">refracta</span> cultura.
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
                    background: `linear-gradient(135deg, var(--prism-${["indigo","blue","violet","red"][i]}) 0%, transparent 130%)`,
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
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Formatos</p>
              <h2 className="font-display text-4xl leading-tight md:text-6xl">
                Contenido diseñado
                <br />
                para el <span className="text-prism">domo</span>.
              </h2>
              <p className="mt-6 max-w-md text-muted-foreground">
                Cada formato es una superficie perceptiva: luz, sonido y datos convergen
                en experiencias que se sienten espaciales.
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
              className="h-56 w-full object-cover md:h-72"
              loading="lazy"
              width={1920}
              height={800}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/30 to-transparent" />
            <div className="absolute inset-0 flex items-center px-8 md:px-14">
              <div className="max-w-xl">
                <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">Immersive · Live</p>
                <h3 className="font-display text-3xl md:text-5xl">Música, arte & tecnología en un mismo pulso.</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section id="comunidad" className="relative z-10 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">Comunidad</p>
              <h2 className="font-display text-4xl leading-tight md:text-6xl">
                Un mismo lente,
                <br />
                <span className="text-prism">múltiples frecuencias</span>.
              </h2>
            </div>
            <p className="max-w-sm text-muted-foreground">
              Immersive conecta creadores, artistas, tecnólogos, marcas y audiencias
              alrededor de experiencias que valen la pena habitar.
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
                    background: `color-mix(in oklab, var(--prism-${["red","yellow","green","blue","violet"][i]}) 30%, transparent)`,
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
              Recibe estrenos, sesiones y accesos anticipados a experiencias del domo.
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                placeholder="tu@correo.com"
                className="w-full rounded-full border border-white/10 bg-white/5 px-5 py-3.5 text-sm outline-none placeholder:text-muted-foreground focus:border-white/30"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-transform hover:scale-[1.02]"
              >
                Unirme <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img src={imagotipo} alt="Immersive by SYNDCT" className="h-6 w-auto opacity-80" />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Música · Arte · Tecnología
          </p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SYNDCT</p>
        </div>
      </footer>
    </div>
  );
}
