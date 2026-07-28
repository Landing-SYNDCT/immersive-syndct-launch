import imagotipo from "@/assets/immersive-imagotipo.png";
import { ImmersiveField } from "@/components/immersive-field";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Instagram, Youtube } from "lucide-react";
import type { ReactNode } from "react";

export const SOCIALS = {
  instagram: "https://www.instagram.com/immersive_col/",
  youtube: "https://www.youtube.com/@Immersive_Col",
  tiktok: "https://www.tiktok.com/@immersive_col",
};

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.5 3c.3 2.1 1.5 3.6 3.5 3.9v2.4c-1.2.1-2.4-.2-3.5-.8v5.7c0 3.2-2.3 5.8-5.5 5.8S5.5 19.4 5.5 16.2c0-3 2.2-5.5 5.2-5.5.3 0 .6 0 .9.1v2.5c-.3-.1-.6-.1-.9-.1-1.6 0-2.7 1.3-2.7 2.9 0 1.7 1.2 2.9 2.8 2.9 1.7 0 2.9-1.3 2.9-3.2V3h2.8z" />
    </svg>
  );
}

/** Immersive's official social links. */
export function Socials({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <a
        href={SOCIALS.instagram}
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Instagram className="h-5 w-5" strokeWidth={1.5} />
      </a>
      <a
        href={SOCIALS.youtube}
        target="_blank"
        rel="noreferrer"
        aria-label="YouTube"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <Youtube className="h-5 w-5" strokeWidth={1.5} />
      </a>
      <a
        href={SOCIALS.tiktok}
        target="_blank"
        rel="noreferrer"
        aria-label="TikTok"
        className="text-muted-foreground transition-colors hover:text-foreground"
      >
        <TikTokIcon className="h-[18px] w-[18px]" />
      </a>
    </div>
  );
}

/** Global site header — identical on the landing and every interior page. */
export function SiteHeader() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <img
            src={imagotipo}
            alt="Immersive by SYNDCT & TechnoSur"
            className="h-28 w-auto md:h-56"
          />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link to="/" hash="experiencia" className="transition-colors hover:text-foreground">
            Experiencia
          </Link>
          <Link to="/" hash="formatos" className="transition-colors hover:text-foreground">
            Formatos
          </Link>
          <Link to="/" hash="comunidad" className="transition-colors hover:text-foreground">
            Comunidad
          </Link>
        </nav>
        <Link
          to="/sessions"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-white/10"
        >
          Ver sesiones <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

/** Global site footer — identical on the landing and every interior page. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`relative z-10 border-t border-white/5 py-10 ${className}`}>
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <img
            src={imagotipo}
            alt="Immersive by SYNDCT & TechnoSur"
            className="h-28 w-auto opacity-90 md:h-56"
          />
        </Link>
        <Socials />
        <div className="text-center text-xs text-muted-foreground md:text-right">
          <p>Centro Cultural y Tecnológico YAWA — Cali, Colombia</p>
          <p className="mt-1">© {new Date().getFullYear()} SYNDCT & TechnoSur</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Shared page shell for the interior (non-landing) pages — sessions, checkout,
 * order status. Same dark prism canvas as the landing, minus the marketing hero.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div
        className="glow-orb top-[-10%] left-[-10%] h-[500px] w-[500px]"
        style={{ background: "var(--prism-indigo)" }}
      />
      <div
        className="glow-orb top-[30%] right-[-15%] h-[600px] w-[600px]"
        style={{ background: "var(--prism-blue)", opacity: 0.35 }}
      />

      <ImmersiveField />

      <SiteHeader />

      <main className="relative z-10">{children}</main>

      <SiteFooter className="mt-20" />
    </div>
  );
}

/** Centered status block (loading / empty / error). */
export function CenterState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-28 text-center">
      <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
      {children ? <div className="mt-4 text-muted-foreground">{children}</div> : null}
    </div>
  );
}
