import type { Task } from './index';
import type Gantt from './index';

interface PopupContext {
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
}

type PopupFunction = (context: PopupContext) => string | false | void;

interface ShowOptions {
    x: number;
    y: number;
    task: Task;
    target: Element;
}

export default class Popup {
    parent: HTMLElement;
    popup_func: PopupFunction;
    gantt: Gantt;
    title: HTMLElement;
    subtitle: HTMLElement;
    details: HTMLElement;
    actions: HTMLElement;

    constructor(parent: HTMLElement, popup_func: PopupFunction, gantt: Gantt) {
        this.parent = parent;
        this.popup_func = popup_func;
        this.gantt = gantt;

        const elements = this.make();
        this.title = elements.title;
        this.subtitle = elements.subtitle;
        this.details = elements.details;
        this.actions = elements.actions;
    }

    make(): { title: HTMLElement; subtitle: HTMLElement; details: HTMLElement; actions: HTMLElement } {
        this.parent.innerHTML = `
            <div class="title"></div>
            <div class="subtitle"></div>
            <div class="details"></div>
            <div class="actions"></div>
        `;
        this.hide();

        const title = this.parent.querySelector('.title');
        const subtitle = this.parent.querySelector('.subtitle');
        const details = this.parent.querySelector('.details');
        const actions = this.parent.querySelector('.actions');

        if (!(title instanceof HTMLElement) ||
            !(subtitle instanceof HTMLElement) ||
            !(details instanceof HTMLElement) ||
            !(actions instanceof HTMLElement)) {
            throw new Error('Failed to create popup elements');
        }

        return { title, subtitle, details, actions };
    }

    show({ x, y, task, target }: ShowOptions): void {
        this.actions.innerHTML = '';
        const html = this.popup_func({
            task,
            chart: this.gantt,
            get_title: () => this.title,
            set_title: (title: string) => (this.title.innerHTML = title),
            get_subtitle: () => this.subtitle,
            set_subtitle: (subtitle: string) => (this.subtitle.innerHTML = subtitle),
            get_details: () => this.details,
            set_details: (details: string) => (this.details.innerHTML = details),
            add_action: (
                html: string | ((task: Task) => string),
                func: (task: Task, gantt: Gantt, event: MouseEvent) => void
            ) => {
                const action = this.gantt.create_el({
                    classes: 'action-btn',
                    type: 'button',
                    append_to: this.actions,
                });
                if (typeof html === 'function') {
                    action.innerHTML = html(task);
                } else {
                    action.innerHTML = html;
                }
                action.onclick = (e: MouseEvent) => func(task, this.gantt, e);
            },
        });
        if (html === false) return;
        if (html) this.parent.innerHTML = html;

        if (this.actions.innerHTML === '') this.actions.remove();
        else this.parent.appendChild(this.actions);

        this.parent.style.left = x + 10 + 'px';
        this.parent.style.top = y - 10 + 'px';
        this.parent.classList.remove('hide');
    }

    hide(): void {
        this.parent.classList.add('hide');
    }
}
