export const PRODUCT = {
  id: "viso-01-ghost",
  name: "VISO .01",
  codename: "Ghost",
  priceCents: 24900,
  currency: "usd",
  tagline: "Anti-surveillance eyewear. Invisible to eyes. Blinding to sensors.",
  description:
    "A pair of IR-emitting frames that flood nearby CMOS sensors with 850nm and 940nm light while remaining invisible to the human eye. Walk into any camera. Walk out a smudge.",
  specs: [
    { label: "Runtime", value: "4 hours continuous" },
    { label: "Charge", value: "USB-C, 45 min to full" },
    { label: "Emitters", value: "12× dual-band IR (850nm + 940nm)" },
    { label: "Frame", value: "Grade 5 titanium, matte PVD coating" },
    { label: "Weight", value: "42 g" },
    { label: "Lens", value: "Polycarbonate, Rx-ready" },
    { label: "Ingress", value: "IPX4 (rain, sweat)" },
    { label: "Indicator", value: "None. Discretion is the point." },
  ],
} as const;

export function formatPrice(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
