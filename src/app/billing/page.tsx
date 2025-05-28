"use client";

import { PricingSection } from "~/components/Billing/PricingSection";
import { Usage } from "~/components/Billing/Usage";
import { Separator } from "~/components/ui/separator";
import "~/styles/globals.css";

export default function Billing() {
  return (
    <div className="flex w-full flex-col px-10 py-10">
      <div className="mx-auto mb-10 w-full max-w-4xl">
        <Usage />
      </div>

      <Separator className="my-2 w-full" />

      <div className="mx-auto w-full max-w-xl">
        <PricingSection />
      </div>
    </div>
  );
}
