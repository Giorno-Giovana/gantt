# 📝 Шпаргалка по тестированию DOM с Bun

## Основные команды

```bash
bun test                    # Запустить все тесты
bun test --watch           # Watch режим (перезапуск при изменениях)
bun test src/index.test.ts # Запустить конкретный файл
bun test --coverage        # Тесты с покрытием кода
bun test --bail            # Остановить после первой ошибки
```

## Структура теста

```typescript
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';

describe('Название группы тестов', () => {
    beforeEach(() => {
        // Выполняется перед каждым тестом
    });

    afterEach(() => {
        // Выполняется после каждого теста
    });

    test('описание теста', () => {
        // Код теста
        expect(1 + 1).toBe(2);
    });
});
```

## Matchers (проверки)

```typescript
// Равенство
expect(value).toBe(expected);           // Строгое равенство (===)
expect(value).toEqual(expected);        // Глубокое равенство
expect(value).not.toBe(expected);       // Отрицание

// Типы
expect(value).toBeInstanceOf(Date);
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Числа
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(10);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(3.14, 2);     // ~3.14 ± 0.01

// Строки и регулярные выражения
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');

// Массивы
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Объекты
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ key: 'value' });

// Функции и исключения
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('error message');
```

## Работа с DOM

### Создание окружения

```typescript
import { Window } from 'happy-dom';

const window = new Window();
const document = window.document;
global.document = document as any;
```

### Создание элементов

```typescript
// HTML элементы
const div = document.createElement('div');
div.id = 'test';
div.className = 'container';
div.innerHTML = '<span>Hello</span>';

// SVG элементы
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
rect.setAttribute('x', '10');
rect.setAttribute('y', '20');
svg.appendChild(rect);
```

### Поиск элементов

```typescript
document.querySelector('.class');
document.querySelectorAll('.class');
document.getElementById('id');
element.querySelector('.child');
element.closest('.parent');
```

### Проверка элементов

```typescript
// Наличие элемента
expect(element).not.toBeNull();
expect(element).toBeDefined();

// Атрибуты
expect(element.getAttribute('id')).toBe('test');
expect(element.id).toBe('test');

// Классы
expect(element.classList.contains('active')).toBe(true);
expect(element.className).toContain('active');

// Содержимое
expect(element.innerHTML).toContain('text');
expect(element.textContent).toBe('text');

// Дочерние элементы
expect(element.children.length).toBe(3);
expect(element.firstChild).toBeDefined();
```

## Симуляция событий

```typescript
// Клик
button.click();

// Пользовательское событие
const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: 100,
    clientY: 200,
});
element.dispatchEvent(event);

// Обработчик события
let clicked = false;
button.addEventListener('click', () => {
    clicked = true;
});
button.click();
expect(clicked).toBe(true);
```

## Мокирование методов DOM

```typescript
// Мокирование getBoundingClientRect
Element.prototype.getBoundingClientRect = function() {
    return {
        width: 100,
        height: 50,
        top: 0,
        left: 0,
        right: 100,
        bottom: 50,
        x: 0,
        y: 0,
        toJSON: () => ({})
    } as DOMRect;
};

// Мокирование getBBox для SVG
(SVGElement.prototype as any).getBBox = function() {
    return {
        x: 0,
        y: 0,
        width: 100,
        height: 50
    };
};
```

## Асинхронные тесты

```typescript
test('async test', async () => {
    const result = await fetchData();
    expect(result).toBeDefined();
});

test('promise test', () => {
    return promise.then(result => {
        expect(result).toBe(expected);
    });
});
```

## Таймеры и задержки

```typescript
// Использование setTimeout
test('with timeout', async () => {
    let called = false;
    setTimeout(() => {
        called = true;
    }, 100);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(called).toBe(true);
});
```

## Паттерны для Gantt проекта

### Тест создания SVG

```typescript
test('creates SVG element', () => {
    const svg = createSVG('rect', {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        class: 'bar'
    });

    expect(svg.tagName.toLowerCase()).toBe('rect');
    expect(svg.getAttribute('x')).toBe('10');
    expect(svg.classList.contains('bar')).toBe(true);
});
```

### Тест Gantt диаграммы

```typescript
test('creates gantt with tasks', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const gantt = new Gantt(container, [
        {
            id: 'Task1',
            name: 'Task',
            start: '2024-01-01',
            end: '2024-01-05'
        }
    ]);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(gantt.tasks.length).toBe(1);
});
```

### Тест обработки событий

```typescript
test('handles bar click', () => {
    // Setup
    const gantt = new Gantt(container, tasks);
    const bar = container.querySelector('.bar-wrapper');
    let clicked = false;

    bar.addEventListener('click', () => {
        clicked = true;
    });

    // Act
    bar.click();

    // Assert
    expect(clicked).toBe(true);
});
```

## Отладка

```typescript
test('debug test', () => {
    const element = document.createElement('div');
    element.innerHTML = '<span>test</span>';

    // Вывести структуру
    console.log(element.outerHTML);

    // Вывести атрибуты
    console.log([...element.attributes].map(a => `${a.name}="${a.value}"`));

    // Вывести дочерние элементы
    console.log(Array.from(element.children));
});
```

## Организация тестов

```typescript
describe('Component', () => {
    describe('initialization', () => {
        test('creates with default options', () => {});
        test('creates with custom options', () => {});
    });

    describe('methods', () => {
        test('method1 works correctly', () => {});
        test('method2 handles errors', () => {});
    });

    describe('edge cases', () => {
        test('handles empty input', () => {});
        test('handles null', () => {});
    });
});
```

## Лучшие практики

1. **Один тест - одна проверка** (по возможности)
2. **AAA паттерн**: Arrange (подготовка), Act (действие), Assert (проверка)
3. **Изолируйте тесты**: каждый тест независим
4. **Используйте beforeEach**: создавайте чистое окружение
5. **Очищайте afterEach**: удаляйте созданные элементы
6. **Именуйте понятно**: название должно описывать, что тестируется
7. **Тестируйте поведение**: не реализацию

## Полезные ссылки

- [Bun Test Docs](https://bun.sh/docs/cli/test)
- [Happy-DOM](https://github.com/capricorn86/happy-dom)
- [Jest Expect API](https://jestjs.io/docs/expect) (совместимый синтаксис)
