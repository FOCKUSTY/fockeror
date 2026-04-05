/**
 * Регулярное выражение для поиска плейсхолдеров вида `${{ key }}`.
 * Используется для извлечения ключей из строковых шаблонов.
 */
export const PLACEHOLDER_PATTERN = /\$\{\{\s{1}([^}\s]+)\s{1}\}\}/g;
export const DEFAULT_HTTP_STATUS = 500 as const;
export const CLEAN_SEARCH_REGEX = /[.*+?^${}()|[\]\\]/g;
export const CLEAN_REGEX_REPLACER = "\\$&";