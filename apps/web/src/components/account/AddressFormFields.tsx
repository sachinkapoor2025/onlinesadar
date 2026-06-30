"use client";

import type { ShippingAddress } from "@onlinesadar/shared";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import { US_STATES } from "@/lib/shipping-address";

export function AddressFormFields({
  value,
  onChange,
}: {
  value: ShippingAddress;
  onChange: (value: ShippingAddress) => void;
}) {
  const update = (field: keyof ShippingAddress, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-4">
      <LeadCaptureInput
        label="Recipient name"
        value={value.name}
        onChange={(e) => update("name", e.target.value)}
        required
        autoComplete="name"
      />
      <LeadCaptureInput
        label="Email"
        type="email"
        value={value.email}
        onChange={(e) => update("email", e.target.value)}
        required
        autoComplete="email"
      />
      <LeadCaptureInput
        label="Phone (optional)"
        type="tel"
        value={value.phone ?? ""}
        onChange={(e) => update("phone", e.target.value)}
        autoComplete="tel"
      />
      <LeadCaptureInput
        label="Street address"
        value={value.line1}
        onChange={(e) => update("line1", e.target.value)}
        required
        autoComplete="address-line1"
      />
      <LeadCaptureInput
        label="Apartment, suite, etc. (optional)"
        value={value.line2 ?? ""}
        onChange={(e) => update("line2", e.target.value)}
        autoComplete="address-line2"
      />
      <div className="grid sm:grid-cols-2 gap-4">
        <LeadCaptureInput
          label="City"
          value={value.city}
          onChange={(e) => update("city", e.target.value)}
          required
          autoComplete="address-level2"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            value={value.state}
            onChange={(e) => update("state", e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent bg-white"
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <LeadCaptureInput
          label="ZIP code"
          value={value.postalCode}
          onChange={(e) => update("postalCode", e.target.value)}
          required
          inputMode="numeric"
          autoComplete="postal-code"
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
          <input
            type="text"
            value="United States"
            readOnly
            className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-600"
          />
        </div>
      </div>
    </div>
  );
}
