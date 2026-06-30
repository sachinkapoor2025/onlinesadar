import { NextResponse } from "next/server";
import { defaultCurrencyForCountry, detectViewerGeo } from "@/lib/geo-currency";

export async function GET() {
  const geo = await detectViewerGeo();
  const currency = defaultCurrencyForCountry(geo.country);

  return NextResponse.json(
    {
      country: geo.country,
      region: geo.region,
      regionName: geo.regionName,
      city: geo.city,
      currency,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=3600",
      },
    }
  );
}

export const runtime = "nodejs";
