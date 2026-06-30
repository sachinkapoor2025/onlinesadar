"use client";

import { useEffect, useState } from "react";
import type { ShippingAddress } from "@hr-ecom/shared";
import { LeadCaptureInput } from "@/components/LeadCaptureInput";
import {
  US_STATES,
  emptyShippingAddress,
  loadSavedAddresses,
  saveShippingAddress,
  deleteSavedAddress,
  formatAddressLine,
  type SavedShippingAddress,
} from "@/lib/shipping-address";

interface Props {
  value: ShippingAddress;
  onChange: (address: ShippingAddress) => void;
  onFieldLeadCapture?: (field: string, value: string) => void;
  saveForLater: boolean;
  onSaveForLaterChange: (checked: boolean) => void;
}

export function ShippingAddressForm({
  value,
  onChange,
  onFieldLeadCapture,
  saveForLater,
  onSaveForLaterChange,
}: Props) {
  const [saved, setSaved] = useState<SavedShippingAddress[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const addresses = loadSavedAddresses();
    setSaved(addresses);
  }, []);

  useEffect(() => {
    if (!saved.length || !value.line1) return;
    const match = saved.find(
      (a) =>
        a.line1 === value.line1 &&
        a.city === value.city &&
        a.postalCode === value.postalCode &&
        a.name === value.name
    );
    if (match) setSelectedId(match.id);
  }, [saved, value.line1, value.city, value.postalCode, value.name]);

  const update = (field: keyof ShippingAddress, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
    if (onFieldLeadCapture && (field === "name" || field === "email" || field === "phone")) {
      onFieldLeadCapture(field, fieldValue);
    }
  };

  const useSaved = (address: SavedShippingAddress) => {
    setSelectedId(address.id);
    onChange({
      name: address.name,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone,
      email: address.email,
    });
  };

  const startNewAddress = () => {
    setSelectedId(null);
    onChange({ ...emptyShippingAddress(), email: value.email, phone: value.phone });
  };

  const handleDeleteSaved = (id: string) => {
    deleteSavedAddress(id);
    const next = loadSavedAddresses();
    setSaved(next);
    if (selectedId === id) {
      setSelectedId(null);
      onChange(emptyShippingAddress());
    }
  };

  const handleSaveCurrent = () => {
    const entry = saveShippingAddress(value);
    setSaved(loadSavedAddresses());
    setSelectedId(entry.id);
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Shipping Address</h2>
        <p className="text-sm text-slate-600 mt-1">
          Enter the US delivery address for your brother or recipient. We ship domestically within all 50 states.
        </p>
      </div>

      {saved.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-700">Saved addresses</p>
            <button
              type="button"
              onClick={startNewAddress}
              className="text-sm text-nav font-medium hover:underline"
            >
              + Add new
            </button>
          </div>
          <ul className="space-y-2">
            {saved.map((address) => {
              const active = selectedId === address.id;
              return (
                <li
                  key={address.id}
                  className={`rounded-lg border p-3 text-sm transition ${
                    active ? "border-nav bg-violet-50/50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => useSaved(address)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="font-semibold text-slate-900">{address.label}</p>
                      <p className="text-slate-600 truncate">{address.name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{formatAddressLine(address)}</p>
                    </button>
                    <div className="flex shrink-0 gap-2">
                      {!active && (
                        <button
                          type="button"
                          onClick={() => useSaved(address)}
                          className="text-xs text-nav font-medium hover:underline"
                        >
                          Use
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSaved(address.id)}
                        className="text-xs text-red-500 hover:underline"
                        aria-label={`Delete ${address.label}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="space-y-4 pt-1">
        {saved.length > 0 && selectedId === null && value.line1 && (
          <p className="text-sm font-medium text-slate-700">Delivery address</p>
        )}
        {saved.length > 0 && selectedId === null && !value.line1 && (
          <p className="text-sm text-slate-500">Select a saved address or enter a new one below.</p>
        )}

        <LeadCaptureInput
            label="Recipient name"
            value={value.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Brother's full name"
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
            placeholder="For delivery updates"
            autoComplete="tel"
          />
          <LeadCaptureInput
            label="Street address"
            value={value.line1}
            onChange={(e) => update("line1", e.target.value)}
            placeholder="House number and street"
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
                autoComplete="address-level1"
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
              autoComplete="postal-code"
              inputMode="numeric"
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

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={saveForLater}
                onChange={(e) => onSaveForLaterChange(e.target.checked)}
                className="rounded border-slate-300 text-nav focus:ring-accent"
              />
              Save this address for future orders
            </label>
            <button
              type="button"
              onClick={handleSaveCurrent}
              className="text-sm text-nav font-medium hover:underline"
            >
              Save now
            </button>
          </div>
        </div>
    </section>
  );
}
