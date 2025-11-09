import React from 'react';
import { createRoot } from 'react-dom/client';
import GanttReact, { Task, GanttOptions } from './GanttReact';
import './styles/gantt.css';

// Вспомогательная функция для создания дат
const daysSince = (dx: number): Date => {
    const rawToday = new Date();
    const today =
        Date.UTC(
            rawToday.getFullYear(),
            rawToday.getMonth(),
            rawToday.getDate()
        ) +
        new Date().getTimezoneOffset() * 60000;
    return new Date(today + dx * 86400000);
};

// Примеры задач
const tasks: Task[] = [
    {
        id: 'Task 0',
        name: 'Redesign website',
        start: daysSince(-2),
        end: daysSince(2),
        progress: 20,
    },
    {
        id: 'Task 1',
        name: 'Write new content',
        start: daysSince(3),
        duration: '6d',
        progress: 40,
        dependencies: 'Task 0',
        important: true,
    },
    {
        id: 'Task 2',
        name: 'Apply new styles',
        start: daysSince(4),
        duration: '2d',
        progress: 60,
    },
    {
        id: 'Task 3',
        name: 'Review',
        start: daysSince(-4),
        end: daysSince(0),
        progress: 80,
    },
];

// Опции Gantt
const options: GanttOptions = {
    view_mode: 'Day',
    view_mode_select: true,
    today_button: true,
    on_click: (task) => {
        console.log('Task clicked:', task);
    },
    on_date_change: (task, start, end) => {
        console.log('Date changed:', task, start, end);
    },
    on_progress_change: (task, progress) => {
        console.log('Progress changed:', task, progress);
    },
    on_view_change: (mode) => {
        console.log('View mode changed:', mode);
    },
};

// Главный компонент приложения
function App() {
    const ganttRef = React.useRef<any>(null);

    return (
        <div style={{ padding: '20px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
                Frappe Gantt - React
            </h1>
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => ganttRef.current?.changeViewMode('Day')}
                    style={{ marginRight: '10px' }}
                >
                    Day
                </button>
                <button
                    onClick={() => ganttRef.current?.changeViewMode('Week')}
                    style={{ marginRight: '10px' }}
                >
                    Week
                </button>
                <button
                    onClick={() => ganttRef.current?.changeViewMode('Month')}
                    style={{ marginRight: '10px' }}
                >
                    Month
                </button>
                <button onClick={() => ganttRef.current?.scrollCurrent()}>
                    Scroll to Today
                </button>
            </div>
            <GanttReact ref={ganttRef} tasks={tasks} options={options} />
        </div>
    );
}

// Монтируем приложение
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
