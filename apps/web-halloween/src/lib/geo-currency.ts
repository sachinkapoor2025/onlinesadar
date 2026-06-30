import { headers } from "next/headers";
import { parseViewerGeoFromHeaders, type ViewerGeo } from "@hr-ecom/shared";

/** Full geo from CloudFront edge headers on Amplify (country, region, city). */
export async function detectViewerGeo(): Promise<ViewerGeo & { country: string }> {
  const h = await headers();
  const record: Record<string, string> = {};
  h.forEach((value, key) => {
    record[key.toLowerCase()] = value;
  });
  const geo = parseViewerGeoFromHeaders(record);
  return { country: geo.country ?? "US", ...geo };
}

/** ISO 3166-1 alpha-2 country from CDN / edge headers (CloudFront on Amplify). */
export async function detectViewerCountry(): Promise<string> {
  const geo = await detectViewerGeo();
  return geo.country;
}

/** Map visitor country to default storefront currency. */
export function defaultCurrencyForCountry(country: string): "USD" | "INR" {
  if (country === "IN") return "INR";
  return "USD";
}
