import type { ExceptionFormatterClass, ExceptionOptions } from "./types";

/**
 * Базовый класс исключения, хранящий данные об ошибке.
 * Позволяет форматировать исключение в специфичный для фреймворка класс через `format()`.
 */
export class Exception {
  /**
   * @param response - Текст сообщения или объект с данными об ошибке.
   * @param status - HTTP статус-код.
   * @param options - Дополнительные опции (cause, description и т.д.).
   */
  public constructor(
    public readonly response: string | Record<string, unknown>,
    public readonly status: number,
    public readonly options?: ExceptionOptions,
  ) {}

  /**
   * Преобразует текущее исключение в экземпляр форматтера, специфичного для фреймворка.
   * @param formatterClass - Класс-конструктор, принимающий параметры (response, status, options).
   * @returns Экземпляр класса форматтера.
   * @template T - Тип возвращаемого форматтера.
   */
  public format<T>(formatterClass: ExceptionFormatterClass<T>): T {
    return new formatterClass(this.response, this.status, this.options);
  }
}

export default Exception;
