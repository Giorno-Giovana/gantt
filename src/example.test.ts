/**
 * Пример теста с использованием test-helpers
 * Этот файл демонстрирует, как использовать вспомогательные функции
 */

import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import {
    createTestEnvironment,
    createGanttContainer,
    createSampleTasks,
    cleanupDOM,
    simulateClick,
    hasClasses,
    getElement,
    isVisible,
    createSVGElement,
} from './test-helpers';
import Gantt from './index';

describe('Example Tests with Helpers', () => {
    beforeEach(() => {
        createTestEnvironment();
    });

    afterEach(() => {
        cleanupDOM();
    });

    test('using createGanttContainer helper', () => {
        const container = createGanttContainer();

        expect(container).toBeDefined();
        expect(container.id).toBe('gantt-test-container');
        expect(document.body.contains(container)).toBe(true);
    });

    test('using createSampleTasks helper', () => {
        const tasks = createSampleTasks();

        expect(tasks.length).toBe(3);
        expect(tasks[0].id).toBe('Task1');
        expect(tasks[1].dependencies).toBe('Task1');
    });

    test('using helpers to create and test Gantt', () => {
        const container = createGanttContainer();
        const tasks = createSampleTasks();

        const gantt = new Gantt(container, tasks, {
            view_mode: 'Day',
        });

        // Проверяем создание диаграммы
        expect(gantt.tasks.length).toBe(3);

        // Используем getElement helper
        const svg = getElement<SVGElement>('svg.gantt', container);
        expect(svg).toBeDefined();

        // Проверяем классы с помощью hasClasses
        expect(hasClasses(svg, 'gantt')).toBe(true);
    });

    test('using simulateClick helper', () => {
        const button = document.createElement('button');
        button.className = 'test-button';
        document.body.appendChild(button);

        let clicked = false;
        button.addEventListener('click', () => {
            clicked = true;
        });

        simulateClick(button);
        expect(clicked).toBe(true);
    });

    test('using isVisible helper', () => {
        const div = document.createElement('div');
        document.body.appendChild(div);

        expect(isVisible(div)).toBe(true);

        div.style.display = 'none';
        expect(isVisible(div)).toBe(false);

        div.style.display = '';
        div.classList.add('hide');
        expect(isVisible(div)).toBe(false);
    });

    test('using createSVGElement helper', () => {
        const rect = createSVGElement('rect', {
            x: 10,
            y: 20,
            width: 100,
            height: 50,
            class: 'test-rect',
        });

        expect(rect.getAttribute('x')).toBe('10');
        expect(rect.getAttribute('width')).toBe('100');
        expect(hasClasses(rect, 'test-rect')).toBe(true);
    });
});
