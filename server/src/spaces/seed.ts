import type { Store } from '../store/types.js';
import { SPACES, type SpaceMessage } from './spaces.service.js';

/** The official account that opens each room. It is a label, not a person: it has no passport. */
export const TEAM_LOGIN = 'equipe-koradevs';

const WELCOME: Record<string, string> = {
  general: 'Bienvenue sur KoraDevs ! Présente-toi en une phrase : ta ville, ta techno, ce que tu construis. Ici on s’entraide en français, sans jugement.',
  bugs: 'Un bug te résiste ? Colle le message d’erreur (sans mot de passe, ils sont masqués de toute façon) et dis ce que tu as déjà essayé. Pour une aide en direct dans une salle de code, utilise « Demander de l’aide ».',
  javascript: 'JavaScript, TypeScript, Node : pose tes questions, partage tes trouvailles. Astuce : cherche d’abord dans les Fiches, ton erreur y est peut-être déjà.',
  react: 'React, Next et interfaces web. Montre ce que tu construis, on te fera des retours.',
  python: 'Python, Django, Flask, données. Débutants bienvenus : il n’y a pas de question bête.',
  php: 'PHP, Laravel, WordPress. Pense à préciser ta version de PHP quand tu demandes de l’aide.',
  java: 'Java, Kotlin et Android. Les journaux d’erreur complets aident beaucoup.',
  sql: 'PostgreSQL, MySQL, modélisation. Partage la requête et la structure de tes tables.',
  devops: 'Docker, déploiement, serveurs, CI. Dis où tu déploies (Render, VPS, Systalink…).',
  mobile: 'Flutter, React Native, applications Android et iOS. Une capture d’écran de l’erreur vaut mille mots.',
};

/** Opens each room with a welcome message. Fixed ids: running it again changes nothing. */
export async function seedSpaces(store: Store): Promise<void> {
  const at = '2026-01-01T00:00:00.000Z';
  for (const space of SPACES) {
    const text = WELCOME[space.id];
    if (!text) continue;
    const message: SpaceMessage = { id: `bienvenue-${space.id}`, author: TEAM_LOGIN, text, at };
    await store.putDoc(`msg:${space.id}`, message.id, message);
  }
}
