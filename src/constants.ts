/**
 * Регулярное выражение для поиска плейсхолдеров вида `${{ key }}`.
 * Допускает только один пробел внутри скобок.
 *
 * @example
 * // Найдёт: ${{ username }}
 */
export const PLACEHOLDER_PATTERN = /\$\{\{\s{1}([^}\s]+)\s{1}\}\}/g;

/** Статус HTTP по умолчанию (500 Internal Server Error). */
export const DEFAULT_HTTP_STATUS = 500 as const;

/** Регулярное выражение для экранирования специальных символов при создании RegExp из ключа. */
export const CLEAN_SEARCH_REGEX = /[.*+?^${}()|[\]\\]/g;

/** Строка замены для экранирования специальных символов. */
export const CLEAN_REGEX_REPLACER = "\\$&";
