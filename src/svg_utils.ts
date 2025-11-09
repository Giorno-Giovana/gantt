type DOMSelector = string | Element | null;

export function $(expr: DOMSelector, con?: Document | Element): Element | null {
    return typeof expr === 'string'
        ? (con || document).querySelector(expr)
        : expr || null;
}

interface SVGAttributes {
    [key: string]: string | number | Element | undefined;
    append_to?: Element;
    innerHTML?: string;
    clipPath?: string;
}

export function createSVG(tag: string, attrs: SVGAttributes): SVGElement {
    const elem = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (let attr in attrs) {
        if (attr === 'append_to') {
            const parent = attrs.append_to;
            if (parent) parent.appendChild(elem);
        } else if (attr === 'innerHTML') {
            const innerHTML = attrs.innerHTML;
            if (innerHTML) elem.innerHTML = innerHTML;
        } else if (attr === 'clipPath') {
            const clipPath = attrs[attr];
            if (typeof clipPath === 'string') {
                elem.setAttribute('clip-path', 'url(#' + clipPath + ')');
            }
        } else {
            const value = attrs[attr];
            if (value !== undefined) {
                elem.setAttribute(attr, String(value));
            }
        }
    }
    return elem;
}

export function animateSVG(
    svgElement: SVGElement,
    attr: string,
    from: number | string,
    to: number | string
): void {
    const animatedSvgElement = getAnimationElement(svgElement, attr, from, to);

    if (animatedSvgElement === svgElement) {
        // triggered 2nd time programmatically
        // trigger artificial click event
        const event = document.createEvent('HTMLEvents');
        event.initEvent('click', true, true);
        Object.defineProperty(event, 'eventName', { value: 'click', writable: true });
        animatedSvgElement.dispatchEvent(event);
    }
}

function getAnimationElement(
    svgElement: SVGElement,
    attr: string,
    from: number | string,
    to: number | string,
    dur = '0.4s',
    begin = '0.1s'
): SVGElement {
    const animEl = svgElement.querySelector('animate');
    if (animEl) {
        $.attr(animEl, {
            attributeName: attr,
            from,
            to,
            dur,
            begin: 'click + ' + begin, // artificial click
        });
        return svgElement;
    }

    const animateElement = createSVG('animate', {
        attributeName: attr,
        from,
        to,
        dur,
        begin,
        calcMode: 'spline',
        values: from + ';' + to,
        keyTimes: '0; 1',
        keySplines: cubic_bezier('ease-out'),
    });
    svgElement.appendChild(animateElement);

    return svgElement;
}

type CubicBezierName =
    | 'ease'
    | 'linear'
    | 'ease-in'
    | 'ease-out'
    | 'ease-in-out';

function cubic_bezier(name: CubicBezierName): string {
    return {
        ease: '.25 .1 .25 1',
        linear: '0 0 1 1',
        'ease-in': '.42 0 1 1',
        'ease-out': '0 0 .58 1',
        'ease-in-out': '.42 0 .58 1',
    }[name];
}

type EventCallback = (e: Event, target?: Element) => void;

$.on = (
    element: Element,
    event: string,
    selector: string | EventCallback,
    callback?: EventCallback
): void => {
    if (!callback) {
        if (typeof selector !== 'function') {
            throw new Error('Callback must be a function');
        }
        $.bind(element, event, selector);
    } else {
        if (typeof selector !== 'string') {
            throw new Error('Selector must be a string');
        }
        $.delegate(element, event, selector, callback);
    }
};

$.off = (element: Element, event: string, handler: EventListener): void => {
    element.removeEventListener(event, handler);
};

$.bind = (element: Element, event: string, callback: EventCallback): void => {
    event.split(/\s+/).forEach(function (eventName) {
        element.addEventListener(eventName, callback as EventListener);
    });
};

$.delegate = (
    element: Element,
    event: string,
    selector: string,
    callback: EventCallback
): void => {
    element.addEventListener(event, function (e) {
        if (!(e.target instanceof Element)) return;
        const delegatedTarget = e.target.closest(selector);
        if (delegatedTarget) {
            Object.defineProperty(e, 'delegatedTarget', { value: delegatedTarget, writable: true });
            callback.call(this, e, delegatedTarget);
        }
    });
};

$.closest = (selector: string, element: Element | null): Element | null => {
    if (!element) return null;

    if (element.matches(selector)) {
        return element;
    }

    const parent = element.parentNode;
    return parent instanceof Element ? $.closest(selector, parent) : null;
};

$.attr = (
    element: Element,
    attr: string | Record<string, any>,
    value?: string | number
): string | null | undefined => {
    if (!value && typeof attr === 'string') {
        return element.getAttribute(attr);
    }

    if (typeof attr === 'object') {
        for (let key in attr) {
            $.attr(element, key, attr[key]);
        }
        return;
    }

    element.setAttribute(attr, String(value));
};
