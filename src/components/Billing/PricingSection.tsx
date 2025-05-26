import { useRouter } from "next/navigation";
import { trpc } from "~/lib/client";
import { PlanCard } from "../Billing/PlanCard";

export function PricingSection() {
  const router = useRouter();
  const customerPortal = trpc.stripe.createCustomerPortal.useMutation({
    onSuccess: ({ url }) => router.push(url),
  });
  const getUser = trpc.users.getUser.useQuery();
  const currentPlan = getUser.isLoading ? undefined : getUser.data!.plan;

  function getButtonLabel(currentPlan: string | undefined) {
    if (getUser.isLoading) {
      return "Loading...";
    }
    if (currentPlan === "pro") {
      return "Manage Subscription";
    } else {
      return "Upgrade";
    }
  }

  function getVariant(currentPlan: string | undefined) {
    if (getUser.isLoading) {
      return "outline";
    }
    if (currentPlan === "pro") {
      return "outline";
    } else {
      return "default";
    }
  }

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
          buttonLabel={getButtonLabel(currentPlan)}
          variant={getVariant(currentPlan)}
          accent="primary"
          onClick={() => {
            customerPortal.mutate();
          }}
          loading={
            customerPortal.isLoading ||
            getUser.isLoading
          }
        />
      </div>
    </section>
  );
}
