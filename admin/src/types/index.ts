export type ID = string;
export interface Timestamped { createdAt: string; updatedAt: string; }

export interface User extends Timestamped {
  _id: ID; email: string; name: string; role: 'admin' | 'editor'; isActive: boolean;
}
export interface Tag extends Timestamped {
  _id: ID; name: string; slug: string; color?: string; description?: string;
}
export interface Project extends Timestamped {
  _id: ID; title: string; slug: string; subtitle?: string;
  description?: string; longDescription?: string;
  techStack: string[]; tags: Tag[] | ID[];
  coverImage?: string; gallery: string[]; demoVideo?: string;
  liveUrl?: string; repoUrl?: string;
  featured: boolean; order: number;
  status: 'draft' | 'published' | 'archived';
  year?: number;
}
export type SkillCategory = 'frontend' | 'backend' | 'tools' | 'design' | 'other';
export interface Skill extends Timestamped {
  _id: ID; name: string; category: SkillCategory; level: number;
  icon?: string; order: number; visible: boolean;
}
export interface Experience extends Timestamped {
  _id: ID; title: string; company: string; location?: string;
  startDate: string; endDate?: string; current: boolean;
  description?: string; achievements: string[]; techStack: string[]; order: number;
}
export interface Education extends Timestamped {
  _id: ID; school: string; degree: string; field?: string; location?: string;
  startDate: string; endDate?: string; description?: string; order: number;
}
export interface Contact extends Timestamped {
  _id: ID; name: string; email: string; subject?: string; message: string;
  read: boolean; archived: boolean; ip?: string; userAgent?: string;
}
