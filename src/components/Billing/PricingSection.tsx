import { PlanCard } from "../Billing/PlanCard";

// You already fetched these from tRPC or props:
const currentPriceId = "sdf";
const subscriptionId = "asd";

export function PricingSection() {
  return (
    <section className="mx-auto max-w-5xl py-8 lg:py-16">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {/* Free */}
        <PlanCard
          title="Free"
          price="$0"
          features={[
            "10 projections",
            "250,000 projected rows",
            "Support on GitHub",
          ]}
          isCurrent={currentPriceId === null}

          // No button for free plan
        />

        {/* Pro */}
        <PlanCard
          title="Pro"
          price="$13"
          features={[
            "200 projections",
            "40,000,000 projected rows",
            "Support on GitHub",
          ]}
          isCurrent={true}
          buttonLabel={
            currentPriceId === "price_pro" ? "Manage subscription" : "Upgrade"
          }
          accent="primary"
          onClick={() => {
            if (currentPriceId === "price_pro") {
              // create Customer‑Portal deep link ➜ redirect
            } else {
              // create Checkout Session ➜ redirect
            }
          }}
        />
      </div>
    </section>
  );
}
