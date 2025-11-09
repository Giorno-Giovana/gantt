import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Gantt from './index';

export interface Task {
    id: string;
    name: string;
    start: string | Date;
    end?: string | Date;
    duration?: string;
    progress?: number;
    dependencies?: string | string[];
    custom_class?: string;
    important?: boolean;
}

export interface GanttOptions {
    view_mode?: string;
    view_modes?: any[];
    view_mode_select?: boolean;
    today_button?: boolean;
    language?: string;
    readonly?: boolean;
    readonly_dates?: boolean;
    readonly_progress?: boolean;
    bar_height?: number;
    bar_corner_radius?: number;
    column_width?: number;
    container_height?: number | 'auto';
    padding?: number;
    arrow_curve?: number;
    popup?: any;
    popup_on?: 'click' | 'hover';
    auto_move_label?: boolean;
    date_format?: string;
    holidays?: any;
    is_weekend?: (date: Date) => boolean;
    ignore?: any[];
    infinite_padding?: boolean;
    lines?: 'none' | 'vertical' | 'horizontal' | 'both';
    move_dependencies?: boolean;
    scroll_to?: string | Date;
    show_expected_progress?: boolean;
    snap_at?: string;
    on_click?: (task: Task) => void;
    on_date_change?: (task: Task, start: Date, end: Date) => void;
    on_progress_change?: (task: Task, progress: number) => void;
    on_view_change?: (mode: string) => void;
}

export interface GanttReactProps {
    tasks: Task[];
    options?: GanttOptions;
}

export interface GanttReactHandle {
    getInstance: () => Gantt | null;
    changeViewMode: (mode: string, maintainPos?: boolean) => void;
    updateOptions: (options: GanttOptions) => void;
    scrollCurrent: () => void;
    updateTask: (id: string, newDetails: Partial<Task>) => void;
    refresh: (tasks: Task[]) => void;
}

const GanttReact = forwardRef<GanttReactHandle, GanttReactProps>(
    ({ tasks, options = {} }, ref) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const ganttRef = useRef<Gantt | null>(null);

        // Инициализация Gantt при монтировании
        useEffect(() => {
            if (containerRef.current && !ganttRef.current) {
                ganttRef.current = new Gantt(
                    containerRef.current,
                    tasks,
                    options
                );
            }

            return () => {
                if (ganttRef.current) {
                    ganttRef.current.clear();
                    ganttRef.current = null;
                }
            };
        }, []);

        // Обновление задач при изменении
        useEffect(() => {
            if (ganttRef.current && tasks) {
                ganttRef.current.refresh(tasks);
            }
        }, [tasks]);

        // Обновление опций при изменении
        useEffect(() => {
            if (ganttRef.current && options) {
                ganttRef.current.update_options(options);
            }
        }, [options]);

        // Предоставляем API через ref
        useImperativeHandle(ref, () => ({
            getInstance: () => ganttRef.current,
            changeViewMode: (mode: string, maintainPos = false) => {
                ganttRef.current?.change_view_mode(mode, maintainPos);
            },
            updateOptions: (newOptions: GanttOptions) => {
                ganttRef.current?.update_options(newOptions);
            },
            scrollCurrent: () => {
                ganttRef.current?.scroll_current();
            },
            updateTask: (id: string, newDetails: Partial<Task>) => {
                ganttRef.current?.update_task(id, newDetails);
            },
            refresh: (newTasks: Task[]) => {
                ganttRef.current?.refresh(newTasks);
            },
        }));

        return <div ref={containerRef} className="gantt-react-wrapper" />;
    }
);

GanttReact.displayName = 'GanttReact';

export default GanttReact;
