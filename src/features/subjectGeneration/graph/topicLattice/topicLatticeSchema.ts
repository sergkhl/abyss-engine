import { z } from 'zod';

const kebabTopicId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const topicLatticeNodeSchema = z.object({
  topicId: z
    .string()
    .min(1)
    .refine((id) => kebabTopicId.test(id), { message: 'topicId must be lowercase kebab-case' }),
  title: z.string().min(1),
  tier: z.number().int().positive(),
  learningObjective: z.string().min(1),
});

export const topicLatticeResponseSchema = z.object({
  topics: z.array(topicLatticeNodeSchema).min(1),
});
