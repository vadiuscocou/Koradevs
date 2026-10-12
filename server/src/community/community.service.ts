import { Injectable } from '@nestjs/common';

export interface UserCommunityProfile {
  userId: string;
  login: string;
  city: string;
  country: string;
  bio: string;
  doorStatus: 'ouverte' | 'fermee';
  tech: string[];
  points: number;
  badges: string[];
  confirmedCount: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  status: 'a_faire' | 'en_cours' | 'termine';
  assignee?: string;
}

export interface CommunityProject {
  id: string;
  title: string;
  description: string;
  author: string;
  country: string;
  city: string;
  repoUrl?: string;
  demoUrl?: string;
  tech: string[];
  neededRoles: string[];
  members: string[];
  tasks: ProjectTask[];
  createdAt: string;
}

export interface ReportItem {
  id: string;
  targetType: 'fiche' | 'projet' | 'utilisateur';
  targetId: string;
  reason: 'pas_clair' | 'doublon' | 'inapproprie';
  details?: string;
  reportedBy: string;
  createdAt: string;
}

@Injectable()
export class CommunityService {
  private readonly profiles = new Map<string, UserCommunityProfile>();
  private readonly countryPoints = new Map<string, number>([
    ['Bénin', 28],
    ['Sénégal', 24],
    ["Côte d'Ivoire", 19],
    ['Togo', 14],
    ['Cameroun', 11],
    ['Mali', 7],
    ['Guinée', 5],
  ]);

  private readonly projects: CommunityProject[] = [
    {
      id: 'proj-1',
      title: 'AfriCode Hub',
      description: 'Plateforme open-source pour connecter les écoles tech d’Afrique de l’Ouest et partager des défis de code.',
      author: 'awa',
      country: 'Sénégal',
      city: 'Dakar',
      repoUrl: 'https://github.com/koradevs/africode-hub',
      demoUrl: 'https://africode-demo.org',
      tech: ['React', 'TypeScript', 'Node.js'],
      neededRoles: ['Dev Frontend React', 'UI/UX Designer', 'Dev Backend Node.js'],
      members: ['awa', 'moussa'],
      tasks: [
        { id: 't-1', title: 'Intégrer l’API d’authentification GitHub', status: 'termine', assignee: 'awa' },
        { id: 't-2', title: 'Créer la page vitrine des écoles partenaires', status: 'en_cours', assignee: 'moussa' },
        { id: 't-3', title: 'Ajouter les tests de montée en charge', status: 'a_faire' },
      ],
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'proj-2',
      title: 'KoraPay Mobile',
      description: 'Micro-passerelle de paiement locale pour développeurs freelances sans carte internationale.',
      author: 'koffi',
      country: 'Bénin',
      city: 'Cotonou',
      repoUrl: 'https://github.com/koradevs/korapay-lib',
      tech: ['Flutter', 'Python', 'Docker'],
      neededRoles: ['Dev Mobile Flutter', 'Expert Sécurité'],
      members: ['koffi'],
      tasks: [
        { id: 't-4', title: 'Spécification de l’API REST de webhook', status: 'termine', assignee: 'koffi' },
        { id: 't-5', title: 'Chiffrement des clés d’API privées', status: 'en_cours', assignee: 'koffi' },
        { id: 't-6', title: 'Application mobile de test pour commerçants', status: 'a_faire' },
      ],
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ];

  private readonly reports: ReportItem[] = [];

  constructor() {
    // Seed initial demo neighbors for Quartier
    this.profiles.set('user-awa', {
      userId: 'user-awa',
      login: 'awa',
      city: 'Dakar',
      country: 'Sénégal',
      bio: 'Développeuse full-stack passionnée par TypeScript et l’open-source.',
      doorStatus: 'ouverte',
      tech: ['TypeScript', 'React', 'Node.js'],
      points: 45,
      badges: ['Confirmé', 'Premier Secours', 'Mentor'],
      confirmedCount: 9,
    });
    this.profiles.set('user-koffi', {
      userId: 'user-koffi',
      login: 'koffi',
      city: 'Cotonou',
      country: 'Bénin',
      bio: 'Dev Python/FastAPI & Flutter. Toujours prêt à débloquer un bug async.',
      doorStatus: 'ouverte',
      tech: ['Python', 'Docker', 'PostgreSQL'],
      points: 38,
      badges: ['Confirmé', 'Expert Python'],
      confirmedCount: 7,
    });
    this.profiles.set('user-fatou', {
      userId: 'user-fatou',
      login: 'fatou',
      city: 'Abidjan',
      country: "Côte d'Ivoire",
      bio: 'Ingénieure DevOps et Rust. Porte ouverte le soir pour du live coding.',
      doorStatus: 'ouverte',
      tech: ['Rust', 'Docker', 'TypeScript'],
      points: 25,
      badges: ['Confirmé', 'As du Debug'],
      confirmedCount: 5,
    });
  }

  getProfile(userId: string, login: string): UserCommunityProfile {
    let prof = this.profiles.get(userId);
    if (!prof) {
      prof = {
        userId,
        login,
        city: 'Cotonou',
        country: 'Bénin',
        bio: 'Développeur passionné sur KoraDevs.',
        doorStatus: 'ouverte',
        tech: ['TypeScript', 'React'],
        points: 15,
        badges: ['Confirmé', 'Voisin Bienveillant'],
        confirmedCount: 3,
      };
      this.profiles.set(userId, prof);
    }
    return prof;
  }

  updateProfile(userId: string, login: string, updates: Partial<UserCommunityProfile>): UserCommunityProfile {
    const prof = this.getProfile(userId, login);
    Object.assign(prof, updates);
    this.profiles.set(userId, prof);
    return prof;
  }

  getNeighbors(currentLogin: string): UserCommunityProfile[] {
    return [...this.profiles.values()].filter((p) => p.login !== currentLogin);
  }

  getCountryStats(): Array<{ country: string; points: number }> {
    return [...this.countryPoints.entries()]
      .map(([country, points]) => ({ country, points }))
      .sort((a, b) => b.points - a.points);
  }

  addCountryPoints(country: string, amount = 3): void {
    const cur = this.countryPoints.get(country) ?? 0;
    this.countryPoints.set(country, cur + amount);
  }

  getProjects(): CommunityProject[] {
    return this.projects;
  }

  createProject(author: string, data: { title: string; description: string; tech: string[]; neededRoles: string[]; repoUrl?: string; demoUrl?: string; country?: string; city?: string }): CommunityProject {
    const proj: CommunityProject = {
      id: `proj-${Date.now()}`,
      title: data.title,
      description: data.description,
      author,
      country: data.country || 'Bénin',
      city: data.city || 'Cotonou',
      repoUrl: data.repoUrl,
      demoUrl: data.demoUrl,
      tech: data.tech,
      neededRoles: data.neededRoles,
      members: [author],
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    this.projects.unshift(proj);
    return proj;
  }

  joinProject(projectId: string, login: string): boolean {
    const proj = this.projects.find((p) => p.id === projectId);
    if (!proj) return false;
    if (!proj.members.includes(login)) {
      proj.members.push(login);
    }
    return true;
  }

  addTask(projectId: string, title: string, assignee?: string): ProjectTask | null {
    const proj = this.projects.find((p) => p.id === projectId);
    if (!proj) return null;
    const task: ProjectTask = {
      id: `task-${Date.now()}`,
      title,
      status: 'a_faire',
      assignee,
    };
    proj.tasks.push(task);
    return task;
  }

  updateTaskStatus(projectId: string, taskId: string, status: 'a_faire' | 'en_cours' | 'termine'): boolean {
    const proj = this.projects.find((p) => p.id === projectId);
    if (!proj) return false;
    const task = proj.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    task.status = status;
    return true;
  }

  report(item: Omit<ReportItem, 'id' | 'createdAt'>): ReportItem {
    const rep: ReportItem = {
      id: `rep-${Date.now()}`,
      ...item,
      createdAt: new Date().toISOString(),
    };
    this.reports.push(rep);
    return rep;
  }
}
