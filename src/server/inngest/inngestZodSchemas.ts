import { z } from "zod";

export const subscriptionSchema = z.object({
  data: z.object({
    object: z.object({
      customer: z.string(),
      items: z.object({
        data: z
          .array(
            z.object({
              price: z.object({
                id: z.string(),
              }),
            }),
          )
          .nonempty(),
      }),
    }),
  }),
});

export const invoicePaidSchema = z.object({
  data: z.object({
    object: z.object({
      customer: z.string(),
      lines: z.object({
        data: z
          .array(
            z.object({
              period: z.object({
                end: z.number(),
              }),
            }),
          )
          .nonempty(),
      }),
    }),
  }),
});

export const stripeHookEnvelope = z.object({
  raw: z.string(),
  sig: z.string(),
  evt: z.unknown().optional(),
});

export const EmailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
});

export const ClerkUserSchema = z.object({
  id: z.string(),
  email_addresses: z.array(EmailAddressSchema),
  primary_email_address_id: z.string(),
});

export const ClerkUpdateAddSchema = z.object({
  data: ClerkUserSchema,
});

export const ClerkDeleteSchema = z.object({
  data: z.object({
    id: z.string(),
  }),
});
