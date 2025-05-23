import { trpc } from "~/lib/client";
import { Button } from "../ui/button";

export function BillingPage() {
  const createCustomerPortal = trpc.stripe.createCustomerPortal.useMutation({
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
    trpc: {
      context: { source: "local" },
    },
  });

  return (
    <Button variant="outline" onClick={() => createCustomerPortal.mutate()}>
      Manage Subscription
    </Button>
  );
}
