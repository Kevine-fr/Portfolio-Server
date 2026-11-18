/**
 * In-memory stand-in for a Mongoose Model, used by unit / e2e tests when no
 * MongoDB server is available. Documents are built with the REAL schema
 * (casting, defaults, validation, select:false, unique indexes), only the
 * storage and the query engine are emulated. The supported query subset is
 * the one used by the services; the CI also runs the same flows against a
 * real MongoDB (test/integration).
 */
import mongoose, { Schema, Types } from 'mongoose';

type Doc = Record<string, any>;
type Filter = Record<string, any>;

export function clone<T>(value: T): T {
  if (value instanceof Types.ObjectId) return new Types.ObjectId(value.toHexString()) as any;
  if (value instanceof Date) return new Date(value.getTime()) as any;
  if (Array.isArray(value)) return value.map(clone) as any;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) as any;
  }
  return value;
}

const getPath = (obj: Doc, path: string) =>
  path.split('.').reduce<any>((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);

function setPath(obj: Doc, path: string, value: unknown) {
  const keys = path.split('.');
  let cur = obj;
  for (const k of keys.slice(0, -1)) {
    if (cur[k] === null || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
}

function unsetPath(obj: Doc, path: string) {
  const keys = path.split('.');
  const parent = keys.length > 1 ? getPath(obj, keys.slice(0, -1).join('.')) : obj;
  if (parent && typeof parent === 'object') delete parent[keys[keys.length - 1]];
}

const norm = (v: unknown): unknown =>
  v instanceof Types.ObjectId ? v.toHexString() : v instanceof Date ? v.getTime() : v;

function eq(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify(a.map(norm)) === JSON.stringify(b.map(norm));
  return norm(a) === norm(b) || (a == null && b == null);
}

const isOperatorObject = (v: unknown) =>
  !!v && typeof v === 'object' && !(v instanceof Types.ObjectId) && !(v instanceof Date) && !Array.isArray(v) &&
  Object.keys(v as object).length > 0 && Object.keys(v as object).every((k) => k.startsWith('$'));

function matchValue(actual: unknown, cond: unknown): boolean {
  if (isOperatorObject(cond)) {
    return Object.entries(cond as Doc).every(([op, v]) => {
      switch (op) {
        case '$ne': return !matchValue(actual, v);
        case '$in': return (v as unknown[]).some((x) => matchValue(actual, x));
        case '$nin': return !(v as unknown[]).some((x) => matchValue(actual, x));
        case '$exists': return (actual !== undefined) === !!v;
        case '$gt': return (norm(actual) as any) > (norm(v) as any);
        case '$gte': return (norm(actual) as any) >= (norm(v) as any);
        case '$lt': return (norm(actual) as any) < (norm(v) as any);
        case '$lte': return (norm(actual) as any) <= (norm(v) as any);
        default: throw new Error(`MemoryModel: unsupported operator ${op}`);
      }
    });
  }
  if (Array.isArray(actual) && !Array.isArray(cond)) return actual.some((x) => eq(x, cond));
  return eq(actual, cond);
}

function matches(doc: Doc, filter: Filter = {}): boolean {
  return Object.entries(filter).every(([key, cond]) => {
    if (key === '$or') return (cond as Filter[]).some((f) => matches(doc, f));
    if (key === '$and') return (cond as Filter[]).every((f) => matches(doc, f));
    return matchValue(getPath(doc, key), cond);
  });
}

function castId(id: unknown): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
    throw new mongoose.Error.CastError('ObjectId', id, '_id');
  }
  return new Types.ObjectId(id);
}

class MemoryQuery<T> implements PromiseLike<T> {
  private projection?: string;
  private sortSpec?: Record<string, 1 | -1>;

  constructor(
    private readonly run: () => T,
    private readonly post: (value: T, projection?: string, sort?: Record<string, 1 | -1>) => T,
  ) {}

  select(p: string) { this.projection = p; return this; }
  sort(s: Record<string, 1 | -1>) { this.sortSpec = s; return this; }
  populate() { return this; }
  lean() { return this; }
  limit() { return this; }

  exec(): Promise<T> {
    return Promise.resolve().then(() => this.post(this.run(), this.projection, this.sortSpec));
  }
  then<A = T, B = never>(onFulfilled?: ((v: T) => A | PromiseLike<A>) | null, onRejected?: ((e: any) => B | PromiseLike<B>) | null) {
    return this.exec().then(onFulfilled, onRejected);
  }
  catch(onRejected: (e: any) => any) { return this.exec().catch(onRejected); }
}

export interface MemoryModel {
  docs: Doc[];
  reset(): void;
  [method: string]: any;
}

export function createMemoryModel(name: string, schema: Schema): MemoryModel {
  const instance = new mongoose.Mongoose();
  const Real = instance.model(name, schema);
  const timestamps = !!schema.get('timestamps');
  const hidden = Object.entries(schema.paths)
    .filter(([, type]) => (type as any).options?.select === false)
    .map(([path]) => path);
  const uniqueIndexes = schema
    .indexes()
    .filter(([, opts]) => opts?.unique)
    .map(([fields, opts]) => ({ keys: Object.keys(fields), sparse: !!opts?.sparse }));

  let docs: Doc[] = [];

  const build = (data: Doc, validate = true): Doc => {
    const d = new Real(data);
    if (validate) {
      const err = d.validateSync();
      if (err) throw err;
    }
    const plain = d.toObject({ depopulate: true });
    delete plain.__v;
    return plain;
  };

  const checkUnique = (candidate: Doc) => {
    for (const { keys, sparse } of uniqueIndexes) {
      const values = keys.map((k) => getPath(candidate, k));
      if (sparse && values.some((v) => v === undefined || v === null)) continue;
      const clash = docs.find(
        (d) => !eq(d._id, candidate._id) && keys.every((k, i) => eq(getPath(d, k), values[i])),
      );
      if (clash) {
        throw new mongoose.mongo.MongoServerError({
          message: `E11000 duplicate key error collection: ${name}`,
          code: 11000,
          keyValue: Object.fromEntries(keys.map((k, i) => [k, values[i]])),
        } as any);
      }
    }
  };

  const project = (doc: Doc, projection?: string): Doc => {
    const out = clone(doc);
    const tokens = (projection ?? '').split(/\s+/).filter(Boolean);
    const forced = tokens.filter((t) => t.startsWith('+')).map((t) => t.slice(1));
    for (const h of hidden) if (!forced.includes(h)) unsetPath(out, h);
    const excluded = tokens.filter((t) => t.startsWith('-')).map((t) => t.slice(1));
    const included = tokens.filter((t) => !t.startsWith('-') && !t.startsWith('+'));
    if (included.length) {
      const picked: Doc = { _id: out._id };
      for (const p of included) {
        const v = getPath(out, p);
        if (v !== undefined) setPath(picked, p, v);
      }
      return wrap(picked);
    }
    excluded.forEach((p) => unsetPath(out, p));
    return wrap(out);
  };

  const wrap = (doc: Doc): Doc => {
    Object.defineProperty(doc, 'toObject', { value: () => clone(doc), enumerable: false });
    Object.defineProperty(doc, 'toJSON', { value: () => clone(doc), enumerable: false });
    return doc;
  };

  const sortDocs = (list: Doc[], spec?: Record<string, 1 | -1>) => {
    if (!spec) return list;
    const entries = Object.entries(spec);
    return [...list].sort((a, b) => {
      for (const [k, dir] of entries) {
        const x = norm(getPath(a, k)) as any;
        const y = norm(getPath(b, k)) as any;
        if (x === y) continue;
        if (x === undefined || x === null) return -dir;
        if (y === undefined || y === null) return dir;
        return (x < y ? -1 : 1) * dir;
      }
      return 0;
    });
  };

  const postMany = (list: Doc[], projection?: string, sort?: Record<string, 1 | -1>) =>
    sortDocs(list, sort).map((d) => project(d, projection));
  const postOne = (doc: Doc | null, projection?: string) => (doc ? project(doc, projection) : null);

  const applyUpdate = (target: Doc, update: Doc, isInsert: boolean) => {
    const ops = Object.keys(update).some((k) => k.startsWith('$')) ? update : { $set: update };
    for (const [op, fields] of Object.entries(ops)) {
      for (const [path, value] of Object.entries(fields as Doc)) {
        switch (op) {
          case '$set': setPath(target, path, clone(value)); break;
          case '$setOnInsert': if (isInsert) setPath(target, path, clone(value)); break;
          case '$unset': unsetPath(target, path); break;
          case '$inc': setPath(target, path, (getPath(target, path) ?? 0) + (value as number)); break;
          case '$addToSet': {
            const arr: unknown[] = getPath(target, path) ?? [];
            const values = value && typeof value === 'object' && '$each' in (value as Doc) ? (value as Doc).$each : [value];
            for (const v of values) if (!arr.some((x) => eq(x, v))) arr.push(clone(v));
            setPath(target, path, arr);
            break;
          }
          case '$pull': {
            const arr: unknown[] = getPath(target, path) ?? [];
            setPath(target, path, arr.filter((x) => !matchValue(x, value)));
            break;
          }
          default: throw new Error(`MemoryModel: unsupported update operator ${op}`);
        }
      }
    }
  };

  const updateDoc = (current: Doc, update: Doc, runValidators: boolean): Doc => {
    const next = clone(current);
    applyUpdate(next, update, false);
    const rebuilt = build(next, runValidators);
    if (timestamps) {
      rebuilt.createdAt = current.createdAt;
      rebuilt.updatedAt = new Date();
    }
    checkUnique(rebuilt);
    docs = docs.map((d) => (eq(d._id, current._id) ? rebuilt : d));
    return rebuilt;
  };

  const insert = (data: Doc): Doc => {
    const doc = build(data);
    if (timestamps) {
      doc.createdAt = doc.createdAt ?? new Date();
      doc.updatedAt = new Date();
    }
    checkUnique(doc);
    docs.push(doc);
    return doc;
  };

  const upsertBase = (filter: Filter): Doc => {
    const base: Doc = {};
    for (const [k, v] of Object.entries(filter)) if (!k.startsWith('$') && !isOperatorObject(v)) setPath(base, k, clone(v));
    return base;
  };

  const findOneAndUpdate = (filter: Filter, update: Doc, opts: Doc = {}) =>
    new MemoryQuery<Doc | null>(() => {
      const current = docs.find((d) => matches(d, filter));
      if (!current) {
        if (!opts.upsert) return null;
        const base = upsertBase(filter);
        applyUpdate(base, update, true);
        const created = insert(base);
        return opts.new ? created : null;
      }
      const before = clone(current);
      const after = updateDoc(current, update, !!opts.runValidators);
      return opts.new ? after : before;
    }, (v, p) => postOne(v, p));

  const model: MemoryModel = {
    get docs() { return docs; },
    reset() { docs = []; },
    modelName: name,

    find: (filter: Filter = {}) =>
      new MemoryQuery<Doc[]>(() => docs.filter((d) => matches(d, filter)), postMany),
    findOne: (filter: Filter = {}) =>
      new MemoryQuery<Doc | null>(() => docs.find((d) => matches(d, filter)) ?? null, (v, p) => postOne(v, p)),
    findById: (id: unknown) =>
      new MemoryQuery<Doc | null>(() => {
        const _id = castId(id);
        return docs.find((d) => eq(d._id, _id)) ?? null;
      }, (v, p) => postOne(v, p)),
    findOneAndUpdate,
    findByIdAndUpdate: (id: unknown, update: Doc, opts: Doc = {}) =>
      new MemoryQuery<Doc | null>(() => {
        const _id = castId(id);
        const current = docs.find((d) => eq(d._id, _id));
        if (!current) return null;
        const before = clone(current);
        const after = updateDoc(current, update, !!opts.runValidators);
        return opts.new ? after : before;
      }, (v, p) => postOne(v, p)),
    findByIdAndDelete: (id: unknown) =>
      new MemoryQuery<Doc | null>(() => {
        const _id = castId(id);
        const current = docs.find((d) => eq(d._id, _id)) ?? null;
        if (current) docs = docs.filter((d) => d !== current);
        return current;
      }, (v, p) => postOne(v, p)),
    updateOne: (filter: Filter, update: Doc, opts: Doc = {}) =>
      new MemoryQuery(() => {
        const current = docs.find((d) => matches(d, filter));
        if (!current) {
          if (opts.upsert) {
            const base = upsertBase(filter);
            applyUpdate(base, update, true);
            insert(base);
            return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
          }
          return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
        }
        updateDoc(current, update, !!opts.runValidators);
        return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
      }, (v) => v),
    updateMany: (filter: Filter, update: Doc) =>
      new MemoryQuery(() => {
        const targets = docs.filter((d) => matches(d, filter));
        targets.forEach((d) => updateDoc(d, update, false));
        return { acknowledged: true, matchedCount: targets.length, modifiedCount: targets.length };
      }, (v) => v),
    deleteOne: (filter: Filter) =>
      new MemoryQuery(() => {
        const current = docs.find((d) => matches(d, filter));
        if (current) docs = docs.filter((d) => d !== current);
        return { acknowledged: true, deletedCount: current ? 1 : 0 };
      }, (v) => v),
    deleteMany: (filter: Filter = {}) =>
      new MemoryQuery(() => {
        const before = docs.length;
        docs = docs.filter((d) => !matches(d, filter));
        return { acknowledged: true, deletedCount: before - docs.length };
      }, (v) => v),
    countDocuments: (filter: Filter = {}) =>
      new MemoryQuery(() => docs.filter((d) => matches(d, filter)).length, (v) => v),
    estimatedDocumentCount: () => new MemoryQuery(() => docs.length, (v) => v),
    exists: (filter: Filter) =>
      new MemoryQuery(() => {
        const d = docs.find((x) => matches(x, filter));
        return d ? { _id: d._id } : null;
      }, (v) => v),
    // Like Mongoose, create() returns the whole document (select:false only applies to queries)
    create: async (data: Doc | Doc[]) => {
      const all = hidden.map((h) => `+${h}`).join(' ');
      return Array.isArray(data) ? data.map((d) => project(insert(d), all)) : project(insert(data), all);
    },
  };
  return model;
}
