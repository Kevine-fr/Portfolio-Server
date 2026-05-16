import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { About } from './about.schema';
import { UpdateAboutDto } from './about.dto';

// Default content used when the singleton has not been created yet
// or when an existing record is missing some of the newer fields.
const DEFAULT_ABOUT = {
  kind: 'default',

  // Hero
  firstName: 'Kevine',
  lastName:  'DIANTOUADI',
  tagline:   "Experiences web immersives a la croisee du design, de la 3D et de l'ingenierie logicielle.",
  roles: [
    'Developpeur Full-Stack',
    'Architecte Cloud',
    'Passionne 3D & WebGL',
    'Creative Developer',
  ],
  stats: [
    { label: 'ANS XP',   value: 3,  order: 0 },
    { label: 'PROJETS',  value: 20, order: 1 },
    { label: 'TECHNOS',  value: 12, order: 2 },
  ],

  // About
  title: 'Qui suis-je ?',
  bio:
    "Developpeur passionne par la convergence du **design**, de la **3D** et de l'**ingenierie logicielle**. " +
    "Je construis des interfaces qui marquent — entre rigueur technique et imagination visuelle.",
  cvUrl: '',
  cvFilename: '',
  timeline: [
    { year: '2021', title: 'Premiere ligne de code',  description: 'Decouverte du HTML/CSS via un site perso.', order: 0 },
    { year: '2022', title: 'Plongee dans React',      description: 'Premieres applications web interactives.',  order: 1 },
    { year: '2023', title: 'Apprentissage backend',   description: 'Node.js, bases de donnees, architecture API.', order: 2 },
    { year: '2024', title: 'Specialisation 3D',       description: 'Three.js, WebGL, experiences immersives.', order: 3 },
    { year: '2025', title: "Aujourd'hui",             description: 'Creative developer full-stack.', order: 4 },
  ],
  values: [
    { icon: '◆', title: 'Precision',  description: 'Code propre, performance et accessibilite avant tout.',    order: 0 },
    { icon: '✦', title: 'Curiosite',  description: 'Veille technologique constante, exploration permanente.', order: 1 },
    { icon: '◈', title: 'Creativite', description: "Chercher l'experience qui marque, pas juste l'utile.",    order: 2 },
    { icon: '✧', title: 'Rigueur',    description: 'Architecture pensee, tests, documentation.', order: 3 },
  ],
};

@Injectable()
export class AboutService {
  constructor(@InjectModel(About.name) private model: Model<About>) {}

  async get(): Promise<any> {
    let doc = await this.model.findOne({ kind: 'default' }).lean();
    if (!doc) {
      await this.model.create(DEFAULT_ABOUT);
      doc = await this.model.findOne({ kind: 'default' }).lean();
    }
    // Backfill missing fields with defaults — preserves forward-compat for existing records
    // created before Hero fields were added.
    return { ...DEFAULT_ABOUT, ...doc };
  }

  async update(dto: UpdateAboutDto): Promise<any> {
    const updated = await this.model.findOneAndUpdate(
      { kind: 'default' },
      { $set: dto },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return { ...DEFAULT_ABOUT, ...updated };
  }
}
