import { trpc } from "~/lib/client";
import { Button } from "../ui/button";
import { PricingSection } from "./PricingSection";

export function BillingPage() {
  const createCustomerPortal = trpc.stripe.createCustomerPortal.useMutation({
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

  return (
    <>
      <Button variant="outline" onClick={() => createCustomerPortal.mutate()}>
        Manage Subscription
      </Button>
      <PricingSection />
    </>
  );
}