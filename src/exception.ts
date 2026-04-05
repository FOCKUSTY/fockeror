import type { ExceptionFormatterClass, ExceptionOptions } from "./types";

export class Exception {
  public constructor(
    public readonly response: string | Record<string, unknown>,
    public readonly status: number,
    public readonly options?: ExceptionOptions
  ) {}

  public format<T>(formatterClass: ExceptionFormatterClass<T>) {
    return new formatterClass(this.response, this.status, this.options);
  }
}
