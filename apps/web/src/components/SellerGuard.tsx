"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useApiClient } from "@/lib/auth-context";

export function SellerGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isSeller, isAdmin } = useAuth();
  const apiClient = useApiClient();
  const router = useRouter();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/seller/register?redirect=/seller");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || loading) return;
    apiClient<{ seller: unknown }>("/sellers/me")
      .then(() => setHasProfile(true))
      .catch(() => setHasProfile(false));
  }, [user, loading, apiClient]);

  if (loading || (user && hasProfile === null)) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500">Checking access...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!hasProfile && !isAdmin) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold mb-2">Complete seller registration</h1>
        <p className="text-slate-600 mb-6">
          Your account is not registered as a seller yet. Complete business registration to access the seller dashboard.
        </p>
        <a
          href="/seller/register"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90"
        >
          Register as seller
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
