import { Exception } from "./exception";
import type { Feror } from "./feror";

/** Интерфейс логгера, используемого в модуле. */
export interface Logger {
  /** Логирование ошибки. */
  error: (message: Error) => unknown;
  /** Логирование информационного сообщения. */
  execute: (message: string) => unknown;
}

/**
 * Объект, содержащий значения для подстановки вместо плейсхолдеров.
 * @template Placeholders - Массив строковых ключей (например, `['userId', 'role']`).
 * @example
 * type Data = PlaceholderObject<['userId', 'role']>; // { userId: string; role: string }
 */
export type PlaceholderObject<Placeholders extends string[]> = {
  [P in Placeholders[number]]: string;
};

/**
 * Рекурсивный тип, извлекающий все ключи плейсхолдеров из строки в кортеж.
 * **Важно:** для корректного вывода типов используйте ровно один пробел внутри `${{ key }}`.
 * В рантайме допускается любое количество пробелов благодаря регулярному выражению.
 *
 * @template InputString - Исходная строка.
 * @template Acc - Аккумулятор кортежа (по умолчанию []).
 * @example
 * type Keys = ExtractPlaceholdersTuple<"Hello ${{ name }}, your id is ${{ id }}">; // ['name', 'id']
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
 * type Template = { message: "User ${{ userId }}", description: "Action ${{ action }}" };
 * type Placeholders = InferPlaceholders<Template>; // ['userId', 'action']
 */
export type InferPlaceholders<
  T extends { message: string; description: string },
> = ExtractPlaceholdersTuple<`${T["message"]} ${T["description"]}`>;

/**
 * Входной формат описания ошибки без автоматически вычисляемого поля `placeholders`.
 * Используется при создании фабрики ошибок.
 */
export type ErrorTemplateInput = {
  /** Текст сообщения об ошибке (может содержать плейсхолдеры `${{ key }}`). */
  message: string;
  /** Подробное описание ошибки (может содержать плейсхолдеры `${{ key }}`). */
  description: string;
  /** Дополнительная причина ошибки (объект Error). */
  cause?: Error;
  /** HTTP статус-код (по умолчанию 500). */
  status?: number;
  /** Дополнительные опции, которые будут переданы в форматтер исключения. */
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

/**
 * Преобразует запись входных шаблонов в запись экземпляров `Feror`.
 * @template T - Объект с шаблонами ошибок.
 * @template FormatterClass - Класс форматтера исключений.
 */
export type Ferors<
  T extends Record<string, ErrorTemplateInput>,
  FormatterClass,
> = {
  [K in keyof T]: Feror<InferPlaceholders<T[K]>, FormatterClass>;
};

/** Опции исключения (cause, description). */
export interface ExceptionOptions {
  cause?: unknown;
  description?: string;
}

/** Параметры конструктора класса Exception. */
export type ExceptionConstructorParameters = ConstructorParameters<
  typeof Exception
>;

/**
 * Класс-конструктор форматтера исключений.
 * @template T - Тип возвращаемого экземпляра.
 */
export type ExceptionFormatterClass<T> = new (
  ...parameters: ExceptionConstructorParameters
) => T;
