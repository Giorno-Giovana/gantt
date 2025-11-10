import date_utils from './date_utils';
import { $, createSVG } from './svg_utils';

import Arrow from './arrow';
import Bar from './bar';
import Popup from './popup';

import { DEFAULT_OPTIONS, DEFAULT_VIEW_MODES } from './defaults';

import './styles/gantt.css';

export interface Task {
    id: string;
    name: string;
    start: string | Date;
    end?: string | Date;
    duration?: string;
    progress?: number;
    dependencies?: string | string[];
    description?: string;
    _start?: Date;
    _end?: Date;
    _index?: number;
    actual_duration?: number;
    ignored_duration?: number;
    color?: string;
    color_progress?: string;
    custom_class?: string;
    thumbnail?: string;
    invalid?: boolean;
}

export interface ViewMode {
    name: string;
    padding: string | string[];
    step: string;
    date_format?: string;
    lower_text?: string | ((d: Date, ld: Date | null, lang: string) => string);
    upper_text?: string | ((d: Date, ld: Date | null, lang: string) => string);
    thick_line?: (d: Date) => boolean;
    snap_at?: string;
    column_width?: number;
    upper_text_frequency?: number;
}

type PopupFunction = (context: {
    task: Task;
    chart: Gantt;
    get_title: () => HTMLElement;
    set_title: (title: string) => void;
    get_subtitle: () => HTMLElement;
    set_subtitle: (subtitle: string) => void;
    get_details: () => HTMLElement;
    set_details: (details: string) => void;
    add_action: (
        html: string | ((task: Task) => string),
        func: (task: Task, gantt: Gantt, event: MouseEvent) => void
    ) => void;
}) => string | false | void;

interface HolidayConfig {
    [color: string]: string | ((d: Date) => boolean) | Array<string | Date | { date: string; name: string } | ((d: Date) => boolean)>;
}

export interface GanttOptions {
    arrow_curve?: number;
    auto_move_label?: boolean;
    bar_corner_radius?: number;
    bar_height?: number;
    container_height?: number | string;
    column_width?: number | null;
    date_format?: string;
    upper_header_height?: number;
    lower_header_height?: number;
    snap_at?: string | null;
    infinite_padding?: boolean;
    holidays?: HolidayConfig;
    ignore?: string | string[] | ((d: Date) => boolean);
    language?: string;
    lines?: string;
    move_dependencies?: boolean;
    padding?: number;
    popup?: PopupFunction | false;
    popup_on?: string;
    readonly_progress?: boolean;
    readonly_dates?: boolean;
    readonly?: boolean;
    scroll_to?: string | null;
    show_expected_progress?: boolean;
    today_button?: boolean;
    view_mode?: string | ViewMode;
    view_mode_select?: boolean;
    view_modes?: (ViewMode | string)[];
    is_weekend?: (d: Date) => boolean;
    on_click?: (task: Task) => void;
    on_date_change?: (task: Task, start: Date, end: Date) => void;
    on_progress_change?: (task: Task, progress: number) => void;
    on_view_change?: (mode: ViewMode | string) => void;
}

type TimeScale = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond';

export interface GanttConfig {
    ignored_dates: Date[];
    ignored_positions: number[];
    extend_by_units: number;
    ignored_function?: (d: Date) => boolean;
    view_mode?: ViewMode;
    step?: number;
    unit?: TimeScale;
    column_width?: number;
    header_height?: number;
    date_format?: string;
}

interface DateInfo {
    date: Date;
    formatted_date: string;
    column_width: number;
    x: number;
    upper_text: string;
    lower_text: string;
    upper_y: number;
    lower_y: number;
}

// Helper function to safely get mouse position (handles both standard and legacy properties)
function getMouseX(e: MouseEvent): number {
    return e.offsetX ?? (e as MouseEvent & { layerX?: number }).layerX ?? 0;
}

function getMouseY(e: MouseEvent): number {
    return e.offsetY ?? (e as MouseEvent & { layerY?: number }).layerY ?? 0;
}

export default class Gantt {
    $svg: SVGElement;
    $container: HTMLElement;
    $popup_wrapper: HTMLElement;
    $header: HTMLElement;
    $upper_header: HTMLElement;
    $lower_header: HTMLElement;
    $side_header: HTMLElement;
    $today_button?: HTMLElement;
    $extras: HTMLElement;
    $adjust: HTMLElement;
    $current_highlight?: HTMLElement;
    $current_ball_highlight?: HTMLElement;
    $current?: HTMLElement;

    options: GanttOptions;
    original_options: GanttOptions;
    config: GanttConfig;
    tasks: Task[];
    dates: Date[];
    gantt_start: Date;
    gantt_end: Date;
    grid_height: number;
    layers: Record<string, SVGElement>;
    bars: Bar[];
    arrows: Arrow[];
    popup?: Popup;
    dependency_map: Record<string, string[]>;
    bar_being_dragged: boolean | null = null;
    current_date: Date;
    upperTexts: Element[];

    constructor(wrapper: string | HTMLElement | SVGElement, tasks: Task[], options?: GanttOptions) {
        // Initialize properties with defaults - will be properly set in setup methods
        this.$svg = createSVG('svg', {});
        this.$container = document.createElement('div');
        this.$popup_wrapper = document.createElement('div');
        this.$header = document.createElement('div');
        this.$upper_header = document.createElement('div');
        this.$lower_header = document.createElement('div');
        this.$side_header = document.createElement('div');
        this.$extras = document.createElement('div');
        this.$adjust = document.createElement('button');

        this.options = {};
        this.original_options = {};
        this.config = { ignored_dates: [], ignored_positions: [], extend_by_units: 10 };
        this.tasks = [];
        this.dates = [];
        this.gantt_start = new Date();
        this.gantt_end = new Date();
        this.grid_height = 0;
        this.layers = {};
        this.bars = [];
        this.arrows = [];
        this.dependency_map = {};
        this.current_date = new Date();
        this.upperTexts = [];

        this.setup_wrapper(wrapper);
        this.setup_options(options);
        this.setup_tasks(tasks);
        this.change_view_mode();
        this.bind_events();
    }

    setup_wrapper(element: string | HTMLElement | SVGElement) {
        let svg_element, wrapper_element;

        // CSS Selector is passed
        if (typeof element === 'string') {
            let el = document.querySelector(element);
            if (!el) {
                throw new ReferenceError(
                    `CSS selector "${element}" could not be found in DOM`,
                );
            }
            if (el instanceof HTMLElement || el instanceof SVGElement) {
                element = el;
            } else {
                throw new TypeError('Selected element must be an HTML or SVG element');
            }
        }

        // get the SVGElement
        if (element instanceof HTMLElement) {
            wrapper_element = element;
            svg_element = element.querySelector('svg');
        } else if (element instanceof SVGElement) {
            svg_element = element;
        } else {
            throw new TypeError(
                'Frappe Gantt only supports usage of a string CSS selector,' +
                    " HTML DOM element or SVG DOM element for the 'element' parameter",
            );
        }

        // svg element
        if (!svg_element) {
            // create it
            this.$svg = createSVG('svg', {
                append_to: wrapper_element,
                class: 'gantt',
            });
        } else {
            this.$svg = svg_element;
            this.$svg.classList.add('gantt');
        }

        // wrapper element
        const parentElement = this.$svg.parentElement;
        if (!parentElement) {
            throw new Error('SVG element must have a parent');
        }
        this.$container = this.create_el({
            classes: 'gantt-container',
            append_to: parentElement,
        });

        this.$container.appendChild(this.$svg);
        this.$popup_wrapper = this.create_el({
            classes: 'popup-wrapper',
            append_to: this.$container,
        });
    }

    setup_options(options?: GanttOptions) {
        this.original_options = options || {};
        if (options?.view_modes) {
            options.view_modes = options.view_modes.map((mode: ViewMode | string) => {
                if (typeof mode === 'string') {
                    const predefined_mode = DEFAULT_VIEW_MODES.find(
                        (d: ViewMode) => d.name === mode,
                    );
                    if (!predefined_mode) {
                        console.error(
                            `The view mode "${mode}" is not predefined in Frappe Gantt. Please define the view mode object instead.`,
                        );
                        return undefined;
                    }
                    return predefined_mode;
                }
                return mode;
            }).filter((mode): mode is ViewMode => mode !== undefined);
            // automatically set the view mode to the first option
            if (options.view_modes && options.view_modes.length > 0) {
                options.view_mode = options.view_modes[0];
            }
        }
        this.options = { ...DEFAULT_OPTIONS, ...options };
        const CSS_VARIABLES: Record<string, keyof GanttOptions> = {
            'grid-height': 'container_height',
            'bar-height': 'bar_height',
            'lower-header-height': 'lower_header_height',
            'upper-header-height': 'upper_header_height',
        };
        for (let name in CSS_VARIABLES) {
            let setting = this.options[CSS_VARIABLES[name]];
            if (setting !== 'auto' && typeof setting === 'number')
                this.$container.style.setProperty(
                    '--gv-' + name,
                    setting + 'px',
                );
        }

        this.config = {
            ignored_dates: [],
            ignored_positions: [],
            extend_by_units: 10,
        };

        if (typeof this.options.ignore !== 'function') {
            if (typeof this.options.ignore === 'string')
                this.options.ignore = [this.options.ignore];
            for (let option of this.options.ignore) {
                if (typeof option === 'function') {
                    this.config.ignored_function = option;
                    continue;
                }
                if (typeof option === 'string') {
                    if (option === 'weekend') {
                        this.config.ignored_function = (d: Date) =>
                            d.getDay() == 6 || d.getDay() == 0;
                    } else {
                        this.config.ignored_dates.push(new Date(option + ' '));
                    }
                }
            }
        } else {
            this.config.ignored_function = this.options.ignore;
        }
    }

    update_options(options: GanttOptions) {
        this.setup_options({ ...this.original_options, ...options });
        this.change_view_mode(undefined, true);
    }

    setup_tasks(tasks: Task[]) {
        this.tasks = (tasks
            .map((task: Task, i: number): Task | undefined => {
                if (!task.start) {
                    console.error(
                        `task "${task.id}" doesn't have a start date`,
                    );
                    return undefined;
                }

                task._start = date_utils.parse(task.start);
                if (task.end === undefined && task.duration !== undefined) {
                    task.end = task._start;
                    let durations = task.duration.split(' ');

                    durations.forEach((tmpDuration: string) => {
                        const parsed = date_utils.parse_duration(tmpDuration);
                        if (parsed && task.end instanceof Date) {
                            let { duration, scale } = parsed;
                            task.end = date_utils.add(task.end, duration, scale);
                        }
                    });
                }
                if (!task.end) {
                    console.error(`task "${task.id}" doesn't have an end date`);
                    return undefined;
                }
                task._end = date_utils.parse(task.end);

                let diff = date_utils.diff(task._end, task._start, 'year');
                if (diff < 0) {
                    console.error(
                        `start of task can't be after end of task: in task "${task.id}"`,
                    );
                    return undefined;
                }

                // make task invalid if duration too large
                if (date_utils.diff(task._end, task._start, 'year') > 10) {
                    console.error(
                        `the duration of task "${task.id}" is too long (above ten years)`,
                    );
                    return undefined;
                }

                // cache index
                task._index = i;

                // if hours is not set, assume the last day is full day
                // e.g: 2018-09-09 becomes 2018-09-09 23:59:59
                const task_end_values = date_utils.get_date_values(task._end);
                if (task_end_values.slice(3).every((d: number) => d === 0)) {
                    task._end = date_utils.add(task._end, 24, 'hour');
                }

                // dependencies
                if (
                    typeof task.dependencies === 'string' ||
                    !task.dependencies
                ) {
                    let deps: string[] = [];
                    if (task.dependencies) {
                        if (typeof task.dependencies === 'string') {
                            deps = task.dependencies
                                .split(',')
                                .map((d: string) => d.trim().replace(/ /g, '_'))
                                .filter((d: string) => d);
                        }
                    }
                    task.dependencies = deps;
                }

                // uids
                if (!task.id) {
                    task.id = generate_id(task);
                } else if (typeof task.id === 'string') {
                    task.id = task.id.replace(/ /g, '_');
                } else {
                    task.id = `${task.id}`;
                }

                return task;
            })
            .filter((t): t is Task => t !== undefined));
        this.setup_dependencies();
    }

    setup_dependencies() {
        this.dependency_map = {};
        for (let t of this.tasks) {
            const dependencies = Array.isArray(t.dependencies) ? t.dependencies : [];
            for (let d of dependencies) {
                this.dependency_map[d] = this.dependency_map[d] || [];
                this.dependency_map[d].push(t.id);
            }
        }
    }

    refresh(tasks: Task[]) {
        this.setup_tasks(tasks);
        this.change_view_mode();
    }

    update_task(id: string, new_details: Partial<Task>) {
        let task = this.tasks.find((t: Task) => t.id === id);
        if (!task) return;
        if (task._index === undefined) return;
        let bar = this.bars[task._index];
        Object.assign(task, new_details);
        bar.refresh();
    }

    change_view_mode(mode?: string | ViewMode, maintain_pos: boolean = false) {
        const viewMode = mode || this.options.view_mode;
        if (!viewMode) {
            throw new Error('No view mode specified');
        }

        let resolvedMode: ViewMode;
        if (typeof viewMode === 'string') {
            const viewModes = this.options.view_modes || [];
            const foundMode = viewModes.find((d): d is ViewMode =>
                typeof d !== 'string' && d.name === viewMode
            );
            if (!foundMode) {
                throw new Error(`View mode "${viewMode}" not found`);
            }
            resolvedMode = foundMode;
        } else {
            resolvedMode = viewMode;
        }
        let old_pos: number | undefined, old_scroll_op: string | null | undefined;
        if (maintain_pos) {
            old_pos = this.$container.scrollLeft;
            old_scroll_op = this.options.scroll_to;
            this.options.scroll_to = null;
        }
        this.options.view_mode = resolvedMode.name;
        this.config.view_mode = resolvedMode;
        this.update_view_scale(resolvedMode);
        this.setup_dates(maintain_pos);
        this.render();
        if (maintain_pos && old_pos !== undefined) {
            this.$container.scrollLeft = old_pos;
            this.options.scroll_to = old_scroll_op;
        }
        this.trigger_event('view_change', [resolvedMode]);
    }

    update_view_scale(mode: ViewMode) {
        const parsed = date_utils.parse_duration(mode.step);
        if (!parsed) {
            throw new Error(`Invalid step format: ${mode.step}`);
        }
        let { duration, scale } = parsed;
        this.config.step = duration;
        this.config.unit = scale;
        this.config.column_width =
            this.options.column_width || mode.column_width || 45;
        this.$container.style.setProperty(
            '--gv-column-width',
            this.config.column_width + 'px',
        );
        this.config.header_height =
            (this.options.lower_header_height || 30) +
            (this.options.upper_header_height || 45) +
            10;
    }

    setup_dates(refresh: boolean = false) {
        this.setup_gantt_dates(refresh);
        this.setup_date_values();
    }

    setup_gantt_dates(refresh: boolean) {
        let gantt_start: Date | undefined, gantt_end: Date | undefined;
        if (!this.tasks.length) {
            gantt_start = new Date();
            gantt_end = new Date();
        }

        for (let task of this.tasks) {
            if (task._start && (!gantt_start || task._start < gantt_start)) {
                gantt_start = task._start;
            }
            if (task._end && (!gantt_end || task._end > gantt_end)) {
                gantt_end = task._end;
            }
        }

        if (!gantt_start || !gantt_end || !this.config.unit) {
            throw new Error('Invalid gantt dates or unit');
        }

        gantt_start = date_utils.start_of(gantt_start, this.config.unit);
        gantt_end = date_utils.start_of(gantt_end, this.config.unit);

        if (!refresh) {
            if (!this.options.infinite_padding) {
                const viewMode = this.config.view_mode;
                if (!viewMode) throw new Error('View mode not set');

                if (typeof viewMode.padding === 'string') {
                    viewMode.padding = [viewMode.padding, viewMode.padding];
                }

                const paddings = viewMode.padding.map(date_utils.parse_duration);
                const padding_start = paddings[0];
                const padding_end = paddings[1];

                if (!padding_start || !padding_end) {
                    throw new Error('Invalid padding configuration');
                }

                this.gantt_start = date_utils.add(
                    gantt_start,
                    -padding_start.duration,
                    padding_start.scale,
                );
                this.gantt_end = date_utils.add(
                    gantt_end,
                    padding_end.duration,
                    padding_end.scale,
                );
            } else {
                if (!this.config.unit) throw new Error('Config unit not set');
                this.gantt_start = date_utils.add(
                    gantt_start,
                    -this.config.extend_by_units * 3,
                    this.config.unit,
                );
                this.gantt_end = date_utils.add(
                    gantt_end,
                    this.config.extend_by_units * 3,
                    this.config.unit,
                );
            }
        }

        const dateFormat = this.config.view_mode?.date_format || this.options.date_format;
        if (!dateFormat) throw new Error('Date format not set');
        this.config.date_format = dateFormat;
        this.gantt_start.setHours(0, 0, 0, 0);
    }

    setup_date_values() {
        let cur_date = this.gantt_start;
        this.dates = [cur_date];

        if (!this.config.step || !this.config.unit) {
            throw new Error('Config step or unit not set');
        }

        while (cur_date < this.gantt_end) {
            cur_date = date_utils.add(
                cur_date,
                this.config.step,
                this.config.unit,
            );
            this.dates.push(cur_date);
        }
    }

    bind_events() {
        this.bind_grid_click();
        this.bind_holiday_labels();
        this.bind_bar_events();
    }

    render() {
        this.clear();
        const { layers, extras, adjust } = this.setup_layers();
        this.layers = layers;
        this.$extras = extras;
        this.$adjust = adjust;
        this.make_grid();
        this.make_dates();
        this.make_grid_extras();
        this.make_bars();
        this.make_arrows();
        this.map_arrows_on_bars();
        this.set_dimensions();
        this.set_scroll_position(this.options.scroll_to);
    }

    setup_layers(): { layers: Record<string, SVGElement>; extras: HTMLElement; adjust: HTMLElement } {
        const layers: Record<string, SVGElement> = {};
        const layerNames = ['grid', 'arrow', 'progress', 'bar'];
        // make group layers
        for (let layer of layerNames) {
            layers[layer] = createSVG('g', {
                class: layer,
                append_to: this.$svg,
            });
        }
        const extras = this.create_el({
            classes: 'extras',
            append_to: this.$container,
        });
        const adjust = this.create_el({
            classes: 'adjust hide',
            append_to: extras,
            type: 'button',
        });
        adjust.innerHTML = '&larr;';
        return { layers, extras, adjust };
    }

    make_grid() {
        this.make_grid_background();
        this.make_grid_rows();
        const { header, upper_header, lower_header } = this.make_grid_header();
        this.$header = header;
        this.$upper_header = upper_header;
        this.$lower_header = lower_header;
        const { side_header, today_button } = this.make_side_header();
        this.$side_header = side_header;
        this.$today_button = today_button;
    }

    make_grid_extras() {
        this.make_grid_highlights();
        this.make_grid_ticks();
    }

    make_grid_background() {
        const grid_width = this.dates.length * this.config.column_width!;
        const grid_height = Math.max(
            this.config.header_height! +
                this.options.padding! +
                (this.options.bar_height! + this.options.padding!) *
                    this.tasks.length -
                10,
            typeof this.options.container_height === 'number'
                ? this.options.container_height
                : 0,
        );

        createSVG('rect', {
            x: 0,
            y: 0,
            width: grid_width,
            height: grid_height,
            class: 'grid-background',
            append_to: this.$svg,
        });

        $.attr(this.$svg, {
            height: grid_height,
            width: '100%',
        });
        this.grid_height = grid_height;
        if (this.options.container_height === 'auto')
            this.$container.style.height = grid_height + 'px';
    }

    make_grid_rows() {
        const rows_layer = createSVG('g', { append_to: this.layers.grid });

        const row_width = this.dates.length * this.config.column_width!;
        const row_height = this.options.bar_height! + this.options.padding!;

        for (
            let y = this.config.header_height!;
            y < this.grid_height;
            y += row_height
        ) {
            createSVG('rect', {
                x: 0,
                y,
                width: row_width,
                height: row_height,
                class: 'grid-row',
                append_to: rows_layer,
            });
        }
    }

    make_grid_header(): { header: HTMLElement; upper_header: HTMLElement; lower_header: HTMLElement } {
        const header = this.create_el({
            width: this.dates.length * this.config.column_width!,
            classes: 'grid-header',
            append_to: this.$container,
        });

        const upper_header = this.create_el({
            classes: 'upper-header',
            append_to: header,
        });
        const lower_header = this.create_el({
            classes: 'lower-header',
            append_to: header,
        });

        return { header, upper_header, lower_header };
    }

    make_side_header(): { side_header: HTMLElement; today_button: HTMLElement | undefined } {
        const side_header = this.create_el({ classes: 'side-header' });
        this.$upper_header.prepend(side_header);

        // Create view mode change select
        if (this.options.view_mode_select) {
            const $select = document.createElement('select');
            $select.classList.add('viewmode-select');

            const $el = document.createElement('option');
            $el.selected = true;
            $el.disabled = true;
            $el.textContent = 'Mode';
            $select.appendChild($el);

            const viewModes = this.options.view_modes || [];
            for (const mode of viewModes) {
                if (typeof mode === 'string') continue;
                const $option = document.createElement('option');
                $option.value = mode.name;
                $option.textContent = mode.name;
                const currentViewMode = this.config.view_mode;
                if (currentViewMode && mode.name === currentViewMode.name)
                    $option.selected = true;
                $select.appendChild($option);
            }

            $select.addEventListener(
                'change',
                function (this: Gantt) {
                    this.change_view_mode($select.value, true);
                }.bind(this),
            );
            side_header.appendChild($select);
        }

        // Create today button
        let today_button: HTMLElement | undefined;
        if (this.options.today_button) {
            today_button = document.createElement('button');
            today_button.classList.add('today-button');
            today_button.textContent = 'Today';
            today_button.onclick = this.scroll_current.bind(this);
            side_header.prepend(today_button);
        }

        return { side_header, today_button };
    }

    make_grid_ticks() {
        if (this.options.lines === 'none') return;
        let tick_x = 0;
        let tick_y = this.config.header_height!;
        let tick_height = this.grid_height - this.config.header_height!;

        let $lines_layer = createSVG('g', {
            class: 'lines_layer',
            append_to: this.layers.grid,
        });

        let row_y = this.config.header_height!;

        const row_width = this.dates.length * this.config.column_width!;
        const row_height = this.options.bar_height! + this.options.padding!;
        if (this.options.lines !== 'vertical') {
            for (
                let y = this.config.header_height;
                y < this.grid_height;
                y += row_height
            ) {
                createSVG('line', {
                    x1: 0,
                    y1: row_y + row_height,
                    x2: row_width,
                    y2: row_y + row_height,
                    class: 'row-line',
                    append_to: $lines_layer,
                });
                row_y += row_height;
            }
        }
        if (this.options.lines === 'horizontal') return;

        for (let date of this.dates) {
            let tick_class = 'tick';
            if (
                this.config.view_mode.thick_line &&
                this.config.view_mode.thick_line(date)
            ) {
                tick_class += ' thick';
            }

            createSVG('path', {
                d: `M ${tick_x} ${tick_y} v ${tick_height}`,
                class: tick_class,
                append_to: this.layers.grid,
            });

            if (this.view_is('month')) {
                tick_x +=
                    (date_utils.get_days_in_month(date) *
                        this.config.column_width!) /
                    30;
            } else if (this.view_is('year')) {
                tick_x +=
                    (date_utils.get_days_in_year(date) *
                        this.config.column_width!) /
                    365;
            } else {
                tick_x += this.config.column_width!;
            }
        }
    }

    highlight_holidays() {
        let labels = {};
        if (!this.options.holidays) return;

        for (let color in this.options.holidays) {
            let check_highlight = this.options.holidays[color];
            if (check_highlight === 'weekend')
                check_highlight = this.options.is_weekend;
            let extra_func;

            if (typeof check_highlight === 'object' && Array.isArray(check_highlight)) {
                let f = check_highlight.find((k) => typeof k === 'function');
                if (f && typeof f === 'function') {
                    extra_func = f;
                }
                const holidayValue = this.options.holidays?.[color];
                const isHolidayEntry = (val: unknown): val is { date: string; name: string } =>
                    typeof val === 'object' && val !== null && 'date' in val && 'name' in val;

                if (Array.isArray(holidayValue) && holidayValue.some(isHolidayEntry)) {
                    check_highlight = (d: Date) => {
                        if (!Array.isArray(holidayValue)) return false;
                        return holidayValue
                            .filter((k): k is string | Date | { date: string; name: string } => typeof k !== 'function')
                            .map((k) => {
                                if (isHolidayEntry(k)) {
                                    let dateObj = new Date(k.date + ' ');
                                    labels[dateObj.toISOString()] = k.name;
                                    return dateObj.getTime();
                                }
                                if (typeof k === 'string') {
                                    return new Date(k + ' ').getTime();
                                }
                                if (k instanceof Date) {
                                    return k.getTime();
                                }
                                return 0;
                            })
                            .includes(d.getTime());
                    };
                }
            }
            for (
                let d = new Date(this.gantt_start);
                d <= this.gantt_end;
                d.setDate(d.getDate() + 1)
            ) {
                if (
                    this.config.ignored_dates.find(
                        (k: Date) => k.getTime() == d.getTime(),
                    ) ||
                    (this.config.ignored_function &&
                        this.config.ignored_function(d))
                )
                    continue;
                if ((typeof check_highlight === 'function' && check_highlight(d)) || (extra_func && extra_func(d))) {
                    const x =
                        (date_utils.diff(
                            d,
                            this.gantt_start,
                            this.config.unit!,
                        ) /
                            this.config.step!) *
                        this.config.column_width!;
                    const height = this.grid_height - this.config.header_height!;
                    const d_formatted = date_utils
                        .format(d, 'YYYY-MM-DD', this.options.language)
                        .replace(' ', '_');

                    if (labels[d.toISOString()]) {
                        let label = this.create_el({
                            classes: 'holiday-label ' + 'label_' + d_formatted,
                            append_to: this.$extras,
                        });
                        label.textContent = labels[d.toISOString()];
                    }
                    createSVG('rect', {
                        x: Math.round(x),
                        y: this.config.header_height!,
                        width:
                            this.config.column_width! /
                            date_utils.convert_scales(
                                this.config.view_mode!.step,
                                'day',
                            ),
                        height,
                        class: 'holiday-highlight ' + d_formatted,
                        style: `fill: ${color};`,
                        append_to: this.layers.grid,
                    });
                }
            }
        }
    }

    /**
     * Compute the horizontal x-axis distance and associated date for the current date and view.
     *
     * @returns Object containing the x-axis distance and date of the current date, or null if the current date is out of the gantt range.
     */
    highlight_current() {
        const res = this.get_closest_date();
        if (!res) return;

        const [_, el] = res;
        if (el instanceof HTMLElement) {
            el.classList.add('current-date-highlight');
        }

        const diff_in_units = date_utils.diff(
            new Date(),
            this.gantt_start,
            this.config.unit!,
        );

        const left =
            (diff_in_units / this.config.step!) * this.config.column_width!;

        this.$current_highlight = this.create_el({
            top: this.config.header_height!,
            left,
            height: this.grid_height - this.config.header_height!,
            classes: 'current-highlight',
            append_to: this.$container,
        });
        this.$current_ball_highlight = this.create_el({
            top: this.config.header_height! - 6,
            left: left - 2.5,
            width: 6,
            height: 6,
            classes: 'current-ball-highlight',
            append_to: this.$header,
        });
    }

    make_grid_highlights() {
        this.highlight_holidays();
        this.config.ignored_positions = [];

        const height =
            (this.options.bar_height! + this.options.padding!) *
            this.tasks.length;
        this.layers.grid.innerHTML += `<pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
          <path d="M-1,1 l2,-2
                   M0,4 l4,-4
                   M3,5 l2,-2"
                style="stroke:grey; stroke-width:0.3" />
        </pattern>`;

        for (
            let d = new Date(this.gantt_start);
            d <= this.gantt_end;
            d.setDate(d.getDate() + 1)
        ) {
            if (
                !this.config.ignored_dates.find(
                    (k: Date) => k.getTime() == d.getTime(),
                ) &&
                (!this.config.ignored_function ||
                    !this.config.ignored_function(d))
            )
                continue;
            let diff =
                date_utils.convert_scales(
                    date_utils.diff(d, this.gantt_start) + 'd',
                    this.config.unit!,
                ) / this.config.step!;

            this.config.ignored_positions.push(diff * this.config.column_width!);
            createSVG('rect', {
                x: diff * this.config.column_width!,
                y: this.config.header_height!,
                width: this.config.column_width!,
                height: height,
                class: 'ignored-bar',
                style: 'fill: url(#diagonalHatch);',
                append_to: this.$svg,
            });
        }

        this.highlight_current();
    }

    create_el({ left, top, width, height, id, classes, append_to, type }: {
        left?: number;
        top?: number;
        width?: number;
        height?: number;
        id?: string;
        classes: string;
        append_to?: HTMLElement | SVGElement;
        type?: string;
    }): HTMLElement {
        let $el = document.createElement(type || 'div');
        for (let cls of classes.split(' ')) $el.classList.add(cls);
        if (top !== undefined) $el.style.top = top + 'px';
        if (left !== undefined) $el.style.left = left + 'px';
        if (id) $el.id = id;
        if (width) $el.style.width = width + 'px';
        if (height) $el.style.height = height + 'px';
        if (append_to) append_to.appendChild($el);
        return $el;
    }

    make_dates() {
        this.get_dates_to_draw().forEach((date: DateInfo, i: number) => {
            if (date.lower_text) {
                let $lower_text = this.create_el({
                    left: date.x,
                    top: date.lower_y,
                    classes: 'lower-text date_' + sanitize(date.formatted_date),
                    append_to: this.$lower_header,
                });
                $lower_text.innerText = date.lower_text;
            }

            if (date.upper_text) {
                let $upper_text = this.create_el({
                    left: date.x,
                    top: date.upper_y,
                    classes: 'upper-text',
                    append_to: this.$upper_header,
                });
                $upper_text.innerText = date.upper_text;
            }
        });
        this.upperTexts = Array.from(
            this.$container.querySelectorAll('.upper-text'),
        );
    }

    get_dates_to_draw(): DateInfo[] {
        let last_date_info: DateInfo | null = null;
        const dates = this.dates.map((date: Date, i: number) => {
            const d = this.get_date_info(date, last_date_info, i);
            last_date_info = d;
            return d;
        });
        return dates;
    }

    get_date_info(date: Date, last_date_info: DateInfo | null = null, i?: number): DateInfo {
        let last_date: Date | null = last_date_info ? last_date_info.date : null;

        let column_width = this.config.column_width!;

        const x = last_date_info
            ? last_date_info.x + last_date_info.column_width
            : 0;

        let upper_text = this.config.view_mode!.upper_text;
        let lower_text = this.config.view_mode!.lower_text;

        if (!upper_text) {
            this.config.view_mode!.upper_text = () => '';
        } else if (typeof upper_text === 'string') {
            this.config.view_mode!.upper_text = (date: Date) =>
                date_utils.format(date, upper_text, this.options.language);
        }

        if (!lower_text) {
            this.config.view_mode!.lower_text = () => '';
        } else if (typeof lower_text === 'string') {
            this.config.view_mode!.lower_text = (date: Date) =>
                date_utils.format(date, lower_text, this.options.language);
        }

        const upperTextFn = this.config.view_mode!.upper_text;
        const lowerTextFn = this.config.view_mode!.lower_text;

        return {
            date,
            formatted_date: sanitize(
                date_utils.format(
                    date,
                    this.config.date_format!,
                    this.options.language,
                ),
            ),
            column_width: this.config.column_width!,
            x,
            upper_text: typeof upperTextFn === 'function'
                ? upperTextFn(date, last_date, this.options.language)
                : upperTextFn || '',
            lower_text: typeof lowerTextFn === 'function'
                ? lowerTextFn(date, last_date, this.options.language)
                : lowerTextFn || '',
            upper_y: 17,
            lower_y: this.options.upper_header_height! + 5,
        };
    }

    make_bars() {
        this.bars = this.tasks.map((task: Task) => {
            const bar = new Bar(this, task);
            this.layers.bar.appendChild(bar.group);
            return bar;
        });
    }

    make_arrows() {
        this.arrows = [];
        for (let task of this.tasks) {
            let arrows = [];
            if (task.dependencies && Array.isArray(task.dependencies)) {
                arrows = task.dependencies
                    .map((task_id: string) => {
                    const dependency = this.get_task(task_id);
                    if (!dependency) return;
                    const arrow = new Arrow(
                        this,
                        this.bars[dependency._index], // from_task
                        this.bars[task._index], // to_task
                    );
                    this.layers.arrow.appendChild(arrow.element);
                        return arrow;
                    })
                    .filter(Boolean); // filter falsy values
            }
            this.arrows = this.arrows.concat(arrows);
        }
    }

    map_arrows_on_bars() {
        for (let bar of this.bars) {
            bar.arrows = this.arrows.filter((arrow: Arrow) => {
                return (
                    arrow.from_task.task.id === bar.task.id ||
                    arrow.to_task.task.id === bar.task.id
                );
            });
        }
    }

    set_dimensions() {
        const { width: cur_width } = this.$svg.getBoundingClientRect();
        const actual_width = this.$svg.querySelector('.grid .grid-row')
            ? this.$svg.querySelector('.grid .grid-row')!.getAttribute('width')
            : '0';
        const actualWidthNum = actual_width ? parseFloat(actual_width) : 0;
        if (cur_width < actualWidthNum) {
            this.$svg.setAttribute('width', actual_width!);
        }
    }

    set_scroll_position(date?: string | Date | null) {
        if (this.options.infinite_padding && (!date || date === 'start')) {
            let [min_start, ..._] = this.get_start_end_positions();
            this.$container.scrollLeft = min_start;
            return;
        }
        let scrollDate: Date;
        if (!date || date === 'start') {
            scrollDate = this.gantt_start;
        } else if (date === 'end') {
            scrollDate = this.gantt_end;
        } else if (date === 'today') {
            return this.scroll_current();
        } else if (typeof date === 'string') {
            scrollDate = date_utils.parse(date);
        } else {
            scrollDate = date;
        }

        // Weird bug where infinite padding results in one day offset in scroll
        // Related to header-body displacement
        const units_since_first_task = date_utils.diff(
            scrollDate,
            this.gantt_start,
            this.config.unit!,
        );
        const scroll_pos =
            (units_since_first_task / this.config.step!) *
            this.config.column_width!;

        this.$container.scrollTo({
            left: scroll_pos - this.config.column_width / 6,
            behavior: 'smooth',
        });

        // Calculate current scroll position's upper text
        if (this.$current) {
            this.$current.classList.remove('current-upper');
        }

        this.current_date = date_utils.add(
            this.gantt_start,
            this.$container.scrollLeft / this.config.column_width!,
            this.config.unit!,
        );

        const upperTextFn2 = this.config.view_mode!.upper_text;
        let current_upper = typeof upperTextFn2 === 'function'
            ? upperTextFn2(this.current_date, null, this.options.language)
            : upperTextFn2 || '';
        let $el = this.upperTexts.find(
            (el) => el.textContent === current_upper,
        );

        // Recalculate
        this.current_date = date_utils.add(
            this.gantt_start,
            (this.$container.scrollLeft + ($el?.clientWidth || 0)) /
                this.config.column_width!,
            this.config.unit!,
        );
        const upperTextFn2b = this.config.view_mode!.upper_text;
        current_upper = typeof upperTextFn2b === 'function'
            ? upperTextFn2b(this.current_date, null, this.options.language)
            : upperTextFn2b || '';
        const foundUpperEl = this.upperTexts.find((el) => el.textContent === current_upper);
        if (foundUpperEl instanceof HTMLElement) {
            $el = foundUpperEl;
            $el.classList.add('current-upper');
            this.$current = foundUpperEl;
        }
    }

    scroll_current() {
        let res = this.get_closest_date();
        if (res) this.set_scroll_position(res[0]);
    }

    get_closest_date(): [Date, Element] | null {
        let now = new Date();
        if (now < this.gantt_start || now > this.gantt_end) return null;

        let current = new Date(),
            el = this.$container.querySelector(
                '.date_' +
                    sanitize(
                        date_utils.format(
                            current,
                            this.config.date_format,
                            this.options.language,
                        ),
                    ),
            );

        // safety check to prevent infinite loop
        let c = 0;
        while (!el && c < this.config.step!) {
            current = date_utils.add(current, -1, this.config.unit!);
            el = this.$container.querySelector(
                '.date_' +
                    sanitize(
                        date_utils.format(
                            current,
                            this.config.date_format!,
                            this.options.language,
                        ),
                    ),
            );
            c++;
        }
        if (!el) return null;
        return [
            new Date(
                date_utils.format(
                    current,
                    this.config.date_format!,
                    this.options.language,
                ) + ' ',
            ),
            el,
        ];
    }

    bind_grid_click() {
        $.on(
            this.$container,
            'click',
            '.grid-row, .grid-header, .ignored-bar, .holiday-highlight',
            () => {
                this.unselect_all();
                this.hide_popup();
            },
        );
    }

    bind_holiday_labels() {
        const $highlights =
            this.$container.querySelectorAll('.holiday-highlight');
        for (let h of Array.from($highlights)) {
            if (!(h instanceof HTMLElement)) continue;
            const label = this.$container.querySelector(
                '.label_' + h.classList[1],
            );
            if (!(label instanceof HTMLElement)) continue;
            let timeout: ReturnType<typeof setTimeout>;
            h.onmouseenter = (e: MouseEvent) => {
                timeout = setTimeout(() => {
                    label.classList.add('show');
                    label.style.left = getMouseX(e) + 'px';
                    label.style.top = getMouseY(e) + 'px';
                }, 300);
            };

            h.onmouseleave = (e: MouseEvent) => {
                clearTimeout(timeout);
                label.classList.remove('show');
            };
        }
    }

    get_start_end_positions() {
        if (!this.bars.length) return [0, 0, 0];
        let { x, width } = this.bars[0].group.getBBox();
        let min_start = x;
        let max_start = x;
        let max_end = x + width;
        Array.prototype.forEach.call(this.bars, function ({ group }, i) {
            let { x, width } = group.getBBox();
            if (x < min_start) min_start = x;
            if (x > max_start) max_start = x;
            if (x + width > max_end) max_end = x + width;
        });
        return [min_start, max_start, max_end];
    }

    bind_bar_events() {
        let is_dragging = false;
        let x_on_start = 0;
        let x_on_scroll_start = 0;
        let is_resizing_left = false;
        let is_resizing_right = false;
        let parent_bar_id = null;
        let bars = []; // instanceof Bar
        this.bar_being_dragged = null;

        const action_in_progress = () =>
            is_dragging || is_resizing_left || is_resizing_right;

        this.$svg.onclick = (e) => {
            if (e.target instanceof Element && e.target.classList.contains('grid-row')) this.unselect_all();
        };

        let pos = 0;
        $.on(this.$svg, 'mousemove', '.bar-wrapper, .handle', (e: Event) => {
            if (!(e instanceof MouseEvent)) return;
            if (
                this.bar_being_dragged === false &&
                Math.abs(getMouseX(e) - pos) > 10
            )
                this.bar_being_dragged = true;
        });

        $.on(this.$svg, 'mousedown', '.bar-wrapper, .handle', (e: Event, element?: Element) => {
            if (!(e instanceof MouseEvent)) return;
            if (!element) return;

            const bar_wrapper = $.closest('.bar-wrapper', element);
            if (element.classList.contains('left')) {
                is_resizing_left = true;
                element.classList.add('visible');
            } else if (element.classList.contains('right')) {
                is_resizing_right = true;
                element.classList.add('visible');
            } else if (element.classList.contains('bar-wrapper')) {
                is_dragging = true;
            }

            if (this.popup) this.popup.hide();

            x_on_start = getMouseX(e);

            parent_bar_id = bar_wrapper.getAttribute('data-id');
            let ids;
            if (this.options.move_dependencies) {
                ids = [
                    parent_bar_id,
                    ...this.get_all_dependent_tasks(parent_bar_id),
                ];
            } else {
                ids = [parent_bar_id];
            }
            bars = ids.map((id) => this.get_bar(id));

            this.bar_being_dragged = false;
            pos = x_on_start;

            bars.forEach((bar) => {
                const $bar = bar.$bar;
                $bar.ox = $bar.getX();
                $bar.oy = $bar.getY();
                $bar.owidth = $bar.getWidth();
                $bar.finaldx = 0;
            });
        });

        if (this.options.infinite_padding) {
            let extended = false;
            $.on(this.$container, 'mousewheel', (e: Event) => {
                if (!(e.currentTarget instanceof HTMLElement)) return;
                let trigger = this.$container.scrollWidth / 2;
                if (!extended && e.currentTarget.scrollLeft <= trigger) {
                    let old_scroll_left = e.currentTarget.scrollLeft;
                    extended = true;

                    this.gantt_start = date_utils.add(
                        this.gantt_start,
                        -this.config.extend_by_units,
                        this.config.unit,
                    );
                    this.setup_date_values();
                    this.render();
                    e.currentTarget.scrollLeft =
                        old_scroll_left +
                        this.config.column_width! * this.config.extend_by_units;
                    setTimeout(() => (extended = false), 300);
                }

                if (
                    !extended &&
                    e.currentTarget.scrollWidth -
                        (e.currentTarget.scrollLeft +
                            e.currentTarget.clientWidth) <=
                        trigger
                ) {
                    let old_scroll_left = e.currentTarget.scrollLeft;
                    extended = true;
                    this.gantt_end = date_utils.add(
                        this.gantt_end,
                        this.config.extend_by_units,
                        this.config.unit,
                    );
                    this.setup_date_values();
                    this.render();
                    e.currentTarget.scrollLeft = old_scroll_left;
                    setTimeout(() => (extended = false), 300);
                }
            });
        }

        $.on(this.$container, 'scroll', (e: Event) => {
            if (!(e.currentTarget instanceof HTMLElement)) return;
            const currentTarget = e.currentTarget;
            let localBars = [];
            const ids = this.bars.map(({ group }) =>
                group.getAttribute('data-id'),
            );
            let dx: number | undefined;
            if (x_on_scroll_start) {
                dx = currentTarget.scrollLeft - x_on_scroll_start;
            }

            // Calculate current scroll position's upper text
            this.current_date = date_utils.add(
                this.gantt_start,
                (currentTarget.scrollLeft / this.config.column_width!) *
                    this.config.step!,
                this.config.unit!,
            );

            const upperTextFn = this.config.view_mode!.upper_text;
            let current_upper = typeof upperTextFn === 'function'
                ? upperTextFn(this.current_date, null, this.options.language)
                : upperTextFn;
            let $el = this.upperTexts.find(
                (el) => el.textContent === current_upper,
            );

            // Recalculate for smoother experience
            if ($el instanceof HTMLElement) {
                this.current_date = date_utils.add(
                    this.gantt_start,
                    ((currentTarget.scrollLeft + $el.clientWidth) /
                        this.config.column_width!) *
                        this.config.step!,
                    this.config.unit!,
                );
                const upperTextFn3 = this.config.view_mode!.upper_text;
                current_upper = typeof upperTextFn3 === 'function'
                    ? upperTextFn3(this.current_date, null, this.options.language)
                    : upperTextFn3;
                const newEl = this.upperTexts.find(
                    (el) => el.textContent === current_upper,
                );
                if (newEl instanceof HTMLElement) {
                    $el = newEl;
                }
            }

            if ($el instanceof HTMLElement && $el !== this.$current) {
                if (this.$current)
                    this.$current.classList.remove('current-upper');

                $el.classList.add('current-upper');
                this.$current = $el;
            }

            x_on_scroll_start = currentTarget.scrollLeft;
            let [min_start, max_start, max_end] =
                this.get_start_end_positions();

            if (x_on_scroll_start > max_end + 100) {
                this.$adjust.innerHTML = '&larr;';
                this.$adjust.classList.remove('hide');
                this.$adjust.onclick = () => {
                    this.$container.scrollTo({
                        left: max_start,
                        behavior: 'smooth',
                    });
                };
            } else if (
                x_on_scroll_start + currentTarget.offsetWidth <
                min_start - 100
            ) {
                this.$adjust.innerHTML = '&rarr;';
                this.$adjust.classList.remove('hide');
                this.$adjust.onclick = () => {
                    this.$container.scrollTo({
                        left: min_start,
                        behavior: 'smooth',
                    });
                };
            } else {
                this.$adjust.classList.add('hide');
            }

            if (dx) {
                localBars = ids.map((id) => this.get_bar(id));
                if (this.options.auto_move_label) {
                    localBars.forEach((bar) => {
                        bar.update_label_position_on_horizontal_scroll({
                            x: dx,
                            sx: currentTarget.scrollLeft,
                        });
                    });
                }
            }
        });

        $.on(this.$svg, 'mousemove', (e: Event) => {
            if (!action_in_progress()) return;
            if (!(e instanceof MouseEvent)) return;
            const dx = getMouseX(e) - x_on_start;

            bars.forEach((bar) => {
                const $bar = bar.$bar;
                $bar.finaldx = this.get_snap_position(dx, $bar.ox);
                this.hide_popup();
                if (is_resizing_left) {
                    if (parent_bar_id === bar.task.id) {
                        bar.update_bar_position({
                            x: $bar.ox + $bar.finaldx,
                            width: $bar.owidth - $bar.finaldx,
                        });
                    } else {
                        bar.update_bar_position({
                            x: $bar.ox + $bar.finaldx,
                        });
                    }
                } else if (is_resizing_right) {
                    if (parent_bar_id === bar.task.id) {
                        bar.update_bar_position({
                            width: $bar.owidth + $bar.finaldx,
                        });
                    }
                } else if (
                    is_dragging &&
                    !this.options.readonly &&
                    !this.options.readonly_dates
                ) {
                    bar.update_bar_position({ x: $bar.ox + $bar.finaldx });
                }
            });
        });

        document.addEventListener('mouseup', () => {
            is_dragging = false;
            is_resizing_left = false;
            is_resizing_right = false;
            this.$container
                .querySelector('.visible')
                ?.classList?.remove?.('visible');
        });

        $.on(this.$svg, 'mouseup', (e) => {
            this.bar_being_dragged = null;
            bars.forEach((bar) => {
                const $bar = bar.$bar;
                if (!$bar.finaldx) return;
                bar.date_changed();
                bar.compute_progress();
                bar.set_action_completed();
            });
        });

        this.bind_bar_progress();
    }

    bind_bar_progress() {
        let x_on_start = 0;
        let is_resizing = null;
        let bar = null;
        let $bar_progress = null;
        let $bar = null;

        $.on(this.$svg, 'mousedown', '.handle.progress', (e: Event, handle?: Element) => {
            if (!(e instanceof MouseEvent)) return;
            is_resizing = true;
            x_on_start = getMouseX(e);

            const $bar_wrapper = $.closest('.bar-wrapper', handle);
            const id = $bar_wrapper.getAttribute('data-id');
            bar = this.get_bar(id);

            $bar_progress = bar.$bar_progress;
            $bar = bar.$bar;

            $bar_progress.finaldx = 0;
            $bar_progress.owidth = $bar_progress.getWidth();
            $bar_progress.min_dx = -$bar_progress.owidth;
            $bar_progress.max_dx = $bar.getWidth() - $bar_progress.getWidth();
        });

        const range_positions = this.config.ignored_positions.map((d) => [
            d,
            d + this.config.column_width,
        ]);

        $.on(this.$svg, 'mousemove', (e: Event) => {
            if (!is_resizing) return;
            if (!(e instanceof MouseEvent)) return;
            let now_x = getMouseX(e);

            let moving_right = now_x > x_on_start;
            if (moving_right) {
                let k = range_positions.find(
                    ([begin, end]) => now_x >= begin && now_x < end,
                );
                while (k) {
                    now_x = k[1];
                    k = range_positions.find(
                        ([begin, end]) => now_x >= begin && now_x < end,
                    );
                }
            } else {
                let k = range_positions.find(
                    ([begin, end]) => now_x > begin && now_x <= end,
                );
                while (k) {
                    now_x = k[0];
                    k = range_positions.find(
                        ([begin, end]) => now_x > begin && now_x <= end,
                    );
                }
            }

            let dx = now_x - x_on_start;
            console.log($bar_progress);
            if (dx > $bar_progress.max_dx) {
                dx = $bar_progress.max_dx;
            }
            if (dx < $bar_progress.min_dx) {
                dx = $bar_progress.min_dx;
            }

            $bar_progress.setAttribute('width', $bar_progress.owidth + dx);
            $.attr(bar.$handle_progress, 'cx', $bar_progress.getEndX());

            $bar_progress.finaldx = dx;
        });

        $.on(this.$svg, 'mouseup', () => {
            is_resizing = false;
            if (!($bar_progress && $bar_progress.finaldx)) return;

            $bar_progress.finaldx = 0;
            bar.progress_changed();
            bar.set_action_completed();
            bar = null;
            $bar_progress = null;
            $bar = null;
        });
    }

    get_all_dependent_tasks(task_id) {
        let out = [];
        let to_process = [task_id];
        while (to_process.length) {
            const deps = to_process.reduce((acc, curr) => {
                acc = acc.concat(this.dependency_map[curr]);
                return acc;
            }, []);

            out = out.concat(deps);
            to_process = deps.filter((d) => !to_process.includes(d));
        }

        return out.filter(Boolean);
    }

    get_snap_position(dx, ox) {
        let unit_length = 1;
        const default_snap =
            this.options.snap_at || this.config.view_mode.snap_at || '1d';

        if (default_snap !== 'unit') {
            const { duration, scale } = date_utils.parse_duration(default_snap);
            unit_length =
                date_utils.convert_scales(this.config.view_mode.step, scale) /
                duration;
        }

        const rem = dx % (this.config.column_width / unit_length);

        let final_dx =
            dx -
            rem +
            (rem < (this.config.column_width / unit_length) * 2
                ? 0
                : this.config.column_width / unit_length);
        let final_pos = ox + final_dx;

        const drn = final_dx > 0 ? 1 : -1;
        let ignored_regions = this.get_ignored_region(final_pos, drn);
        while (ignored_regions.length) {
            final_pos += this.config.column_width * drn;
            ignored_regions = this.get_ignored_region(final_pos, drn);
            if (!ignored_regions.length)
                final_pos -= this.config.column_width * drn;
        }
        return final_pos - ox;
    }

    get_ignored_region(pos, drn = 1) {
        if (drn === 1) {
            return this.config.ignored_positions.filter((val) => {
                return pos > val && pos <= val + this.config.column_width;
            });
        } else {
            return this.config.ignored_positions.filter(
                (val) => pos >= val && pos < val + this.config.column_width,
            );
        }
    }

    unselect_all() {
        if (this.popup) this.popup.parent.classList.add('hide');
        this.$container
            .querySelectorAll('.date-range-highlight')
            .forEach((k) => k.classList.add('hide'));
    }

    view_is(modes) {
        if (typeof modes === 'string') {
            return this.config.view_mode.name === modes;
        }

        if (Array.isArray(modes)) {
            return modes.some(m => this.view_is(m));
        }

        return this.config.view_mode.name === modes.name;
    }

    get_task(id) {
        return this.tasks.find((task) => {
            return task.id === id;
        });
    }

    get_bar(id) {
        return this.bars.find((bar) => {
            return bar.task.id === id;
        });
    }

    show_popup(opts) {
        if (this.options.popup === false) return;
        if (!this.popup) {
            this.popup = new Popup(
                this.$popup_wrapper,
                this.options.popup,
                this,
            );
        }
        this.popup.show(opts);
    }

    hide_popup() {
        this.popup && this.popup.hide();
    }

    trigger_event(event, args) {
        if (this.options['on_' + event]) {
            this.options['on_' + event].apply(this, args);
        }
    }

    /**
     * Gets the oldest starting date from the list of tasks
     *
     * @returns Date
     * @memberof Gantt
     */
    get_oldest_starting_date() {
        if (!this.tasks.length) return new Date();
        return this.tasks
            .map((task) => task._start)
            .reduce((prev_date, cur_date) =>
                cur_date <= prev_date ? cur_date : prev_date,
            );
    }

    /**
     * Clear all elements from the parent svg element
     *
     * @memberof Gantt
     */
    clear() {
        this.$svg.innerHTML = '';
        this.$header?.remove?.();
        this.$side_header?.remove?.();
        this.$current_highlight?.remove?.();
        this.$extras?.remove?.();
        this.popup?.hide?.();
    }
}

Object.assign(Gantt, {
    VIEW_MODE: {
        HOUR: DEFAULT_VIEW_MODES[0],
        QUARTER_DAY: DEFAULT_VIEW_MODES[1],
        HALF_DAY: DEFAULT_VIEW_MODES[2],
        DAY: DEFAULT_VIEW_MODES[3],
        WEEK: DEFAULT_VIEW_MODES[4],
        MONTH: DEFAULT_VIEW_MODES[5],
        YEAR: DEFAULT_VIEW_MODES[6],
    }
});

function generate_id(task: Task): string {
    return task.name + '_' + Math.random().toString(36).slice(2, 12);
}

function sanitize(s: string): string {
    return s.replace(/ /g, '_').replace(/:/g, '_').replace(/\./g, '_');
}
