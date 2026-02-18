"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { MpesaSendModePage } from "@/components/mpesa/MpesaSendModePage";

export default function PayPaybillPage() {
  const router = useRouter();

  return (
    <AuthGuard redirectTo="/onboarding">
      <MpesaSendModePage mode="paybill" onBack={() => router.push("/pay")} />
    </AuthGuard>
  );
}

