/**
 * Вспомогательные функции для тестирования
 */

import { Window } from 'happy-dom';

/**
 * Создает чистое DOM окружение для тестов
 */
export function createTestEnvironment() {
    const window = new Window({
        url: 'http://localhost:3000',
        width: 1024,
        height: 768,
    });

    const document = window.document;

    // Устанавливаем глобальные переменные
    global.window = window as any;
    global.document = document as any;

    // Мокируем getBoundingClientRect
    if (!window.Element.prototype.getBoundingClientRect) {
        window.Element.prototype.getBoundingClientRect = function () {
            return {
                width: parseFloat(this.getAttribute('width') || '100'),
                height: parseFloat(this.getAttribute('height') || '50'),
                top: parseFloat(this.style.top || '0'),
                left: parseFloat(this.style.left || '0'),
                right: parseFloat(this.style.left || '0') + parseFloat(this.getAttribute('width') || '100'),
                bottom: parseFloat(this.style.top || '0') + parseFloat(this.getAttribute('height') || '50'),
                x: parseFloat(this.style.left || '0'),
                y: parseFloat(this.style.top || '0'),
                toJSON: () => ({}),
            } as DOMRect;
        };
    }

    // Мокируем getBBox для SVG элементов
    if (!(window.SVGElement.prototype as any).getBBox) {
        (window.SVGElement.prototype as any).getBBox = function () {
            return {
                x: parseFloat(this.getAttribute('x') || '0'),
                y: parseFloat(this.getAttribute('y') || '0'),
                width: parseFloat(this.getAttribute('width') || '100'),
                height: parseFloat(this.getAttribute('height') || '50'),
            };
        };
    }

    // Мокируем getEndX для SVG элементов
    if (!(window.SVGElement.prototype as any).getEndX) {
        (window.SVGElement.prototype as any).getEndX = function () {
            const x = parseFloat(this.getAttribute('x') || '0');
            const width = parseFloat(this.getAttribute('width') || '0');
            return x + width;
        };
    }

    // Мокируем getX для SVG элементов
    if (!(window.SVGElement.prototype as any).getX) {
        (window.SVGElement.prototype as any).getX = function () {
            return parseFloat(this.getAttribute('x') || '0');
        };
    }

    // Мокируем getY для SVG элементов
    if (!(window.SVGElement.prototype as any).getY) {
        (window.SVGElement.prototype as any).getY = function () {
            return parseFloat(this.getAttribute('y') || '0');
        };
    }

    // Мокируем getWidth для SVG элементов
    if (!(window.SVGElement.prototype as any).getWidth) {
        (window.SVGElement.prototype as any).getWidth = function () {
            return parseFloat(this.getAttribute('width') || '0');
        };
    }

    // Мокируем getHeight для SVG элементов
    if (!(window.SVGElement.prototype as any).getHeight) {
        (window.SVGElement.prototype as any).getHeight = function () {
            return parseFloat(this.getAttribute('height') || '0');
        };
    }

    return { window, document };
}

/**
 * Создает контейнер для тестов Gantt диаграммы
 */
export function createGanttContainer() {
    const container = document.createElement('div');
    container.id = 'gantt-test-container';
    container.style.width = '1000px';
    container.style.height = '600px';
    document.body.appendChild(container);
    return container;
}

/**
 * Создает примеры задач для тестирования
 */
export function createSampleTasks() {
    return [
        {
            id: 'Task1',
            name: 'Redesign website',
            start: '2024-01-01',
            end: '2024-01-05',
            progress: 50,
        },
        {
            id: 'Task2',
            name: 'Write new content',
            start: '2024-01-03',
            end: '2024-01-08',
            progress: 20,
            dependencies: 'Task1',
        },
        {
            id: 'Task3',
            name: 'Review and approve',
            start: '2024-01-08',
            end: '2024-01-10',
            progress: 0,
            dependencies: 'Task2',
        },
    ];
}

/**
 * Ожидает выполнения условия с таймаутом
 */
export async function waitFor(
    condition: () => boolean,
    timeout = 1000,
    interval = 50,
): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeout) {
            throw new Error('Timeout waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
}

/**
 * Симулирует клик мыши на элементе
 */
export function simulateClick(element: Element, options: Partial<MouseEvent> = {}) {
    const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window as any,
        ...options,
    });
    element.dispatchEvent(event);
}

/**
 * Симулирует событие мыши
 */
export function simulateMouseEvent(
    element: Element,
    eventType: string,
    options: Partial<MouseEvent> = {},
) {
    const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window as any,
        ...options,
    });
    element.dispatchEvent(event);
}

/**
 * Очищает DOM после теста
 */
export function cleanupDOM() {
    document.body.innerHTML = '';
}

/**
 * Проверяет, что элемент имеет указанные CSS классы
 */
export function hasClasses(element: Element, ...classes: string[]): boolean {
    return classes.every((cls) => element.classList.contains(cls));
}

/**
 * Находит элемент по селектору с проверкой на null
 */
export function getElement<T extends Element = Element>(
    selector: string,
    parent: Document | Element = document,
): T {
    const element = parent.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }
    return element;
}

/**
 * Проверяет видимость элемента
 */
export function isVisible(element: HTMLElement): boolean {
    return (
        element.style.display !== 'none' &&
        element.style.visibility !== 'hidden' &&
        !element.classList.contains('hide')
    );
}

/**
 * Создает SVG элемент для тестирования
 */
export function createSVGElement(tagName: string, attributes: Record<string, any> = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tagName);

    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'class') {
            element.setAttribute('class', value);
        } else {
            element.setAttribute(key, String(value));
        }
    }

    return element;
}
