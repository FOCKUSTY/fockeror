# Fockeror

[![npm версия](https://img.shields.io/npm/v/fockeror.svg)](https://www.npmjs.com/package/fockeror)
[![Лицензия: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Fockeror** — типобезопасная фабрика ошибок для TypeScript. Позволяет определить набор предсказуемых, типизированных ошибок с автоматическими уникальными кодами, подстановкой значений в сообщения и интеграцией с любым фреймворком.

- 🔑 **Уникальные коды** – каждая ошибка получает код формата `base64url(префикс):hex(ключ:индекс)`
- 📝 **Плейсхолдеры** – динамические сообщения с синтаксисом `${{ placeholder }}`
- 🧩 **Интеграция с фреймворками** – подключите свой форматтер исключений (например, `HttpException` из NestJS или `ApiError` из Express)
- 📦 **Статические или динамические ошибки** – используйте `error.exception` для статической ошибки или `error.execute({ ... })` для динамической подстановки
- 🪵 **Поддержка логгера** – опциональный логгер для отладки и предупреждений о валидации

## Установка

```bash
npm install fockeror
```

## Быстрый старт

```typescript
import { FockerorFactory } from 'fockeror';
// 1. Определите свой форматтер исключений (пример для NestJS)
import { HttpException } from "@nestjs/common";


// 2. Создайте фабрику
const factory = new FockerorFactory(HttpException, console);

// 3. Определите шаблоны ошибок
const errors = factory.execute('AUTH', {
  INVALID_TOKEN: {
    message: 'Неверный токен',
    description: 'Предоставленный токен повреждён или истёк',
    status: 401,
  },
  USER_NOT_FOUND: {
    message: 'Пользователь ${{ userId }} не найден',
    description: 'Пользователь с id ${{ userId }} не существует',
    status: 404,
  },
});

// 4. Используйте их
// Статическая ошибка (без плейсхолдеров)
throw errors.INVALID_TOKEN.exception;

// Динамическая ошибка с подстановкой значений
throw errors.USER_NOT_FOUND.execute({ userId: '123' });
```

## Зачем нужен Fockeror?

- **Никаких «магических» строк** – ошибки типизированы и поддерживают автодополнение.
- **Централизованное описание ошибок** – храните все бизнес-ошибки в одном месте.
- **Безопасная подстановка плейсхолдеров** – если значение отсутствует, ошибка логируется, а сообщение не ломается.
- **Не зависит от фреймворка** – работает с Express, NestJS, Fastify или любой другой библиотекой.

## API

### `FockerorFactory`

#### `constructor(formatterClass, logger?)`

- `formatterClass` – класс для преобразования внутреннего исключения `Exception` в специфичный для фреймворка тип. Должен принимать параметры `(response, status, options)`.
- `logger` – опциональный логгер, реализующий интерфейс `{ error?: (err: Error) => unknown; execute?: (msg: string) => unknown }`

#### `execute(prefix, templates)`

- `prefix` – строка для генерации уникального кода (будет преобразована в base64url)
- `templates` – объект, где ключи — имена ошибок, значения — `ErrorTemplateInput`

Возвращает объект с экземплярами `Fockeror` с теми же ключами, что и `templates`.

### `Fockeror<Placeholders, FormatterClass>`

#### `.exception` (геттер)

Возвращает статическое отформатированное исключение (плейсхолдеры не заменяются).

#### `.execute(placeholders?, cause?)`

- `placeholders` – объект с значениями для замены плейсхолдеров
- `cause` – опциональная ошибка-причина

Возвращает отформатированное исключение.

#### `.throw(placeholders?, cause?)` / `.throw(cause?)`

Немедленно выбрасывает отформатированное исключение.

### Формат шаблона ошибки

```typescript
type ErrorTemplateInput = {
  message: string;        // может содержать ${{ placeholder }}
  description: string;    // может содержать ${{ placeholder }}
  status?: number;        // HTTP статус (по умолчанию 500)
  cause?: Error;          // опциональная причина
  options?: Record<string, unknown>; // дополнительные данные для форматтера
};
```

## Синтаксис плейсхолдеров

Плейсхолдеры должны быть записаны как `${{ key }}` **ровно с одним пробелом** внутри фигурных скобок.  
Во время выполнения регулярное выражение допускает только один пробел, также для корректного вывода типов TypeScript требуется ровно один пробел.

✅ `Привет, ${{ name }}`  
❌ `Привет, ${{name}}`  
❌ `Привет, ${{  name  }}`

## Продвинутое использование

### Использование логгера

```typescript
const logger = {
  error: (err: Error) => console.error(err.message),
  execute: (msg: string) => console.debug(msg),
};

const factory = new FockerorFactory(MyFormatter, logger);
```

Если при подстановке значения плейсхолдер отсутствует, логгер получит ошибку.

### Свой форматтер исключений

Класс форматтера получает три аргумента:

```typescript
class MyFormatter {
  constructor(
    public readonly response: string | Record<string, unknown>,
    public readonly status: number,
    public readonly options?: { cause?: Error; description?: string },
  ) {}
}
```

### Коды ошибок

Каждая ошибка получает уникальный код в формате:  
`base64url(префикс):hex(имяОшибки:индекс)`

Код **автоматически добавляется** в начало поля `message`.  
Пример: `QVVUSDo=:494e56414c49445f544f4b454e3a30 : Неверный токен`

## Лицензия

MIT
