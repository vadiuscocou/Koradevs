import { Controller, Get, Post, Inject, Query } from '@nestjs/common';
import { z } from 'zod';
import { parseBody } from '../validation.js';
import { SolutionsService } from './solutions.service.js';

const SearchQuery = z.object({
  q: z.string().trim().min(1).max(500),
  tech: z.string().max(500).optional(),
});

/** The solution library is public: no login needed to search it. */
@Controller('solutions')
export class SolutionsController {
  constructor(@Inject(SolutionsService) private readonly solutions: SolutionsService) {}

  @Get('search')
  search(@Query() query: unknown) {
    const { q, tech } = parseBody(SearchQuery, query);
    return this.solutions.search(q, tech ? tech.split(',').map((t) => t.trim()).filter(Boolean) : []);
  }

  @Post('ai-hint')
  aiHint() {
    return { hint: "Il semble que vous ayez oublié d'installer une dépendance ou qu'il y ait une faute de frappe..." };
  }
}
