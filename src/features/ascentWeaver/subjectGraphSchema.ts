import { z } from 'zod';

const graphPrerequisiteEntrySchema = z.union([
  z.string().min(1),
  z.object({
    topicId: z.string().min(1),
    minLevel: z.number().int().min(1),
  }),
]);

export const graphNodeSchema = z.object({
  topicId: z.string().min(1),
  title: z.string().min(1),
  tier: z.number().int().positive(),
  prerequisites: z.array(graphPrerequisiteEntrySchema),
  learningObjective: z.string().min(1),
});

export const subjectGraphSchema = z.object({
  subjectId: z.string().min(1),
  title: z.string().min(1),
  themeId: z.string().min(1),
  maxTier: z.number().int().positive(),
  nodes: z.array(graphNodeSchema).min(1),
});

export type ParsedSubjectGraph = z.infer<typeof subjectGraphSchema>;
