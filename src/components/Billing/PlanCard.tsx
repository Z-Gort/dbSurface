import { Check, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export interface PlanCardProps {
  title: string;
  price: string;
  period?: string;
  features: string[];
  isCurrent?: boolean;
  buttonLabel?: string;
  variant?: "default" | "outline",
  onClick?: () => void;
  accent?: "default" | "primary";
  loading?: boolean;
}

export function PlanCard({
  title,
  price,
  period = "/month",
  features,
  isCurrent,
  buttonLabel,
  variant,
  onClick,
  loading,
  accent = "default",
}: PlanCardProps) {
  const accentRing =
    accent === "primary" ? "ring-2 ring-primary/50" : "ring-1 ring-border";
  const accentShadow =
    accent === "primary" ? "shadow-lg shadow-primary/10" : "shadow";

  return (
    <Card
      className={`max-w-xs relative flex flex-col overflow-hidden ${accentRing} ${accentShadow}`}
    >
      {isCurrent && (
        <span className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          <Crown className="h-3 w-3" />
          Active
        </span>
      )}

      <CardHeader className="space-y-1">
        <CardTitle className="text-center text-xl font-bold">{title}</CardTitle>

        <div className="py-1 flex items-end justify-center gap-1 text-xl font-semibold font-mono leading-none">
          {price}
          <span className="text-xs font-normal text-muted-foreground">
            {period}
          </span>
        </div>

        <span className="my-2 block h-px w-full bg-border" />
      </CardHeader>

      <CardContent className="flex grow flex-col">
        <ul className="space-y-3 py-0 text-sm">
          {features.map((feat) => (
            <li key={feat} className="flex items-start gap-2 leading-snug">
              <Check className="h-4 w-4 flex-none text-emerald-600" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        <div className="my-2" />

        {buttonLabel && (
          <Button variant={variant} disabled={loading} onClick={onClick} className="w-full">
            {buttonLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
