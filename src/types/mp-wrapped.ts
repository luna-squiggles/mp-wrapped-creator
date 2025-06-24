import { z } from 'zod';

export const mpWrappedSchema = z.object({
  mpName: z.string().min(2, "MP name must be at least 2 characters"),
  constituency: z.string().min(1, "Constituency is required"),
  surgeryHours: z.number().int().nonnegative("Surgery hours must be 0 or positive"),
  casesClosed: z.number().int().nonnegative("Cases closed must be 0 or positive"),
  parliamentContributions: z.number().int().nonnegative("Parliament contributions must be 0 or positive"),
  parliamentVotes: z.number().int().nonnegative("Parliament votes must be 0 or positive"),
  communityVisits: z.object({
    totalEngagements: z.number().int().nonnegative("Total engagements must be 0 or positive"),
    category1: z.object({
      number: z.number().int().nonnegative(),
      label: z.string().min(1, "Category 1 label is required")
    }),
    category2: z.object({
      number: z.number().int().nonnegative(),
      label: z.string().min(1, "Category 2 label is required")
    }),
    category3: z.object({
      number: z.number().int().nonnegative(),
      label: z.string().min(1, "Category 3 label is required")
    })
  }),
  contributionPriorities: z.array(z.string().min(1, "Priority cannot be empty")).length(3, "Exactly 3 contribution priorities required"),
  votePriorities: z.array(z.string().min(1, "Priority cannot be empty")).length(3, "Exactly 3 vote priorities required"),
  localProject: z.object({
    name: z.string().min(1, "Local project name is required"),
    achievement: z.string().min(1, "Local project achievement is required")
  }),
  quote: z.string().max(40, "Quote must be 40 characters or less").min(1, "Quote is required")
});

export type MPWrapped = z.infer<typeof mpWrappedSchema>;