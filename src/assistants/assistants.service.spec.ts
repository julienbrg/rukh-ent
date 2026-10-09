import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import { openDatabase } from '../db/db.module';
import type { EntUser } from '../ent/session.service';
import {
  assistantName,
  AssistantsService,
  slugify,
} from './assistants.service';

const teacher: EntUser = {
  userId: 't1',
  profile: 'Teacher',
  role: 'teacher',
  uai: ['0000001A'],
  classes: ['3A', '4B'],
};
const otherTeacher: EntUser = { ...teacher, userId: 't2' };
const student: EntUser = {
  userId: 's1',
  profile: 'Student',
  role: 'user',
  uai: ['0000001A'],
  classes: ['3A'],
};
const staff: EntUser = {
  ...student,
  userId: 'p1',
  profile: 'Personnel',
  classes: [],
};

describe('slugify', () => {
  it('strips accents and punctuation', () => {
    expect(slugify('Histoire-Géo : 3ème !')).toBe('histoire-geo-3eme');
  });

  it('falls back when nothing is left', () => {
    expect(slugify('!!!')).toBe('assistant');
  });

  it('caps the length', () => {
    expect(slugify('a'.repeat(100))).toHaveLength(40);
  });
});

describe('assistantName', () => {
  it('matches the upstream name pattern', () => {
    expect(assistantName('0000001A', 'Maths 3A')).toMatch(
      /^hdf-0000001a-maths-3a-[a-z0-9]{6}$/,
    );
  });
});

describe('AssistantsService', () => {
  let db: Database.Database;
  let service: AssistantsService;

  beforeEach(() => {
    db = openDatabase(':memory:');
    const config = {
      get: () => 'mistral, anthropic',
    } as unknown as ConfigService;
    service = new AssistantsService(db, config);
  });

  afterEach(() => db.close());

  const create = (classes: string[] = [], user = teacher) =>
    service.create(user, { title: 'Maths', model: 'mistral', classes });

  describe('create', () => {
    it('stores a draft owned by the teacher in their school', () => {
      const a = create(['3A']);
      expect(a).toMatchObject({
        ownerId: 't1',
        uai: '0000001A',
        classes: ['3A'],
        published: false,
        model: 'mistral',
        description: '',
      });
    });

    it('refuses non-teachers', () => {
      expect(() => create([], student)).toThrow(ForbiddenException);
    });

    it('refuses a model outside ENT_ALLOWED_MODELS', () => {
      expect(() =>
        service.create(teacher, { title: 'x', model: 'openai' }),
      ).toThrow(BadRequestException);
    });

    it('refuses classes the teacher does not have', () => {
      expect(() => create(['5C'])).toThrow(BadRequestException);
    });

    it('refuses a school the teacher is not in', () => {
      expect(() =>
        service.create(teacher, {
          title: 'x',
          model: 'mistral',
          uai: '0000002B',
        }),
      ).toThrow(BadRequestException);
    });

    it('requires uai when the teacher has several schools', () => {
      const twoSchools = { ...teacher, uai: ['0000001A', '0000002B'] };
      expect(() =>
        service.create(twoSchools, { title: 'x', model: 'mistral' }),
      ).toThrow(BadRequestException);
      expect(
        service.create(twoSchools, {
          title: 'x',
          model: 'mistral',
          uai: '0000002B',
        }).uai,
      ).toBe('0000002B');
    });
  });

  describe('list and get', () => {
    it('shows drafts to their owner only', () => {
      const a = create();
      expect(service.list(teacher).map((x) => x.name)).toEqual([a.name]);
      expect(service.list(student)).toEqual([]);
      expect(() => service.get(student, a.name)).toThrow(NotFoundException);
    });

    it('applies school and class visibility once published', () => {
      const school = create();
      const a3 = create(['3A']);
      const b4 = create(['4B']);
      for (const a of [school, a3, b4]) {
        service.update(teacher, a.name, { published: true });
      }

      const names = (u: EntUser) =>
        service
          .list(u)
          .map((x) => x.name)
          .sort();
      expect(names(student)).toEqual([school.name, a3.name].sort());
      expect(names(staff)).toEqual([school.name]);
      expect(names({ ...student, uai: ['0000002B'] })).toEqual([]);
      expect(() => service.get(student, b4.name)).toThrow(NotFoundException);
    });

    it("lists the caller's own assistants first", () => {
      service.update(otherTeacher, create([], otherTeacher).name, {
        published: true,
      });
      const mine = create();
      expect(service.list(teacher)[0].name).toBe(mine.name);
    });

    it('returns 404 for an unknown name', () => {
      expect(() => service.get(teacher, 'nope')).toThrow(NotFoundException);
    });
  });

  describe('update and remove', () => {
    it('updates the editable fields', () => {
      const a = create();
      expect(
        service.update(teacher, a.name, {
          model: 'anthropic',
          description: 'd',
          classes: ['4B'],
          published: true,
        }),
      ).toMatchObject({
        model: 'anthropic',
        description: 'd',
        classes: ['4B'],
        published: true,
      });
    });

    it('validates the model and classes', () => {
      const a = create();
      expect(() => service.update(teacher, a.name, { model: 'x' })).toThrow(
        BadRequestException,
      );
      expect(() =>
        service.update(teacher, a.name, { classes: ['5C'] }),
      ).toThrow(BadRequestException);
    });

    it('returns 403 to another teacher who can see it', () => {
      const a = create();
      service.update(teacher, a.name, { published: true });
      expect(() =>
        service.update(otherTeacher, a.name, { description: 'x' }),
      ).toThrow(ForbiddenException);
      expect(() => service.remove(otherTeacher, a.name)).toThrow(
        ForbiddenException,
      );
    });

    it('returns 404 to another teacher on a draft', () => {
      const a = create();
      expect(() => service.remove(otherTeacher, a.name)).toThrow(
        NotFoundException,
      );
    });

    it('refuses a non-teacher who can see it', () => {
      const a = create();
      service.update(teacher, a.name, { published: true });
      expect(() =>
        service.update(student, a.name, { published: false }),
      ).toThrow(ForbiddenException);
    });

    it('deletes the assistant and its conversations', () => {
      const a = create();
      db.prepare(
        "INSERT INTO conversations (user_id, assistant, session_id) VALUES ('s1', ?, 'x')",
      ).run(a.name);
      service.remove(teacher, a.name);
      expect(() => service.get(teacher, a.name)).toThrow(NotFoundException);
      expect(
        db.prepare('SELECT count(*) FROM conversations').pluck().get(),
      ).toBe(0);
    });
  });
});
