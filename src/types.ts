import { Exception } from "./exception";
import type { Feror } from "./feror";

export interface Logger {
  error: (message: Error) => unknown;
  execute: (message: string) => unknown;
}

/**
 * Объект, содержащий значения для подстановки вместо плейсхолдеров.
 * @template Placeholders - Массив строковых ключей (например, `['userId', 'role']`).
 * @example
 * // Для Placeholders = ['userId', 'role']
 * type Data = PlaceholderObject<['userId', 'role']>; // { userId: string; role: string }
 */
export type PlaceholderObject<Placeholders extends string[]> = {
  [P in Placeholders[number]]: string;
};

/**
 * Рекурсивный тип, извлекающий все ключи плейсхолдеров из строки в кортеж.
 * Проходит по строке, находит каждое вхождение `${{ key }}` и добавляет `key` в аккумулятор.
 * Дубликаты сохраняются, порядок соответствует порядку появления в строке.
 * @template InputString - Исходная строка.
 * @template Acc - Аккумулятор кортежа (по умолчанию []).
 * @example
 * type Keys = ExtractPlaceholdersTuple<"Hello {name}, your id is {id}">; // ['name', 'id']
 */
export type ExtractPlaceholdersTuple<
  InputString extends string,
  Acc extends string[] = [],
> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  InputString extends `${infer _}\${{ ${infer P} }}${infer Rest}`
    ? ExtractPlaceholdersTuple<Rest, [...Acc, P]>
    : Acc;

/**
 * Вычисляет кортеж плейсхолдеров, объединяя поля `message` и `description` шаблона.
 * @template T - Объект с обязательными полями `message` и `description`.
 * @example
 * type Template = { message: "User {userId}", description: "Action {action}" };
 * type Placeholders = InferPlaceholders<Template>; // ['userId', 'action']
 */
export type InferPlaceholders<T extends { message: string; description: string }> =
  ExtractPlaceholdersTuple<`${T["message"]} ${T["description"]}`>;

/**
 * Входной формат описания ошибки без автоматически вычисляемого поля `placeholders`.
 * Используется при создании фабрики ошибок.
 */
export type ErrorTemplateInput = {
  /** Текст сообщения об ошибке (может содержать плейсхолдеры `${{ key }}`). */
  message: string;
  /** Подробное описание ошибки (может содержать плейсхолдеры `${{ key }}`). */
  description: string;
  /** Дополнительная причина ошибки (если строка, в ней тоже могут быть плейсхолдеры). */
  cause?: Error;
  /** HTTP статус-код (по умолчанию 500). */
  status?: number;
  /** Дополнительные опции для HttpException. */
  options?: Record<string, unknown>;
};

/**
 * Внутренний шаблон ошибки, где поле `placeholders` выводится автоматически из `message` и `description`.
 * @template Placeholders - Кортеж ключей плейсхолдеров.
 */
export interface ErrorTemplate<Placeholders extends string[]> {
  message: string;
  description: string;
  cause?: Error;
  status?: number;
  options?: Record<string, unknown>;
  placeholders: Placeholders;
}

/** Карта ключ → регулярное выражение для замены плейсхолдера в строке. */
export type PlaceholderRegexMap<Placeholders extends string[]> = Map<
  keyof PlaceholderObject<Placeholders>,
  RegExp
>;

/** Шаблон после замены всех плейсхолдеров (плейсхолдеры отсутствуют). */
export type FormattedErrorTemplate = ErrorTemplate<[]>;

/** Преобразует запись входных шаблонов в запись экземпляров `BadError`. */
export type Ferors<
  T extends Record<string, ErrorTemplateInput>,
  FormatterClass
> = {
  [K in keyof T]: Feror<InferPlaceholders<T[K]>, FormatterClass>;
};

export interface ExceptionOptions {
  cause?: unknown;
  description?: string;
}

export type ExceptionConstructorParameters = ConstructorParameters<typeof Exception>;
export type ExceptionFormatterClass<T> = new (...parameters: ExceptionConstructorParameters) => T;
