import { ConfigService } from '@nestjs/config';

/** `ENT_ALLOWED_MODELS` as a list, without blanks. */
export function allowedModels(config: ConfigService): string[] {
  return config
    .get<string>('ENT_ALLOWED_MODELS')
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}
