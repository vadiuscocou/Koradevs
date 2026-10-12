import { Inject, Injectable } from '@nestjs/common';
import type { SolutionHit } from '@sos/shared';
import type { Store } from '../store/types.js';
import { STORE } from '../tokens.js';
import { solutionWords } from './words.js';

const MIN_SCORE = 0.35;
const TECH_BONUS = 0.1;

@Injectable()
export class SolutionsService {
  constructor(@Inject(STORE) private readonly store: Store) {}

  /** Sheets whose title or error share enough words with the user's error. */
  async search(query: string, tech: string[], limit = 3): Promise<SolutionHit[]> {
    const words = solutionWords(query);
    if (!words.length) return [];
    const candidates = await this.store.findSolutionCandidates(words, 20);
    return candidates
      .map((s) => {
        const signature = new Set(solutionWords(`${s.title} ${s.error}`, 1000));
        const shared = words.filter((w) => signature.has(w)).length / words.length;
        const bonus = s.tech.some((t) => tech.includes(t)) ? TECH_BONUS : 0;
        const score = Math.min(1, Math.round((shared + (shared > 0 ? bonus : 0)) * 100) / 100);
        return { id: s.id, title: s.title, error: s.error, cause: s.cause, fix: s.fix, tech: s.tech, score };
      })
      .filter((hit) => hit.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async recent(limit = 20): Promise<SolutionHit[]> {
    const list = await this.store.listSolutions(limit);
    return list.map((s) => ({
      id: s.id,
      title: s.title,
      error: s.error,
      cause: s.cause,
      fix: s.fix,
      tech: s.tech,
      score: 1,
    }));
  }
}
