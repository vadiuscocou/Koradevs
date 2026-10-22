import { BadRequestException } from '@nestjs/common';
import type { z } from 'zod';

/** `friendly`: the message is the first problem itself (for forms a person fills in), not a generic « Requête invalide ». */
export function parseBody<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown, friendly = false): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException({
      statusCode: 400,
      error: 'Bad Request',
      message: friendly ? (result.error.issues[0]?.message ?? 'Requête invalide') : 'Requête invalide',
      issues: result.error.issues.slice(0, 20).map((i) => `${i.path.join('.') || '(racine)'} : ${i.message}`),
    });
  }
  return result.data;
}
