"use client";

import {
  formatE164,
  orderedCountryDialCodes,
} from "@/lib/country-codes";

const COUNTRIES = orderedCountryDialCodes();

interface PhoneInputProps {
  label?: string;
  countryIso: string;
  localNumber: string;
  onCountryChange: (iso: string) => void;
  onLocalNumberChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export function PhoneInput({
  label = "Phone",
  countryIso,
  localNumber,
  onCountryChange,
  onLocalNumberChange,
  required = false,
  placeholder = "Phone number",
  className = "",
}: PhoneInputProps) {
  const selected = COUNTRIES.find((c) => c.iso === countryIso) ?? COUNTRIES[0];

  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <select
          value={selected.iso}
          onChange={(e) => onCountryChange(e.target.value)}
          aria-label="Country code"
          className="w-[min(100%,11rem)] shrink-0 border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
        >
          {COUNTRIES.map((c) => (
            <option key={c.iso} value={c.iso}>
              {c.dial} {c.name}
            </option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={localNumber}
          onChange={(e) => onLocalNumberChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2"
        />
      </div>
    </div>
  );
}

export function buildPhoneValue(countryIso: string, localNumber: string): string {
  const country = COUNTRIES.find((c) => c.iso === countryIso);
  if (!country) return formatE164("+91", localNumber);
  return formatE164(country.dial, localNumber);
}
