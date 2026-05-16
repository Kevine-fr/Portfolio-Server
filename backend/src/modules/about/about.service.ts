import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { About } from './about.schema';
import { UpdateAboutDto } from './about.dto';

// Default content used when the singleton has not been created yet.
const DEFAULT_ABOUT = {
  kind: 'default',
  title: 'Qui suis-je ?',
  bio:
    "Developpeur passionne par la convergence du **design**, de la **3D** et de l'**ingenierie logicielle**. " +
    "Je construis des interfaces qui marquent — entre rigueur technique et imagination visuelle.",
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

  async get(): Promise<About> {
    let doc = await this.model.findOne({ kind: 'default' }).lean();
    if (!doc) {
      // Lazily create the singleton on first read so the API always returns something.
      doc = await this.model.create(DEFAULT_ABOUT);
      // Re-fetch as lean for consistent return type
      return (await this.model.findOne({ kind: 'default' }).lean()) as any;
    }
    return doc as any;
  }

  async update(dto: UpdateAboutDto): Promise<About> {
    const updated = await this.model.findOneAndUpdate(
      { kind: 'default' },
      { $set: dto },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return updated as any;
  }
}
