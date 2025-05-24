"use client";

import { trpc } from "~/lib/client";
import { Button } from "~/components/ui/button";
import { PricingSection } from "~/components/Billing/PricingSection";

export default function BillingPage() {
  const createCustomerPortal = trpc.stripe.createCustomerPortal.useMutation({
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8">
      <Button variant="outline" onClick={() => createCustomerPortal.mutate()}>
        Manage Subscription
      </Button>
      <PricingSection />
    </div>
  );
}
