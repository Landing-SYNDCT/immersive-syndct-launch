/**
 * Analytics pixels for the checkout funnel — Meta + TikTok, per
 * https://docs.underpass.com.co/analytics-pixels.
 *
 * The fixed platform Meta pixel + Microsoft Clarity load in the document head
 * (see __root.tsx) so PageView fires on every page. These helpers add the
 * organizer's own pixels (from the event's pixelIntegration) and fire the
 * funnel events. Currency is always COP as an integer (no decimals), and the
 * Purchase event carries `eventID: orderId` so Meta's server-side CAPI can
 * dedupe the two halves.
 */
import type { PixelIntegration } from "./underpass";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    ttq?: {
      track?: (event: string, params?: unknown) => void;
      page?: () => void;
      load?: (id: string) => void;
    };
    clarity?: (...args: unknown[]) => void;
  }
}

const initedMeta = new Set<string>();
let initedTikTok = false;

/** Register the organizer's own Meta/TikTok pixels once we know the event. */
export function initOrganizerPixels(integration?: PixelIntegration | null): void {
  if (typeof window === "undefined" || !integration) return;

  const metaIds = (integration.meta_pixel_id ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const id of metaIds) {
    if (initedMeta.has(id)) continue;
    initedMeta.add(id);
    window.fbq?.("init", id);
  }
  if (metaIds.length) window.fbq?.("track", "PageView");

  const ttqId = integration.tiktok_pixel_id?.trim();
  if (ttqId && !initedTikTok) {
    initedTikTok = true;
    loadTikTok(ttqId);
  }
}

/** Fire before calling /checkout/start. */
export function trackInitiateCheckout(value: number, currency = "COP"): void {
  if (typeof window === "undefined") return;
  const params = { value, currency };
  window.fbq?.("track", "InitiateCheckout", params);
  window.ttq?.track?.("InitiateCheckout", params);
}

/** Fire only once the order status is CONFIRMED. `orderId` dedupes with CAPI. */
export function trackPurchase(value: number, orderId: string, currency = "COP"): void {
  if (typeof window === "undefined") return;
  const params = { value, currency };
  window.fbq?.("track", "Purchase", params, { eventID: orderId });
  window.ttq?.track?.("CompletePayment", params);
}

// Minimal TikTok pixel loader (Meta's base loads in the document head).
function loadTikTok(id: string): void {
  /* eslint-disable */
  (function (w: any, d: any, t: string) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = function (obj: any, m: string) {
      obj[m] = function () {
        obj.push([m].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.load = function (i: string) {
      const s = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[i] = [];
      ttq._i[i]._u = s;
      ttq._t = ttq._t || {};
      ttq._t[i] = +new Date();
      const e = d.createElement("script");
      e.type = "text/javascript";
      e.async = true;
      e.src = s + "?sdkid=" + i + "&lib=" + t;
      const a = d.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(e, a);
    };
    ttq.load(id);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
}
