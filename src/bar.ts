import date_utils from './date_utils';
import { $, createSVG, animateSVG } from './svg_utils';
import type Gantt from './index';
import type { Task } from './index';
import type Arrow from './arrow';

/**
 * Extend the global SVGElement interface to include custom helper methods.
 *
 * These methods are added to SVGElement.prototype at runtime in the prepare_helpers() method
 * to provide convenient access to SVG element attributes and computed properties.
 *
 * Without this declaration, TypeScript would not recognize these methods and would throw
 * type errors when calling them (e.g., this.$bar.getX()).
 *
 * Note: Modifying built-in prototypes is generally discouraged in modern JavaScript.
 * A better approach would be to use standalone utility functions, but this code maintains
 * compatibility with the existing architecture.
 */
declare global {
    interface SVGElement {
        getX(): number;
        getY(): number;
        getWidth(): number;
        getHeight(): number;
        getEndX(): number;
        getBBox(): DOMRect;
    }
}

export default class Bar {
    action_completed: boolean = false;
    gantt: Gantt;
    task: Task;
    name: string = '';
    group: SVGElement;
    bar_group: SVGElement;
    handle_group: SVGElement;
    invalid: boolean = false;
    height: number = 0;
    image_size: number = 0;
    corner_radius: number = 0;
    width: number = 0;
    duration: number = 0;
    expected_progress_width: number = 0;
    expected_progress: number = 0;
    $bar: SVGElement;
    progress_width: number = 0;
    $bar_progress: SVGElement;
    $date_highlight: HTMLElement;
    $expected_bar_progress: SVGElement;
    $handle_progress: SVGElement;
    handles: SVGElement[] = [];
    arrows: Arrow[] = [];
    x: number = 0;
    y: number = 0;
    actual_duration_raw: number = 0;
    ignored_duration_raw: number = 0;

    constructor(gantt: Gantt, task: Task) {
        this.gantt = gantt;
        this.task = task;

        // Initialize SVG elements - these will be properly set in prepare_wrappers and draw
        this.group = createSVG('g', {});
        this.bar_group = createSVG('g', {});
        this.handle_group = createSVG('g', {});
        this.$bar = createSVG('rect', {});
        this.$bar_progress = createSVG('rect', {});
        this.$expected_bar_progress = createSVG('rect', {});
        this.$handle_progress = createSVG('circle', {});
        this.$date_highlight = document.createElement('div');

        this.set_defaults(gantt, task);
        this.prepare_wrappers();
        this.prepare_helpers();
        this.refresh();
    }

    refresh() {
        this.bar_group.innerHTML = '';
        this.handle_group.innerHTML = '';
        if (this.task.custom_class) {
            this.group.classList.add(this.task.custom_class);
        } else {
            this.group.setAttribute('class', 'bar-wrapper');
        }

        this.prepare_values();
        this.draw();
        this.bind();
    }

    set_defaults(gantt: Gantt, task: Task) {
        this.action_completed = false;
        this.gantt = gantt;
        this.task = task;
        this.name = this.name || '';
    }

    prepare_wrappers() {
        this.group = createSVG('g', {
            class:
                'bar-wrapper' +
                (this.task.custom_class ? ' ' + this.task.custom_class : ''),
            'data-id': this.task.id,
        });
        this.bar_group = createSVG('g', {
            class: 'bar-group',
            append_to: this.group,
        });
        this.handle_group = createSVG('g', {
            class: 'handle-group',
            append_to: this.group,
        });
    }

    prepare_values() {
        this.invalid = this.task.invalid;
        this.height = this.gantt.options.bar_height;
        this.image_size = this.height - 5;
        this.task._start = new Date(this.task.start);
        this.task._end = new Date(this.task.end);
        this.compute_x();
        this.compute_y();
        this.compute_duration();
        this.corner_radius = this.gantt.options.bar_corner_radius;
        this.width = this.gantt.config.column_width * this.duration;
        if (!this.task.progress || this.task.progress < 0)
            this.task.progress = 0;
        if (this.task.progress > 100) this.task.progress = 100;
    }

    prepare_helpers() {
        SVGElement.prototype.getX = function () {
            return +(this.getAttribute('x') || 0);
        };
        SVGElement.prototype.getY = function () {
            return +(this.getAttribute('y') || 0);
        };
        SVGElement.prototype.getWidth = function () {
            return +(this.getAttribute('width') || 0);
        };
        SVGElement.prototype.getHeight = function () {
            return +(this.getAttribute('height') || 0);
        };
        SVGElement.prototype.getEndX = function () {
            return this.getX() + this.getWidth();
        };
    }

    prepare_expected_progress_values() {
        this.compute_expected_progress();
        this.expected_progress_width =
            this.gantt.options.column_width *
                this.duration *
                (this.expected_progress / 100) || 0;
    }

    draw() {
        this.draw_bar();
        this.draw_progress_bar();
        if (this.gantt.options.show_expected_progress) {
            this.prepare_expected_progress_values();
            this.draw_expected_progress_bar();
        }
        this.draw_label();
        this.draw_resize_handles();

        if (this.task.thumbnail) {
            this.draw_thumbnail();
        }
    }

    draw_bar() {
        this.$bar = createSVG('rect', {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'bar',
            append_to: this.bar_group,
        });
        if (this.task.color) this.$bar.style.fill = this.task.color;
        animateSVG(this.$bar, 'width', 0, this.width);

        if (this.invalid) {
            this.$bar.classList.add('bar-invalid');
        }
    }

    draw_expected_progress_bar() {
        if (this.invalid) return;
        this.$expected_bar_progress = createSVG('rect', {
            x: this.x,
            y: this.y,
            width: this.expected_progress_width,
            height: this.height,
            rx: this.corner_radius,
            ry: this.corner_radius,
            class: 'bar-expected-progress',
            append_to: this.bar_group,
        });

        animateSVG(
            this.$expected_bar_progress,
            'width',
            0,
            this.expected_progress_width,
        );
    }

    draw_progress_bar() {
        if (this.invalid) return;
        this.progress_width = this.calculate_progress_width();
        let r = this.corner_radius;
        if (!/^((?!chrome|android).)*safari/i.test(navigator.userAgent))
            r = this.corner_radius + 2;
        this.$bar_progress = createSVG('rect', {
            x: this.x,
            y: this.y,
            width: this.progress_width,
            height: this.height,
            rx: r,
            ry: r,
            class: 'bar-progress',
            append_to: this.bar_group,
        });
        if (this.task.color_progress)
            this.$bar_progress.style.fill = this.task.color_progress;
        const x =
            (date_utils.diff(
                this.task._start,
                this.gantt.gantt_start,
                this.gantt.config.unit,
            ) /
                this.gantt.config.step) *
            this.gantt.config.column_width;

        let $date_highlight = this.gantt.create_el({
            classes: `date-range-highlight hide highlight-${this.task.id}`,
            width: this.width,
            left: x,
        });
        this.$date_highlight = $date_highlight;
        this.gantt.$lower_header.prepend(this.$date_highlight);

        animateSVG(this.$bar_progress, 'width', 0, this.progress_width);
    }

    calculate_progress_width() {
        const width = this.$bar.getWidth();
        const ignored_end = this.x + width;
        const total_ignored_area =
            this.gantt.config.ignored_positions.reduce((acc: number, val: number) => {
                return acc + (val >= this.x && val < ignored_end ? 1 : 0);
            }, 0) * this.gantt.config.column_width;
        let progress_width =
            ((width - total_ignored_area) * this.task.progress) / 100;
        const progress_end = this.x + progress_width;
        const total_ignored_progress =
            this.gantt.config.ignored_positions.reduce((acc: number, val: number) => {
                return acc + (val >= this.x && val < progress_end ? 1 : 0);
            }, 0) * this.gantt.config.column_width;

        progress_width += total_ignored_progress;

        let ignored_regions = this.gantt.get_ignored_region(
            this.x + progress_width,
        );

        while (ignored_regions.length) {
            progress_width += this.gantt.config.column_width;
            ignored_regions = this.gantt.get_ignored_region(
                this.x + progress_width,
            );
        }
        this.progress_width = progress_width;
        return progress_width;
    }

    draw_label() {
        let x_coord = this.x + this.$bar.getWidth() / 2;

        if (this.task.thumbnail) {
            x_coord = this.x + this.image_size + 5;
        }

        createSVG('text', {
            x: x_coord,
            y: this.y + this.height / 2,
            innerHTML: this.task.name,
            class: 'bar-label',
            append_to: this.bar_group,
        });
        // labels get BBox in the next tick
        requestAnimationFrame(() => this.update_label_position());
    }

    draw_thumbnail() {
        let x_offset = 10,
            y_offset = 2;
        let defs, clipPath;

        defs = createSVG('defs', {
            append_to: this.bar_group,
        });

        createSVG('rect', {
            id: 'rect_' + this.task.id,
            x: this.x + x_offset,
            y: this.y + y_offset,
            width: this.image_size,
            height: this.image_size,
            rx: '15',
            class: 'img_mask',
            append_to: defs,
        });

        clipPath = createSVG('clipPath', {
            id: 'clip_' + this.task.id,
            append_to: defs,
        });

        createSVG('use', {
            href: '#rect_' + this.task.id,
            append_to: clipPath,
        });

        createSVG('image', {
            x: this.x + x_offset,
            y: this.y + y_offset,
            width: this.image_size,
            height: this.image_size,
            class: 'bar-img',
            href: this.task.thumbnail,
            clipPath: 'clip_' + this.task.id,
            append_to: this.bar_group,
        });
    }

    draw_resize_handles() {
        if (this.invalid || this.gantt.options.readonly) return;

        const bar = this.$bar;
        const handle_width = 3;
        this.handles = [];
        if (!this.gantt.options.readonly_dates) {
            this.handles.push(
                createSVG('rect', {
                    x: bar.getEndX() - handle_width / 2,
                    y: bar.getY() + this.height / 4,
                    width: handle_width,
                    height: this.height / 2,
                    rx: 2,
                    ry: 2,
                    class: 'handle right',
                    append_to: this.handle_group,
                }),
            );

            this.handles.push(
                createSVG('rect', {
                    x: bar.getX() - handle_width / 2,
                    y: bar.getY() + this.height / 4,
                    width: handle_width,
                    height: this.height / 2,
                    rx: 2,
                    ry: 2,
                    class: 'handle left',
                    append_to: this.handle_group,
                }),
            );
        }
        if (!this.gantt.options.readonly_progress) {
            const bar_progress = this.$bar_progress;
            this.$handle_progress = createSVG('circle', {
                cx: bar_progress.getEndX(),
                cy: bar_progress.getY() + bar_progress.getHeight() / 2,
                r: 4.5,
                class: 'handle progress',
                append_to: this.handle_group,
            });
            this.handles.push(this.$handle_progress);
        }

        for (let handle of this.handles) {
            $.on(handle, 'mouseenter', () => handle.classList.add('active'));
            $.on(handle, 'mouseleave', () => handle.classList.remove('active'));
        }
    }

    bind() {
        if (this.invalid) return;
        this.setup_click_event();
    }

    setup_click_event() {
        let task_id = this.task.id;
        $.on(this.group, 'mouseover', (e: Event) => {
            if (!(e instanceof MouseEvent)) return;
            this.gantt.trigger_event('hover', [
                this.task,
                e.screenX,
                e.screenY,
                e,
            ]);
        });

        if (this.gantt.options.popup_on === 'click') {
            $.on(this.group, 'mouseup', (e: Event) => {
                if (!(e instanceof MouseEvent)) return;
                const posX = e.offsetX || e.layerX;
                if (this.$handle_progress) {
                    const cx = +(this.$handle_progress.getAttribute('cx') || 0);
                    if (cx > posX - 1 && cx < posX + 1) return;
                    if (this.gantt.bar_being_dragged) return;
                }
                this.gantt.show_popup({
                    x: e.offsetX || e.layerX,
                    y: e.offsetY || e.layerY,
                    task: this.task,
                    target: this.$bar,
                });
            });
        }
        let timeout: ReturnType<typeof setTimeout>;
        $.on(this.group, 'mouseenter', (e: Event) => {
            if (!(e instanceof MouseEvent)) return;
            timeout = setTimeout(() => {
                if (this.gantt.options.popup_on === 'hover')
                    this.gantt.show_popup({
                        x: e.offsetX || e.layerX,
                        y: e.offsetY || e.layerY,
                        task: this.task,
                        target: this.$bar,
                    });
                const highlightEl = this.gantt.$container.querySelector(`.highlight-${task_id}`);
                if (highlightEl) highlightEl.classList.remove('hide');
            }, 200);
        });
        $.on(this.group, 'mouseleave', () => {
            clearTimeout(timeout);
            if (this.gantt.options.popup_on === 'hover')
                this.gantt.popup?.hide?.();
            const highlightEl = this.gantt.$container.querySelector(`.highlight-${task_id}`);
            if (highlightEl) highlightEl.classList.add('hide');
        });

        $.on(this.group, 'click', () => {
            this.gantt.trigger_event('click', [this.task]);
        });

        $.on(this.group, 'dblclick', (e) => {
            if (this.action_completed) {
                // just finished a move action, wait for a few seconds
                return;
            }
            this.group.classList.remove('active');
            if (this.gantt.popup)
                this.gantt.popup.parent.classList.remove('hide');

            this.gantt.trigger_event('double_click', [this.task]);
        });
        let tapedTwice = false;
        $.on(this.group, 'touchstart', (e: Event) => {
            if (!tapedTwice) {
                tapedTwice = true;
                setTimeout(function () {
                    tapedTwice = false;
                }, 300);
                return;
            }
            e.preventDefault();
            //action on double tap goes below

            if (this.action_completed) {
                // just finished a move action, wait for a few seconds
                return;
            }
            this.group.classList.remove('active');
            if (this.gantt.popup)
                this.gantt.popup.parent.classList.remove('hide');

            this.gantt.trigger_event('double_click', [this.task]);
        });
    }

    update_bar_position({ x = null, width = null }: { x?: number | null; width?: number | null }): void {
        const bar = this.$bar;

        if (x !== null) {
            const dependencies = Array.isArray(this.task.dependencies) ? this.task.dependencies : [];
            const xs = dependencies.map((dep: string) => {
                return this.gantt.get_bar(dep).$bar.getX();
            });
            const valid_x = xs.reduce((prev: boolean, curr: number) => {
                return prev && x >= curr;
            }, true);
            if (!valid_x) return;
            this.update_attr(bar, 'x', x);
            this.x = x;
            this.$date_highlight.style.left = x + 'px';
        }
        if (width !== null && width > 0) {
            this.update_attr(bar, 'width', width);
            this.$date_highlight.style.width = width + 'px';
        }

        this.update_label_position();
        this.update_handle_position();
        this.date_changed();
        this.compute_duration();

        if (this.gantt.options.show_expected_progress) {
            this.update_expected_progressbar_position();
        }

        this.update_progressbar_position();
        this.update_arrow_position();
    }

    update_label_position_on_horizontal_scroll({ x, sx }: { x: number; sx: number }) {
        const container = this.gantt.$container;
        const label = this.group.querySelector('.bar-label');
        const img = this.group.querySelector('.bar-img');
        const img_mask = this.bar_group.querySelector('.img_mask');

        if (!(label instanceof SVGElement)) return;

        let barWidthLimit = this.$bar.getX() + this.$bar.getWidth();
        let newLabelX = label.getX() + x;
        let newImgX = (img instanceof SVGElement && img.getX() + x) || 0;
        let imgWidth = (img instanceof SVGElement && img.getBBox().width + 7) || 7;
        let labelEndX = newLabelX + label.getBBox().width + 7;
        let viewportCentral = sx + container.clientWidth / 2;

        if (label.classList.contains('big')) return;

        if (labelEndX < barWidthLimit && x > 0 && labelEndX < viewportCentral) {
            label.setAttribute('x', newLabelX.toString());
            if (img instanceof SVGElement && img_mask instanceof SVGElement) {
                img.setAttribute('x', newImgX.toString());
                img_mask.setAttribute('x', newImgX.toString());
            }
        } else if (
            newLabelX - imgWidth > this.$bar.getX() &&
            x < 0 &&
            labelEndX > viewportCentral
        ) {
            label.setAttribute('x', newLabelX.toString());
            if (img instanceof SVGElement && img_mask instanceof SVGElement) {
                img.setAttribute('x', newImgX.toString());
                img_mask.setAttribute('x', newImgX.toString());
            }
        }
    }

    date_changed() {
        let changed = false;
        const { new_start_date, new_end_date } = this.compute_start_end_date();
        if (Number(this.task._start) !== Number(new_start_date)) {
            changed = true;
            this.task._start = new_start_date;
        }

        if (Number(this.task._end) !== Number(new_end_date)) {
            changed = true;
            this.task._end = new_end_date;
        }

        if (!changed) return;

        this.gantt.trigger_event('date_change', [
            this.task,
            new_start_date,
            date_utils.add(new_end_date, -1, 'second'),
        ]);
    }

    progress_changed() {
        this.task.progress = this.compute_progress();
        this.gantt.trigger_event('progress_change', [
            this.task,
            this.task.progress,
        ]);
    }

    set_action_completed() {
        this.action_completed = true;
        setTimeout(() => (this.action_completed = false), 1000);
    }

    compute_start_end_date() {
        const bar = this.$bar;
        const x_in_units = bar.getX() / this.gantt.config.column_width;
        let new_start_date = date_utils.add(
            this.gantt.gantt_start,
            x_in_units * this.gantt.config.step,
            this.gantt.config.unit,
        );

        const width_in_units = bar.getWidth() / this.gantt.config.column_width;
        const new_end_date = date_utils.add(
            new_start_date,
            width_in_units * this.gantt.config.step,
            this.gantt.config.unit,
        );

        return { new_start_date, new_end_date };
    }

    compute_progress() {
        this.progress_width = this.$bar_progress.getWidth();
        this.x = this.$bar_progress.getBBox().x;
        const progress_area = this.x + this.progress_width;
        const progress =
            this.progress_width -
            this.gantt.config.ignored_positions.reduce((acc: number, val: number) => {
                return acc + (val >= this.x && val <= progress_area ? 1 : 0);
            }, 0) *
                this.gantt.config.column_width;
        if (progress < 0) return 0;
        const total =
            this.$bar.getWidth() -
            this.ignored_duration_raw * this.gantt.config.column_width;
        return parseInt(((progress / total) * 100).toString(), 10);
    }

    compute_expected_progress() {
        this.expected_progress =
            date_utils.diff(date_utils.today(), this.task._start, 'hour') /
            this.gantt.config.step;
        this.expected_progress =
            ((this.expected_progress < this.duration
                ? this.expected_progress
                : this.duration) *
                100) /
            this.duration;
    }

    compute_x() {
        const { column_width } = this.gantt.config;
        const task_start = this.task._start;
        const gantt_start = this.gantt.gantt_start;

        const diff =
            date_utils.diff(task_start, gantt_start, this.gantt.config.unit) /
            this.gantt.config.step;

        let x = diff * column_width;

        /* Since the column width is based on 30,
        we count the month-difference, multiply it by 30 for a "pseudo-month"
        and then add the days in the month, making sure the number does not exceed 29
        so it is within the column */

        // if (this.gantt.view_is('Month')) {
        //     const diffDaysBasedOn30DayMonths =
        //         date_utils.diff(task_start, gantt_start, 'month') * 30;
        //     const dayInMonth = Math.min(
        //         29,
        //         date_utils.format(
        //             task_start,
        //             'DD',
        //             this.gantt.options.language,
        //         ),
        //     );
        //     const diff = diffDaysBasedOn30DayMonths + dayInMonth;

        //     x = (diff * column_width) / 30;
        // }

        this.x = x;
    }

    compute_y() {
        this.y =
            this.gantt.config.header_height +
            this.gantt.options.padding / 2 +
            this.task._index * (this.height + this.gantt.options.padding);
    }

    compute_duration() {
        let actual_duration_in_days = 0,
            duration_in_days = 0;
        for (
            let d = new Date(this.task._start);
            d < this.task._end;
            d.setDate(d.getDate() + 1)
        ) {
            duration_in_days++;
            if (
                !this.gantt.config.ignored_dates.find(
                    (k: Date) => k.getTime() === d.getTime(),
                ) &&
                (!this.gantt.config.ignored_function ||
                    !this.gantt.config.ignored_function(d))
            ) {
                actual_duration_in_days++;
            }
        }
        this.task.actual_duration = actual_duration_in_days;
        this.task.ignored_duration = duration_in_days - actual_duration_in_days;

        this.duration =
            date_utils.convert_scales(
                duration_in_days + 'd',
                this.gantt.config.unit,
            ) / this.gantt.config.step;

        this.actual_duration_raw =
            date_utils.convert_scales(
                actual_duration_in_days + 'd',
                this.gantt.config.unit,
            ) / this.gantt.config.step;

        this.ignored_duration_raw = this.duration - this.actual_duration_raw;
    }

    update_attr(element: SVGElement, attr: string, value: number | string) {
        value = +value;
        if (!isNaN(value)) {
            element.setAttribute(attr, value.toString());
        }
        return element;
    }

    update_expected_progressbar_position() {
        if (this.invalid) return;
        this.$expected_bar_progress.setAttribute('x', this.$bar.getX().toString());
        this.compute_expected_progress();
        this.$expected_bar_progress.setAttribute(
            'width',
            (this.gantt.config.column_width *
                this.actual_duration_raw *
                (this.expected_progress / 100) || 0).toString(),
        );
    }

    update_progressbar_position() {
        if (this.invalid || this.gantt.options.readonly) return;
        this.$bar_progress.setAttribute('x', this.$bar.getX().toString());

        this.$bar_progress.setAttribute(
            'width',
            this.calculate_progress_width().toString(),
        );
    }

    update_label_position() {
        const img_mask = this.bar_group.querySelector('.img_mask');
        const bar = this.$bar;
        const label = this.group.querySelector('.bar-label');
        const img = this.group.querySelector('.bar-img');

        if (!(label instanceof SVGElement)) return;

        let padding = 5;
        let x_offset_label_img = this.image_size + 10;
        const labelWidth = label.getBBox().width;
        const barWidth = bar.getWidth();
        if (labelWidth > barWidth) {
            label.classList.add('big');
            if (img instanceof SVGElement && img_mask instanceof SVGElement) {
                img.setAttribute('x', (bar.getEndX() + padding).toString());
                img_mask.setAttribute('x', (bar.getEndX() + padding).toString());
                label.setAttribute('x', (bar.getEndX() + x_offset_label_img).toString());
            } else {
                label.setAttribute('x', (bar.getEndX() + padding).toString());
            }
        } else {
            label.classList.remove('big');
            if (img instanceof SVGElement && img_mask instanceof SVGElement) {
                img.setAttribute('x', (bar.getX() + padding).toString());
                img_mask.setAttribute('x', (bar.getX() + padding).toString());
                label.setAttribute(
                    'x',
                    (bar.getX() + barWidth / 2 + x_offset_label_img).toString(),
                );
            } else {
                label.setAttribute(
                    'x',
                    (bar.getX() + barWidth / 2 - labelWidth / 2).toString(),
                );
            }
        }
    }

    update_handle_position() {
        if (this.invalid || this.gantt.options.readonly) return;
        const bar = this.$bar;
        const leftHandle = this.handle_group.querySelector('.handle.left');
        const rightHandle = this.handle_group.querySelector('.handle.right');
        if (leftHandle) {
            leftHandle.setAttribute('x', bar.getX().toString());
        }
        if (rightHandle) {
            rightHandle.setAttribute('x', bar.getEndX().toString());
        }
        const handle = this.group.querySelector('.handle.progress');
        if (handle) {
            handle.setAttribute('cx', this.$bar_progress.getEndX().toString());
        }
    }

    update_arrow_position() {
        this.arrows = this.arrows || [];
        for (let arrow of this.arrows) {
            arrow.update();
        }
    }
}
