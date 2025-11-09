# Руководство по тестированию DOM в проекте с Bun

## Обзор

Bun имеет встроенную поддержку тестирования с использованием `bun:test`. Для тестирования DOM-операций Bun использует **happy-dom** - быструю и легковесную имплементацию DOM API.

## Настройка окружения для тестирования DOM

### 1. Установка зависимостей

```bash
# happy-dom уже встроен в Bun, но можно установить явно для автодополнения
bun add -d happy-dom @types/node
```

### 2. Конфигурация для тестирования (необязательно)

Создайте файл `bunfig.toml` в корне проекта:

```toml
[test]
# Использовать happy-dom для всех тестов
preload = ["./test-setup.ts"]
```

### 3. Файл setup для тестов

Создайте `test-setup.ts`:

```typescript
import { Window } from 'happy-dom';

// Настройка глобального DOM окружения
const window = new Window({
    url: 'http://localhost:3000',
    width: 1024,
    height: 768
});

global.window = window as any;
global.document = window.document as any;
global.HTMLElement = window.HTMLElement as any;
global.SVGElement = window.SVGElement as any;
global.Element = window.Element as any;
```

## Структура тестов

### Базовый пример теста

Создайте файл `src/svg_utils.test.ts`:

```typescript
import { test, expect, describe, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import { createSVG, $ } from './svg_utils';

describe('SVG Utils', () => {
    let window: Window;
    let document: Document;

    beforeEach(() => {
        // Создаем чистое DOM окружение для каждого теста
        window = new Window();
        document = window.document;
        global.document = document as any;
    });

    test('createSVG creates an SVG element', () => {
        const svg = createSVG('svg', {
            class: 'gantt',
            width: 100,
            height: 200
        });

        expect(svg.tagName.toLowerCase()).toBe('svg');
        expect(svg.classList.contains('gantt')).toBe(true);
        expect(svg.getAttribute('width')).toBe('100');
        expect(svg.getAttribute('height')).toBe('200');
    });

    test('createSVG appends element to parent', () => {
        const container = document.createElement('div');
        const rect = createSVG('rect', {
            append_to: container,
            x: 10,
            y: 20
        });

        expect(container.children.length).toBe(1);
        expect(container.firstChild).toBe(rect);
    });
});
```

### Тестирование класса Gantt

Создайте файл `src/index.test.ts`:

```typescript
import { test, expect, describe, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import Gantt from './index';

describe('Gantt Chart', () => {
    let window: Window;
    let document: Document;
    let container: HTMLElement;

    beforeEach(() => {
        window = new Window({
            url: 'http://localhost:3000',
            width: 1024,
            height: 768
        });
        document = window.document;
        global.document = document as any;
        global.window = window as any;

        // Создаем контейнер для диаграммы
        container = document.createElement('div');
        container.id = 'gantt';
        document.body.appendChild(container);
    });

    test('creates gantt chart with tasks', () => {
        const tasks = [
            {
                id: 'Task 1',
                name: 'Redesign website',
                start: '2024-01-01',
                end: '2024-01-05',
                progress: 50
            },
            {
                id: 'Task 2',
                name: 'Write new content',
                start: '2024-01-03',
                end: '2024-01-08',
                progress: 20,
                dependencies: 'Task 1'
            }
        ];

        const gantt = new Gantt('#gantt', tasks, {
            view_mode: 'Day'
        });

        // Проверяем, что SVG элемент создан
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.classList.contains('gantt')).toBe(true);

        // Проверяем количество задач
        expect(gantt.tasks.length).toBe(2);
    });

    test('throws error for invalid selector', () => {
        expect(() => {
            new Gantt('#nonexistent', [], {});
        }).toThrow('CSS selector "#nonexistent" could not be found in DOM');
    });

    test('accepts HTMLElement as wrapper', () => {
        const tasks = [{
            id: 'Task 1',
            name: 'Test',
            start: '2024-01-01',
            end: '2024-01-05'
        }];

        const gantt = new Gantt(container, tasks, {});

        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
    });

    test('accepts SVGElement directly', () => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        document.body.appendChild(svg);

        const tasks = [{
            id: 'Task 1',
            name: 'Test',
            start: '2024-01-01',
            end: '2024-01-05'
        }];

        const gantt = new Gantt(svg, tasks, {});

        expect(gantt.$svg).toBe(svg);
        expect(svg.classList.contains('gantt')).toBe(true);
    });
});
```

### Тестирование Bar компонента

Создайте файл `src/bar.test.ts`:

```typescript
import { test, expect, describe, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import Gantt from './index';
import Bar from './bar';

describe('Bar Component', () => {
    let window: Window;
    let document: Document;
    let gantt: Gantt;

    beforeEach(() => {
        window = new Window({
            url: 'http://localhost:3000',
            width: 1024,
            height: 768
        });
        document = window.document;
        global.document = document as any;
        global.window = window as any;

        const container = document.createElement('div');
        document.body.appendChild(container);

        const tasks = [{
            id: 'Task 1',
            name: 'Test Task',
            start: '2024-01-01',
            end: '2024-01-05',
            progress: 50
        }];

        gantt = new Gantt(container, tasks, {
            view_mode: 'Day'
        });
    });

    test('bar is created with correct attributes', () => {
        const bar = gantt.bars[0];

        expect(bar).toBeDefined();
        expect(bar.task.id).toBe('Task 1');
        expect(bar.task.name).toBe('Test Task');
    });

    test('bar progress is visible', () => {
        const bar = gantt.bars[0];
        const progressBar = bar.group.querySelector('.bar-progress');

        expect(progressBar).not.toBeNull();
    });
});
```

## Запуск тестов

```bash
# Запустить все тесты
bun test

# Запустить конкретный файл
bun test src/index.test.ts

# Запустить с watch mode
bun test --watch

# Запустить с покрытием (если настроено)
bun test --coverage
```

## Полезные паттерны

### 1. Мокирование событий DOM

```typescript
test('handles click events', () => {
    const button = document.createElement('button');
    let clicked = false;

    button.addEventListener('click', () => {
        clicked = true;
    });

    button.click();
    expect(clicked).toBe(true);
});
```

### 2. Тестирование SVG манипуляций

```typescript
test('creates SVG rect with correct dimensions', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

    rect.setAttribute('x', '10');
    rect.setAttribute('y', '20');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '50');

    svg.appendChild(rect);

    expect(rect.getAttribute('x')).toBe('10');
    expect(rect.getAttribute('y')).toBe('20');
    expect(rect.getAttribute('width')).toBe('100');
    expect(rect.getAttribute('height')).toBe('50');
});
```

### 3. Тестирование querySelector

```typescript
test('finds elements by selector', () => {
    const container = document.createElement('div');
    container.innerHTML = `
        <div class="gantt">
            <svg class="chart"></svg>
        </div>
    `;

    const ganttDiv = container.querySelector('.gantt');
    const svg = container.querySelector('svg.chart');

    expect(ganttDiv).not.toBeNull();
    expect(svg).not.toBeNull();
});
```

### 4. Очистка после тестов

```typescript
import { afterEach } from 'bun:test';

afterEach(() => {
    // Очищаем DOM после каждого теста
    document.body.innerHTML = '';
});
```

## Альтернатива: jsdom

Если happy-dom не подходит, можно использовать jsdom:

```bash
bun add -d jsdom @types/jsdom
```

```typescript
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.window = dom.window as any;
global.document = dom.window.document;
```

## Отладка тестов

```typescript
test('debug example', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span>Hello</span>';

    // Вывести HTML для отладки
    console.log(element.innerHTML);
    console.log(element.outerHTML);

    // Проверить состояние
    expect(element.querySelector('span')).not.toBeNull();
});
```

## Рекомендации

1. **Изолируйте тесты**: Каждый тест должен иметь свой чистый DOM
2. **Используйте beforeEach**: Создавайте новое окружение для каждого теста
3. **Тестируйте поведение, а не реализацию**: Фокусируйтесь на том, что делает код, а не как
4. **Мокируйте внешние зависимости**: Если код использует таймеры или fetch, замокайте их
5. **Проверяйте граничные случаи**: Пустые массивы, null, undefined и т.д.

## Примеры coverage

Добавьте в `package.json`:

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

## Полезные ссылки

- [Bun Test API](https://bun.sh/docs/cli/test)
- [Happy DOM](https://github.com/capricorn86/happy-dom)
- [Bun Test Documentation](https://bun.sh/docs/test/writing)
