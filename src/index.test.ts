import { test, expect, describe, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import Gantt from './index';

describe('Gantt Chart', () => {
    let window: Window;
    let document: Document;
    let container: HTMLElement;

    beforeEach(() => {
        // Создаем новое DOM окружение для каждого теста
        window = new Window({
            url: 'http://localhost:3000',
            width: 1024,
            height: 768,
        });
        document = window.document;
        global.document = document as any;
        global.window = window as any;

        // Мокируем getBoundingClientRect для SVG элементов
        if (!(window.SVGElement.prototype as any).getBBox) {
            (window.SVGElement.prototype as any).getBBox = function () {
                return {
                    x: 0,
                    y: 0,
                    width: parseFloat(this.getAttribute('width') || '100'),
                    height: parseFloat(this.getAttribute('height') || '50'),
                };
            };
        }

        // Создаем контейнер для диаграммы
        container = document.createElement('div');
        container.id = 'gantt';
        document.body.appendChild(container);
    });

    describe('Constructor and Setup', () => {
        test('creates gantt chart with CSS selector', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Redesign website',
                    start: '2024-01-01',
                    end: '2024-01-05',
                    progress: 50,
                },
            ];

            const gantt = new Gantt('#gantt', tasks, {
                view_mode: 'Day',
            });

            // Проверяем, что SVG элемент создан
            const svg = container.querySelector('svg');
            expect(svg).not.toBeNull();
            expect(svg?.classList.contains('gantt')).toBe(true);

            // Проверяем задачи
            expect(gantt.tasks.length).toBe(1);
            expect(gantt.tasks[0].id).toBe('Task1');
        });

        test('throws error for invalid CSS selector', () => {
            expect(() => {
                new Gantt('#nonexistent', [], {});
            }).toThrow('CSS selector "#nonexistent" could not be found in DOM');
        });

        test('accepts HTMLElement as wrapper', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Test',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            const svg = container.querySelector('svg');
            expect(svg).not.toBeNull();
            expect(gantt.$svg).toBeDefined();
        });

        test('accepts SVGElement directly', () => {
            const svg = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'svg',
            );
            document.body.appendChild(svg);

            const tasks = [
                {
                    id: 'Task1',
                    name: 'Test',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(svg, tasks, {});

            expect(gantt.$svg).toBe(svg);
            expect(svg.classList.contains('gantt')).toBe(true);
        });
    });

    describe('Task Processing', () => {
        test('processes tasks with start and end dates', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task 1',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            expect(gantt.tasks.length).toBe(1);
            expect(gantt.tasks[0]._start).toBeInstanceOf(Date);
            expect(gantt.tasks[0]._end).toBeInstanceOf(Date);
        });

        test('calculates end date from duration', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task 1',
                    start: '2024-01-01',
                    duration: '5d',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            expect(gantt.tasks.length).toBe(1);
            expect(gantt.tasks[0]._end).toBeInstanceOf(Date);
            expect(gantt.tasks[0]._end.getTime()).toBeGreaterThan(
                gantt.tasks[0]._start.getTime(),
            );
        });

        test('processes dependencies', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task 1',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
                {
                    id: 'Task2',
                    name: 'Task 2',
                    start: '2024-01-06',
                    end: '2024-01-10',
                    dependencies: 'Task1',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            expect(gantt.tasks[1].dependencies).toContain('Task1');
            expect(gantt.dependency_map['Task1']).toContain('Task2');
        });

        test('filters out invalid tasks', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Valid Task',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
                {
                    id: 'Task2',
                    name: 'Invalid Task - no start',
                    end: '2024-01-05',
                },
                {
                    id: 'Task3',
                    name: 'Invalid Task - no end',
                    start: '2024-01-01',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            // Только валидная задача должна остаться
            expect(gantt.tasks.length).toBe(1);
            expect(gantt.tasks[0].id).toBe('Task1');
        });
    });

    describe('View Modes', () => {
        test('initializes with default view mode', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            expect(gantt.options.view_mode).toBeDefined();
        });

        test('changes view mode', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, tasks, {
                view_mode: 'Day',
            });

            gantt.change_view_mode('Week');

            expect(gantt.options.view_mode).toBe('Week');
        });
    });

    describe('Update Operations', () => {
        test('refreshes with new tasks', () => {
            const initialTasks = [
                {
                    id: 'Task1',
                    name: 'Task 1',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, initialTasks, {});

            const newTasks = [
                {
                    id: 'Task1',
                    name: 'Task 1',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
                {
                    id: 'Task2',
                    name: 'Task 2',
                    start: '2024-01-06',
                    end: '2024-01-10',
                },
            ];

            gantt.refresh(newTasks);

            expect(gantt.tasks.length).toBe(2);
        });

        test('updates single task', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Original Name',
                    start: '2024-01-01',
                    end: '2024-01-05',
                    progress: 0,
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            gantt.update_task('Task1', {
                name: 'Updated Name',
                progress: 50,
            });

            expect(gantt.tasks[0].name).toBe('Updated Name');
            expect(gantt.tasks[0].progress).toBe(50);
        });
    });

    describe('DOM Structure', () => {
        test('creates proper DOM structure', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            // Проверяем наличие основных элементов
            expect(container.querySelector('.gantt-container')).not.toBeNull();
            expect(container.querySelector('svg.gantt')).not.toBeNull();
            expect(container.querySelector('.popup-wrapper')).not.toBeNull();
        });

        test('creates grid layers', () => {
            const tasks = [
                {
                    id: 'Task1',
                    name: 'Task',
                    start: '2024-01-01',
                    end: '2024-01-05',
                },
            ];

            const gantt = new Gantt(container, tasks, {});

            const svg = container.querySelector('svg');
            expect(svg?.querySelector('g.grid')).not.toBeNull();
            expect(svg?.querySelector('g.bar')).not.toBeNull();
            expect(svg?.querySelector('g.arrow')).not.toBeNull();
        });
    });
});
