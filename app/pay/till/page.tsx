"use client";

import { useRouter } from "next/navigation";
import AuthGuard from "@/components/auth/AuthGuard";
import { MpesaSendModePage } from "@/components/mpesa/MpesaSendModePage";

export default function PayTillPage() {
  const router = useRouter();

  return (
    <AuthGuard redirectTo="/onboarding">
      <MpesaSendModePage mode="buygoods" onBack={() => router.push("/pay")} />
    </AuthGuard>
  );
}

