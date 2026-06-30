"use client";

import { ORDER_TYPES, type OrderType } from "@onlinesadar/shared";

const OPTIONS: { value: OrderType; label: string; desc: string }[] = [
  { value: ORDER_TYPES.BULK, label: "Bulk order", desc: "Pay full amount online" },
  { value: ORDER_TYPES.SAMPLE, label: "Sample order", desc: "Try before bulk purchase" },
  { value: ORDER_TYPES.TOKEN, label: "Token booking", desc: "Pay 20% now, balance to seller later" },
];

export function CheckoutOrderTypePicker({
  value,
  onChange,
  hasSampleItems,
}: {
  value: OrderType;
  onChange: (v: OrderType) => void;
  hasSampleItems: boolean;
}) {
  return (
    <div className="border rounded-xl p-4 bg-white space-y-2">
      <p className="text-sm font-semibold text-slate-800">Order type</p>
      {OPTIONS.map((opt) => {
        const disabled = opt.value === ORDER_TYPES.SAMPLE && !hasSampleItems;
        return (
          <label
            key={opt.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer ${
              value === opt.value ? "border-orange-500 bg-orange-50" : "border-slate-200"
            } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="orderType"
              value={opt.value}
              checked={value === opt.value}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-sm block">{opt.label}</span>
              <span className="text-xs text-slate-500">{opt.desc}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}
