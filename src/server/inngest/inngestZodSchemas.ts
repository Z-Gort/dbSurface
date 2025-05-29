import { z } from "zod";

export const SubscriptionSchema = z.object({
  data: z.object({
    object: z.object({
      customer: z.string(),
      items: z.object({
        data: z
          .array(
            z.object({
              price: z.object({ id: z.string() }),
              current_period_end: z.number(),
              current_period_start: z.number(),
            }),
          )
          .nonempty(),
      }),
    }),
    previous_attributes: z
      .object({
        latest_invoice: z.string().optional(),
        items: z
          .object({
            data: z.array(
              z.object({
                price: z.object({ id: z.string() }),
                current_period_end: z.number(),
                current_period_start: z.number(),
              }),
            ),
          })
          .optional(),
      })
      .optional(),
  }),
});

export const StripeHookEnvelope = z.object({
  raw: z.string(),
  sig: z.string(),
  evt: z.unknown().optional(),
});

export type TierSwitch = "free_to_pro" | "pro_to_free" | "none";

export const KindeEventSchema = z.object({
  type: z.string(),
  data: z.any(),
});

export const KindeUserSchema = z.object({
  user: z.object({
    id: z.string(),
  }),
});
