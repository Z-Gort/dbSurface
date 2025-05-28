"use client";

import { PricingSection } from "~/components/Billing/PricingSection";
import { Usage } from "~/components/Billing/Usage";
import { Separator } from "~/components/ui/separator";
import "~/styles/globals.css";

export default function Billing() {
  return (
    <div className="flex w-full flex-col px-10 py-10">
      {/* Usage section — now stretches to the full 4 xl max width */}
      <div className="mb-10 w-full max-w-4xl mx-auto">  {/* <- changed */}
        <Usage />
      </div>

      <Separator className="my-2 w-full" />

      {/* Pricing cards keep the narrower look */}
      <div className="w-full max-w-xl mx-auto">
        <PricingSection />
      </div>
    </div>
  );
}
