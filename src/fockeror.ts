import type {
  ErrorTemplate,
  ExceptionFormatterClass,
  FormattedErrorTemplate,
  Logger,
  PlaceholderObject,
  PlaceholderRegexMap,
} from "./types";

import {
  PLACEHOLDER_PATTERN,
  CLEAN_SEARCH_REGEX,
  CLEAN_REGEX_REPLACER,
  DEFAULT_HTTP_STATUS,
} from "./constants";

import { Exception } from "./exception";

/**
 * Класс, представляющий конкретную ошибку с возможностью динамической подстановки плейсхолдеров по примеру `${{ key }}`.
 * @template Placeholders - Кортеж ключей плейсхолдеров (например, `['userId', 'action']`).
 * @template FormatterClass - Тип класса-форматтера для преобразования исключения.
 *
 * @example
 * const error = new Fockeror({
 *   message: 'User ${{ userId }} not found',
 *   description: 'No user with id ${{ userId }} exists',
 *   placeholders: ['userId']
 * }, logger, formatterClass);
 *
 * // Подстановка значений
 * throw error.throw({ userId: '123' });
 *
 * // Статическое исключение (без подстановки)
 * throw error.exception;
 */
export class Fockeror<const Placeholders extends string[], FormatterClass> {
  private readonly placeholderRegexes: PlaceholderRegexMap<Placeholders>;

  /**
   * Создаёт экземпляр Fockeror.
   * @param template - Шаблон ошибки (должен содержать корректный массив `placeholders`).
   * @param logger - Экземпляр логгера (должен соответствовать интерфейсу Logger).
   * @param formatterClass - Класс для форматирования исключения в специфичный для фреймворка тип.
   * @throws {Error} Если объявленные в `placeholders` ключи не соответствуют реально найденным в тексте.
   */
  public constructor(
    public readonly template: ErrorTemplate<Placeholders>,
    private readonly logger: Logger,
    private readonly formatterClass: ExceptionFormatterClass<FormatterClass>,
  ) {
    this.placeholderRegexes = this.extractPlaceholders(template);
  }

  public execute(
    placeholders: PlaceholderObject<Placeholders>,
    cause?: Error,
  ): FormatterClass;
  public execute(cause?: Error): FormatterClass;

  /**
   * Возвращает отформатированное исключение с подстановкой данных.
   * Если передан пустой объект `placeholders` или вызов без аргументов, возвращается статическое исключение.
   *
   * @param placeholdersOrCause - Объект с значениями для замены плейсхолдеров или причина ошибки.
   * @param cause - Дополнительная причина ошибки (если первый аргумент — placeholders).
   * @returns Экземпляр форматтера (обычно исключение фреймворка).
   *
   * @example
   * const error = new Fockeror({ message: 'Hello ${{ name }}', description: '', placeholders: ['name'] }, logger, formatter);
   * const exception = error.execute({ name: 'World' });
   * throw exception;
   */
  public execute(
    placeholdersOrCause?: PlaceholderObject<Placeholders> | Error,
    cause?: Error,
  ): FormatterClass {
    let placeholders: PlaceholderObject<Placeholders> | undefined;
    let actualCause: Error | undefined;

    if (placeholdersOrCause instanceof Error) {
      actualCause = placeholdersOrCause;
    } else {
      placeholders = placeholdersOrCause;
      actualCause = cause;
    }

    if (!placeholders || Object.keys(placeholders).length === 0) {
      return this.createStaticException(actualCause);
    }

    return this.createDynamicException(placeholders, actualCause);
  }

  public throw(
    placeholders: PlaceholderObject<Placeholders>,
    cause?: Error,
  ): never;
  public throw(cause?: Error): never;

  /**
   * Немедленно выбрасывает отформатированное исключение с подстановкой данных.
   * @param placeholdersOrCause - Объект с значениями для замены плейсхолдеров или причина ошибки.
   * @param cause - Дополнительная причина ошибки.
   * @throws {FormatterClass} Всегда выбрасывает исключение, отформатированное через `formatterClass`.
   */
  public throw(
    placeholdersOrCause?: PlaceholderObject<Placeholders> | Error,
    cause?: Error,
  ): never {
    if (placeholdersOrCause instanceof Error) {
      throw this.execute(placeholdersOrCause);
    }
    throw this.execute(
      placeholdersOrCause as PlaceholderObject<Placeholders>,
      cause,
    );
  }

  /**
   * Геттер, возвращающий статическое исключение (без подстановки плейсхолдеров).
   * Позволяет использовать краткую запись `throw error.exception`.
   */
  public get exception(): FormatterClass {
    return this.createStaticException();
  }

  private createStaticException(cause?: Error): FormatterClass {
    return this.createException({ ...this.template, placeholders: [] }, cause);
  }

  private createDynamicException(
    placeholders: PlaceholderObject<Placeholders>,
    cause?: Error,
  ): FormatterClass {
    const error = this.formatTemplate(placeholders);
    return this.createException(error, cause);
  }

  private formatTemplate(
    placeholders: PlaceholderObject<Placeholders>,
  ): FormattedErrorTemplate {
    let message = this.template.message;
    let description = this.template.description;

    for (const [key, regex] of this.placeholderRegexes.entries()) {
      const value = placeholders[key];
      if (value === undefined) {
        this.logger.error(
          new Error(`Placeholder \${{ ${key} }} not provided in data`),
        );
        continue;
      }

      message = message.replace(regex, value);
      description = description.replace(regex, value);
    }

    return {
      ...this.template,
      message,
      description,
      placeholders: [],
    };
  }

  private createException(
    error: FormattedErrorTemplate,
    cause?: Error,
  ): FormatterClass {
    const status = error.status ?? this.template.status ?? DEFAULT_HTTP_STATUS;
    const exception = new Exception(error.message, status, {
      description: error.description,
      cause: cause ?? error.cause,
    });
    return exception.format(this.formatterClass);
  }

  private collectPlaceholdersFromText(
    template: ErrorTemplate<Placeholders>,
  ): Set<Placeholders[number]> {
    const text = `${template.message} ${template.description}`;
    const set = new Set<Placeholders[number]>();
    for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
      set.add(match[1] as Placeholders[number]);
    }

    return set;
  }

  private validatePlaceholders(
    collectedPlaceholders: Set<string>,
    declaredPlaceholders?: readonly string[],
  ): void {
    if (!declaredPlaceholders) {
      return;
    }

    const errors: Error[] = [];
    for (const placeholder of declaredPlaceholders) {
      if (collectedPlaceholders.has(placeholder)) {
        continue;
      }

      errors.push(new Error(`Placeholder "${placeholder}" not found in text`));
    }

    for (const placeholder of collectedPlaceholders) {
      if (declaredPlaceholders.includes(placeholder)) {
        continue;
      }

      errors.push(
        new Error(
          `Placeholder from text "${placeholder}" not found in placeholders list`,
        ),
      );
    }

    if (errors.length !== 0) {
      errors.forEach((e) => this.logger.error(e));
      throw new Error("Placeholder validation failed.");
    }
  }

  private buildRegexMap(
    keys: Set<Placeholders[number]>,
  ): PlaceholderRegexMap<Placeholders> {
    const map = new Map();
    for (const key of keys) {
      map.set(key, this.createRegEx(key));
    }

    return map;
  }

  private extractPlaceholders(
    template: ErrorTemplate<Placeholders>,
  ): PlaceholderRegexMap<Placeholders> {
    const collected = this.collectPlaceholdersFromText(template);
    this.validatePlaceholders(collected, template.placeholders);
    return this.buildRegexMap(collected);
  }

  private createRegEx(key: string): RegExp {
    const clean = key.replace(CLEAN_SEARCH_REGEX, CLEAN_REGEX_REPLACER);
    return new RegExp(`\\$\\{\\{\\s{1}${clean}\\s{1}\\}\\}`);
  }
}

export default Fockeror;
