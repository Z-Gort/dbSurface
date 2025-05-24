import { useRouter } from "next/navigation";
import { PlanCard } from "../Billing/PlanCard";
import { trpc } from "~/lib/client";

const currentPlan = "sdf";
const subscriptionId = "asd";

export function PricingSection() {
  const router = useRouter();
  const checkout = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => router.push(url!),
  });
  
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
          isCurrent={true}
        />

        <PlanCard
          title="Pro"
          price="$13"
          features={[
            "200 projections",
            "40,000,000 projected rows",
            "Support on GitHub",   
          ]}
          isCurrent={false}
          buttonLabel={
            currentPlan === "price_pro" ? "Manage subscription" : "Upgrade"
          }
          accent="primary"
          onClick={() => {
            if (currentPlan === "price_pro") {
              // create Customer‑Portal deep link ➜ redirect
            } else {
              checkout.mutate();
            }
          }}
          loading={checkout.isLoading}
        />
      </div>
    </section>
  );
}
