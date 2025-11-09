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

    describe('createSVG', () => {
        test('creates basic SVG element', () => {
            const svg = createSVG('svg');

            expect(svg).toBeDefined();
            expect(svg.tagName.toLowerCase()).toBe('svg');
            expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
        });

        test('creates SVG element with attributes', () => {
            const rect = createSVG('rect', {
                x: 10,
                y: 20,
                width: 100,
                height: 50,
                class: 'test-rect',
            });

            expect(rect.getAttribute('x')).toBe('10');
            expect(rect.getAttribute('y')).toBe('20');
            expect(rect.getAttribute('width')).toBe('100');
            expect(rect.getAttribute('height')).toBe('50');
            expect(rect.classList.contains('test-rect')).toBe(true);
        });

        test('appends element to parent', () => {
            const parent = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'svg',
            );
            const child = createSVG('circle', {
                append_to: parent,
                r: 5,
            });

            expect(parent.children.length).toBe(1);
            expect(parent.firstChild).toBe(child);
            expect(child.getAttribute('r')).toBe('5');
        });

        test('creates nested SVG structure', () => {
            const svg = createSVG('svg', {
                width: 200,
                height: 100,
            });

            const group = createSVG('g', {
                append_to: svg,
                class: 'layer',
            });

            const rect1 = createSVG('rect', {
                append_to: group,
                x: 0,
                y: 0,
                width: 50,
                height: 50,
            });

            const rect2 = createSVG('rect', {
                append_to: group,
                x: 60,
                y: 0,
                width: 50,
                height: 50,
            });

            expect(svg.children.length).toBe(1);
            expect(group.children.length).toBe(2);
            expect(group.children[0]).toBe(rect1);
            expect(group.children[1]).toBe(rect2);
        });

        test('handles various SVG shapes', () => {
            const shapes = [
                createSVG('circle', { r: 10 }),
                createSVG('line', { x1: 0, y1: 0, x2: 100, y2: 100 }),
                createSVG('path', { d: 'M 0 0 L 100 100' }),
                createSVG('polygon', { points: '0,0 100,0 50,100' }),
            ];

            shapes.forEach((shape) => {
                expect(shape.namespaceURI).toBe('http://www.w3.org/2000/svg');
            });
        });
    });

    describe('$ utility functions', () => {
        test('$.on adds event listener', () => {
            const button = document.createElement('button');
            button.className = 'test-button';
            document.body.appendChild(button);

            let clicked = false;
            $.on(document.body, 'click', '.test-button', () => {
                clicked = true;
            });

            button.click();
            expect(clicked).toBe(true);
        });

        test('$.attr sets attributes', () => {
            const element = createSVG('rect');
            $.attr(element, {
                x: 100,
                y: 200,
                width: 50,
                height: 75,
            });

            expect(element.getAttribute('x')).toBe('100');
            expect(element.getAttribute('y')).toBe('200');
            expect(element.getAttribute('width')).toBe('50');
            expect(element.getAttribute('height')).toBe('75');
        });

        test('$.closest finds parent element', () => {
            const container = document.createElement('div');
            container.className = 'container';

            const wrapper = document.createElement('div');
            wrapper.className = 'wrapper';
            container.appendChild(wrapper);

            const button = document.createElement('button');
            button.className = 'button';
            wrapper.appendChild(button);

            const result = $.closest('.container', button);
            expect(result).toBe(container);
        });
    });
});
