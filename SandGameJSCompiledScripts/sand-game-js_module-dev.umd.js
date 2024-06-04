/* Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SandGameJS_ModuleDev = {}));
})(this, (function (exports) { 'use strict';

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @version 2023-12-21
     * @author Patrik Harag
     */
    class DomBuilder {

        /**
         *
         * @param element {HTMLElement}
         * @param content {null|string|Node|(null|string|Node)[]}
         */
        static addContent(element, content) {
            if (content === null) ; else if (typeof content === 'string') {
                element.textContent = content;
            } else if (content instanceof Node) {
                element.appendChild(content);
            } else if (Array.isArray(content)) {
                for (const item of content) {
                    if (item instanceof Node) {
                        element.appendChild(item);
                    } else if (typeof item === 'string') {
                        element.insertAdjacentText('beforeend', item);
                    } else if (item === null) ; else {
                        throw 'Content type not supported: ' + (typeof item);
                    }
                }
            } else {
                throw 'Content type not supported: ' + (typeof content);
            }
        }

        /**
         *
         * @param element {HTMLElement}
         * @param content {null|string|Node|(Node|null)[]}
         */
        static setContent(element, content) {
            element.innerHTML = '';
            DomBuilder.addContent(element, content);
        }

        /**
         *
         * @param element {HTMLElement}
         * @param attributes {object|null}
         */
        static putAttributes(element, attributes) {
            for (const key in attributes) {
                const value = attributes[key];
                const type = typeof value;

                if (type === 'string' || type === 'boolean' || type === 'number') {
                    element.setAttribute(key, value);
                } else if (key === 'style' && type === 'object') {
                    Object.assign(element.style, value);
                } else if (value === null) ; else {
                    throw 'Unsupported attribute type: ' + (typeof value);
                }
            }
        }

        /**
         *
         * @param html {string}
         * @return {HTMLElement}
         */
        static create(html) {
            const template = document.createElement('template');
            template.innerHTML = html.trim();
            return template.content.firstElementChild;
        }

        /**
         *
         * @param name {string}
         * @param attributes {object|null}
         * @param content {null|string|HTMLElement|HTMLElement[]}
         * @return {HTMLElement}
         */
        static element(name, attributes = null, content = null) {
            const element = document.createElement(name);

            // attributes
            DomBuilder.putAttributes(element, attributes);

            // content
            DomBuilder.addContent(element, content);

            return element;
        }

        /**
         *
         * @param attributes {object|null}
         * @param content {null|string|HTMLElement|HTMLElement[]}
         * @return {HTMLElement}
         */
        static div(attributes = null, content = null) {
            return DomBuilder.element('div', attributes, content);
        }

        /**
         *
         * @param attributes {object|null}
         * @param content {null|string|HTMLElement|HTMLElement[]}
         * @return {HTMLElement}
         */
        static par(attributes = null, content = null) {
            return DomBuilder.element('p', attributes, content);
        }

        /**
         *
         * @param text {string|null}
         * @param attributes {object|null}
         * @return {HTMLElement}
         */
        static span(text = null, attributes = null) {
            return DomBuilder.element('span', attributes, text);
        }

        /**
         *
         * @param text {string}
         * @param attributes {object|null}
         * @param handler {function()}
         * @return {HTMLElement}
         */
        static link(text, attributes = null, handler = null) {
            const link = DomBuilder.element('a', attributes, text);
            if (handler !== null) {
                link.href = 'javascript:void(0)';
                link.addEventListener('click', handler);
            }
            return link;
        }

        /**
         *
         * @param label {string|HTMLElement|HTMLElement[]}
         * @param attributes {object|null}
         * @param handler {function()}
         * @return {HTMLElement}
         */
        static button(label, attributes = null, handler = null) {
            if (attributes === null) {
                attributes = {};
            }
            attributes['type'] = 'button';

            const button = DomBuilder.element('button', attributes, label);
            if (handler !== null) {
                button.addEventListener('click', handler);
            }
            return button;
        }

        // bootstrap methods

        /**
         *
         * @param bodyContent {string|HTMLElement}
         * @return {HTMLElement}
         */
        static bootstrapAlertInfo(bodyContent) {
            const alertDiv = DomBuilder.div({ class: 'alert alert-info alert-dismissible fade show', role: 'alert' });
            DomBuilder.addContent(alertDiv, bodyContent);
            alertDiv.append(DomBuilder.button(null, { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'alert', 'aria-label': 'Close' }));
            return alertDiv;
        }

        /**
         *
         * @param headerContent {string|HTMLElement|HTMLElement[]}
         * @param bodyContent {string|HTMLElement|HTMLElement[]}
         * @param attributes {object|null}
         * @return {HTMLElement}
         */
        static bootstrapCard(headerContent, bodyContent, attributes = null) {
            if (attributes === null) {
                attributes = {};
            }
            if (attributes.class === undefined) {
                attributes.class = 'card';
            }

            const card = DomBuilder.div(attributes);

            if (headerContent) {
                card.append(DomBuilder.div({ class: 'card-header' }, headerContent));
            }

            card.append(DomBuilder.div({ class: 'card-body' }, bodyContent));
            return card;
        }

        /**
         *
         * @param title {string}
         * @param collapsed {boolean}
         * @param bodyContent {string|HTMLElement|HTMLElement[]}
         * @return {HTMLElement}
         */
        static bootstrapCardCollapsable(title, collapsed, bodyContent) {
            const id = 'collapsable_' + Math.floor(Math.random() * 999_999_999);

            return DomBuilder.div({ class: 'card' }, [
                DomBuilder.div({ class: 'card-header' }, [
                    DomBuilder.element('a', { class: 'card-link', 'data-bs-toggle': 'collapse', href: '#' + id}, title)
                ]),
                DomBuilder.div({ id: id, class: (collapsed ? 'collapse' : 'collapse show') }, [
                    DomBuilder.div({ class: 'card-body' }, bodyContent)
                ])
            ]);
        }

        /**
         *
         * @param content {string|HTMLElement}
         * @param node {HTMLElement}
         * @return {HTMLElement}
         */
        static bootstrapInitTooltip(content, node) {
            if (window.bootstrap === undefined) {
                console.error('Bootstrap library not available');
                return node;
            }

            const old = new window.bootstrap.Tooltip(node);
            if (old) {
                old.dispose();
            }

            node.setAttribute('data-bs-toggle', 'tooltip');
            node.setAttribute('data-bs-placement', 'top');
            if (typeof content === 'object') {
                node.setAttribute('data-bs-html', 'true');
                node.setAttribute('title', content.innerHTML);
            } else {
                node.setAttribute('title', content);
            }

            new window.bootstrap.Tooltip(node);
            return node;
        }

        /**
         *
         * @param text {string}
         * @param checked {boolean}
         * @param handler {function(boolean)}
         * @return {HTMLElement}
         */
        static bootstrapSwitchButton(text, checked, handler = null) {
            const id = 'switch-button_' + Math.floor(Math.random() * 999_999_999);

            const switchInput = DomBuilder.element('input', {
                type: 'checkbox',
                id: id,
                class: 'form-check-input',
                role: 'switch',
                checked: checked
            });

            const control = DomBuilder.div({ class: 'form-check form-switch' }, [
                switchInput,
                DomBuilder.element('label', { class: 'form-check-label', for: id }, text)
            ]);

            if (handler !== null) {
                switchInput.addEventListener('click', () => {
                    handler(switchInput.checked);
                });
            }
            return control;
        }

        /**
         *
         * @param labelContent {string|HTMLElement}
         * @param buttonClass {string} e.g. btn-primary
         * @param checked {boolean}
         * @param handler {function(boolean)}
         * @return {HTMLElement[]}
         */
        static bootstrapToggleButton(labelContent, buttonClass, checked, handler = null) {
            const id = 'toggle-button_' + Math.floor(Math.random() * 999_999_999);

            const nodeInput = DomBuilder.element('input', {
                type: 'checkbox',
                class: 'btn-check',
                checked: checked,
                id: id
            });
            const nodeLabel = DomBuilder.element('label', {
                class: 'btn ' + buttonClass,
                for: id
            }, labelContent);

            nodeInput.addEventListener('change', (e) => {
                if (handler !== null) {
                    handler(nodeInput.checked);
                }
            });

            return [nodeInput, nodeLabel];
        }

        static bootstrapTableBuilder() {
            return new BootstrapTable();
        }

        static bootstrapDialogBuilder() {
            return new BootstrapDialog();
        }

        static bootstrapToastBuilder() {
            return new BootstrapToast();
        }

        static bootstrapSimpleFormBuilder() {
            return new BootstrapSimpleForm();
        }
    }

    /**
     *
     * @version 2023-12-21
     * @author Patrik Harag
     */
    class BootstrapTable {

        #tableBody = DomBuilder.element('tbody');

        addRow(row) {
            this.#tableBody.appendChild(row);
        }

        addRowBefore(row) {
            this.#tableBody.insertBefore(row, this.#tableBody.firstChild);
        }

        createNode() {
            const table = DomBuilder.element('table', { class: 'table table-striped' });
            table.appendChild(this.#tableBody);

            const tableResponsive = DomBuilder.div({ class: 'table-responsive' });
            tableResponsive.appendChild(table);

            return tableResponsive;
        }
    }

    /**
     *
     * @version 2023-12-24
     * @author Patrik Harag
     */
    class BootstrapDialog {

        // will be removed after close
        #persistent = false;

        #additionalStyle = '';

        #headerNode = null;
        #bodyNode = null;
        #footerNodeChildren = [];

        #dialog = null;
        #dialogBootstrap = null;


        setPersistent(persistent) {
            this.#persistent = persistent;
        }

        setSizeLarge() {
            this.#additionalStyle = 'modal-lg';
        }

        setSizeExtraLarge() {
            this.#additionalStyle = 'modal-xl';
        }

        setHeaderContent(headerNode) {
            if (typeof headerNode === 'string') {
                this.#headerNode = DomBuilder.element('strong', null, headerNode);
            } else {
                this.#headerNode = headerNode;
            }
        }

        setBodyContent(bodyNode) {
            this.#bodyNode = bodyNode;
        }

        addCloseButton(buttonText) {
            const button = DomBuilder.element('button', { type: 'button', class: 'btn btn-secondary', 'data-bs-dismiss': 'modal' }, buttonText);
            this.#footerNodeChildren.push(button);
        }

        addSubmitButton(buttonText, handler) {
            const button = DomBuilder.element('button', { type: 'button', class: 'btn btn-primary', 'data-bs-dismiss': 'modal' }, buttonText);
            button.addEventListener('click', handler);
            this.#footerNodeChildren.push(button);
        }

        addButton(button) {
            this.#footerNodeChildren.push(button);
        }

        show(dialogAnchor) {
            if (window.bootstrap === undefined) {
                console.error('Bootstrap library not available');
                return;
            }

            if (this.#dialog === null) {
                this.#dialog = DomBuilder.div({ class: 'modal fade', tabindex: '-1', role: 'dialog', 'aria-hidden': 'true' }, [
                    DomBuilder.div({ class: `modal-dialog modal-dialog-centered ${this.#additionalStyle}` }, [
                        DomBuilder.div({ class: 'modal-content' }, [
                            DomBuilder.div({ class: 'modal-header' }, this.#headerNode),
                            DomBuilder.div({ class: 'modal-body' }, this.#bodyNode),
                            DomBuilder.div({ class: 'modal-footer' }, this.#footerNodeChildren)
                        ])
                    ])
                ]);

                // add into DOM
                dialogAnchor.appendChild(this.#dialog);
            }

            this.#dialogBootstrap = new window.bootstrap.Modal(this.#dialog);

            if (!this.#persistent) {
                // remove from DOM after hide
                this.#dialog.addEventListener('hidden.bs.modal', () => {
                    dialogAnchor.removeChild(this.#dialog);
                });
            }

            this.#dialogBootstrap.show();
        }

        hide() {
            if (this.#dialog !== null) {
                this.#dialogBootstrap.hide();
            }
        }
    }

    /**
     *
     * @version 2023-12-22
     * @author Patrik Harag
     */
    class BootstrapToast {

        #headerNode = null;
        #bodyNode = null;

        #toast = null;
        #toastBootstrap = null;

        #dataDelay = 1000 * 60 * 60;  // ms

        setHeaderContent(headerNode) {
            if (typeof headerNode === 'string') {
                headerNode = DomBuilder.element('strong', headerNode);
            }
            this.#headerNode = DomBuilder.span(headerNode, { class: 'me-auto' });
        }

        setBodyContent(bodyNode) {
            this.#bodyNode = bodyNode;
        }

        setDelay(milliseconds) {
            this.#dataDelay = milliseconds;
        }

        show(dialogAnchor) {
            if (window.bootstrap === undefined) {
                console.error('Bootstrap library not available');
                return;
            }

            const wrapperAttributes = {
                class: 'position-fixed bottom-0 right-0 p-3',
                style: 'z-index: 5; right: 0; bottom: 0;'
            };
            const toastAttributes = {
                class: 'toast hide',
                role: 'alert',
                'aria-live': 'assertive',
                'aria-atomic': 'true',
                'data-bs-delay': this.#dataDelay
            };
            const wrapper = DomBuilder.div(wrapperAttributes, [
                this.#toast = DomBuilder.div(toastAttributes, [
                    DomBuilder.div({ class: 'toast-header' }, [
                        this.#headerNode,
                        DomBuilder.button('', {
                            type: 'button',
                            class: 'btn-close',
                            'data-bs-dismiss': 'toast',
                            'aria-label': 'Close'
                        })
                    ]),
                    DomBuilder.div({ class: 'toast-body' }, [
                        this.#bodyNode,

                    ])
                ])
            ]);

            // add into DOM
            dialogAnchor.append(wrapper);

            this.#toastBootstrap = new window.bootstrap.Toast(this.#toast);

            // remove from DOM after hide
            this.#toast.addEventListener('hidden.bs.toast', () => {
                dialogAnchor.removeChild(wrapper);
            });

            this.#toastBootstrap.show();
        }

        hide() {
            if (this.#toast !== null) {
                this.#toastBootstrap.hide();
            }
        }
    }

    /**
     *
     * @version 2023-12-22
     * @author Patrik Harag
     */
    class BootstrapSimpleForm {

        /** @type {{key:string,label:string,input:HTMLElement}[]} */
        #formFields = [];
        #submitButton = null;

        addTextArea(label, key, initialValue = '', rows = 8) {
            let input = DomBuilder.element('textarea', { class: 'form-control', rows: rows }, initialValue);
            this.#formFields.push({
                key: key,
                label: label,
                input: input
            });
            return input;
        }

        addInput(label, key, initialValue = '') {
            let input = DomBuilder.element('input', { class: 'form-control' });
            if (initialValue) {
                input.value = initialValue;
            }
            this.#formFields.push({
                key: key,
                label: label,
                input: input
            });
            return input;
        }

        addSubmitButton(text, handler) {
            this.#submitButton = DomBuilder.button(text, { class: 'btn btn-primary' }, e => {
                handler(this.getData());
            });
        }

        createNode() {
            let form = DomBuilder.element('form', { action: 'javascript:void(0);' });

            for (let formField of this.#formFields) {
                form.append(DomBuilder.div({ class: 'mb-3' }, [
                    DomBuilder.element('label', null, formField.label),
                    formField.input
                ]));
            }

            if (this.#submitButton) {
                form.append(this.#submitButton);
            }

            return form;
        }

        getData() {
            let data = {};
            for (let formField of this.#formFields) {
                data[formField.key] = formField.input.value;
            }
            return data;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2023-08-19
     */
    class Action {

        /**
         *
         * @param controller {Controller}
         * @returns void
         */
        performAction(controller) {
            throw 'Not implemented';
        }

        /**
         *
         * @param func {function(controller:Controller):void}
         * @returns {ActionAnonymous}
         */
        static create(func) {
            return new ActionAnonymous(func);
        }

        /**
         *
         * @param def {boolean}
         * @param func {function(controller:Controller,v:boolean):void}
         * @returns {ActionAnonymous}
         */
        static createToggle(def, func) {
            let state = def;
            return new ActionAnonymous(function (c) {
                state = !state;
                func(c, state);
            });
        }
    }

    class ActionAnonymous extends Action {
        #func;

        constructor(func) {
            super();
            this.#func = func;
        }

        performAction(controller) {
            this.#func(controller);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2023-12-22
     */
    class Component {

        /**
         *
         * @param controller {Controller}
         * @return {HTMLElement}
         */
        createNode(controller) {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-05
     */
    class ComponentButton extends Component {

        static CLASS_PRIMARY = 'btn-primary';
        static CLASS_SECONDARY = 'btn-secondary';
        static CLASS_INFO = 'btn-info';
        static CLASS_SUCCESS = 'btn-success';
        static CLASS_WARNING = 'btn-warning';
        static CLASS_LIGHT = 'btn-light';

        static CLASS_OUTLINE_PRIMARY = 'btn-outline-primary';
        static CLASS_OUTLINE_SECONDARY = 'btn-outline-secondary';
        static CLASS_OUTLINE_INFO = 'btn-outline-info';
        static CLASS_OUTLINE_SUCCESS = 'btn-outline-success';
        static CLASS_OUTLINE_WARNING = 'btn-outline-warning';
        static CLASS_OUTLINE_LIGHT = 'btn-outline-light';


        #label;
        #action;
        #cssClass;

        /**
         *
         * @param label {string|HTMLElement|HTMLElement[]}
         * @param cssClass {string|null}
         * @param action {Action|function}
         */
        constructor(label, cssClass, action) {
            super();
            this.#label = label;
            this.#action = (typeof action === "function" ? Action.create(action) : action);
            this.#cssClass = (cssClass == null ? ComponentButton.CLASS_PRIMARY : cssClass);
        }

        createNode(controller) {
            return DomBuilder.button(this.#label, { class: 'btn ' + this.#cssClass }, e => {
                this.#action.performAction(controller);
            });
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2023-08-27
     */
    class Renderer {

        trigger(x, y) {
            throw 'Not implemented';
        }

        /**
         *
         * @param changedChunks {boolean[]}
         * @return {void}
         */
        render(changedChunks) {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Null renderer. For testing purposes - to measure effects of rendering...
     *
     * @author Patrik Harag
     * @version 2023-10-11
     */
    class RendererNull extends Renderer {

        constructor() {
            super();
        }

        trigger(x, y) {
            // ignore
        }

        render(changedChunks) {
            // ignore
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class RendererInitializer {

        getContextType() {
            throw 'Not implemented'
        }

        /**
         *
         * @param elementArea
         * @param chunkSize
         * @param context
         * @return {Renderer}
         */
        initialize(elementArea, chunkSize, context) {
            throw 'Not implemented'
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-06
     */
    class RendererInitializerNull extends RendererInitializer {

        constructor() {
            super();
        }

        getContextType() {
            return '2d';
        }

        initialize(elementArea, chunkSize, context) {
            return new RendererNull();
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @author Patrik Harag
     * @version 2023-02-18
     */
    class RenderingMode {

        /**
         * Element rendering function.
         *
         * Default implementation:
         * <pre>
         *     data[dataIndex] = ElementTail.getColorRed(elementTail);
         *     data[dataIndex + 1] = ElementTail.getColorGreen(elementTail);
         *     data[dataIndex + 2] = ElementTail.getColorBlue(elementTail);
         * </pre>
         *
         * @param data
         * @param dataIndex
         * @param elementHead
         * @param elementTail
         */
        apply(data, dataIndex, elementHead, elementTail) {
            throw 'Not implemented'
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Tools for working with the element head.
     *
     * The element head structure: <code>0x[type][beh.][flags][temp.]</code> (32b)
     * <pre>
     *     | type class   3b  | type modifiers                 5b  |
     *     | behaviour             4b  | special               4b  |
     *     | heat modifiers index                              8b  |
     *     | temperature                                       8b  |
     * </pre>
     *
     * Type modifier for powder-like types: (5b)
     * <pre>
     *     | sliding  1b |  direction  1b  | momentum  3b  |
     * </pre>
     *
     * Type modifier for solid-like types: (5b)
     * <pre>
     *     | neighbourhood type  1b |  body id  4b  |
     * </pre>
     *
     * @author Patrik Harag
     * @version 2024-05-26
     */
    class ElementHead {

        static FIELD_TYPE_CLASS_SIZE = 3;  // bits
        static TYPE_AIR = 0x0;
        static TYPE_EFFECT = 0x1;
        static TYPE_GAS = 0x2;
        static TYPE_POWDER_FLOATING = 0x3;   // floating, not wet, can turn into wet
        static TYPE_FLUID = 0x4;
        static TYPE_POWDER = 0x5;  // not wet, can turn into wet
        static TYPE_POWDER_WET = 0x6;  // wet
        static TYPE_STATIC = 0x7;

        static FIELD_TYPE_MODIFIERS_SIZE = 5;  // bits

        static FIELD_BEHAVIOUR_SIZE = 4;  // bits
        static BEHAVIOUR_NONE = 0x0;
        static BEHAVIOUR_SOIL = 0x1;
        static BEHAVIOUR_GRASS = 0x2;
        static BEHAVIOUR_3 = 0x3;  // unused
        static BEHAVIOUR_4 = 0x4;  // unused
        static BEHAVIOUR_TREE = 0x5;
        static BEHAVIOUR_TREE_ROOT = 0x6;
        static BEHAVIOUR_TREE_TRUNK = 0x7;
        static BEHAVIOUR_TREE_LEAF = 0x8;
        static BEHAVIOUR_FIRE = 0x9;
        static BEHAVIOUR_FIRE_SOURCE = 0xA;
        static BEHAVIOUR_METEOR = 0xB;  // TODO: to entity?
        static BEHAVIOUR_LIQUID = 0xC;
        static BEHAVIOUR_ENTITY = 0xD;
        static BEHAVIOUR_E = 0xE;
        static BEHAVIOUR_F = 0xF;

        static FIELD_SPECIAL_SIZE = 4;  // bits
        static SPECIAL_LIQUID_WATER = 0;
        static SPECIAL_LIQUID_LIGHT_OIL = 5;
        static SPECIAL_LIQUID_HEAVY_MOLTEN = 10;

        static FIELD_HMI_SIZE = 8;  // bits

        static FIELD_TEMPERATURE_SIZE = 8;  // bits


        static of(type8, behaviour8 = 0, modifiers8 = 0, temperature = 0) {
            let value = temperature << 8;
            value = (value | modifiers8) << 8;
            value = (value | behaviour8) << 8;
            value = value | type8;
            return value;
        }

        static type8(typeClass, typeModifiers = 0) {
            return typeClass | (typeModifiers << 3);
        }

        static type8Powder(typeClass, momentum = 0, sliding = 0, direction = 0) {
            let value = momentum << 1;
            value = (value | direction) << 1;
            value = (value | sliding) << 3;
            value = value | typeClass;
            return value;
        }

        // TODO TYPE_FLUID: density, step size, ? viscosity, ? pressure
        static type8Fluid(typeClass) {
            return typeClass;
        }

        static type8Solid(typeClass, bodyId = 0, extendedNeighbourhood = true) {
            let value = bodyId << 1;
            value = (value | (extendedNeighbourhood ? 0 : 1)) << 3;
            value = value | typeClass;
            return value;
        }

        static behaviour8(behaviour = 0, special = 0) {
            return behaviour | (special << 4);
        }

        static modifiers8(heatModIndex = 0) {
            return heatModIndex;
        }

        // get methods

        static getType(elementHead) {
            return elementHead & 0x000000FF;
        }

        static getTypeClass(elementHead) {
            return elementHead & 0x00000007;
        }

        static getTypeModifierPowderSliding(elementHead) {
            return (elementHead >> 3) & 0x00000001;
        }

        static getTypeModifierPowderDirection(elementHead) {
            return (elementHead >> 4) & 0x00000001;
        }

        static getTypeModifierPowderMomentum(elementHead) {
            return (elementHead >> 5) & 0x00000007;
        }

        static getTypeModifierSolidNeighbourhoodType(elementHead) {
            return (elementHead >> 3) & 0x00000001;
        }

        static getTypeModifierSolidBodyId(elementHead) {
            return (elementHead >> 4) & 0x0000000F;
        }

        static getBehaviour(elementHead) {
            return (elementHead >> 8) & 0x0000000F;
        }

        static getSpecial(elementHead) {
            return (elementHead >> 12) & 0x0000000F;
        }

        static getHeatModIndex(elementHead) {
            return (elementHead >> 16) & 0x000000FF;
        }

        static getTemperature(elementHead) {
            return (elementHead >> 24) & 0x000000FF;
        }

        // set methods

        static setType(elementHead, type) {
            return (elementHead & 0xFFFFFF00) | type;
        }

        static setTypeClass(elementHead, type) {
            return (elementHead & 0xFFFFFFF8) | type;
        }

        static setTypeModifierPowderSliding(elementHead, val) {
            return (elementHead & 0xFFFFFFF7) | (val << 3);
        }

        static setTypeModifierPowderDirection(elementHead, val) {
            return (elementHead & 0xFFFFFFEF) | (val << 4);
        }

        static setTypeModifierPowderMomentum(elementHead, val) {
            return (elementHead & 0xFFFFFF1F) | (val << 5);
        }

        static setTypeModifierSolidNeighbourhoodType(elementHead, val) {
            return (elementHead & 0xFFFFFFF7) | (val << 3);
        }

        static setTypeModifierSolidBodyId(elementHead, val) {
            return (elementHead & 0xFFFFFF0F) | (val << 4);
        }

        static setBehaviour(elementHead, behaviour) {
            return (elementHead & 0xFFFFF0FF) | (behaviour << 8);
        }

        static setSpecial(elementHead, special) {
            return (elementHead & 0xFFFF0FFF) | (special << 12);
        }

        static setHeatModIndex(elementHead, heatModIndex) {
            return (elementHead & 0xFF00FFFF) | (heatModIndex << 16);
        }

        static setTemperature(elementHead, temperature) {
            return (elementHead & 0x00FFFFFF) | (temperature << 24);
        }


        // --- HEAT MODIFIERS ---

        static #HEAT_MODS_COUNT = 16;
        static #HEAT_MODS = Array(ElementHead.#HEAT_MODS_COUNT);

        static #defHeatMods({i, conductiveIndex = 0.2, heatLossChanceTo10000 = 2500,
                                flammableChanceTo10000 = 0, selfIgnitionChanceTo10000 = 0,
                                flameHeat = 0, burnDownChanceTo10000 = 0,
                                meltingTemperature = 0xFF + 1, meltingHMI = 0,
                                hardeningTemperature = 0, hardeningHMI = 0}) {

            const array = Array(10);
            array[0] = conductiveIndex;
            array[1] = heatLossChanceTo10000;
            array[2] = flammableChanceTo10000;
            array[3] = selfIgnitionChanceTo10000;
            array[4] = flameHeat;
            array[5] = burnDownChanceTo10000;
            array[6] = meltingTemperature;
            array[7] = meltingHMI;
            array[8] = hardeningTemperature;
            array[9] = hardeningHMI;

            ElementHead.#HEAT_MODS[i] = array;
            return i;
        }

        static HMI_DEFAULT = ElementHead.#defHeatMods({
            i: 0
            // default values
        });

        static HMI_CONDUCTIVE_1 = ElementHead.#defHeatMods({
            i: 1,
            conductiveIndex: 0.25,
            heatLossChanceTo10000: 500
        });

        static HMI_CONDUCTIVE_2 = ElementHead.#defHeatMods({
            i: 2,
            conductiveIndex: 0.3,
            heatLossChanceTo10000: 20
        });

        static HMI_CONDUCTIVE_3 = ElementHead.#defHeatMods({
            i: 3,
            conductiveIndex: 0.45,
            heatLossChanceTo10000: 10
        });

        static HMI_GRASS_LIKE = ElementHead.#defHeatMods({
            i: 4,
            flammableChanceTo10000: 4500,
            selfIgnitionChanceTo10000: 3,
            flameHeat: 165,
            burnDownChanceTo10000: 1000
        });

        static HMI_WOOD_LIKE = ElementHead.#defHeatMods({
            i: 5,
            flammableChanceTo10000: 100,
            selfIgnitionChanceTo10000: 2,
            flameHeat: 165,
            burnDownChanceTo10000: 2
        });

        static HMI_LEAF_LIKE = ElementHead.#defHeatMods({
            i: 6,
            flammableChanceTo10000: 4500,
            selfIgnitionChanceTo10000: 3,
            flameHeat: 165,
            burnDownChanceTo10000: 100
        });

        static HMI_METAL = ElementHead.#defHeatMods({
            i: 7,
            conductiveIndex: 0.45,
            heatLossChanceTo10000: 10,
            meltingTemperature: 200,
            meltingHMI: 8
        });

        static HMI_MOLTEN = ElementHead.#defHeatMods({
            i: 8,
            conductiveIndex: 0.45,
            heatLossChanceTo10000: 10,
            hardeningTemperature: 150,
            hardeningHMI: 7
        });

        static HMI_COAL = ElementHead.#defHeatMods({
            i: 9,
            conductiveIndex: 0.3,
            heatLossChanceTo10000: 20,
            flammableChanceTo10000: 500,
            selfIgnitionChanceTo10000: 3,
            flameHeat: 190,
            burnDownChanceTo10000: 50
        });

        static HMI_THERMITE = ElementHead.#defHeatMods({
            i: 10,
            conductiveIndex: 0.45,
            heatLossChanceTo10000: 10,
            flammableChanceTo10000: 8000,
            selfIgnitionChanceTo10000: 500,
            flameHeat: 250,
            burnDownChanceTo10000: 1000
        });

        static HMI_OIL = ElementHead.#defHeatMods({
            i: 11,
            conductiveIndex: 0.45,
            heatLossChanceTo10000: 10,
            flammableChanceTo10000: 10000,
            selfIgnitionChanceTo10000: 2500,
            flameHeat: 220,
            burnDownChanceTo10000: 1000
        });

        static {
            // fill missing definitions - bounds checking is not needed then...
            for (let i = 0; i < ElementHead.#HEAT_MODS_COUNT; i++) {
                if (ElementHead.#HEAT_MODS[i] === undefined) {
                    ElementHead.#defHeatMods(i);
                }
            }
        }

        // ---

        static hmiToConductiveIndex(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][0];
        }

        static hmiToHeatLossChanceTo10000(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][1];
        }

        // how hard it is to ignite this element
        static hmiToFlammableChanceTo10000(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][2];
        }

        // how hard it is to ignite this element
        static hmiToSelfIgnitionChanceTo10000(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][3];
        }

        // how much heat this element produces while burning
        static hmiToFlameHeat(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][4];
        }

        // how hard it is to burn down this element
        static hmiToBurnDownChanceTo10000(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][5];
        }

        static hmiToMeltingTemperature(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][6];
        }

        static hmiToMeltingHMI(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][7];
        }

        static hmiToHardeningTemperature(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][8];
        }

        static hmiToHardeningHMI(heatModIndex) {
            return ElementHead.#HEAT_MODS[heatModIndex & 0xF][9];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @author Patrik Harag
     * @version 2023-08-18
     */
    class RenderingModeElementType extends RenderingMode {

        constructor() {
            super();
        }

        #asColor(elementHead) {
            switch (ElementHead.getTypeClass(elementHead)) {
                case ElementHead.TYPE_AIR: return [255, 255, 255];
                case ElementHead.TYPE_STATIC: return [0, 0, 0];
                case ElementHead.TYPE_FLUID: return [0, 0, 255];
                case ElementHead.TYPE_POWDER:
                case ElementHead.TYPE_POWDER_WET:
                case ElementHead.TYPE_POWDER_FLOATING:
                    if (ElementHead.getTypeModifierPowderSliding(elementHead) === 1) {
                        if (ElementHead.getTypeModifierPowderDirection(elementHead) === 1) {
                            return [232, 137, 70];
                        } else {
                            return [255, 0, 0];
                        }
                    }
                    switch (ElementHead.getTypeClass(elementHead)) {
                        case ElementHead.TYPE_POWDER: return [36, 163, 57];
                        case ElementHead.TYPE_POWDER_WET: return [44, 122, 57];
                        case ElementHead.TYPE_POWDER_FLOATING: return [16, 194, 45];
                    }
                    // fallthrough
                default: return [255, 0, 125];
            }
        }

        apply(data, dataIndex, elementHead, elementTail) {
            const [r, g, b] = this.#asColor(elementHead);

            data[dataIndex] = r;
            data[dataIndex + 1] = g;
            data[dataIndex + 2] = b;

            return false;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-09
     */
    class Assets {

        /**
         *
         * @param base64
         * @param maxWidth {number|undefined}
         * @param maxHeight {number|undefined}
         * @returns {Promise<ImageData>}
         */
        static asImageData(base64, maxWidth=undefined, maxHeight=undefined) {
            function countSize(imageWidth, imageHeight) {
                let w = imageWidth;
                let h = imageHeight;

                if (maxWidth !== undefined && w > maxWidth) {
                    const wScale = w / maxWidth;
                    w = maxWidth;
                    h = h / wScale;
                }
                if (maxHeight !== undefined && h > maxHeight) {
                    const hScale = h / maxHeight;
                    h = maxHeight;
                    w = w / hScale;
                }

                return [Math.trunc(w), Math.trunc(h)];
            }

            return new Promise((resolve, reject) => {
                try {
                    // http://stackoverflow.com/questions/3528299/get-pixel-color-of-base64-png-using-javascript
                    let image = new Image();
                    image.onload = () => {
                        let canvas = document.createElement('canvas');
                        let [w, h] = countSize(image.width, image.height);
                        canvas.width = w;
                        canvas.height = h;

                        let context = canvas.getContext('2d');
                        context.drawImage(image, 0, 0, canvas.width, canvas.height);

                        let imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                        resolve(imageData);
                    };
                    image.onerror = () => {
                        reject('Cannot load image');
                    };
                    image.src = base64;
                } catch (e) {
                    reject(e);
                }
            });
        }
    }

    var img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAfQAAAABCAIAAACnnMvDAAAACXBIWXMAAAsTAAALEwEAmpwYAAABTUlEQVQ4T22QUZIjMQhDHzhH32PHYj/UZoiTLlcXloQQfsE/AF6QsM6/i4CABa9T5Kj5RPqfkL9s29y2l6e75lBff33Nx2h6AcfGxxP6ykjU+Exkw5m3YxqfbnPRucfPSFev1+p64rbqrm9NAif2xfYiPc5UCz5sixRLZLF2poDMylSmcilcLxkBMhShpBIlCirZiwoEGDz4U/tqxPqg1oMrqcEqkak2sW2g9WlrK2DiBsfQJ1JQi90ZAuLIEnmdwbrwXg+42ImggvpK8mQ+UTvMh//Fdh6D/Xrt1uITqc77/C2SUlRFKaVUpSpFbFKECAEgEGwo2CCog3Bwawy6qNNrZOJumV3XiIu98I4xRztMt7Smz1zkW3YtcmnMXtTPqK35yZ4RJd4bQELiLarYG4m9nwltsMe61/COY6rgfWa+x8xmO1FbWd91P5Lr/2afRpQBYZvbAAAAAElFTkSuQmCC";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @author Patrik Harag
     * @version 2023-08-14
     */
    class RenderingModeHeatmap extends RenderingMode {

        /** @type ImageData */
        #gradientImageData = null;

        constructor() {
            super();
            Assets.asImageData(img).then(d => this.#gradientImageData = d);
        }

        apply(data, dataIndex, elementHead, elementTail) {
            if (this.#gradientImageData === null) {
                // not loaded yet
                return;
            }

            if (elementHead === 0x00) {
                // background
                data[dataIndex] = 0x00;
                data[dataIndex + 1] = 0x00;
                data[dataIndex + 2] = 0x00;
            } else {
                const temperature = ElementHead.getTemperature(elementHead);
                const x = Math.trunc(temperature / (1 << ElementHead.FIELD_TEMPERATURE_SIZE) * this.#gradientImageData.width);
                const gradIndex = x * 4;
                data[dataIndex] = this.#gradientImageData.data[gradIndex];
                data[dataIndex + 1] = this.#gradientImageData.data[gradIndex + 1];
                data[dataIndex + 2] = this.#gradientImageData.data[gradIndex + 2];
            }
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var FileSaver_minExports = {};
    var FileSaver_min = {
      get exports(){ return FileSaver_minExports; },
      set exports(v){ FileSaver_minExports = v; },
    };

    (function (module, exports) {
    	(function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c);},d.onerror=function(){console.error("could not download file");},d.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null;},k.readAsDataURL(b);}else {var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m);},4E4);}});f.saveAs=g.saveAs=g,(module.exports=g);});

    	
    } (FileSaver_min));

    var FileSaver = FileSaver_minExports;

    // DEFLATE is a complex format; to read this code, you should probably check the RFC first:

    // aliases for shorter compressed code (most minifers don't do this)
    var u8 = Uint8Array, u16 = Uint16Array, u32 = Uint32Array;
    // fixed length extra bits
    var fleb = new u8([0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, /* unused */ 0, 0, /* impossible */ 0]);
    // fixed distance extra bits
    // see fleb note
    var fdeb = new u8([0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, /* unused */ 0, 0]);
    // code length index map
    var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
    // get base, reverse index map from extra bits
    var freb = function (eb, start) {
        var b = new u16(31);
        for (var i = 0; i < 31; ++i) {
            b[i] = start += 1 << eb[i - 1];
        }
        // numbers here are at max 18 bits
        var r = new u32(b[30]);
        for (var i = 1; i < 30; ++i) {
            for (var j = b[i]; j < b[i + 1]; ++j) {
                r[j] = ((j - b[i]) << 5) | i;
            }
        }
        return [b, r];
    };
    var _a = freb(fleb, 2), fl = _a[0], revfl = _a[1];
    // we can ignore the fact that the other numbers are wrong; they never happen anyway
    fl[28] = 258, revfl[258] = 28;
    var _b = freb(fdeb, 0), revfd = _b[1];
    // map of value to reverse (assuming 16 bits)
    var rev = new u16(32768);
    for (var i = 0; i < 32768; ++i) {
        // reverse table algorithm from SO
        var x = ((i & 0xAAAA) >>> 1) | ((i & 0x5555) << 1);
        x = ((x & 0xCCCC) >>> 2) | ((x & 0x3333) << 2);
        x = ((x & 0xF0F0) >>> 4) | ((x & 0x0F0F) << 4);
        rev[i] = (((x & 0xFF00) >>> 8) | ((x & 0x00FF) << 8)) >>> 1;
    }
    // create huffman tree from u8 "map": index -> code length for code index
    // mb (max bits) must be at most 15
    // TODO: optimize/split up?
    var hMap = (function (cd, mb, r) {
        var s = cd.length;
        // index
        var i = 0;
        // u16 "map": index -> # of codes with bit length = index
        var l = new u16(mb);
        // length of cd must be 288 (total # of codes)
        for (; i < s; ++i) {
            if (cd[i])
                ++l[cd[i] - 1];
        }
        // u16 "map": index -> minimum code for bit length = index
        var le = new u16(mb);
        for (i = 0; i < mb; ++i) {
            le[i] = (le[i - 1] + l[i - 1]) << 1;
        }
        var co;
        if (r) {
            // u16 "map": index -> number of actual bits, symbol for code
            co = new u16(1 << mb);
            // bits to remove for reverser
            var rvb = 15 - mb;
            for (i = 0; i < s; ++i) {
                // ignore 0 lengths
                if (cd[i]) {
                    // num encoding both symbol and bits read
                    var sv = (i << 4) | cd[i];
                    // free bits
                    var r_1 = mb - cd[i];
                    // start value
                    var v = le[cd[i] - 1]++ << r_1;
                    // m is end value
                    for (var m = v | ((1 << r_1) - 1); v <= m; ++v) {
                        // every 16 bit value starting with the code yields the same result
                        co[rev[v] >>> rvb] = sv;
                    }
                }
            }
        }
        else {
            co = new u16(s);
            for (i = 0; i < s; ++i) {
                if (cd[i]) {
                    co[i] = rev[le[cd[i] - 1]++] >>> (15 - cd[i]);
                }
            }
        }
        return co;
    });
    // fixed length tree
    var flt = new u8(288);
    for (var i = 0; i < 144; ++i)
        flt[i] = 8;
    for (var i = 144; i < 256; ++i)
        flt[i] = 9;
    for (var i = 256; i < 280; ++i)
        flt[i] = 7;
    for (var i = 280; i < 288; ++i)
        flt[i] = 8;
    // fixed distance tree
    var fdt = new u8(32);
    for (var i = 0; i < 32; ++i)
        fdt[i] = 5;
    // fixed length map
    var flm = /*#__PURE__*/ hMap(flt, 9, 0);
    // fixed distance map
    var fdm = /*#__PURE__*/ hMap(fdt, 5, 0);
    // get end of byte
    var shft = function (p) { return ((p + 7) / 8) | 0; };
    // typed array slice - allows garbage collector to free original reference,
    // while being more compatible than .slice
    var slc = function (v, s, e) {
        if (s == null || s < 0)
            s = 0;
        if (e == null || e > v.length)
            e = v.length;
        // can't use .constructor in case user-supplied
        var n = new (v.BYTES_PER_ELEMENT == 2 ? u16 : v.BYTES_PER_ELEMENT == 4 ? u32 : u8)(e - s);
        n.set(v.subarray(s, e));
        return n;
    };
    // error codes
    var ec = [
        'unexpected EOF',
        'invalid block type',
        'invalid length/literal',
        'invalid distance',
        'stream finished',
        'no stream handler',
        ,
        'no callback',
        'invalid UTF-8 data',
        'extra field too long',
        'date not in range 1980-2099',
        'filename too long',
        'stream finishing',
        'invalid zip data'
        // determined by unknown compression method
    ];
    var err = function (ind, msg, nt) {
        var e = new Error(msg || ec[ind]);
        e.code = ind;
        if (Error.captureStackTrace)
            Error.captureStackTrace(e, err);
        if (!nt)
            throw e;
        return e;
    };
    // starting at p, write the minimum number of bits that can hold v to d
    var wbits = function (d, p, v) {
        v <<= p & 7;
        var o = (p / 8) | 0;
        d[o] |= v;
        d[o + 1] |= v >>> 8;
    };
    // starting at p, write the minimum number of bits (>8) that can hold v to d
    var wbits16 = function (d, p, v) {
        v <<= p & 7;
        var o = (p / 8) | 0;
        d[o] |= v;
        d[o + 1] |= v >>> 8;
        d[o + 2] |= v >>> 16;
    };
    // creates code lengths from a frequency table
    var hTree = function (d, mb) {
        // Need extra info to make a tree
        var t = [];
        for (var i = 0; i < d.length; ++i) {
            if (d[i])
                t.push({ s: i, f: d[i] });
        }
        var s = t.length;
        var t2 = t.slice();
        if (!s)
            return [et, 0];
        if (s == 1) {
            var v = new u8(t[0].s + 1);
            v[t[0].s] = 1;
            return [v, 1];
        }
        t.sort(function (a, b) { return a.f - b.f; });
        // after i2 reaches last ind, will be stopped
        // freq must be greater than largest possible number of symbols
        t.push({ s: -1, f: 25001 });
        var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
        t[0] = { s: -1, f: l.f + r.f, l: l, r: r };
        // efficient algorithm from UZIP.js
        // i0 is lookbehind, i2 is lookahead - after processing two low-freq
        // symbols that combined have high freq, will start processing i2 (high-freq,
        // non-composite) symbols instead
        // see https://reddit.com/r/photopea/comments/ikekht/uzipjs_questions/
        while (i1 != s - 1) {
            l = t[t[i0].f < t[i2].f ? i0++ : i2++];
            r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
            t[i1++] = { s: -1, f: l.f + r.f, l: l, r: r };
        }
        var maxSym = t2[0].s;
        for (var i = 1; i < s; ++i) {
            if (t2[i].s > maxSym)
                maxSym = t2[i].s;
        }
        // code lengths
        var tr = new u16(maxSym + 1);
        // max bits in tree
        var mbt = ln(t[i1 - 1], tr, 0);
        if (mbt > mb) {
            // more algorithms from UZIP.js
            // TODO: find out how this code works (debt)
            //  ind    debt
            var i = 0, dt = 0;
            //    left            cost
            var lft = mbt - mb, cst = 1 << lft;
            t2.sort(function (a, b) { return tr[b.s] - tr[a.s] || a.f - b.f; });
            for (; i < s; ++i) {
                var i2_1 = t2[i].s;
                if (tr[i2_1] > mb) {
                    dt += cst - (1 << (mbt - tr[i2_1]));
                    tr[i2_1] = mb;
                }
                else
                    break;
            }
            dt >>>= lft;
            while (dt > 0) {
                var i2_2 = t2[i].s;
                if (tr[i2_2] < mb)
                    dt -= 1 << (mb - tr[i2_2]++ - 1);
                else
                    ++i;
            }
            for (; i >= 0 && dt; --i) {
                var i2_3 = t2[i].s;
                if (tr[i2_3] == mb) {
                    --tr[i2_3];
                    ++dt;
                }
            }
            mbt = mb;
        }
        return [new u8(tr), mbt];
    };
    // get the max length and assign length codes
    var ln = function (n, l, d) {
        return n.s == -1
            ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1))
            : (l[n.s] = d);
    };
    // length codes generation
    var lc = function (c) {
        var s = c.length;
        // Note that the semicolon was intentional
        while (s && !c[--s])
            ;
        var cl = new u16(++s);
        //  ind      num         streak
        var cli = 0, cln = c[0], cls = 1;
        var w = function (v) { cl[cli++] = v; };
        for (var i = 1; i <= s; ++i) {
            if (c[i] == cln && i != s)
                ++cls;
            else {
                if (!cln && cls > 2) {
                    for (; cls > 138; cls -= 138)
                        w(32754);
                    if (cls > 2) {
                        w(cls > 10 ? ((cls - 11) << 5) | 28690 : ((cls - 3) << 5) | 12305);
                        cls = 0;
                    }
                }
                else if (cls > 3) {
                    w(cln), --cls;
                    for (; cls > 6; cls -= 6)
                        w(8304);
                    if (cls > 2)
                        w(((cls - 3) << 5) | 8208), cls = 0;
                }
                while (cls--)
                    w(cln);
                cls = 1;
                cln = c[i];
            }
        }
        return [cl.subarray(0, cli), s];
    };
    // calculate the length of output from tree, code lengths
    var clen = function (cf, cl) {
        var l = 0;
        for (var i = 0; i < cl.length; ++i)
            l += cf[i] * cl[i];
        return l;
    };
    // writes a fixed block
    // returns the new bit pos
    var wfblk = function (out, pos, dat) {
        // no need to write 00 as type: TypedArray defaults to 0
        var s = dat.length;
        var o = shft(pos + 2);
        out[o] = s & 255;
        out[o + 1] = s >>> 8;
        out[o + 2] = out[o] ^ 255;
        out[o + 3] = out[o + 1] ^ 255;
        for (var i = 0; i < s; ++i)
            out[o + i + 4] = dat[i];
        return (o + 4 + s) * 8;
    };
    // writes a block
    var wblk = function (dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
        wbits(out, p++, final);
        ++lf[256];
        var _a = hTree(lf, 15), dlt = _a[0], mlb = _a[1];
        var _b = hTree(df, 15), ddt = _b[0], mdb = _b[1];
        var _c = lc(dlt), lclt = _c[0], nlc = _c[1];
        var _d = lc(ddt), lcdt = _d[0], ndc = _d[1];
        var lcfreq = new u16(19);
        for (var i = 0; i < lclt.length; ++i)
            lcfreq[lclt[i] & 31]++;
        for (var i = 0; i < lcdt.length; ++i)
            lcfreq[lcdt[i] & 31]++;
        var _e = hTree(lcfreq, 7), lct = _e[0], mlcb = _e[1];
        var nlcc = 19;
        for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
            ;
        var flen = (bl + 5) << 3;
        var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
        var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + (2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18]);
        if (flen <= ftlen && flen <= dtlen)
            return wfblk(out, p, dat.subarray(bs, bs + bl));
        var lm, ll, dm, dl;
        wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
        if (dtlen < ftlen) {
            lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
            var llm = hMap(lct, mlcb, 0);
            wbits(out, p, nlc - 257);
            wbits(out, p + 5, ndc - 1);
            wbits(out, p + 10, nlcc - 4);
            p += 14;
            for (var i = 0; i < nlcc; ++i)
                wbits(out, p + 3 * i, lct[clim[i]]);
            p += 3 * nlcc;
            var lcts = [lclt, lcdt];
            for (var it = 0; it < 2; ++it) {
                var clct = lcts[it];
                for (var i = 0; i < clct.length; ++i) {
                    var len = clct[i] & 31;
                    wbits(out, p, llm[len]), p += lct[len];
                    if (len > 15)
                        wbits(out, p, (clct[i] >>> 5) & 127), p += clct[i] >>> 12;
                }
            }
        }
        else {
            lm = flm, ll = flt, dm = fdm, dl = fdt;
        }
        for (var i = 0; i < li; ++i) {
            if (syms[i] > 255) {
                var len = (syms[i] >>> 18) & 31;
                wbits16(out, p, lm[len + 257]), p += ll[len + 257];
                if (len > 7)
                    wbits(out, p, (syms[i] >>> 23) & 31), p += fleb[len];
                var dst = syms[i] & 31;
                wbits16(out, p, dm[dst]), p += dl[dst];
                if (dst > 3)
                    wbits16(out, p, (syms[i] >>> 5) & 8191), p += fdeb[dst];
            }
            else {
                wbits16(out, p, lm[syms[i]]), p += ll[syms[i]];
            }
        }
        wbits16(out, p, lm[256]);
        return p + ll[256];
    };
    // deflate options (nice << 13) | chain
    var deo = /*#__PURE__*/ new u32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
    // empty
    var et = /*#__PURE__*/ new u8(0);
    // compresses data into a raw DEFLATE buffer
    var dflt = function (dat, lvl, plvl, pre, post, lst) {
        var s = dat.length;
        var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7000)) + post);
        // writing to this writes to the output buffer
        var w = o.subarray(pre, o.length - post);
        var pos = 0;
        if (!lvl || s < 8) {
            for (var i = 0; i <= s; i += 65535) {
                // end
                var e = i + 65535;
                if (e >= s) {
                    // write final block
                    w[pos >> 3] = lst;
                }
                pos = wfblk(w, pos + 1, dat.subarray(i, e));
            }
        }
        else {
            var opt = deo[lvl - 1];
            var n = opt >>> 13, c = opt & 8191;
            var msk_1 = (1 << plvl) - 1;
            //    prev 2-byte val map    curr 2-byte val map
            var prev = new u16(32768), head = new u16(msk_1 + 1);
            var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
            var hsh = function (i) { return (dat[i] ^ (dat[i + 1] << bs1_1) ^ (dat[i + 2] << bs2_1)) & msk_1; };
            // 24576 is an arbitrary number of maximum symbols per block
            // 424 buffer for last block
            var syms = new u32(25000);
            // length/literal freq   distance freq
            var lf = new u16(288), df = new u16(32);
            //  l/lcnt  exbits  index  l/lind  waitdx  bitpos
            var lc_1 = 0, eb = 0, i = 0, li = 0, wi = 0, bs = 0;
            for (; i < s; ++i) {
                // hash value
                // deopt when i > s - 3 - at end, deopt acceptable
                var hv = hsh(i);
                // index mod 32768    previous index mod
                var imod = i & 32767, pimod = head[hv];
                prev[imod] = pimod;
                head[hv] = imod;
                // We always should modify head and prev, but only add symbols if
                // this data is not yet processed ("wait" for wait index)
                if (wi <= i) {
                    // bytes remaining
                    var rem = s - i;
                    if ((lc_1 > 7000 || li > 24576) && rem > 423) {
                        pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
                        li = lc_1 = eb = 0, bs = i;
                        for (var j = 0; j < 286; ++j)
                            lf[j] = 0;
                        for (var j = 0; j < 30; ++j)
                            df[j] = 0;
                    }
                    //  len    dist   chain
                    var l = 2, d = 0, ch_1 = c, dif = (imod - pimod) & 32767;
                    if (rem > 2 && hv == hsh(i - dif)) {
                        var maxn = Math.min(n, rem) - 1;
                        var maxd = Math.min(32767, i);
                        // max possible length
                        // not capped at dif because decompressors implement "rolling" index population
                        var ml = Math.min(258, rem);
                        while (dif <= maxd && --ch_1 && imod != pimod) {
                            if (dat[i + l] == dat[i + l - dif]) {
                                var nl = 0;
                                for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                                    ;
                                if (nl > l) {
                                    l = nl, d = dif;
                                    // break out early when we reach "nice" (we are satisfied enough)
                                    if (nl > maxn)
                                        break;
                                    // now, find the rarest 2-byte sequence within this
                                    // length of literals and search for that instead.
                                    // Much faster than just using the start
                                    var mmd = Math.min(dif, nl - 2);
                                    var md = 0;
                                    for (var j = 0; j < mmd; ++j) {
                                        var ti = (i - dif + j + 32768) & 32767;
                                        var pti = prev[ti];
                                        var cd = (ti - pti + 32768) & 32767;
                                        if (cd > md)
                                            md = cd, pimod = ti;
                                    }
                                }
                            }
                            // check the previous match
                            imod = pimod, pimod = prev[imod];
                            dif += (imod - pimod + 32768) & 32767;
                        }
                    }
                    // d will be nonzero only when a match was found
                    if (d) {
                        // store both dist and len data in one Uint32
                        // Make sure this is recognized as a len/dist with 28th bit (2^28)
                        syms[li++] = 268435456 | (revfl[l] << 18) | revfd[d];
                        var lin = revfl[l] & 31, din = revfd[d] & 31;
                        eb += fleb[lin] + fdeb[din];
                        ++lf[257 + lin];
                        ++df[din];
                        wi = i + l;
                        ++lc_1;
                    }
                    else {
                        syms[li++] = dat[i];
                        ++lf[dat[i]];
                    }
                }
            }
            pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
            // this is the easiest way to avoid needing to maintain state
            if (!lst && pos & 7)
                pos = wfblk(w, pos + 1, et);
        }
        return slc(o, 0, pre + shft(pos) + post);
    };
    // CRC32 table
    var crct = /*#__PURE__*/ (function () {
        var t = new Int32Array(256);
        for (var i = 0; i < 256; ++i) {
            var c = i, k = 9;
            while (--k)
                c = ((c & 1) && -306674912) ^ (c >>> 1);
            t[i] = c;
        }
        return t;
    })();
    // CRC32
    var crc = function () {
        var c = -1;
        return {
            p: function (d) {
                // closures have awful performance
                var cr = c;
                for (var i = 0; i < d.length; ++i)
                    cr = crct[(cr & 255) ^ d[i]] ^ (cr >>> 8);
                c = cr;
            },
            d: function () { return ~c; }
        };
    };
    // deflate with opts
    var dopt = function (dat, opt, pre, post, st) {
        return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : (12 + opt.mem), pre, post, !st);
    };
    // Walmart object spread
    var mrg = function (a, b) {
        var o = {};
        for (var k in a)
            o[k] = a[k];
        for (var k in b)
            o[k] = b[k];
        return o;
    };
    // write bytes
    var wbytes = function (d, b, v) {
        for (; v; ++b)
            d[b] = v, v >>>= 8;
    };
    /**
     * Compresses data with DEFLATE without any wrapper
     * @param data The data to compress
     * @param opts The compression options
     * @returns The deflated version of the data
     */
    function deflateSync(data, opts) {
        return dopt(data, opts || {}, 0, 0);
    }
    // flatten a directory structure
    var fltn = function (d, p, t, o) {
        for (var k in d) {
            var val = d[k], n = p + k, op = o;
            if (Array.isArray(val))
                op = mrg(o, val[1]), val = val[0];
            if (val instanceof u8)
                t[n] = [val, op];
            else {
                t[n += '/'] = [new u8(0), op];
                fltn(val, n, t, o);
            }
        }
    };
    // text encoder
    var te = typeof TextEncoder != 'undefined' && /*#__PURE__*/ new TextEncoder();
    // text decoder
    var td = typeof TextDecoder != 'undefined' && /*#__PURE__*/ new TextDecoder();
    // text decoder stream
    var tds = 0;
    try {
        td.decode(et, { stream: true });
        tds = 1;
    }
    catch (e) { }
    /**
     * Converts a string into a Uint8Array for use with compression/decompression methods
     * @param str The string to encode
     * @param latin1 Whether or not to interpret the data as Latin-1. This should
     *               not need to be true unless decoding a binary string.
     * @returns The string encoded in UTF-8/Latin-1 binary
     */
    function strToU8(str, latin1) {
        if (latin1) {
            var ar_1 = new u8(str.length);
            for (var i = 0; i < str.length; ++i)
                ar_1[i] = str.charCodeAt(i);
            return ar_1;
        }
        if (te)
            return te.encode(str);
        var l = str.length;
        var ar = new u8(str.length + (str.length >> 1));
        var ai = 0;
        var w = function (v) { ar[ai++] = v; };
        for (var i = 0; i < l; ++i) {
            if (ai + 5 > ar.length) {
                var n = new u8(ai + 8 + ((l - i) << 1));
                n.set(ar);
                ar = n;
            }
            var c = str.charCodeAt(i);
            if (c < 128 || latin1)
                w(c);
            else if (c < 2048)
                w(192 | (c >> 6)), w(128 | (c & 63));
            else if (c > 55295 && c < 57344)
                c = 65536 + (c & 1023 << 10) | (str.charCodeAt(++i) & 1023),
                    w(240 | (c >> 18)), w(128 | ((c >> 12) & 63)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
            else
                w(224 | (c >> 12)), w(128 | ((c >> 6) & 63)), w(128 | (c & 63));
        }
        return slc(ar, 0, ai);
    }
    // extra field length
    var exfl = function (ex) {
        var le = 0;
        if (ex) {
            for (var k in ex) {
                var l = ex[k].length;
                if (l > 65535)
                    err(9);
                le += l + 4;
            }
        }
        return le;
    };
    // write zip header
    var wzh = function (d, b, f, fn, u, c, ce, co) {
        var fl = fn.length, ex = f.extra, col = co && co.length;
        var exl = exfl(ex);
        wbytes(d, b, ce != null ? 0x2014B50 : 0x4034B50), b += 4;
        if (ce != null)
            d[b++] = 20, d[b++] = f.os;
        d[b] = 20, b += 2; // spec compliance? what's that?
        d[b++] = (f.flag << 1) | (c < 0 && 8), d[b++] = u && 8;
        d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
        var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
        if (y < 0 || y > 119)
            err(10);
        wbytes(d, b, (y << 25) | ((dt.getMonth() + 1) << 21) | (dt.getDate() << 16) | (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >>> 1)), b += 4;
        if (c != -1) {
            wbytes(d, b, f.crc);
            wbytes(d, b + 4, c < 0 ? -c - 2 : c);
            wbytes(d, b + 8, f.size);
        }
        wbytes(d, b + 12, fl);
        wbytes(d, b + 14, exl), b += 16;
        if (ce != null) {
            wbytes(d, b, col);
            wbytes(d, b + 6, f.attrs);
            wbytes(d, b + 10, ce), b += 14;
        }
        d.set(fn, b);
        b += fl;
        if (exl) {
            for (var k in ex) {
                var exf = ex[k], l = exf.length;
                wbytes(d, b, +k);
                wbytes(d, b + 2, l);
                d.set(exf, b + 4), b += 4 + l;
            }
        }
        if (col)
            d.set(co, b), b += col;
        return b;
    };
    // write zip footer (end of central directory)
    var wzf = function (o, b, c, d, e) {
        wbytes(o, b, 0x6054B50); // skip disk
        wbytes(o, b + 8, c);
        wbytes(o, b + 10, c);
        wbytes(o, b + 12, d);
        wbytes(o, b + 16, e);
    };
    /**
     * Synchronously creates a ZIP file. Prefer using `zip` for better performance
     * with more than one file.
     * @param data The directory structure for the ZIP archive
     * @param opts The main options, merged with per-file options
     * @returns The generated ZIP archive
     */
    function zipSync(data, opts) {
        if (!opts)
            opts = {};
        var r = {};
        var files = [];
        fltn(data, '', r, opts);
        var o = 0;
        var tot = 0;
        for (var fn in r) {
            var _a = r[fn], file = _a[0], p = _a[1];
            var compression = p.level == 0 ? 0 : 8;
            var f = strToU8(fn), s = f.length;
            var com = p.comment, m = com && strToU8(com), ms = m && m.length;
            var exl = exfl(p.extra);
            if (s > 65535)
                err(11);
            var d = compression ? deflateSync(file, p) : file, l = d.length;
            var c = crc();
            c.p(file);
            files.push(mrg(p, {
                size: file.length,
                crc: c.d(),
                c: d,
                f: f,
                m: m,
                u: s != fn.length || (m && (com.length != ms)),
                o: o,
                compression: compression
            }));
            o += 30 + s + exl + l;
            tot += 76 + 2 * (s + exl) + (ms || 0) + l;
        }
        var out = new u8(tot + 22), oe = o, cdl = tot - o;
        for (var i = 0; i < files.length; ++i) {
            var f = files[i];
            wzh(out, f.o, f, f.f, f.u, f.c.length);
            var badd = 30 + f.f.length + exfl(f.extra);
            out.set(f.c, f.o + badd);
            wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
        }
        wzf(out, o, files.length, cdl, oe);
        return out;
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-02
     */
    class ActionRecord extends Action {

        #controllerHandlersRegistered = false;
        #sandGameHandlersRegistered = false;

        #zipData = null;

        performAction(controller) {
            if (!this.#controllerHandlersRegistered) {
                controller.addOnBeforeClosed(() => {
                    if (this.#zipData !== null) {
                        this.#stopRecording();
                    }
                });
                controller.addOnInitialized(sandGame => {
                    this.#sandGameHandlersRegistered = false;
                });
                this.#controllerHandlersRegistered = true;
            }

            if (this.#zipData === null) {
                // start recording
                this.#zipData = {};

                if (!this.#sandGameHandlersRegistered) {
                    let processed = false;
                    let lastIteration = 0;
                    let frameInProgress = false;
                    controller.getSandGame().addOnProcessed((iteration) => {
                        processed = true;
                        lastIteration = iteration;
                    });
                    controller.getSandGame().addOnRendered(() => {
                        if (this.#zipData !== null && processed && !frameInProgress) {
                            frameInProgress = true;
                            this.#addFrame(controller, lastIteration, () => frameInProgress = false);
                            processed = false;
                        }
                    });
                    this.#sandGameHandlersRegistered = true;
                }
            } else {
                this.#stopRecording();
            }
        }

        #addFrame(controller, iteration, completed) {
            const canvas = controller.getCanvas();
            if (canvas !== null) {
                canvas.toBlob((blob) => {
                    blob.arrayBuffer().then(arrayBuffer => {
                        const array = new Uint8Array(arrayBuffer);
                        if (this.#zipData !== null) {
                            this.#zipData[`iteration_${String(iteration).padStart(6, '0')}.png`] = array;
                        }
                    }).finally(() => {
                        completed();
                    });
                });
            }
        }

        #stopRecording() {
            this.#download(this.#zipData, 'frames.zip');
            this.#zipData = null;
        }

        #download(zipData, filename) {
            const bytes = zipSync(zipData, { level: 0 });
            FileSaver.saveAs(new Blob([bytes]), filename);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-11-20
     */
    class ActionScreenshot extends Action {

        performAction(controller) {
            const canvas = controller.getCanvas();
            if (canvas !== null) {
                canvas.toBlob((blob) => {
                    FileSaver.saveAs(blob, this.#formatDate(new Date()) + '.png');
                });
            }
        }

        #formatDate(date) {
            let dd = String(date.getDate()).padStart(2, '0');
            let MM = String(date.getMonth() + 1).padStart(2, '0');  // January is 0!
            let yyyy = date.getFullYear();

            let hh = String(date.getHours()).padStart(2, '0');
            let mm = String(date.getMinutes()).padStart(2, '0');

            return `${yyyy}-${MM}-${dd}_${hh}-${mm}`;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // Warning: dev tools only

    const Scenes = window.SandGameJS.Scenes;

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class ActionBenchmark extends Action {

        performAction(controller) {
            let benchmarkProvider = new BenchmarkProvider(controller, results => {
                let dialog = DomBuilder.bootstrapDialogBuilder();
                dialog.setHeaderContent('Benchmark results');
                dialog.setBodyContent([
                    DomBuilder.par(null, 'IPS AVG: ' + results.ipsAvg.toFixed(2)),
                    DomBuilder.par(null, 'IPS MIN: ' + results.ipsMin)
                ]);
                dialog.addCloseButton('Close');
                dialog.addButton(
                    DomBuilder.button('Download results', { type: 'button', class: 'btn btn-primary' }, e => {
                        const data = JSON.stringify(results, null, '  ');
                        const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
                        const date = this.#formatDate(new Date());
                        FileSaver.saveAs(blob, `${date}.benchmark.json`);
                    })
                );
                dialog.show(controller.getDialogAnchor());
            });
            benchmarkProvider.start();
        }

        #formatDate(date) {
            let dd = String(date.getDate()).padStart(2, '0');
            let MM = String(date.getMonth() + 1).padStart(2, '0');  // January is 0!
            let yyyy = date.getFullYear();

            let hh = String(date.getHours()).padStart(2, '0');
            let mm = String(date.getMinutes()).padStart(2, '0');

            return `${yyyy}-${MM}-${dd}_${hh}-${mm}`;
        }
    }

    /**
     *
     * @author Patrik Harag
     * @version 2023-04-29
     */
    class BenchmarkProvider {

        static WAITING_GAP = 300;

        /** @type Controller */
        #controller;

        /** @type function */
        #onFinish;

        /**
         *
         * @param controller {Controller}
         * @param onFinish {function({ipsAvg,ipsMin,benchmarks:{name,ipsAvg,ipsMin}[]})}
         */
        constructor(controller, onFinish) {
            this.#controller = controller;
            this.#onFinish = onFinish;
        }

        start() {
            let scene = Scenes.custom('Benchmark', (s) => this.#benchmarkScene(s));
            this.#controller.openScene(scene);
            this.#controller.start();
        }

        #benchmarkScene(sandGame) {
            const benchmarkResults = [];
            const benchmarkQueue = [...BenchmarkProvider.BENCHMARKS];
            let i = 0;
            let waiting = BenchmarkProvider.WAITING_GAP;
            let ipsSum = 0;
            let ipsMin = Number.MAX_SAFE_INTEGER;
            sandGame.addOnProcessed(() => {
                if (waiting > 0) {
                    waiting--;
                    return;
                }
                if (benchmarkQueue.length === 0) {
                    return;
                }

                const benchmark = benchmarkQueue[0];
                if (i === 0) {
                    console.log('Running benchmark: ' + benchmark.name);
                }
                benchmark.nextIteration(sandGame, i);
                i++;
                const ips = sandGame.getIterationsPerSecond();
                ipsSum = ipsSum + ips;
                ipsMin = Math.min(ipsMin, ips);

                if (benchmark.iterations === i) {
                    const ipsAvg = ipsSum / benchmark.iterations;
                    benchmarkResults.push({
                        name: benchmark.name,
                        ipsAvg: ipsAvg,
                        ipsMin: ipsMin
                    });

                    benchmarkQueue.shift();
                    i = 0;
                    ipsSum = 0;
                    ipsMin = Number.MAX_SAFE_INTEGER;
                    waiting = BenchmarkProvider.WAITING_GAP;

                    sandGame.graphics().fill(sandGame.getBrushCollection().byCodeName('air'));

                    if (benchmarkQueue.length === 0) {
                        this.#onFinish(this.#finalizeResults(sandGame, benchmarkResults));
                    }
                }
            });
        }

        #finalizeResults(sandGame, benchmarkResults) {
            const ipsSum = benchmarkResults.map(r => r.ipsAvg).reduce((a, b) => a + b, 0);
            const ipsAvg = ipsSum / benchmarkResults.length;
            const ipsMin = benchmarkResults.map(r => r.ipsMin).reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
            return {
                version: 1,
                date: new Date().toString(),
                ipsAvg: ipsAvg,
                ipsMin: ipsMin,
                benchmarks: benchmarkResults,
                scene: {
                    width: sandGame.getWidth(),
                    height: sandGame.getHeight()
                }
            }
        }


        static #createBenchmark(name, iterations, nextIteration) {
            if (iterations <= 0) {
                throw 'Number of iterations must be a positive number';
            }
            return {
                name: name,
                iterations: iterations,
                nextIteration: nextIteration
            };
        }

        static BENCHMARKS = [
            BenchmarkProvider.#createBenchmark('sand-fall-q', 500, function (sandGame, j) {
                const sand = sandGame.getBrushCollection().byCodeName('sand');
                sandGame.graphics().drawRectangle(0, 0, -1, 1, sand, true);
            }),
            BenchmarkProvider.#createBenchmark('sand-fall-s', 2000, function (sandGame, j) {
                if (j % 10 === 0) {
                    const sand = sandGame.getBrushCollection().byCodeName('sand');
                    sandGame.graphics().drawRectangle(0, 0, -1, 1, sand, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('sand-fill', 1000, function (sandGame, j) {
                if (j === 0) {
                    const sand = sandGame.getBrushCollection().byCodeName('sand');
                    sandGame.graphics().drawRectangle(0, 0, -1, -1, sand, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('soil-fall-q', 500, function (sandGame, j) {
                const soil = sandGame.getBrushCollection().byCodeName('soil');
                sandGame.graphics().drawRectangle(0, 0, -1, 1, soil, true);
            }),
            BenchmarkProvider.#createBenchmark('soil-fall-s', 2000, function (sandGame, j) {
                if (j % 10 === 0) {
                    const soil = sandGame.getBrushCollection().byCodeName('soil');
                    sandGame.graphics().drawRectangle(0, 0, -1, 1, soil, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('soil-fill', 1000, function (sandGame, j) {
                if (j === 0) {
                    const soil = sandGame.getBrushCollection().byCodeName('soil');
                    sandGame.graphics().drawRectangle(0, 0, -1, -1, soil, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('water-fall-q', 500, function (sandGame, j) {
                const water = sandGame.getBrushCollection().byCodeName('water');
                sandGame.graphics().drawRectangle(0, 0, -1, 1, water, true);
            }),
            BenchmarkProvider.#createBenchmark('water-fall-s', 2000, function (sandGame, j) {
                if (j % 10 === 0) {
                    const water = sandGame.getBrushCollection().byCodeName('water');
                    sandGame.graphics().drawRectangle(0, 0, -1, 1, water, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('water-fill', 1000, function (sandGame, j) {
                if (j === 0) {
                    const water = sandGame.getBrushCollection().byCodeName('water');
                    sandGame.graphics().drawRectangle(0, 0, -1, -1, water, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('sand-into-water', 1000, function (sandGame, j) {
                if (j === 0) {
                    const sand = sandGame.getBrushCollection().byCodeName('sand');
                    const water = sandGame.getBrushCollection().byCodeName('water');
                    sandGame.graphics().drawRectangle(0, 0, -1, 31, sand, true);
                    sandGame.graphics().drawRectangle(0, 60, -1, -1, water, true);
                }
            }),
            BenchmarkProvider.#createBenchmark('soil-into-water', 1000, function (sandGame, j) {
                if (j === 0) {
                    const soil = sandGame.getBrushCollection().byCodeName('soil');
                    const water = sandGame.getBrushCollection().byCodeName('water');
                    sandGame.graphics().drawRectangle(0, 0, -1, 31, soil, true);
                    sandGame.graphics().drawRectangle(0, 60, -1, -1, water, true);
                }
            }),
        ];
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-05
     */
    class ActionFill extends Action {

        performAction(controller) {
            const sandGame = controller.getSandGame();
            if (sandGame === null) {
                return;
            }
            const primaryTool = controller.getToolManager().getPrimaryTool();
            if (!primaryTool.isAreaModeEnabled()) {
                return;
            }
            primaryTool.applyArea(0, 0, sandGame.getWidth(), sandGame.getHeight(), sandGame.graphics(), false);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // Warning: dev tools only

    const BrushDefs$1 = window.SandGameJS.BrushDefs;

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-19
     */
    class ActionsDev {

        static ALL_MATERIALS = function (controller) {
            let sandGame = controller.getSandGame();
            if (sandGame === null) {
                return;
            }

            const brushes = [
                'ash',
                'sand',
                'soil',
                'gravel',
                'wall',
                'rock',
                'metal',
                'wood',
                'water'
            ];

            let segment = Math.ceil(sandGame.getWidth() / brushes.length);
            for (let i = 0; i < brushes.length; i++) {
                const brush = BrushDefs$1.byCodeName(brushes[i]);
                sandGame.graphics().drawRectangle(i * segment, 0, (i + 1) * segment, -1, brush, true);
            }
        }

        static TREE_SPAWN_TEST = function (controller) {
            let sandGame = controller.getSandGame();
            if (sandGame === null) {
                return;
            }

            sandGame.graphics().fill(BrushDefs$1.AIR);

            sandGame.layeredTemplate()
                    .layer(Math.trunc(sandGame.getHeight() / 2), false, BrushDefs$1.AIR)
                    .layer(1, true, BrushDefs$1.WALL)
                    .layer(10, true, BrushDefs$1.SOIL)
                    .grass();

            sandGame.layeredTemplate()
                    .layer(1, true, BrushDefs$1.WALL)
                    .layer(10, true, BrushDefs$1.SOIL)
                    .grass();
        }

        static treeGrowTest(level = -1) {
            return function (controller) {
                let sandGame = controller.getSandGame();
                if (sandGame === null) {
                    return;
                }

                sandGame.graphics().fill(BrushDefs$1.AIR);

                let count = 8;
                let segment = Math.trunc(sandGame.getWidth() / 8);

                const template1 = sandGame.layeredTemplate();
                template1.layer(Math.trunc(sandGame.getHeight() / 2), false, BrushDefs$1.AIR);
                template1.layer(1, true, BrushDefs$1.WALL);
                template1.layer(10, true, BrushDefs$1.SOIL);
                for (let i = 0; i < 8; i++) {
                    template1.tree(Math.trunc((i + 0.5) * segment), i % count, level);
                }
                template1.grass();

                const template2 = sandGame.layeredTemplate();
                template2.layer(1, true, BrushDefs$1.WALL);
                template2.layer(10, true, BrushDefs$1.SOIL);
                for (let i = 0; i < 8; i++) {
                    template2.tree(Math.trunc((i + 0.5) * segment), (i + 8) % count, level);
                }
                template2.grass();
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class ActionShowActiveChunks extends Action {

        static #MARKER_GROUP = 'chunk';

        #registered = false;
        #enabled = false;

        performAction(controller) {
            this.#enabled = !this.#enabled;  // toggle

            if (!this.#registered) {
                if (controller.getSandGame() !== null) {
                    const sandGame = controller.getSandGame();
                    sandGame.addOnRendered((changedChunks) => {
                        this.#onRendered(controller, changedChunks);
                    });
                }
                controller.addOnInitialized(sandGame => {
                    sandGame.addOnRendered((changedChunks) => {
                        this.#onRendered(controller, changedChunks);
                    });
                });
                this.#registered = true;
            }
        }

        #onRendered(controller, changedChunks) {
            if (this.#enabled) {
                this.#highlightChunks(controller, changedChunks);
            } else {
                this.#highlightChunks(controller, null);
            }
        }

        #highlightChunks(controller, changedChunks) {
            this.#initIfNeeded(controller);
            this.#update(controller, changedChunks);
        }

        #update(controller, changedChunks) {
            const sandGame = controller.getSandGame();
            const chunkSize = sandGame.getChunkSize();
            const horChunkCount = Math.ceil(sandGame.getWidth() / chunkSize);
            const verChunkCount = Math.ceil(sandGame.getHeight() / chunkSize);

            const markers = sandGame.overlay().getMarkers(ActionShowActiveChunks.#MARKER_GROUP);

            if (changedChunks === null) {
                for (let cy = 0; cy < verChunkCount; cy++) {
                    for (let cx = 0; cx < horChunkCount; cx++) {
                        const chunkIndex = cy * horChunkCount + cx;
                        const marker = markers[chunkIndex];
                        marker.setVisible(false);
                    }
                }
            } else {
                for (let cy = 0; cy < verChunkCount; cy++) {
                    for (let cx = 0; cx < horChunkCount; cx++) {
                        const chunkIndex = cy * horChunkCount + cx;
                        const marker = markers[chunkIndex];
                        if (changedChunks[chunkIndex]) {
                            marker.setVisible(true);
                        } else {
                            marker.setVisible(false);
                        }
                    }
                }
            }
        }

        #initIfNeeded(controller) {
            const sandGame = controller.getSandGame();
            const markers = sandGame.overlay().getMarkers(ActionShowActiveChunks.#MARKER_GROUP);

            if (markers.length === 0) {
                const chunkSize = sandGame.getChunkSize();
                const horChunkCount = Math.ceil(sandGame.getWidth() / chunkSize);
                const verChunkCount = Math.ceil(sandGame.getHeight() / chunkSize);

                // chunks
                for (let cy = 0; cy < verChunkCount; cy++) {
                    for (let cx = 0; cx < horChunkCount; cx++) {
                        sandGame.overlay().createRectangleWH(cx * chunkSize, cy * chunkSize, chunkSize, chunkSize, {
                            visible: false,
                            group: ActionShowActiveChunks.#MARKER_GROUP,
                            style: {
                                outline: 'rgb(0, 255, 0) 1px solid',
                            }
                        });
                    }
                }

                // label
                sandGame.overlay().createRectangleWH(0, 0, 100, 20, {
                    visible: true,
                    group: ActionShowActiveChunks.#MARKER_GROUP,
                    style: {
                        color: 'rgb(18,121,18)'
                    },
                    label: 'Chunks: ' + (horChunkCount * verChunkCount)
                });
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // Warning: dev tools only

    const Tools = window.SandGameJS.Tools;
    const ToolDefs = window.SandGameJS.ToolDefs;
    const BrushDefs = window.SandGameJS.BrushDefs;

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class DevToolDefs {

        static DEFAULT_SIZE = 6;

        static CATEGORY_NONE = undefined;
        static CATEGORY_POWDER = 'powders';
        static CATEGORY_FLUIDS = 'fluids';
        static CATEGORY_SOLIDS = 'solids';
        static CATEGORY_EFFECTS = 'effects';
        static CATEGORY_BIOLOGICAL = 'biological';

        /** @type Tool[] */
        static TEST_TOOLS = [
            Tools.pointBrushTool(BrushDefs.GRASS, {
                codeName: 'grass',
                displayName: 'Grass',
                category: DevToolDefs.CATEGORY_BIOLOGICAL,
            }),
            Tools.pointBrushTool(BrushDefs.TREE, {
                codeName: 'tree',
                displayName: 'Tree',
                category: DevToolDefs.CATEGORY_BIOLOGICAL,
            }),
            ToolDefs.BIRD,
            ToolDefs.BUTTERFLY,
            ToolDefs.FISH,
            Tools.actionTool((x, y, graphics) => {
                graphics.entities().assignWaypoint(x, y);
            }, {
                codeName: 'entity_waypoint',
                displayName: 'Waypoint',
                category: DevToolDefs.CATEGORY_BIOLOGICAL,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_BURNT, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_burnt',
                displayName: 'Burnt',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_NOISE_SM, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_noise_sm',
                displayName: 'Noise SM',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_NOISE_MD, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_noise_md',
                displayName: 'Noise MD',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_NOISE_LG, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_noise_lg',
                displayName: 'Noise LG',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_TEMP_0, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_temp_0',
                displayName: 'Temp 0',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_TEMP_127, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_temp_127',
                displayName: 'Temp 127',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_TEMP_200, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_temp_200',
                displayName: 'Temp 200',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.EFFECT_TEMP_255, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'effect_temp_255',
                displayName: 'Temp 255',
                category: DevToolDefs.CATEGORY_EFFECTS,
            }),
            Tools.roundBrushTool(BrushDefs.ASH, DevToolDefs.DEFAULT_SIZE, {
                codeName: 'ash',
                displayName: 'Ash',
                category: DevToolDefs.CATEGORY_POWDER,
            })
        ];

        static _LIST = {};
        static {
            for (const tool of DevToolDefs.TEST_TOOLS) {
                DevToolDefs._LIST[tool.getInfo().getCodeName()] = tool;
            }
        }

        static byCodeName(codeName) {
            const tool = DevToolDefs._LIST[codeName];
            if (tool !== undefined) {
                return tool;
            }
            return null;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // Warning: dev tools only

    const RendererInitializerDefs = window.SandGameJS.RendererInitializerDefs;
    window.SandGameJS.BrushDefs;

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class ComponentViewDevTools extends Component {

        createNode(controller) {
            const BTN_SCENE = ComponentButton.CLASS_OUTLINE_SECONDARY;
            const BTN_RENDERING = ComponentButton.CLASS_OUTLINE_INFO;
            const BTN_TOOL = ComponentButton.CLASS_OUTLINE_PRIMARY;
            const BTN_BRUSH = ComponentButton.CLASS_OUTLINE_SUCCESS;

            let components = [
                new ComponentButton("All materials", BTN_SCENE, ActionsDev.ALL_MATERIALS),
                new ComponentButton("Tree spawn", BTN_SCENE, ActionsDev.TREE_SPAWN_TEST),
                new ComponentButton("Tree grow", BTN_SCENE, ActionsDev.treeGrowTest(0)),
                new ComponentButton("Tree grown", BTN_SCENE, ActionsDev.treeGrowTest(-1)),
                new ComponentButton("Fill", BTN_SCENE, new ActionFill()),

                new ComponentButton("Benchmark", BTN_TOOL, new ActionBenchmark()),
                new ComponentButton("Record (start/stop)", BTN_TOOL, new ActionRecord()),
                new ComponentButton("Screenshot", BTN_TOOL, new ActionScreenshot()),

                new ComponentButton("Chunks", BTN_RENDERING, new ActionShowActiveChunks()),
                new ComponentButton("M/webgl", BTN_RENDERING,
                    Action.create(c => c.setRendererInitializer(RendererInitializerDefs.canvasWebGL()))),
                new ComponentButton("M/classic", BTN_RENDERING,
                    Action.create(c => c.setRendererInitializer(RendererInitializerDefs.canvas2d(null)))),
                new ComponentButton("M/heatmap", BTN_RENDERING,
                    Action.create(c => c.setRendererInitializer(RendererInitializerDefs.canvas2d(new RenderingModeHeatmap())))),
                new ComponentButton("M/type", BTN_RENDERING,
                    Action.create(c => c.setRendererInitializer(RendererInitializerDefs.canvas2d(new RenderingModeElementType())))),
                new ComponentButton("M/null", BTN_RENDERING,
                    Action.create(c => c.setRendererInitializer(new RendererInitializerNull()))),
                new ComponentButton("Pixelated", BTN_RENDERING,
                    Action.createToggle(true, (c, v) => c.setCanvasImageRenderingStyle(v ? 'pixelated' : 'auto'))),
            ];
            for (let tool of DevToolDefs.TEST_TOOLS) {
                let action = Action.create(c => c.getToolManager().setPrimaryTool(tool));
                components.push(new ComponentButton(tool.getInfo().getDisplayName(), BTN_BRUSH, action));
            }

            let content = DomBuilder.div({ class: 'test-tools' }, []);
            for (let component of components) {
                content.append(component.createNode(controller));
            }
            return content;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Initialize component.
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    function createComponent() {
        return new ComponentViewDevTools();
    }

    exports.createComponent = createComponent;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=sand-game-js_module-dev.umd.js.map
