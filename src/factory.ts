import type {
  ErrorTemplate,
  ErrorTemplateInput,
  ExceptionFormatterClass,
  Ferors,
  InferPlaceholders,
  Logger,
} from "./types";

import { OFFSETS, PLACEHOLDER_PATTERN } from "./constants";
import { Fockeror } from "./fockeror";

/**
 * Фабричный класс, создающий набор предопределённых ошибок с автоматически сгенерированными кодами.
 * Каждой ошибке присваивается уникальный код формата `base64url(prefix):hex(key:index)`.
 * Плейсхолдеры извлекаются автоматически из полей `message` и `description`.
 *
 * @template FormatterClass - Тип класса-форматтера исключений.
 *
 * @example
 * const factory = new FockerorFactory(logger, CustomExceptionFormatter);
 * const errors = factory.execute('AUTH', {
 *   INVALID_TOKEN: {
 *     message: 'Invalid token',
 *     description: 'The token is expired',
 *     status: 401,
 *   },
 *   USER_NOT_FOUND: {
 *     message: 'User ${{ userId }} not found',
 *     description: 'No user with id ${{ userId }} exists',
 *     status: 404,
 *   },
 * });
 *
 * // Статическое исключение (без плейсхолдеров)
 * throw errors.INVALID_TOKEN.exception;
 *
 * // Динамическое исключение с подстановкой
 * throw errors.USER_NOT_FOUND.execute({ userId: '123' });
 */
export class FockerorFactory<FormatterClass> {
  /**
   * @param logger - Экземпляр логгера (должен соответствовать интерфейсу Logger).
   * @param formatterClass - Класс для форматирования исключения (должен иметь конструктор, совместимый с Exception).
   */
  public constructor(
    private readonly formatterClass: ExceptionFormatterClass<FormatterClass>,
    private readonly logger?: Logger,
  ) {}

  /**
   * Генерирует набор ошибок для указанного префикса и шаблонов.
   * Для каждого шаблона создаётся экземпляр `Fockeror` с автоматически вычисленными плейсхолдерами.
   *
   * @param prefix - Строка для генерации уникального кода (будет преобразована в base64url).
   * @param templates - Объект, где ключи — идентификаторы ошибок, значения — `ErrorTemplateInput`.
   * @returns Объект с экземплярами `Fockeror`, ключи соответствуют ключам входного объекта.
   *
   * @template Templates - Тип входных шаблонов.
   */
  public execute<const Templates extends Record<string, ErrorTemplateInput>>(
    prefix: string,
    templates: Templates,
  ): Ferors<Templates, FormatterClass> {
    const templateKeys = Object.keys(templates);
    const entries = templateKeys.map((key, index) => {
      const input = templates[key];
      const errorTemplate = this.defineError(input);
      const code = this.generateCode(prefix, key, index);
      this.logger?.execute?.(
        `Загрузка ошибки ${prefix} ${code} : ${errorTemplate.message}`,
      );

      const prefixed = {
        ...errorTemplate,
        message: `${code} : ${errorTemplate.message}`,
      };
      const fockeror = new Fockeror(prefixed, this.formatterClass, this.logger);

      return [key, fockeror];
    });

    return Object.fromEntries(entries);
  }

  private generateCode(prefix: string, key: string, index: number): string {
    const prefixEncoded = Buffer.from(prefix).toString("base64url");
    const suffix = Buffer.from(`${key}:${index}`).toString("hex");
    return `${prefixEncoded}:${suffix}`;
  }

  private defineError<const Template extends ErrorTemplateInput>(
    error: Template,
  ): ErrorTemplate<InferPlaceholders<Template>> {
    const combined = `${error.message} ${error.description}`;
    const matches = combined.match(PLACEHOLDER_PATTERN);
    const allKeys = matches?.map((m) => m.slice(OFFSETS.START, OFFSETS.END)) ?? [];
    const uniqueKeys = Array.from(
      new Set(allKeys),
    ) as InferPlaceholders<Template>;

    return { ...error, placeholders: uniqueKeys };
  }
}

export default FockerorFactory;
