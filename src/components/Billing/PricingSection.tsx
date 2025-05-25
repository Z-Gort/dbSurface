import { useRouter } from "next/navigation";
import { PlanCard } from "../Billing/PlanCard";
import { trpc } from "~/lib/client";

export function PricingSection() {
  const router = useRouter();
  const checkout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => router.push(url!),
  });
  const customerPortal = trpc.stripe.createCustomerPortal.useMutation({
    onSuccess: ({ url }) => router.push(url),
  });
  const { data: currentPlan } = trpc.stripe.getUserPlan.useQuery();

  return (
    <section className="mx-auto max-w-5xl py-8 lg:py-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        <PlanCard
          title="Free"
          price="$0"
          features={[
            "10 projections",
            "250,000 projected rows",
            "Support on GitHub",
          ]}
          isCurrent={currentPlan === "free"}
        />

        <PlanCard
          title="Pro"
          price="$13"
          features={[
            "200 projections",
            "40,000,000 projected rows",
            "Support on GitHub",
          ]}
          isCurrent={currentPlan === "pro"}
          buttonLabel={
            currentPlan === "pro" ? "Manage Subscription" : "Upgrade"
          }
          variant={currentPlan === "pro" ? "outline" : "default"}
          accent="primary"
          onClick={() => {
            if (currentPlan === "pro") {
              customerPortal.mutate();
            } else {
              checkout.mutate();
            }
          }}
          loading={checkout.isLoading || customerPortal.isLoading}
        />
      </div>
    </section>
  );
}
