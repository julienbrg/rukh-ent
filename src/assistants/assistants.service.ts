import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import { randomInt } from 'node:crypto';
import { allowedModels } from '../config/allowed-models';
import { DATABASE } from '../db/db.module';
import type { EntUser } from '../ent/session.service';
import { Assistant, canEdit, canSee } from './access';
import { CreateAssistantDto, UpdateAssistantDto } from './assistants.dto';

interface Row {
  name: string;
  owner_id: string;
  uai: string;
  classes: string;
  published: number;
  model: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

function toAssistant(row: Row): Assistant {
  return {
    name: row.name,
    ownerId: row.owner_id,
    uai: row.uai,
    classes: JSON.parse(row.classes),
    published: row.published === 1,
    model: row.model,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function slugify(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
  return slug || 'assistant';
}

/** `hdf-<uai>-<slug>-<6 random characters>`, matching `^[a-z0-9-]+$`. */
export function assistantName(uai: string, title: string): string {
  const suffix = Array.from(
    { length: 6 },
    () => ALPHABET[randomInt(ALPHABET.length)],
  ).join('');
  return `hdf-${slugify(uai)}-${slugify(title)}-${suffix}`;
}

@Injectable()
export class AssistantsService {
  private readonly models: string[];

  constructor(
    @Inject(DATABASE) private readonly db: Database.Database,
    config: ConfigService,
  ) {
    this.models = allowedModels(config);
  }

  /** Visible assistants; the caller's own first, then most recently updated. */
  list(user: EntUser): Assistant[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM assistants
         WHERE owner_id = @userId
            OR (published = 1
                AND uai IN (SELECT value FROM json_each(@uai))
                AND (json_array_length(classes) = 0
                     OR EXISTS (SELECT 1 FROM json_each(assistants.classes)
                                WHERE value IN (SELECT value FROM json_each(@classes)))))
         ORDER BY owner_id = @userId DESC, updated_at DESC, name`,
      )
      .all({
        userId: user.userId,
        uai: JSON.stringify(user.uai),
        classes: JSON.stringify(user.classes),
      }) as Row[];
    return rows.map(toAssistant);
  }

  /** Throws 404 when missing or hidden from the caller, so names do not leak. */
  get(user: EntUser, name: string): Assistant {
    const row = this.db
      .prepare('SELECT * FROM assistants WHERE name = ?')
      .get(name) as Row | undefined;
    const assistant = row && toAssistant(row);
    if (!assistant || !canSee(user, assistant)) {
      throw new NotFoundException();
    }
    return assistant;
  }

  create(user: EntUser, dto: CreateAssistantDto): Assistant {
    if (user.role !== 'teacher') throw new ForbiddenException();
    const uai = this.schoolFor(user, dto.uai);
    this.checkModel(dto.model);
    const classes = this.checkClasses(user, dto.classes ?? []);

    const name = assistantName(uai, dto.title);
    this.db
      .prepare(
        `INSERT INTO assistants (name, owner_id, uai, classes, model, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        name,
        user.userId,
        uai,
        JSON.stringify(classes),
        dto.model,
        dto.description ?? '',
      );
    return this.get(user, name);
  }

  update(user: EntUser, name: string, dto: UpdateAssistantDto): Assistant {
    const current = this.editable(user, name);
    if (dto.model !== undefined) this.checkModel(dto.model);
    const classes =
      dto.classes === undefined
        ? current.classes
        : this.checkClasses(user, dto.classes);

    this.db
      .prepare(
        `UPDATE assistants
         SET model = ?, description = ?, classes = ?, published = ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ')
         WHERE name = ?`,
      )
      .run(
        dto.model ?? current.model,
        dto.description ?? current.description,
        JSON.stringify(classes),
        (dto.published ?? current.published) ? 1 : 0,
        name,
      );
    return this.get(user, name);
  }

  /** Conversations go with it (`ON DELETE CASCADE`). */
  remove(user: EntUser, name: string): void {
    this.editable(user, name);
    this.db.prepare('DELETE FROM assistants WHERE name = ?').run(name);
  }

  /** 404 when hidden, 403 when visible but not the caller's. */
  private editable(user: EntUser, name: string): Assistant {
    const assistant = this.get(user, name);
    if (!canEdit(user, assistant)) throw new ForbiddenException();
    return assistant;
  }

  private schoolFor(user: EntUser, uai: string | undefined): string {
    if (uai !== undefined) {
      if (!user.uai.includes(uai)) {
        throw new BadRequestException('uai must be one of your schools');
      }
      return uai;
    }
    if (user.uai.length !== 1) {
      throw new BadRequestException('uai is required with several schools');
    }
    return user.uai[0];
  }

  private checkModel(model: string): void {
    if (!this.models.includes(model)) {
      throw new BadRequestException(
        `model must be one of: ${this.models.join(', ')}`,
      );
    }
  }

  private checkClasses(user: EntUser, classes: string[]): string[] {
    const unknown = classes.filter((c) => !user.classes.includes(c));
    if (unknown.length > 0) {
      throw new BadRequestException(
        `classes must be among your classes: ${unknown.join(', ')}`,
      );
    }
    return classes;
  }
}
