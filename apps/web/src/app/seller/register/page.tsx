"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { Seller } from "@onlinesadar/shared";

type Step = "coupon" | "account" | "business" | "done";

export default function SellerRegisterPage() {
  const router = useRouter();
  const { user, login, register, token } = useAuth();
  const [step, setStep] = useState<Step>("coupon");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponExpires, setCouponExpires] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seller, setSeller] = useState<Seller | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState<"manufacturer" | "wholesaler" | "trader">("wholesaler");
  const [gstin, setGstin] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("Delhi");
  const [state, setState] = useState("Delhi");
  const [postalCode, setPostalCode] = useState("110006");

  async function requestCoupon(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ code: string; expiresAt: string }>("/sellers/trial-coupon", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setCouponCode(data.code);
      setCouponExpires(data.expiresAt);
      setStep("account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not issue coupon");
    } finally {
      setLoading(false);
    }
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!user) {
        await register(email, password, contactName || businessName);
        await login(email, password);
      }
      setStep("business");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Account creation failed");
    } finally {
      setLoading(false);
    }
  }

  async function submitBusiness(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const authToken = token ?? loadToken();
      const data = await api<{ seller: Seller }>("/sellers/register", {
        method: "POST",
        token: authToken,
        body: JSON.stringify({
          businessName,
          contactName,
          phone,
          businessType,
          gstin: gstin || undefined,
          addressLine1,
          city,
          state,
          postalCode,
          country: "IN",
          trialCouponCode: couponCode,
        }),
      });
      setSeller(data.seller);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function loadToken(): string | undefined {
    if (typeof window === "undefined") return undefined;
    try {
      const raw = localStorage.getItem("onlinesadar_auth");
      return raw ? (JSON.parse(raw) as { token?: string }).token : undefined;
    } catch {
      return undefined;
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <Link href="/seller" className="text-sm text-slate-500 hover:text-primary">
        ← Back to seller info
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">Seller registration</h1>
      <p className="text-slate-600 mb-8">
        Step {step === "coupon" ? 1 : step === "account" ? 2 : step === "business" ? 3 : 4} of 4
      </p>

      {error && <p className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

      {step === "coupon" && (
        <form onSubmit={requestCoupon} className="space-y-4">
          <p className="text-sm text-slate-600">
            Enter your business email to receive a trial signup coupon valid for <strong>4 hours</strong>.
          </p>
          <label className="block">
            <span className="text-sm font-medium">Business email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Sending..." : "Get trial coupon"}
          </button>
        </form>
      )}

      {step === "account" && (
        <form onSubmit={createAccount} className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm">
            <p className="font-semibold text-green-800">Coupon: {couponCode}</p>
            <p className="text-green-700">Valid until {new Date(couponExpires).toLocaleString()}</p>
          </div>
          {user ? (
            <p className="text-sm">Logged in as {user.email}. Continue to business details.</p>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium">Password</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                />
              </label>
            </>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Please wait..." : user ? "Continue" : "Create account & continue"}
          </button>
        </form>
      )}

      {step === "business" && (
        <form onSubmit={submitBusiness} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Business name *</span>
            <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Contact person *</span>
            <input required value={contactName} onChange={(e) => setContactName(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Phone *</span>
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Business type *</span>
            <select value={businessType} onChange={(e) => setBusinessType(e.target.value as typeof businessType)} className="mt-1 w-full border rounded-lg px-3 py-2">
              <option value="manufacturer">Manufacturer</option>
              <option value="wholesaler">Wholesaler</option>
              <option value="trader">Trader</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium">GSTIN (optional at signup)</span>
            <input value={gstin} onChange={(e) => setGstin(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Business address *</span>
            <input required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">City</span>
              <input required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Pincode</span>
              <input required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" />
            </label>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-primary text-white py-3 rounded-lg font-semibold disabled:opacity-50">
            {loading ? "Registering..." : "Complete seller registration"}
          </button>
        </form>
      )}

      {step === "done" && seller && (
        <div className="text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-bold">Welcome, {seller.businessName}!</h2>
          <p className="text-slate-600">
            Your 90-day trial is active until{" "}
            {seller.trialEndsAt ? new Date(seller.trialEndsAt).toLocaleDateString() : "—"}.
          </p>
          <Link
            href="/seller/products/new"
            className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            List your first product
          </Link>
        </div>
      )}
    </div>
  );
}
