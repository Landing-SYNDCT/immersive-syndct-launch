import imagotipo from "@/assets/immersive-imagotipo.png";
import { Link } from "@tanstack/react-router";
import { Instagram, Youtube } from "lucide-react";
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

      <header className="relative z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="transition-opacity hover:opacity-80">
            <img
              src={imagotipo}
              alt="Immersive by SYNDCT & TechnoSur"
              className="h-56 w-auto md:h-72"
            />
          </Link>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link to="/sessions" className="transition-colors hover:text-foreground">
              Sesiones
            </Link>
            <Link to="/" hash="cta" className="transition-colors hover:text-foreground">
              Comunidad
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 mt-20 border-t border-white/5 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <img
            src={imagotipo}
            alt="Immersive by SYNDCT"
            className="h-40 w-auto opacity-90 md:h-56"
          />
          <Socials />
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SYNDCT</p>
        </div>
      </footer>
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
