# 🧪 Быстрый старт: Тестирование DOM в проекте

## Установка зависимостей

```bash
bun install
```

Это установит `happy-dom` - быструю реализацию DOM для тестирования.

## Запуск тестов

```bash
# Запустить все тесты
bun test

# Запустить тесты в watch режиме
bun test --watch

# Запустить конкретный тест
bun test src/index.test.ts

# Запустить с покрытием кода
bun test --coverage
```

## Структура тестов

```
gantt/
├── bunfig.toml                # Конфигурация Bun
├── test-setup.ts              # Глобальная настройка DOM окружения
├── src/
│   ├── index.ts               # Основной код
│   ├── index.test.ts          # Тесты для Gantt класса
│   ├── svg_utils.ts           # Утилиты для SVG
│   ├── svg_utils.test.ts      # Тесты для SVG утилит
│   ├── date_utils.ts          # Утилиты для дат
│   └── date_utils.test.ts     # Тесты для дат
└── TESTING_GUIDE.md           # Подробное руководство
```

## Примеры тестов

### Тестирование создания SVG элементов

```typescript
import { test, expect } from 'bun:test';
import { createSVG } from './svg_utils';

test('creates SVG rect', () => {
    const rect = createSVG('rect', {
        x: 10,
        y: 20,
        width: 100,
        height: 50
    });

    expect(rect.getAttribute('x')).toBe('10');
    expect(rect.getAttribute('width')).toBe('100');
});
```

### Тестирование Gantt диаграммы

```typescript
import { test, expect, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import Gantt from './index';

test('creates gantt chart', () => {
    const window = new Window();
    global.document = window.document as any;

    const container = document.createElement('div');
    document.body.appendChild(container);

    const gantt = new Gantt(container, [
        {
            id: 'Task1',
            name: 'My Task',
            start: '2024-01-01',
            end: '2024-01-05'
        }
    ]);

    expect(gantt.tasks.length).toBe(1);
});
```

## Важные файлы

- **`test-setup.ts`** - Настраивает глобальное DOM окружение (document, window, SVGElement)
- **`bunfig.toml`** - Указывает Bun загружать test-setup перед запуском тестов
- **`*.test.ts`** - Файлы с тестами (любой файл с расширением `.test.ts` будет найден автоматически)

## Особенности тестирования DOM

### 1. Happy-DOM автоматически загружается

Bun использует happy-dom по умолчанию для эмуляции браузерного окружения:

```typescript
import { Window } from 'happy-dom';

const window = new Window();
const document = window.document;
```

### 2. Мокирование методов DOM

Некоторые методы (например, `getBBox` для SVG) нужно мокировать вручную:

```typescript
beforeEach(() => {
    if (!(SVGElement.prototype as any).getBBox) {
        (SVGElement.prototype as any).getBBox = () => ({
            x: 0, y: 0, width: 100, height: 50
        });
    }
});
```

### 3. Чистое окружение для каждого теста

Используйте `beforeEach` для создания нового DOM окружения:

```typescript
beforeEach(() => {
    const window = new Window();
    global.document = window.document as any;
});
```

## Советы

✅ **Изолируйте тесты** - каждый тест должен иметь чистое DOM окружение
✅ **Тестируйте поведение** - проверяйте, что код делает, а не как
✅ **Используйте describe** - группируйте связанные тесты
✅ **Проверяйте граничные случаи** - пустые массивы, null, undefined

## Отладка

Если тест падает, добавьте логирование:

```typescript
test('debug test', () => {
    const element = document.createElement('div');
    console.log(element.outerHTML); // Вывести HTML
    console.log(element.children); // Вывести дочерние элементы
});
```

## Следующие шаги

1. Запустите `bun test` чтобы увидеть примеры в действии
2. Изучите `TESTING_GUIDE.md` для подробной информации
3. Добавьте свои тесты в `src/*.test.ts` файлы

## Полезные ссылки

- [Документация Bun Test](https://bun.sh/docs/cli/test)
- [Happy-DOM на GitHub](https://github.com/capricorn86/happy-dom)
- [Примеры в src/](./src/)
