import { Progress } from "~/components/ui/progress";
import { trpc } from "~/lib/client";
import { format } from "date-fns";

export function Usage() {
  const { data: currentPlan } = trpc.users.getUser.useQuery();
  const { data: remainingUsage } = trpc.users.remainingUsage.useQuery();

  const ready = !!currentPlan && !!remainingUsage;

  const rowsLimit = currentPlan?.plan === "pro" ? 40_000_000 : 250_000;
  const projLimit = currentPlan?.plan === "pro" ? 100 : 10;

  const rowsUsed = ready ? rowsLimit - remainingUsage.remainingRows : 0;
  const projUsed = ready ? projLimit - remainingUsage.remainingProjections : 0;

  const rowsPct = ready ? (rowsUsed / rowsLimit) * 100 : 0;
  const projPct = ready ? (projUsed / projLimit) * 100 : 0;

  const resetLabel =
    ready && currentPlan.subscriptionPeriodEnd
      ? `Usage resets on ${format(
          currentPlan.subscriptionPeriodEnd,
          "MMM d, yyyy",
        )}`
      : "Usage resets on...";

  return (
    <div className="space-y-4">
      {resetLabel && (
        <p className="text-sm font-medium text-muted-foreground">{resetLabel}</p>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-sm font-medium">
          <span>Rows used</span>
          {ready && (
            <span>
              {rowsUsed.toLocaleString()} / {rowsLimit.toLocaleString()}
            </span>
          )}
        </div>
        <Progress value={rowsPct} />
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-sm font-medium">
          <span>Projections used</span>
          {ready && (
            <span>
              {projUsed} / {projLimit}
            </span>
          )}
        </div>
        <Progress value={projPct} />
      </div>
    </div>
  );
}
