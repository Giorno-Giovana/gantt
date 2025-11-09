/**
 * Глобальная настройка окружения для тестирования DOM
 * Этот файл автоматически загружается перед запуском тестов
 */

import { Window } from 'happy-dom';

// Создаем глобальное DOM окружение для всех тестов
const window = new Window({
    url: 'http://localhost:3000',
    width: 1024,
    height: 768,
});

// Устанавливаем глобальные переменные для имитации браузера
global.window = window as any;
global.document = window.document as any;
global.HTMLElement = window.HTMLElement as any;
global.SVGElement = window.SVGElement as any;
global.Element = window.Element as any;
global.Node = window.Node as any;

// Дополнительные API, которые могут понадобиться
global.navigator = window.navigator as any;
global.location = window.location as any;

// Мокируем методы, которые могут быть недоступны в happy-dom
if (!Element.prototype.getBoundingClientRect) {
    Element.prototype.getBoundingClientRect = function () {
        return {
            width: 100,
            height: 50,
            top: 0,
            left: 0,
            right: 100,
            bottom: 50,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect;
    };
}

// SVG элементы также должны иметь getBBox
if (typeof SVGElement !== 'undefined' && !(SVGElement.prototype as any).getBBox) {
    (SVGElement.prototype as any).getBBox = function () {
        return {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
        };
    };
}

console.log('✓ Test environment initialized with happy-dom');
