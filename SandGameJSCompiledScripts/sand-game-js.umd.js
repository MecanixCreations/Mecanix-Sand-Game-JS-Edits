/* Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SandGameJS = {}));
})(this, (function (exports) { 'use strict';

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-24
     */
    class SizeUtils {

        static #determineSize(root, maxWidthPx = 1400, maxHeightPx = 800) {
            let parentWidth;
            if (window.innerWidth <= 575) {
                parentWidth = window.innerWidth;  // no margins
            } else {
                parentWidth = root.clientWidth;  // including padding
            }

            let width = Math.min(maxWidthPx, parentWidth);
            let height = Math.min(maxHeightPx, Math.trunc(window.innerHeight * 0.70));
            if (width / height < 0.75) {
                height = Math.trunc(width / 0.75);
            }
            return {width, height};
        }

        static #determineMaxNumberOfPoints() {
            if (navigator.maxTouchPoints || 'ontouchstart' in document.documentElement) {
                // probably a smartphone
                return 75000;
            } else {
                // bigger screen => usually more powerful (or newer) computer
                if (window.screen.width >= 2560 && window.screen.height >= 1440) {
                    return 200000;  // >= QHD
                } else if (window.screen.width >= 2048 && window.screen.height >= 1080) {
                    return 175000;  // >= 2k
                } else if (window.screen.width >= 1920 && window.screen.height >= 1080) {
                    return 150000;
                } else {
                    return 125000;
                }
            }
        }

        static #determineOptimalScale(width, height, maxPoints) {
            function countPointsWithScale(scale) {
                return Math.trunc(width * scale) * Math.trunc(height * scale);
            }

            if (countPointsWithScale(0.750) < maxPoints) {
                return 0.750;
            } else if (countPointsWithScale(0.5) < maxPoints) {
                return 0.5;
            } else if (countPointsWithScale(0.375) < maxPoints) {
                return 0.375;
            } else {
                return 0.25;
            }
        }

        static determineOptimalSizes(parentNode, canvasConfig = undefined) {
            const maxWidthPx = (canvasConfig !== undefined) ? canvasConfig.maxWidthPx : undefined;
            const maxHeightPx = (canvasConfig !== undefined) ? canvasConfig.maxHeightPx : undefined;

            const {width, height} = SizeUtils.#determineSize(parentNode, maxWidthPx, maxHeightPx);

            const scaleOverride = (canvasConfig !== undefined) ? canvasConfig.scale : undefined;
            const scale = (scaleOverride === undefined)
                ? SizeUtils.#determineOptimalScale(width, height, SizeUtils.#determineMaxNumberOfPoints())
                : scaleOverride;
            return { width, height, scale };
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2022-09-09
     */
    class Element {
        elementHead;
        elementTail;

        constructor(elementHead = 0, elementTail = 0) {
            this.elementHead = elementHead;
            this.elementTail = elementTail;
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
     * Custom random implementation: "Mulberry32"
     * https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript/47593316#47593316
     *
     * @author Patrik Harag
     * @version 2023-12-20
     */
    class DeterministicRandom {

        static DEFAULT = new DeterministicRandom(106244033);

        static next(seed) {
            let t = seed + 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }

        /** @type number */
        #last;

        constructor(seed) {
            this.#last = seed;
        }

        /**
         *
         * @return {number} (0..1)
         */
        next() {
            let t = this.#last += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        }

        /**
         *
         * @param max
         * @return {number} <0..max)
         */
        nextInt(max) {
            return Math.trunc(this.next() * max);
        }

        /**
         * Generator state.
         *
         * @return {number} integer
         */
        getState() {
            return this.#last;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2023-12-20
     */
    class Brush {

        /**
         *
         * @param x
         * @param y
         * @param random {DeterministicRandom}
         * @param oldElement {Element}
         * @return {Element}
         */
        apply(x, y, random = undefined, oldElement = undefined) {
            throw 'Not implemented'
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-29
     */
    class RandomBrush extends Brush {

        /** @type Brush[] */
        #list;

        constructor(list) {
            super();
            this.#list = list;
        }

        apply(x, y, random, oldElement) {
            if (this.#list.length > 1) {
                const i = ((random) ? random : DeterministicRandom.DEFAULT).nextInt(this.#list.length);
                const item = this.#list[i];
                return item.apply(x, y, random, oldElement);
            } else if (this.#list.length === 1) {
                const item = this.#list[0];
                return item.apply(x, y, random, oldElement);
            } else {
                return null;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-29
     */
    class RandomElementBrush extends Brush {

        /** @type Element[] */
        #elements;

        constructor(elements) {
            super();
            this.#elements = elements;
        }

        apply(x, y, random, oldElement) {
            if (this.#elements.length > 1) {
                const i = ((random) ? random : DeterministicRandom.DEFAULT).nextInt(this.#elements.length);
                return this.#elements[i];
            } else if (this.#elements.length === 1) {
                return this.#elements[0];
            } else {
                return null;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-05
     */
    class AbstractEffectBrush extends Brush {

        /** @type Brush|undefined */
        #innerBrush;
        constructor(innerBrush) {
            super();
            this.#innerBrush = innerBrush;
        }

        _retrieveElement(x, y, random, oldElement) {
            if (this.#innerBrush !== undefined) {
                // use inner brush
                return this.#innerBrush.apply(x, y, random);
            } else {
                // use old element
                return oldElement;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Tools for working with the element tail.
     *
     * The element head structure: <code>0x[flags][red][green][blue]</code> (32b)
     * <pre>
     *     |            2b  | heat e.    2b  | burnt lvl  2b  | blur type  2b  |
     *     | color red                                                     8b  |
     *     | color green                                                   8b  |
     *     | color blue                                                    8b  |
     * </pre>
     *
     * @author Patrik Harag
     * @version 2023-12-04
     */
    class ElementTail {

        static BLUR_TYPE_NONE = 0x0;
        /** This element acts as a background = blur can be applied over this element */
        static BLUR_TYPE_BACKGROUND = 0x1;
        static BLUR_TYPE_1 = 0x2;

        static HEAT_EFFECT_NONE = 0x0;
        static HEAT_EFFECT_1 = 0x1;
        static HEAT_EFFECT_2 = 0x2;
        static HEAT_EFFECT_3 = 0x3;

        static of(r, g, b, blurType=ElementTail.BLUR_TYPE_NONE, heatEffect=0, burntLevel=0) {
            let value = 0;
            value = (value | (heatEffect & 0x03)) << 2;
            value = (value | (burntLevel & 0x03)) << 2;
            value = (value | (blurType & 0x03)) << 8;
            value = (value | (r & 0xFF)) << 8;
            value = (value | (g & 0xFF)) << 8;
            value = value | (b & 0xFF);
            return value;
        }

        static getColorRed(elementTail) {
            return (elementTail >> 16) & 0x000000FF;
        }

        static getColorGreen(elementTail) {
            return (elementTail >> 8) & 0x000000FF;
        }

        static getColorBlue(elementTail) {
            return elementTail & 0x000000FF;
        }

        static getBlurType(elementTail) {
            return (elementTail >> 24) & 0x00000003;
        }

        static getBurntLevel(elementTail) {
            return (elementTail >> 26) & 0x00000003;
        }

        static getHeatEffect(elementTail) {
            return (elementTail >> 28) & 0x00000003;
        }

        static setColor(elementTail, r, g, b) {
            elementTail = (elementTail & ~(0x00FF0000)) | (r << 16);
            elementTail = (elementTail & ~(0x0000FF00)) | (g << 8);
            elementTail = (elementTail & ~(0x000000FF)) | (b);
            return elementTail;
        }

        static setBlurType(elementTail, blurType) {
            return (elementTail & 0xFCFFFFFF) | (blurType << 24);
        }

        static setBurntLevel(elementTail, burntLevel) {
            return (elementTail & 0xF3FFFFFF) | (burntLevel << 26);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-05
     */
    class ColorBrush extends AbstractEffectBrush {

        #r; #g; #b;

        constructor(r, g, b, innerBrush) {
            super(innerBrush);
            this.#r = r;
            this.#g = g;
            this.#b = b;
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            const newElementTail = ElementTail.setColor(element.elementTail, this.#r, this.#g, this.#b);
            return new Element(element.elementHead, newElementTail);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-05
     */
    class ColorPaletteRandomBrush extends AbstractEffectBrush {

        /** @type number[][] */
        #palette;

        constructor(innerBrush, palette) {
            super(innerBrush);
            if (typeof palette === 'string') {
                // parse
                this.#palette = palette.split('\n').map(line => line.split(',').map(Number));
            } else {
                this.#palette = palette;
            }
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            const i = ((random) ? random : DeterministicRandom.DEFAULT).nextInt(this.#palette.length);
            const [r, g, b] = this.#palette[i];

            const newElementTail = ElementTail.setColor(element.elementTail, r, g, b);
            return new Element(element.elementHead, newElementTail);
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

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-05
     */
    class ColorTextureBrush extends AbstractEffectBrush {

        /** @type ImageData|null */
        #imageData = null;

        constructor(innerBrush, base64) {
            super(innerBrush);

            Assets.asImageData(base64).then(imageData => this.#imageData = imageData);
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            if (this.#imageData != null) {
                const cx = x % this.#imageData.width;
                const cy = y % this.#imageData.height;
                const index = (cy * this.#imageData.width + cx) * 4;

                const red = this.#imageData.data[index];
                const green = this.#imageData.data[index + 1];
                const blue = this.#imageData.data[index + 2];
                // const alpha = this.#imageData.data[index + 3];

                const newElementTail = ElementTail.setColor(element.elementTail, red, green, blue);
                return new Element(element.elementHead, newElementTail);

            } else {
                return element;
            }
        }
    }

    /*
     * A fast javascript implementation of simplex noise by Jonas Wagner

    Based on a speed-improved simplex noise algorithm for 2D, 3D and 4D in Java.
    Which is based on example code by Stefan Gustavson (stegu@itn.liu.se).
    With Optimisations by Peter Eastman (peastman@drizzle.stanford.edu).
    Better rank ordering method by Stefan Gustavson in 2012.

     Copyright (c) 2022 Jonas Wagner

     Permission is hereby granted, free of charge, to any person obtaining a copy
     of this software and associated documentation files (the "Software"), to deal
     in the Software without restriction, including without limitation the rights
     to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     copies of the Software, and to permit persons to whom the Software is
     furnished to do so, subject to the following conditions:

     The above copyright notice and this permission notice shall be included in all
     copies or substantial portions of the Software.

     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     SOFTWARE.
     */

    // 
    const F2 =  0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 =  (3.0 - Math.sqrt(3.0)) / 6.0;
    // I'm really not sure why this | 0 (basically a coercion to int)
    // is making this faster but I get ~5 million ops/sec more on the
    // benchmarks across the board or a ~10% speedup.
    const fastFloor = (x) => Math.floor(x) | 0;
    const grad2 = /*#__PURE__*/ new Float64Array([1, 1,
        -1, 1,
        1, -1,
        -1, -1,
        1, 0,
        -1, 0,
        1, 0,
        -1, 0,
        0, 1,
        0, -1,
        0, 1,
        0, -1]);
    /**
     * Creates a 2D noise function
     * @param random the random function that will be used to build the permutation table
     * @returns {NoiseFunction2D}
     */
    function createNoise2D(random = Math.random) {
        const perm = buildPermutationTable(random);
        // precalculating this yields a little ~3% performance improvement.
        const permGrad2x = new Float64Array(perm).map(v => grad2[(v % 12) * 2]);
        const permGrad2y = new Float64Array(perm).map(v => grad2[(v % 12) * 2 + 1]);
        return function noise2D(x, y) {
            // if(!isFinite(x) || !isFinite(y)) return 0;
            let n0 = 0; // Noise contributions from the three corners
            let n1 = 0;
            let n2 = 0;
            // Skew the input space to determine which simplex cell we're in
            const s = (x + y) * F2; // Hairy factor for 2D
            const i = fastFloor(x + s);
            const j = fastFloor(y + s);
            const t = (i + j) * G2;
            const X0 = i - t; // Unskew the cell origin back to (x,y) space
            const Y0 = j - t;
            const x0 = x - X0; // The x,y distances from the cell origin
            const y0 = y - Y0;
            // For the 2D case, the simplex shape is an equilateral triangle.
            // Determine which simplex we are in.
            let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
            if (x0 > y0) {
                i1 = 1;
                j1 = 0;
            } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
            else {
                i1 = 0;
                j1 = 1;
            } // upper triangle, YX order: (0,0)->(0,1)->(1,1)
            // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
            // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
            // c = (3-sqrt(3))/6
            const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
            const y2 = y0 - 1.0 + 2.0 * G2;
            // Work out the hashed gradient indices of the three simplex corners
            const ii = i & 255;
            const jj = j & 255;
            // Calculate the contribution from the three corners
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 >= 0) {
                const gi0 = ii + perm[jj];
                const g0x = permGrad2x[gi0];
                const g0y = permGrad2y[gi0];
                t0 *= t0;
                // n0 = t0 * t0 * (grad2[gi0] * x0 + grad2[gi0 + 1] * y0); // (x,y) of grad3 used for 2D gradient
                n0 = t0 * t0 * (g0x * x0 + g0y * y0);
            }
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 >= 0) {
                const gi1 = ii + i1 + perm[jj + j1];
                const g1x = permGrad2x[gi1];
                const g1y = permGrad2y[gi1];
                t1 *= t1;
                // n1 = t1 * t1 * (grad2[gi1] * x1 + grad2[gi1 + 1] * y1);
                n1 = t1 * t1 * (g1x * x1 + g1y * y1);
            }
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 >= 0) {
                const gi2 = ii + 1 + perm[jj + 1];
                const g2x = permGrad2x[gi2];
                const g2y = permGrad2y[gi2];
                t2 *= t2;
                // n2 = t2 * t2 * (grad2[gi2] * x2 + grad2[gi2 + 1] * y2);
                n2 = t2 * t2 * (g2x * x2 + g2y * y2);
            }
            // Add contributions from each corner to get the final noise value.
            // The result is scaled to return values in the interval [-1,1].
            return 70.0 * (n0 + n1 + n2);
        };
    }
    /**
     * Builds a random permutation table.
     * This is exported only for (internal) testing purposes.
     * Do not rely on this export.
     * @private
     */
    function buildPermutationTable(random) {
        const tableSize = 512;
        const p = new Uint8Array(tableSize);
        for (let i = 0; i < tableSize / 2; i++) {
            p[i] = i;
        }
        for (let i = 0; i < tableSize / 2 - 1; i++) {
            const r = i + ~~(random() * (256 - i));
            const aux = p[i];
            p[i] = p[r];
            p[r] = aux;
        }
        for (let i = 256; i < tableSize; i++) {
            p[i] = p[i - 256];
        }
        return p;
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-06
     */
    class VisualEffects {

        static isVisualBurnApplicable(elementHead) {
            const type = ElementHead.getTypeClass(elementHead);
            return type > ElementHead.TYPE_FLUID || type === ElementHead.TYPE_POWDER_FLOATING;
        }

        static visualBurn(elementTail, force = 1, maxBurntLevel = 3) {
            const burntLevel = ElementTail.getBurntLevel(elementTail);
            if (burntLevel >= 3) {
                return elementTail;
            }

            let newTail = elementTail;

            let newBurntLevel = burntLevel + force;
            newBurntLevel = Math.min(newBurntLevel, maxBurntLevel);
            newBurntLevel = Math.max(newBurntLevel, 0);

            const appliedForce = newBurntLevel - burntLevel;
            if (appliedForce > 0) {
                newTail = ElementTail.setBurntLevel(newTail, newBurntLevel);

                let red = ElementTail.getColorRed(elementTail);
                let green = ElementTail.getColorGreen(elementTail);
                let blue = ElementTail.getColorBlue(elementTail);

                let divisor = 1.8 - (Math.random() * 0.5);
                if (appliedForce > 1) {
                    divisor = divisor * (1.8 - (Math.random() * 0.5));
                }
                if (appliedForce > 2) {
                    divisor = divisor * (1.8 - (Math.random() * 0.5));
                }

                red = Math.trunc(red / divisor);
                green = Math.trunc(green / divisor);
                blue = Math.trunc(blue / divisor);

                newTail = ElementTail.setColor(newTail, red, green, blue);
            }

            return newTail;
        }

        /**
         *
         * @param seed {number|number[]|null}
         * @returns {PerlinNoiseVisualEffect}
         */
        static visualNoiseProvider(seed = 0) {
            if (Array.isArray(seed)) {
                const instances = seed.map(s => {
                    const random = new DeterministicRandom(s);
                    return createNoise2D(() => random.next());
                });
                return new PerlinNoiseVisualEffect(instances);
            } else {
                const random = new DeterministicRandom(seed);
                const noise2D = createNoise2D(() => random.next());
                return new PerlinNoiseVisualEffect([noise2D]);
            }
        }
    }

    class PerlinNoiseVisualEffect {
        #noise2DInstances;

        constructor(noise2DInstances) {
            this.#noise2DInstances = noise2DInstances;
        }

        visualNoise(elementTail, x, y, factor = 1, threshold = 0.5, force = 0.1,
                    nr = 0x00, ng = 0x00, nb = 0x00) {

            const nose2D = this.#noise2DInstances[0];

            let value = (nose2D(x / factor, y / factor) + 1) / 2;  // 0..1

            // apply threshold

            if (value < threshold) {
                return elementTail;
            }
            value = (value - threshold) * (1 / (1 - threshold));  // normalized 0..1

            // alpha blending

            const alpha = 1 - (value * force);

            let r = ElementTail.getColorRed(elementTail);
            let g = ElementTail.getColorGreen(elementTail);
            let b = ElementTail.getColorBlue(elementTail);

            r = Math.trunc(r * alpha) + (nr * (1 - alpha));
            g = Math.trunc(g * alpha) + (ng * (1 - alpha));
            b = Math.trunc(b * alpha) + (nb * (1 - alpha));

            return ElementTail.setColor(elementTail, r, g, b);
        }

        visualNoiseCombined(elementTail, x, y, coefficientList,
                    nr = 0x00, ng = 0x00, nb = 0x00) {

            let result = 0;
            for (let i = 0; i < coefficientList.length; i++) {
                const { factor, threshold, force } = coefficientList[i];
                const instance = this.#noise2DInstances[i % this.#noise2DInstances.length];

                // apply factor and count value
                let value = (instance(x / factor, y / factor) + 1) / 2;  // 0..1

                // apply threshold
                if (value < threshold) {
                    value = 0;
                } else {
                    value = (value - threshold) * (1 / (1 - threshold));  // normalized 0..1

                    // apply force
                    value = value * force;

                    result += value;
                }
            }
            result = Math.min(result, 1);

            // alpha blending

            const alpha = 1 - (result);

            let r = ElementTail.getColorRed(elementTail);
            let g = ElementTail.getColorGreen(elementTail);
            let b = ElementTail.getColorBlue(elementTail);

            r = Math.trunc(r * alpha) + (nr * (1 - alpha));
            g = Math.trunc(g * alpha) + (ng * (1 - alpha));
            b = Math.trunc(b * alpha) + (nb * (1 - alpha));

            return ElementTail.setColor(elementTail, r, g, b);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-06
     */
    class ColorNoiseBrush extends AbstractEffectBrush {

        #r; #g; #b;

        /**
         * @type {object|object[]}
         */
        #coefficients;

        #noise;

        constructor(innerBrush, coefficients, r, g, b) {
            super(innerBrush);
            this.#coefficients = coefficients;
            this.#r = r;
            this.#g = g;
            this.#b = b;
            if (Array.isArray(coefficients)) {
                this.#noise = VisualEffects.visualNoiseProvider(coefficients.map(c => c.seed));
            } else {
                this.#noise = VisualEffects.visualNoiseProvider(coefficients.seed);
            }
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            const coefficients = this.#coefficients;
            const r = this.#r;  // it could be null...
            const g = this.#g;
            const b = this.#b;

            let newElementTail;
            if (Array.isArray(coefficients)) {
                newElementTail = this.#noise.visualNoiseCombined(element.elementTail, x, y, coefficients, r, g, b);
            } else {
                const factor = coefficients.factor;  // it could be null...
                const threshold = coefficients.threshold;
                const force = coefficients.force;
                newElementTail = this.#noise.visualNoise(element.elementTail, x, y, factor, threshold, force, r, g, b);
            }
            return new Element(element.elementHead, newElementTail);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-12
     */
    class ColorMovingPaletteBrush extends AbstractEffectBrush {

        /** @type number[][] */
        #palette;

        /** @type number */
        #stepSize;

        #i = 0;
        #direction = 1;
        #current = 0;

        constructor(innerBrush, palette, stepSize) {
            super(innerBrush);
            this.#palette = palette;
            this.#stepSize = stepSize;
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            if (this.#palette.length === 0) {
                return element;
            }

            // retrieve current color
            const [r, g, b] = this.#palette[this.#i];

            if (this.#palette.length > 1) {
                // count next index
                this.#current += 1;
                if (this.#current >= this.#stepSize) {
                    this.#current = 0;
                    this.#i += this.#direction;
                    if (this.#i < 0) {
                        // switch direction
                        this.#direction = 1;
                        this.#i = 1;
                    } else if (this.#i >= this.#palette.length) {
                        // switch direction
                        this.#direction = -1;
                        this.#i = this.#palette.length - 2;
                    }
                }
            }

            const newElementTail = ElementTail.setColor(element.elementTail, r, g, b);
            return new Element(element.elementHead, newElementTail);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * This brush provides a bit of randomness to element colors.
     *
     * @author Patrik Harag
     * @version 2024-03-12
     */
    class ColorRandomize extends AbstractEffectBrush {

        #maxDiff;

        constructor(innerBrush, maxDiff) {
            super(innerBrush);
            this.#maxDiff = maxDiff;
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            let r = ElementTail.getColorRed(element.elementTail);
            let g = ElementTail.getColorGreen(element.elementTail);
            let b = ElementTail.getColorBlue(element.elementTail);

            r += random.nextInt(this.#maxDiff) * (random.nextInt(2) === 0 ? 1 : -1);
            g += random.nextInt(this.#maxDiff) * (random.nextInt(2) === 0 ? 1 : -1);
            b += random.nextInt(this.#maxDiff) * (random.nextInt(2) === 0 ? 1 : -1);

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            const newElementTail = ElementTail.setColor(element.elementTail, r, g, b);
            return new Element(element.elementHead, newElementTail);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-02-20
     */
    class CustomBrush extends Brush {

        /** @type function(x: number, y: number, random: DeterministicRandom, oldElement: Element) */
        #func;

        constructor(func) {
            super();
            this.#func = func;
        }

        apply(x, y, random, oldElement) {
            return this.#func(x, y, random, oldElement);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Special brush for counting elements.
     *
     * @author Patrik Harag
     * @version 2024-01-10
     */
    class CountingBrush extends Brush {

        static #NULL_REDICATE = function (elementHead, elementTail) {
            return false;
        };

        #predicate;

        #counterPositives = 0;
        #counterTotal = 0;

        /**
         *
         * @param predicate {function(number:elementHead, number:elementTail):boolean}
         */
        constructor(predicate = CountingBrush.#NULL_REDICATE) {
            super();
            this.#predicate = predicate;
        }

        apply(x, y, random, oldElement) {
            this.#counterTotal++;
            if (oldElement !== null) {
                if (this.#predicate(oldElement.elementHead, oldElement.elementTail)) {
                    this.#counterPositives++;
                }
            }
            return null;
        }

        getPositives() {
            return this.#counterPositives;
        }

        getTotal() {
            return this.#counterTotal;
        }

        reset() {
            this.#counterTotal = 0;
            this.#counterPositives = 0;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class PredicateDefs {

        static and(predicateA, predicateB) {
            return function (elementHead, elementTail) {
                return predicateA(elementHead, elementTail) && predicateB(elementHead, elementTail);
            };
        }

        static or(predicateA, predicateB) {
            return function (elementHead, elementTail) {
                return predicateA(elementHead, elementTail) || predicateB(elementHead, elementTail);
            };
        }

        static not(predicate) {
            return function (elementHead, elementTail) {
                return !predicate(elementHead, elementTail);
            };
        }

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static TRUE = function (elementHead, elementTail) {
            return true;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_AIR = function (elementHead, elementTail) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_AIR;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_EFFECT = function (elementHead, elementTail) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_EFFECT;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_GAS = function (elementHead, elementTail) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_GAS;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_FLUID = function (elementHead, elementTail) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_FLUID;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_WATER = function (elementHead, elementTail) {
            // TODO
            return ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_LIQUID
                && ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_FLUID;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_POWDER = function (elementHead, elementTail) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            return typeClass === ElementHead.TYPE_POWDER
                || typeClass === ElementHead.TYPE_POWDER_FLOATING
                || typeClass === ElementHead.TYPE_POWDER_WET;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_SAND = function (elementHead, elementTail) {
            if (PredicateDefs.IS_POWDER(elementHead, elementTail)) {
                return ElementHead.getBehaviour(elementHead) === 0
                    && ElementHead.getTypeModifierPowderMomentum(elementHead) === 6;
            }
            return false;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_SOIL = function (elementHead, elementTail) {
            if (PredicateDefs.IS_POWDER(elementHead, elementTail)) {
                const behaviour = ElementHead.getBehaviour(elementHead);
                return behaviour === ElementHead.BEHAVIOUR_SOIL;
            }
            return false;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_GRAVEL = function (elementHead, elementTail) {
            if (PredicateDefs.IS_POWDER(elementHead, elementTail)) {
                return ElementHead.getBehaviour(elementHead) === 0
                    && ElementHead.getTypeModifierPowderMomentum(elementHead) === 3;
            }
            return false;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_STATIC = function (elementHead, elementTail) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_STATIC;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_SOLID_BODY = function (elementHead, elementTail) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_STATIC
                && ElementHead.getTypeModifierSolidBodyId(elementHead) > 0;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_ENTITY = function (elementHead, elementTail) {
            return ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_ENTITY;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_BIOMASS = function (elementHead, elementTail) {
            const behaviour = ElementHead.getBehaviour(elementHead);
            return behaviour === ElementHead.BEHAVIOUR_GRASS
                || behaviour === ElementHead.BEHAVIOUR_TREE
                || behaviour === ElementHead.BEHAVIOUR_TREE_LEAF
                || behaviour === ElementHead.BEHAVIOUR_TREE_TRUNK
                || behaviour === ElementHead.BEHAVIOUR_TREE_ROOT
                || behaviour === ElementHead.BEHAVIOUR_ENTITY;
        };

        /** @type {function(elementHead:number, elementTail:number):boolean} */
        static IS_TREE_PART = function (elementHead, elementTail) {
            const behaviour = ElementHead.getBehaviour(elementHead);
            return behaviour === ElementHead.BEHAVIOUR_TREE
                || behaviour === ElementHead.BEHAVIOUR_TREE_LEAF
                || behaviour === ElementHead.BEHAVIOUR_TREE_TRUNK
                || behaviour === ElementHead.BEHAVIOUR_TREE_ROOT;
        };
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-07
     */
    class MeltingBrush extends AbstractEffectBrush {

        constructor(innerBrush) {
            super(innerBrush);
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);
            if (element === null) {
                return null;
            }

            const heatModIndex = ElementHead.getHeatModIndex(element.elementHead);
            if (ElementHead.hmiToMeltingTemperature(heatModIndex) < (1 << ElementHead.FIELD_TEMPERATURE_SIZE)) {
                let newElementHead = element.elementHead;
                newElementHead = ElementHead.setHeatModIndex(newElementHead, ElementHead.hmiToMeltingHMI(heatModIndex));
                newElementHead = ElementHead.setType(newElementHead, ElementHead.TYPE_FLUID);

                let newElementTail = ElementTail.setBlurType(element.elementTail, ElementTail.BLUR_TYPE_1);

                return new Element(newElementHead, newElementTail);
            }
            return element;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-23
     */
    class SolidBodyBrush extends AbstractEffectBrush {

        #solidBodyId;
        #extendedNeighbourhood;

        constructor(solidBodyId, extendedNeighbourhood, innerBrush) {
            super(innerBrush);
            this.#solidBodyId = solidBodyId;
            this.#extendedNeighbourhood = extendedNeighbourhood;
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);

            let elementHead = element.elementHead;
            const newType = ElementHead.type8Solid(ElementHead.TYPE_STATIC, this.#solidBodyId, this.#extendedNeighbourhood);
            elementHead = ElementHead.setType(elementHead, newType);
            return new Element(elementHead, element.elementTail);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-07
     */
    class ExtinguishedBrush extends AbstractEffectBrush {

        constructor(innerBrush) {
            super(innerBrush);
        }

        apply(x, y, random, oldElement) {
            const element = this._retrieveElement(x, y, random, oldElement);
            if (element === null) {
                return null;
            }

            const behaviour = ElementHead.getBehaviour(element.elementHead);
            if (behaviour === ElementHead.BEHAVIOUR_FIRE_SOURCE) {
                const newElementHead = ElementHead.setBehaviour(element.elementHead, ElementHead.BEHAVIOUR_NONE);
                return new Element(newElementHead, element.elementTail);
            } else {
                return null;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-07
     */
    class Brushes {

        static #parsePalette(string) {
            return string.split('\n')
                .filter(line => line.trim() !== '')
                .map(line => line.split(',').map(Number));
        }


        /**
         *
         * @param predicate {(function(elementHead:number, elementTail:number):boolean)|undefined}
         * @returns {CountingBrush}
         */
        static counting(predicate) {
            return new CountingBrush(predicate);
        }

        /**
         *
         * @param func {function(x: number, y: number, random: DeterministicRandom, oldElement: Element)}
         * @returns {Brush}
         */
        static custom(func) {
            return new CustomBrush(func);
        }

        /**
         *
         * @param list {Element[]|Brush[]}
         * @returns {Brush}
         */
        static random(list) {
            let hasBrushes = undefined;
            for (let item of list) {
                if (item instanceof Element) {
                    if (hasBrushes === true) {
                        throw 'Mixing Element and Brush instances';
                    }
                    hasBrushes = false;
                } else if (item instanceof Brush) {
                    if (hasBrushes === false) {
                        throw 'Mixing Element and Brush instances';
                    }
                    hasBrushes = true;
                } else {
                    throw 'Element or Brush instances expected';
                }
            }
            return (hasBrushes) ? new RandomBrush(list) : new RandomElementBrush(list);
        }

        /**
         *
         * @param r {number} 0..255
         * @param g {number} 0..255
         * @param b {number} 0..255
         * @param innerBrush {Brush|undefined}
         * @return {Brush}
         */
        static color(r = 0, g = 0, b = 0, innerBrush = undefined) {
            return new ColorBrush(r, g, b, innerBrush);
        }

        /**
         *
         * @param base64
         * @param innerBrush {Brush|undefined}
         * @return {ColorTextureBrush}
         */
        static colorTexture(base64, innerBrush = undefined) {
            return new ColorTextureBrush(innerBrush, base64);
        }

        /**
         *
         * @param palette {number[][]|string}
         * @param innerBrush {Brush|undefined}
         * @returns {Brush}
         */
        static colorPaletteRandom(palette, innerBrush = undefined) {
            if (typeof palette === 'string') {
                palette = Brushes.#parsePalette(palette);
            }
            return new ColorPaletteRandomBrush(innerBrush, palette);
        }

        /**
         *
         * @param palette {number[][]|string}
         * @param stepSize {number}
         * @param innerBrush {Brush|undefined}
         * @returns {Brush}
         */
        static colorPaletteCyclic(palette, stepSize = 1, innerBrush = undefined) {
            if (typeof palette === 'string') {
                palette = Brushes.#parsePalette(palette);
            }
            return new ColorMovingPaletteBrush(innerBrush, palette, stepSize);
        }

        /**
         * This brush provides a bit of randomness to element colors.
         *
         * @param maxDiff {number}
         * @param innerBrush {Brush|undefined}
         * @returns {Brush}
         */
        static colorRandomize(maxDiff, innerBrush = undefined) {
            return new ColorRandomize(innerBrush, maxDiff);
        }

        /**
         *
         * @param coefficients {
         * {
         *     seed: number|undefined,
         *     factor: number|undefined,
         *     threshold: number|undefined,
         *     force: number|undefined,
         * }
         * |
         * {
         *     seed: number|undefined,
         *     factor: number|undefined,
         *     threshold: number|undefined,
         *     force: number|undefined,
         * }[]
         * }
         * @param r {number} 0..255
         * @param g {number} 0..255
         * @param b {number} 0..255
         * @param innerBrush {Brush|undefined}
         * @return {Brush}
         */
        static colorNoise(coefficients, r = undefined, g = undefined, b = undefined,
                innerBrush = undefined) {

            return new ColorNoiseBrush(innerBrush, coefficients, r, g, b);
        }

        /**
         *
         * @param brush {Brush}
         * @param intensity {number} 0..1
         * @returns {Brush}
         */
        static withIntensity(intensity, brush) {
            return Brushes.custom((x, y, random, oldElement) => {
                let rnd = ((random) ? random : DeterministicRandom.DEFAULT).next();
                if (rnd < intensity) {
                    return brush.apply(x, y, random, oldElement);
                }
                return null;
            });
        }

        /**
         * Brush will not paint over other elements.
         *
         * @param brush {Brush}
         */
        static gentle(brush) {
            return Brushes.conditional(PredicateDefs.IS_AIR, brush);
        }

        /**
         * Brush will paint only over specific elements.
         *
         * @param predicate {function(elementHead:number, elementTail:number):boolean}
         * @param brush {Brush}
         */
        static conditional(predicate, brush) {
            return Brushes.custom((x, y, random, oldElement) => {
                if (oldElement === null) {
                    return null;
                }
                if (predicate(oldElement.elementHead, oldElement.elementTail)) {
                    return brush.apply(x, y, random, oldElement);
                }
                return null;
            });
        }

        static temperature(value) {
            return Brushes.custom((x, y, random, oldElement) => {
                if (oldElement === null) {
                    return null;
                }
                const newElementHead = ElementHead.setTemperature(oldElement.elementHead, value & 0xFF);
                return new Element(newElementHead, oldElement.elementTail);
            });
        }

        static temperatureOrBrush(value, brush) {
            return Brushes.custom((x, y, random, oldElement) => {
                if (oldElement === null) {
                    return brush.apply(x, y, random, null);
                }

                const typeClass = ElementHead.getTypeClass(oldElement.elementHead);
                switch (typeClass) {
                    case ElementHead.TYPE_AIR:
                    case ElementHead.TYPE_EFFECT:
                        return brush.apply(x, y, random, oldElement);

                    case ElementHead.TYPE_POWDER:
                    case ElementHead.TYPE_POWDER_WET:
                    case ElementHead.TYPE_POWDER_FLOATING:
                    case ElementHead.TYPE_FLUID:
                    case ElementHead.TYPE_GAS:
                    case ElementHead.TYPE_STATIC:
                        const newElementHead = ElementHead.setTemperature(oldElement.elementHead, value & 0xFF);
                        return new Element(newElementHead, oldElement.elementTail);

                    default:
                        return brush.apply(x, y, random, null);
                }
            });
        }

        static concat(first, second) {
            return Brushes.custom((x, y, random, oldElement) => {
                const firstResult = first.apply(x, y, random, oldElement);
                const secondResult = second.apply(x, y, random, firstResult !== null ? firstResult : oldElement);
                return (secondResult !== null) ? secondResult : firstResult;
            });
        }

        static join(brushes) {
            return Brushes.custom((x, y, random, oldElement) => {
                let last = oldElement;
                for (let brush of brushes) {
                    const next = brush.apply(x, y, random, last);
                    if (next !== null) {
                        last = next;
                    }
                }
                return last;
            });
        }

        /**
         *
         * @param innerBrush {Brush|undefined}
         * @returns {Brush}
         */
        static molten(innerBrush) {
            return new MeltingBrush(innerBrush);
        }

        /**
         *
         * @param innerBrush {Brush|undefined}
         * @returns {Brush}
         */
        static extinguished(innerBrush) {
            return new ExtinguishedBrush(innerBrush)
        }

        /**
         * @param solidBodyId {number}
         * @param extendedNeighbourhood {boolean|undefined}
         * @param innerBrush {Brush|undefined}
         * @return {SolidBodyBrush}
         */
        static toSolidBody(solidBodyId, extendedNeighbourhood = undefined, innerBrush = undefined) {
            return new SolidBodyBrush(solidBodyId, extendedNeighbourhood, innerBrush);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-19
     */
    class ToolInfo {

        static NOT_DEFINED = new ToolInfo();

        #info

        /**
         *
         * @param info {{
         *     codeName: string|undefined,
         *     displayName: string|undefined,
         *     category: string|undefined,
         *     badgeStyle: CSSStyleDeclaration|undefined,
         *     icon: {svg: string|undefined}|undefined,
         * }}
         */
        constructor(info = {}) {
            this.#info = info;
        }

        derive(info) {
            const derivedInfo = {};
            Object.assign(derivedInfo, this.#info);
            Object.assign(derivedInfo, info);
            return new ToolInfo(derivedInfo);
        }

        /**
         *
         * @return {string|undefined}
         */
        getCategory() {
            return this.#info.category;
        }

        /**
         *
         * @return {string|undefined}
         */
        getDisplayName() {
            return this.#info.displayName;
        }

        /**
         *
         * @return {string|undefined}
         */
        getCodeName() {
            return this.#info.codeName;
        }

        /**
         *
         * @return {CSSStyleDeclaration|undefined}
         */
        getBadgeStyle() {
            return this.#info.badgeStyle;
        }

        /**
         *
         * @returns {string|undefined}
         */
        getSvgIcon() {
            return this.#info.icon?.svg;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2023-05-04
     */
    class CursorDefinition {

        /**
         *
         * @return {number}
         */
        getWidth() {
            throw 'Not implemented';
        }

        /**
         *
         * @return {number}
         */
        getHeight() {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-02-08
     */
    class Tool {

        /** @type ToolInfo|null */
        #info;

        constructor(info = ToolInfo.NOT_DEFINED) {
            this.#info = info;
        }

        /**
         *
         * @returns {ToolInfo}
         */
        getInfo() {
            return this.#info;
        }

        hasCursor() {
            return false;
        }

        /**
         * @return {CursorDefinition|null}
         */
        createCursor() {
            // default cursor
            return null;
        }

        isRepeatingEnabled() {
            return false;
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param graphics {SandGameGraphics}
         * @param altModifier {boolean}
         * @return {void}
         */
        applyPoint(x, y, graphics, altModifier) {
            // no action by default
        }

        isLineModeEnabled() {
            return false;
        }

        onDragStart(x, y, graphics, altModifier) {
            // no action by default
        }

        onDragEnd(x, y, graphics, altModifier) {
            // no action by default
        }

        /**
         *
         * @param x1 {number}
         * @param y1 {number}
         * @param x2 {number}
         * @param y2 {number}
         * @param graphics {SandGameGraphics}
         * @param altModifier {boolean}
         * @return {void}
         */
        applyStroke(x1, y1, x2, y2, graphics, altModifier) {
            // no action by default
        }

        isAreaModeEnabled() {
            return false;
        }

        /**
         *
         * @param x1 {number}
         * @param y1 {number}
         * @param x2 {number}
         * @param y2 {number}
         * @param graphics {SandGameGraphics}
         * @param altModifier {boolean}
         * @return {void}
         */
        applyArea(x1, y1, x2, y2, graphics, altModifier) {
            // no action by default
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param graphics {SandGameGraphics}
         * @param altModifier {boolean}
         * @return {void}
         */
        applySpecial(x, y, graphics, altModifier) {
            // no action by default
        }

        isSecondaryActionEnabled() {
            return false;
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param graphics {SandGameGraphics}
         * @param altModifier {boolean}
         * @return {void}
         */
        applySecondaryAction(x, y, graphics, altModifier) {
            // no action by default
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-26
     */
    class RoundBrushTool extends Tool {

        /** @type Brush */
        #brush;

        /** @type number */
        #size;

        constructor(info, brush, size) {
            super(info);
            this.#brush = brush;
            this.#size = size;
        }

        getBrush() {
            return this.#brush;
        }

        isLineModeEnabled() {
            return true;
        }

        isAreaModeEnabled() {
            return true;
        }

        isRepeatingEnabled() {
            return true;
        }

        applyPoint(x, y, graphics, altModifier) {
            this.applyStroke(x, y, x, y, graphics, altModifier);
        }

        applyStroke(x1, y1, x2, y2, graphics, altModifier) {
            const brush = this.#currentBrush(altModifier);
            graphics.drawLine(x1, y1, x2, y2, this.#size, brush, true);
        }

        applyArea(x1, y1, x2, y2, graphics, altModifier) {
            const brush = this.#currentBrush(altModifier);
            graphics.drawRectangle(x1, y1, x2, y2, brush);
        }

        applySpecial(x, y, graphics, altModifier) {
            const brush = this.#currentBrush(altModifier);
            graphics.floodFill(x, y, brush, 1);
        }

        #currentBrush(altModifier) {
            let brush = this.#brush;
            if (altModifier) {
                brush = Brushes.gentle(brush);
            }
            return brush;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-26
     */
    class RoundBrushToolForSolidBody extends Tool {

        /** @type Brush */
        #brush;

        /** @type Brush */
        #toSolidBodyBrush = Brushes.conditional(PredicateDefs.IS_STATIC, Brushes.toSolidBody(2, false));  // TODO: hardcoded

        /** @type number */
        #size;

        #drag = false;
        #dragBuffer = [];

        constructor(info, brush, size) {
            super(info);
            this.#brush = brush;
            this.#size = size;
        }

        getBrush() {
            return this.#brush;
        }

        isLineModeEnabled() {
            return true;
        }

        isAreaModeEnabled() {
            return true;
        }

        isRepeatingEnabled() {
            return false;
        }

        applyPoint(x, y, graphics, altModifier) {
            // ignored
        }

        applyStroke(x1, y1, x2, y2, graphics, altModifier) {
            const brush = this.#currentBrush(altModifier);
            graphics.drawLine(x1, y1, x2, y2, this.#size, brush, true);
        }

        applyArea(x1, y1, x2, y2, graphics, altModifier) {
            const brush = this.#currentBrush(altModifier);
            graphics.drawRectangle(x1, y1, x2, y2, brush);
        }

        applySpecial(x, y, graphics, altModifier) {
            const brush = this.#currentBrush(altModifier);
            graphics.floodFill(x, y, brush, 1);
        }

        onDragStart(x, y, graphics, altModifier) {
            this.#drag = true;
        }

        onDragEnd(x, y, graphics, altModifier) {
            this.#drag = false;
            for (const [ex, ey] of this.#dragBuffer) {
                graphics.draw(ex, ey, this.#toSolidBodyBrush);
            }
            this.#dragBuffer = [];
        }

        #currentBrush(altModifier) {
            let brush = this.#brush;
            if (altModifier) {
                brush = Brushes.gentle(brush);
            }

            if (this.#drag) {
                return Brushes.custom((x, y, random, oldElement) => {
                    const element = brush.apply(x, y, random, oldElement);
                    if (element !== null) {
                        const elementHead = ElementHead.setType(element.elementHead, ElementHead.TYPE_STATIC);
                        this.#dragBuffer.push([x, y]);
                        return new Element(elementHead, element.elementTail);
                    }
                    return null;
                });
            } else {
                return brush;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-25
     */
    class PointBrushTool extends Tool {

        /** @type {{dx: number, dy: number, brush: Brush}[]} */
        #points;

        constructor(info, points) {
            super(info);
            this.#points = points;
        }

        applyPoint(x, y, graphics, aldModifier) {
            for (const {dx, dy, brush} of this.#points) {
                graphics.draw(x + dx, y + dy, brush);
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-12
     */
    class MeteorTool extends Tool {

        #meteor;
        #meteorFromLeft;
        #meteorFromRight;

        constructor(info, meteor, meteorFromLeft, meteorFromRight) {
            super(info);
            this.#meteor = meteor;
            this.#meteorFromLeft = meteorFromLeft;
            this.#meteorFromRight = meteorFromRight;
        }

        applyPoint(x, y, graphics, aldModifier) {
            const diffSlope4 = Math.trunc(y / 4);
            if (x < diffSlope4 + 10) {
                // right only
                graphics.draw(x + diffSlope4, 1, this.#meteorFromRight);
                return;
            }
            if (x > graphics.getWidth() - diffSlope4 - 10) {
                // left only
                graphics.draw(x - diffSlope4, 1, this.#meteorFromLeft);
                return;
            }

            if (x < graphics.getWidth() / 2) {
                if (DeterministicRandom.DEFAULT.next() < 0.8) {
                    graphics.draw(x + diffSlope4, 1, this.#meteorFromRight);
                } else {
                    graphics.draw(x, 1, this.#meteor);
                }
            } else {
                if (DeterministicRandom.DEFAULT.next() < 0.8) {
                    graphics.draw(x - diffSlope4, 1, this.#meteorFromLeft);
                } else {
                    graphics.draw(x, 1, this.#meteor);
                }
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-10-11
     */
    class ElementArea {

        /**
         * This element is used for templates etc.
         * @type {Element}
         */
        static TRANSPARENT_ELEMENT = new Element(0xFFFFFFFF, 0xFFFFFFFF);

        static LITTLE_ENDIAN = true;

        static create(width, height, defaultElement) {
            let bufferHeads = new DataView(new ArrayBuffer(width * height * 4));
            let bufferTails = new DataView(new ArrayBuffer(width * height * 4));
            let instance = new ElementArea(width, height, bufferHeads, bufferTails);

            // set default elements
            for (let y = 0; y < instance.#height; y++) {
                for (let x = 0; x < instance.#width; x++) {
                    instance.setElement(x, y, defaultElement);
                }
            }
            return instance;
        }

        /**
         *
         * @param width
         * @param height
         * @param dataHeads {ArrayBuffer}
         * @param dataTails {ArrayBuffer}
         * @returns {ElementArea}
         */
        static from(width, height, dataHeads, dataTails) {
            return new ElementArea(width, height, new DataView(dataHeads), new DataView(dataTails));
        }


        /** @type number */
        #width;

        /** @type number */
        #height;

        /** @type DataView */
        #bufferHeads;

        /** @type DataView */
        #bufferTails;

        constructor(width, height, bufferHeads, bufferTails) {
            this.#width = width;
            this.#height = height;
            this.#bufferHeads = bufferHeads;
            this.#bufferTails = bufferTails;
        }

        isValidPosition(x, y) {
            if (x < 0 || y < 0) {
                return false;
            }
            if (x >= this.#width || y >= this.#height) {
                return false;
            }
            return true;
        }

        setElement(x, y, element) {
            if (element !== null) {
                this.setElementHeadAndTail(x, y, element.elementHead, element.elementTail);
            }
            // brushes can produce nulls
        }

        setElementHeadAndTail(x, y, elementHead, elementTail) {
            const byteOffset = (this.#width * y + x) * 4;
            this.#bufferHeads.setUint32(byteOffset, elementHead, ElementArea.LITTLE_ENDIAN);
            this.#bufferTails.setUint32(byteOffset, elementTail, ElementArea.LITTLE_ENDIAN);
        }

        setElementHead(x, y, elementHead) {
            const byteOffset = (this.#width * y + x) * 4;
            this.#bufferHeads.setUint32(byteOffset, elementHead, ElementArea.LITTLE_ENDIAN);
        }

        setElementTail(x, y, elementTail) {
            const byteOffset = (this.#width * y + x) * 4;
            this.#bufferTails.setUint32(byteOffset, elementTail, ElementArea.LITTLE_ENDIAN);
        }

        getElement(x, y) {
            const byteOffset = (this.#width * y + x) * 4;
            const elementHead = this.#bufferHeads.getUint32(byteOffset, ElementArea.LITTLE_ENDIAN);
            const elementTail = this.#bufferTails.getUint32(byteOffset, ElementArea.LITTLE_ENDIAN);
            return new Element(elementHead, elementTail);
        }

        getElementHead(x, y) {
            const byteOffset = (this.#width * y + x) * 4;
            return this.#bufferHeads.getUint32(byteOffset, ElementArea.LITTLE_ENDIAN);
        }

        getElementHeadOrNull(x, y) {
            if (this.isValidPosition(x, y)) {
                return this.getElementHead(x, y);
            }
            return null;
        }

        getElementTail(x, y) {
            const byteOffset = (this.#width * y + x) * 4;
            return this.#bufferTails.getUint32(byteOffset, ElementArea.LITTLE_ENDIAN);
        }

        getElementTailOrNull(x, y) {
            if (this.isValidPosition(x, y)) {
                return this.getElementTail(x, y);
            }
            return null;
        }

        swap(x, y, x2, y2) {
            const elementHead = this.getElementHead(x, y);
            const elementHead2 = this.getElementHead(x2, y2);
            this.setElementHead(x2, y2, elementHead);
            this.setElementHead(x, y, elementHead2);

            const elementTail = this.getElementTail(x, y);
            const elementTail2 = this.getElementTail(x2, y2);
            this.setElementTail(x2, y2, elementTail);
            this.setElementTail(x, y, elementTail2);
        }

        /**
         *
         * @return {ArrayBuffer}
         */
        getDataHeads() {
            return this.#bufferHeads.buffer;
        }

        /**
         *
         * @return {ArrayBuffer}
         */
        getDataTails() {
            return this.#bufferTails.buffer;
        }

        /**
         *
         * @return {number}
         */
        getWidth() {
            return this.#width;
        }

        /**
         *
         * @return {number}
         */
        getHeight() {
            return this.#height;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @author Patrik Harag
     * @version 2023-05-04
     */
    class CursorDefinitionElementArea extends CursorDefinition {

        /** @type ElementArea */
        #elementArea;

        constructor(elementArea) {
            super();
            this.#elementArea = elementArea;
        }

        getWidth() {
            return this.#elementArea.getWidth();
        }

        getHeight() {
            return this.#elementArea.getHeight();
        }

        getElementArea() {
            return this.#elementArea;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class InsertElementAreaTool extends Tool {

        static asElementArea(scene) {
            return scene.createElementArea(InsertElementAreaTool.DEFAULT_W, InsertElementAreaTool.DEFAULT_H,
                    ElementArea.TRANSPARENT_ELEMENT);
        }


        static DEFAULT_W = 30;
        static DEFAULT_H = 30;

        /** @type ElementArea */
        #elementArea;
        /** @type object[] */
        #serializedEntities;
        /** @type function */
        #onInsertHandler;

        constructor(info, elementArea, serializedEntities, onInsertHandler) {
            super(info);
            this.#elementArea = elementArea;
            this.#serializedEntities = serializedEntities;
            this.#onInsertHandler = onInsertHandler;
        }

        applyPoint(x, y, graphics, aldModifier) {
            const elementArea = this.#elementArea;
            const offsetX = x - Math.trunc(elementArea.getWidth() / 2);
            const offsetY = y - Math.trunc(elementArea.getHeight() / 2);

            // apply elements
            let brush = Brushes.custom((tx, ty) => {
                const element = elementArea.getElement(tx - offsetX, ty - offsetY);
                if (element.elementHead !== ElementArea.TRANSPARENT_ELEMENT.elementHead
                    && element.elementTail !== ElementArea.TRANSPARENT_ELEMENT.elementTail) {

                    return element;
                }
                return null;
            });
            if (aldModifier) {
                brush = Brushes.gentle(brush);
            }

            for (let i = 0; i < elementArea.getWidth() && offsetX + i < graphics.getWidth(); i++) {
                const tx = offsetX + i;
                if (tx < 0) {
                    continue;
                }

                for (let j = 0; j < elementArea.getHeight() && offsetY + j < graphics.getHeight(); j++) {
                    const ty = offsetY + j;
                    if (ty < 0) {
                        continue;
                    }

                    graphics.draw(tx, ty, brush);
                }
            }

            // apply entities
            for (const serializedEntity of this.#serializedEntities) {
                const serializedClone = Object.assign({}, serializedEntity);
                // map entity position
                if (typeof serializedClone.x === 'number') {
                    serializedClone.x += offsetX;
                }
                if (typeof serializedClone.y === 'number') {
                    serializedClone.y += offsetY;
                }
                graphics.entities().insertEntity(serializedClone);
            }

            if (this.#onInsertHandler !== undefined) {
                this.#onInsertHandler();
            }
        }

        hasCursor() {
            return true;
        }

        createCursor() {
            return new CursorDefinitionElementArea(this.#elementArea);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class InsertRandomSceneTool extends Tool {

        /** @type Scene[] */
        #scenes;

        #currentTool;

        /** @type function */
        #onInsertHandler;

        constructor(info, scenes, onInsertHandler) {
            super(info);
            this.#scenes = scenes;
            this.#onInsertHandler = onInsertHandler;
            this.#initRandomTool();
        }

        #initRandomTool() {
            if (this.#scenes.length === undefined || this.#scenes.length === 0) {
                throw 'Scenes not set';
            }

            const i = DeterministicRandom.DEFAULT.nextInt(this.#scenes.length);
            const scene = this.#scenes[i];
            const elementArea = InsertElementAreaTool.asElementArea(scene);
            const serializedEntitiesOrNull = scene.createEntities();
            const serializedEntities = serializedEntitiesOrNull !== null ? serializedEntitiesOrNull : [];
            this.#currentTool = new InsertElementAreaTool(this.getInfo(), elementArea, serializedEntities, this.#onInsertHandler);
        }

        applyPoint(x, y, graphics, aldModifier) {
            this.#currentTool.applyPoint(x, y, graphics, aldModifier);
            this.#initRandomTool();
        }

        hasCursor() {
            return true;
        }

        createCursor() {
            return this.#currentTool.createCursor();
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-04
     */
    class ActionTool extends Tool {

        /** @type function */
        #handler;

        constructor(info, handler) {
            super(info);
            this.#handler = handler;
        }

        applyPoint(x, y, graphics, aldModifier) {
            this.#handler(x, y, graphics, aldModifier);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class PositionedElement extends Element {

        x;
        y;

        constructor(x, y, elementHead, elementTail) {
            super(elementHead, elementTail);
            this.x = x;
            this.y = y;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class FloodFillPainter {

        static NEIGHBOURHOOD_VON_NEUMANN = 0;
        static NEIGHBOURHOOD_MOORE = 1;
        static NEIGHBOURHOOD_SOLID_BODY = 2;


        /** @type ElementArea */
        #elementArea;

        /** @type SandGameGraphics */
        #graphics;

        #neighbourhood;

        /**
         *
         * @param elementArea {ElementArea}
         * @param neighbourhood
         * @param graphics {SandGameGraphics}
         */
        constructor(elementArea, neighbourhood = FloodFillPainter.NEIGHBOURHOOD_VON_NEUMANN, graphics) {
            this.#elementArea = elementArea;
            this.#neighbourhood = neighbourhood;
            this.#graphics = graphics;
        }

        #createPattern() {
            if (this.#neighbourhood === FloodFillPainter.NEIGHBOURHOOD_SOLID_BODY) {
                return 0b1111_1111;  // type class + solid body id (without neighbourhood type)
            } else {
                return 0b1111_11100111;  // TODO: different for fluid, powder-like...
            }
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param brush {Brush}
         */
        paint(x, y, brush) {
            const pattern = this.#createPattern();
            const matcher = this.#normalize(this.#elementArea.getElementHead(x, y)) & pattern;

            const w = this.#elementArea.getWidth();

            const pointSet = new Set();
            const queue = [];

            let point = x + y * w;
            do {
                let x = point % w;
                let y = Math.trunc(point / w);

                if (pointSet.has(point)) {
                    continue;  // already completed
                }

                this.#graphics.draw(x, y, brush);
                pointSet.add(point);

                // add neighbours
                this.#tryAdd(x, y - 1, pattern, matcher, pointSet, queue);
                this.#tryAdd(x + 1, y, pattern, matcher, pointSet, queue);
                this.#tryAdd(x, y + 1, pattern, matcher, pointSet, queue);
                this.#tryAdd(x - 1, y, pattern, matcher, pointSet, queue);

                let extendedNeighbourhood = false;
                if (this.#neighbourhood === FloodFillPainter.NEIGHBOURHOOD_MOORE) {
                    extendedNeighbourhood = true;
                } else if (this.#neighbourhood === FloodFillPainter.NEIGHBOURHOOD_SOLID_BODY) {
                    const elementHead = this.#elementArea.getElementHead(x, y);
                    if (ElementHead.getTypeModifierSolidNeighbourhoodType(elementHead) === 0) {
                        extendedNeighbourhood = true;
                    }
                }

                if (extendedNeighbourhood) {
                    this.#tryAdd(x + 1, y + 1, pattern, matcher, pointSet, queue);
                    this.#tryAdd(x + 1, y - 1, pattern, matcher, pointSet, queue);
                    this.#tryAdd(x - 1, y + 1, pattern, matcher, pointSet, queue);
                    this.#tryAdd(x - 1, y - 1, pattern, matcher, pointSet, queue);
                }

            } while ((point = queue.pop()) != null);
        }

        #tryAdd(x, y, pattern, matcher, pointSet, queue) {
            const w = this.#elementArea.getWidth();
            const h = this.#elementArea.getHeight();

            if (x < 0 || y < 0) {
                return;
            }
            if (x >= w || y >= h) {
                return;
            }

            if (!this.#equals(x, y, pattern, matcher)) {
                return;
            }

            const point = x + y * w;
            if (pointSet.has(point)) {
                return;
            }

            queue.push(point);
        }

        #equals(x, y, pattern, matcher) {
            let elementHead = this.#elementArea.getElementHead(x, y);
            elementHead = this.#normalize(elementHead);
            return (elementHead & pattern) === matcher;
        }

        #normalize(elementHead) {
            // wetness is ignored
            if (ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_POWDER_WET) {
                elementHead = ElementHead.setTypeClass(elementHead, ElementHead.TYPE_POWDER);
            }
            return elementHead;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class CopyUtils {

        static copyNonSolidElements(graphicsCommands, replacementElement = null) {
            const elements = [];

            function canBeCopiedAsNonSolidElement(elementHead) {
                const elementTypeClass = ElementHead.getTypeClass(elementHead);
                if (elementTypeClass > ElementHead.TYPE_AIR && elementTypeClass < ElementHead.TYPE_STATIC) {
                    return true;
                }
                return false;
            }

            const brush = Brushes.custom((tx, ty, r, element) => {
                if (canBeCopiedAsNonSolidElement(element.elementHead)) {
                    elements.push(new PositionedElement(tx, ty, element.elementHead, element.elementTail));
                    return replacementElement;  // remove
                }
                return null;  // ignore
            });

            graphicsCommands(brush);

            return elements;
        }

        static copySolidBodies(graphicsCommands, graphics, maxArea, replacementElement) {
            const elements = [];

            const brush = Brushes.custom((tx, ty, r, element) => {
                if (ElementHead.getTypeClass(element.elementHead) === ElementHead.TYPE_STATIC
                        && ElementHead.getTypeModifierSolidBodyId(element.elementHead) !== 0) {

                    const newElements = CopyUtils.copySolidBody(tx, ty, graphics, maxArea, replacementElement);
                    for (const newElement of newElements) {
                        elements.push(newElement);
                    }
                }
                return null;  // ignore here
            });

            graphicsCommands(brush);

            return elements;
        }

        static copySolidBody(x, y, graphics, maxArea, replacementElement = null) {
            const solidBodyElements = [];
            const collectingBrush = Brushes.custom((tx, ty, random, element) => {
                solidBodyElements.push(new PositionedElement(tx, ty, element.elementHead, element.elementTail));
                return null;  // ignore here
            });
            graphics.floodFill(x, y, collectingBrush, FloodFillPainter.NEIGHBOURHOOD_SOLID_BODY);

            if (solidBodyElements.length > maxArea) {
                return [];  // too big
            }
            for (let solidBodyElement of solidBodyElements) {
                graphics.draw(solidBodyElement.x, solidBodyElement.y, replacementElement);
            }
            return solidBodyElements;
        }

        static copyEntities(graphicsCommands, graphics, defaultElement) {
            const elements = [];
            const entities = [];

            const brush = Brushes.custom((tx, ty, r, element) => {
                for (const entity of graphics.entities().getAt(tx, ty)) {
                    if (entity.isActive()) {
                        const [extractedSerializedEntity, extractedElements] = entity.extract(defaultElement, 0, 0);
                        entities.push(extractedSerializedEntity);
                        elements.push(...extractedElements);
                    }
                }
                return null;  // ignore
            });

            graphicsCommands(brush);

            return [entities, elements];
        }

        static trimmed(elements, entities) {
            if (elements.length === 0) {
                return [null, null];
            }

            let minX = Number.MAX_VALUE;
            let maxX = Number.MIN_VALUE;
            let minY = Number.MAX_VALUE;
            let maxY = Number.MIN_VALUE;
            for (const element of elements) {
                minX = Math.min(minX, element.x);
                maxX = Math.max(maxX, element.x);
                minY = Math.min(minY, element.y);
                maxY = Math.max(maxY, element.y);
            }
            const w = maxX - minX + 1;
            const h = maxY - minY + 1;

            // create element area
            const elementArea = ElementArea.create(w, h, ElementArea.TRANSPARENT_ELEMENT);
            for (const element of elements) {
                const tx = element.x - minX;
                const ty = element.y - minY;
                elementArea.setElement(tx, ty, element);
            }

            // map entities
            for (let serializedEntity of entities) {
                if (typeof serializedEntity.x === 'number') {
                    serializedEntity.x -= minX;
                }
                if (typeof serializedEntity.y === 'number') {
                    serializedEntity.y -= minY;
                }
            }

            return [elementArea, entities];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * It can be used to move elements from one place to another.
     * This tool works in three modes: click-click, drag-drop and selection-click.
     *
     * @author Patrik Harag
     * @version 2024-04-24
     */
    class MoveTool extends Tool {

        /** @type number */
        #size;
        /** @type number */
        #solidBodyMaxArea;

        /** @type InsertElementAreaTool */
        #insertScene = null;

        constructor(info, size, solidBodyMaxArea) {
            super(info);
            this.#size = size;
            this.#solidBodyMaxArea = solidBodyMaxArea;
        }

        // POINT & DRAG AND DROP ACTION

        applyPoint(x, y, graphics, altModifier) {
            if (this.#insertScene === null) {
                this.#insertScene = this.#createInsertToolAt(x, y, graphics);
            } else {
                this.#insertScene.applyPoint(x, y, graphics, altModifier);
                this.#insertScene = null;
            }
        }

        onDragStart(x, y, graphics, altModifier) {
            // ignore
        }

        onDragEnd(x, y, graphics, altModifier) {
            if (this.#insertScene !== null) {
                this.#insertScene.applyPoint(x, y, graphics, altModifier);
                this.#insertScene = null;
            }
        }

        #createInsertToolAt(x, y, graphics) {
            const [elementArea, entities] = this.#copySingleElementsAt(x, y, graphics);
            return (elementArea !== null)
                    ? new InsertElementAreaTool(new ToolInfo(), elementArea, entities)
                    : null;
        }

        #copySingleElementsAt(x, y, graphics) {
            const defaultElement = graphics.getDefaults().getDefaultElement();
            const graphicsCommands = (brush) => graphics.drawLine(x, y, x, y, this.#size, brush, true);

            const elements = [];

            elements.push(...CopyUtils.copyNonSolidElements(graphicsCommands, defaultElement));

            elements.push(...CopyUtils.copySolidBodies(graphicsCommands, graphics, this.#solidBodyMaxArea, defaultElement));

            const [entities, entitiesElements] = CopyUtils.copyEntities(graphicsCommands, graphics, defaultElement);
            elements.push(...entitiesElements);

            return CopyUtils.trimmed(elements, entities);
        }

        // AREA ACTION

        isAreaModeEnabled() {
            return true;
        }

        applyArea(x1, y1, x2, y2, graphics, altModifier) {
            this.#insertScene = this.#createInsertTool(x1, y1, x2, y2, graphics);
        }

        #createInsertTool(x1, y1, x2, y2, graphics) {
            const [elementArea, entities] = this.#copyElements(x1, y1, x2, y2, graphics);
            return (elementArea !== null)
                ? new InsertElementAreaTool(new ToolInfo(), elementArea, entities)
                : null;
        }

        #copyElements(x1, y1, x2, y2, graphics) {
            const w = Math.abs(x1 - x2) + 1;
            const h = Math.abs(y1 - y2) + 1;
            const elementArea = ElementArea.create(w, h, ElementArea.TRANSPARENT_ELEMENT);
            const entities = [];

            const defaultElement = graphics.getDefaults().getDefaultElement();
            let empty = true;
            const brush = Brushes.custom((tx, ty, r, element) => {

                // process entities
                for (const entity of graphics.entities().getAt(tx, ty)) {
                    if (entity.isActive()) {
                        const [serializedEntity] = entity.extract(defaultElement, x1, y1);
                        entities.push(serializedEntity);
                    }
                }

                // process elements
                if (ElementHead.getTypeClass(element.elementHead) > ElementHead.TYPE_AIR) {
                    let x = tx - Math.min(x1, x2);
                    let y = ty - Math.min(y1, y2);
                    elementArea.setElement(x, y, element);
                    empty = false;
                    return defaultElement;  // remove
                }
                return null;  // ignore
            });

            graphics.drawRectangle(x1, y1, x2, y2, brush, false);

            return (empty) ? null : [elementArea, entities];
        }

        // SECONDARY ACTION

        isSecondaryActionEnabled() {
            return (this.#insertScene !== null);
        }

        applySecondaryAction(x, y, graphics, altModifier) {
            this.#insertScene = null;
        }

        // CURSOR

        hasCursor() {
            return this.#insertScene !== null;
        }

        createCursor() {
            if (this.#insertScene !== null) {
                return this.#insertScene.createCursor();
            } else {
                return null;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-07
     */
    class SelectionFakeTool extends Tool {

        #tools;

        constructor(info, tools) {
            super(info);
            this.#tools = tools;
        }

        getTools() {
            return this.#tools;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-08
     */
    class TemplateSelectionFakeTool extends Tool {

        #templateDefinitions;

        constructor(info, templateDefinitions) {
            super(info);
            this.#templateDefinitions = templateDefinitions;
        }

        getTemplateDefinitions() {
            return this.#templateDefinitions;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-04
     */
    class GlobalActionTool extends Tool {

        /** @type function(SandGame) */
        #handler;

        constructor(info, handler) {
            super(info);
            this.#handler = handler;
        }

        /**
         *
         * @return {function((SandGame))}
         */
        getHandler() {
            return this.#handler;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-23
     */
    class ProcessorContext {

        static OPT_CYCLES_PER_SECOND = 120;
        static OPT_FRAMES_PER_SECOND = 60;


        /**
         * @returns number
         */
        getIteration() {
            throw 'Not implemented';
        }

        /**
         * @returns GameDefaults
         */
        getDefaults() {
            throw 'Not implemented';
        }

        /**
         * @returns {boolean}
         */
        isFallThroughEnabled() {
            throw 'Not implemented';
        }

        /**
         * @returns {boolean}
         */
        isErasingEnabled() {
            throw 'Not implemented';
        }

        trigger(x, y) {
            throw 'Not implemented';
        }

        triggerSolidCreated(elementHead, x, y) {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class GameState {

        /** @type ElementArea */
        elementArea;
        /** @type DeterministicRandom */
        random;
        /** @type ProcessorContext */
        processorContext;
        /** @type EntityManager */
        entityManager;

        constructor(elementArea, random, processorContext, entityManager) {
            this.elementArea = elementArea;
            this.random = random;
            this.processorContext = processorContext;
            this.entityManager = entityManager;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-26
     */
    class InsertEntityTool extends Tool {

        /** @type {function(object, GameState):Entity} */
        #entityFactory;

        /** @type {Entity} */
        #nextEntity;

        constructor(info, entityFactory) {
            super(info);
            this.#entityFactory = entityFactory;

            this.#createEntity();
        }

        #createEntity() {
            const tmpElementArea = ElementArea.create(1, 1, ElementArea.TRANSPARENT_ELEMENT);
            const tmpRandom = DeterministicRandom.DEFAULT;
            const tmpProcessorContext = new ProcessorContext();
            const gameState = new GameState(tmpElementArea, tmpRandom, tmpProcessorContext);
            this.#nextEntity = this.#entityFactory({}, gameState);
        }

        applyPoint(x, y, graphics, aldModifier) {
            const serialized = this.#nextEntity.serialize();
            serialized.x = x;
            serialized.y = y;

            graphics.entities().insertEntity(serialized);

            this.#createEntity();
        }

        hasCursor() {
            return true;
        }

        createCursor() {
            const boundaries = 2;
            const [w, h] = this.#nextEntity.countMaxBoundaries();
            const defaultElement = ElementArea.TRANSPARENT_ELEMENT;
            const tmpElementArea = ElementArea.create(w + 2 * boundaries, h + 2 * boundaries, defaultElement);
            const centerX = Math.trunc(tmpElementArea.getWidth() / 2);
            const centerY = Math.trunc(tmpElementArea.getHeight() / 2);
            this.#nextEntity.paint(centerX, centerY, tmpElementArea, DeterministicRandom.DEFAULT);
            return new CursorDefinitionElementArea(tmpElementArea);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-07
     */
    class Tools {

        static #info(info) {
            if (info instanceof ToolInfo) {
                return info;
            }
            if (info === undefined) {
                return ToolInfo.NOT_DEFINED;
            }
            if (typeof info === 'object') {
                return new ToolInfo(info);
            }
            throw 'Incorrect tool info type: ' + (typeof info);
        }

        /**
         *
         * @param brush
         * @param size
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static roundBrushTool(brush, size, info) {
            return new RoundBrushTool(Tools.#info(info), brush, size);
        }

        /**
         *
         * @param brush
         * @param size
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static roundBrushToolForSolidBody(brush, size, info) {
            return new RoundBrushToolForSolidBody(Tools.#info(info), brush, size);
        }

        /**
         *
         * @param brush
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static pointBrushTool(brush, info) {
            return new PointBrushTool(Tools.#info(info), [{ dx: 0, dy: 0, brush: brush }]);
        }

        /**
         *
         * @param points {{dx: number, dy: number, brush: Brush}[]}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static multiPointBrushTool(points, info) {
            return new PointBrushTool(Tools.#info(info), points);
        }

        /**
         *
         * @param meteor {Brush}
         * @param meteorFromLeft {Brush}
         * @param meteorFromRight {Brush}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static meteorTool(meteor, meteorFromLeft, meteorFromRight, info) {
            return new MeteorTool(Tools.#info(info), meteor, meteorFromLeft, meteorFromRight);
        }

        /**
         *
         * @param scenes
         * @param handler
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static insertScenesTool(scenes, handler, info) {
            if (scenes.length === 1) {
                const scene = scenes[0];
                const elementArea = InsertElementAreaTool.asElementArea(scene);
                const serializedEntitiesOrNull = scene.createEntities();
                const serializedEntities = serializedEntitiesOrNull !== null ? serializedEntitiesOrNull : [];
                return new InsertElementAreaTool(Tools.#info(info), elementArea, serializedEntities, handler);
            } else {
                return new InsertRandomSceneTool(Tools.#info(info), scenes, handler);
            }
        }

        /**
         *
         * @param handler {function(x: number, y: number, graphics: SandGameGraphics, aldModifier: boolean)}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static actionTool(handler, info) {
            return new ActionTool(Tools.#info(info), handler);
        }

        /**
         *
         * @param handler {function(SandGame)}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static globalActionTool(handler, info) {
            return new GlobalActionTool(Tools.#info(info), handler);
        }

        /**
         *
         * @param size {number}
         * @param solidBodyMaxArea {number}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static moveTool(size, solidBodyMaxArea, info) {
            return new MoveTool(Tools.#info(info), size, solidBodyMaxArea);
        }

        /**
         *
         * @param templateDefinitions
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static templateSelectionTool(templateDefinitions, info) {
            return new TemplateSelectionFakeTool(Tools.#info(info), templateDefinitions);
        }

        /**
         *
         * @param tools {Tool[]}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static selectionTool(tools, info) {
            return new SelectionFakeTool(Tools.#info(info), tools);
        }

        /**
         *
         * @param entityFactory {function(serialized:object, gameState:GameState):Entity}
         * @param info {ToolInfo|object|undefined}
         * @return {Tool}
         */
        static insertEntityTool(entityFactory, info) {
            return new InsertEntityTool(Tools.#info(info), entityFactory);
        }

        // ---

        /**
         *
         * @param tools {Tool[]}
         * @param categoryDefinitions {Object<string, {displayName: string, badgeStyle: object}>}
         * @returns {Tool[]}
         */
        static grouping(tools, categoryDefinitions) {
            const groups = [];
            const selections = {};
            for (const tool of tools) {
                const category = tool.getInfo().getCategory();
                if (category !== undefined && categoryDefinitions[category] !== undefined) {
                    let selection = selections[category];
                    if (selection === undefined) {
                        selection = [];
                        selections[category] = selection;
                        groups.push(selection);
                    }
                    selection.push(tool);
                } else {
                    groups.push(tool);
                }
            }

            const groupedTools = [];
            for (const group of groups) {
                if (Array.isArray(group)) {
                    const category = group[0].getInfo().getCategory();
                    const categoryDefinition = categoryDefinitions[category];
                    groupedTools.push(Tools.selectionTool(group, Tools.#info({
                        ...categoryDefinition,
                        codeName: 'category_' + category,
                    })));
                } else {
                    groupedTools.push(group);
                }
            }
            return groupedTools;
        }

    }

    var _ASSET_TREE_TRUNK_TEMPLATES = [{entriesCount:310,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[0,15,1],[0,16,1],[0,17,1],[-1,17,1],[0,18,1],[1,18,1],[2,18,1],[3,19,1],[4,20,1],[5,21,2],[0,19,1],[0,20,1],[0,21,1],[0,22,1],[0,23,1],[-1,23,1],[-2,23,1],[-3,24,1],[-4,25,1],[-5,25,1],[-6,25,1],[-7,25,2],[0,24,1],[1,25,1],[1,26,1],[1,27,1],[2,28,1],[3,29,1],[4,30,1],[5,30,2],[0,28,1],[0,29,1],[-1,30,1,[[-2,31,1],[-3,31,1],[-4,31,2],[-2,32,1],[-1,33,1],[-1,34,1],[0,35,1],[0,36,2]]],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1],[1,7,1],[1,8,1],[1,9,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[2,19,1],[1,19,1],[1,20,1],[1,21,1],[1,22,1],[1,23,1],[1,24,1],[2,25,1],[2,26,1],[2,27,1],[1,28,1],[1,29,1],[1,30,1],[1,31,1],[2,32,1],[2,33,1],[2,34,1],[3,34,1],[3,35,1],[4,35,1],[5,35,1],[6,36,1,[[7,36,1],[8,37,1],[8,38,2],[9,38,1],[10,39,1],[11,39,1],[12,40,1],[13,40,1],[14,40,1],[15,40,1],[16,40,2]]],[3,36,1],[3,37,1],[4,38,1],[5,39,1,[[6,40,1],[6,41,1],[6,42,1],[7,43,1],[8,44,2]]],[2,38,1,[[1,39,1],[0,39,1],[-1,40,1],[-2,40,1],[-2,41,2],[-3,41,1],[-4,41,1],[-5,42,1],[-6,42,1],[-7,43,1],[-8,43,1],[-9,43,2]]],[3,20,1],[4,21,1],[5,21,2],[5,22,1],[6,23,1],[7,24,1],[8,25,1],[8,26,2],[9,26,1,[]],[-1,-1,4],[-1,0,1],[-1,1,1],[-1,2,1],[-1,3,1],[-1,4,1],[-1,5,1],[-1,6,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[-1,11,1],[-1,12,1],[-1,13,1],[-1,14,1],[-1,15,1],[-1,16,1],[-1,24,1],[-2,25,1],[-3,26,1],[-4,27,1],[-5,27,1],[-6,28,1],[-7,29,1],[-8,30,1],[-9,31,1],[-10,31,1,[[-9,32,1],[-9,33,1],[-9,34,1],[-9,35,1],[-8,36,1],[-7,36,1],[-6,36,1],[-5,37,2],[-8,37,1],[-7,38,1],[-7,39,1],[-6,40,1],[-6,41,1],[-9,38,1],[-10,38,2]]],[9,27,1],[10,28,1],[11,29,1],[12,30,1],[13,31,1],[13,32,1],[14,33,2],[10,30,1],[10,31,1],[9,32,1],[8,33,2],[12,41,1],[12,42,1],[13,43,1],[13,44,1],[13,45,1],[14,46,2],[-6,43,1],[-5,44,1],[-4,44,1],[-3,45,1],[-2,46,1],[-1,46,1],[0,47,1],[1,48,1],[2,48,1],[3,48,2],[-3,47,2],[-2,-1,4],[-2,0,1],[-2,1,1],[-2,2,1],[-2,3,1],[-2,4,1],[-2,5,1],[-2,6,1],[-2,7,1],[-2,8,1],[-2,9,1],[-2,10,1],[-2,11,1],[-2,12,1],[-2,13,1],[-2,14,1],[-2,15,1],[-2,16,1],[-2,17,1],[-1,18,1],[-1,19,1],[-1,20,1],[-1,21,1],[-1,22,1],[-2,24,1],[-3,25,1],[-4,26,1],[-5,26,1],[-6,27,1],[-7,28,1],[-8,29,1],[-9,30,1],[-10,30,2],[-10,31,1,[[-11,32,1],[-12,32,1],[-13,33,1],[-14,34,1],[-15,35,1],[-16,35,1],[-17,35,2],[-14,36,1],[-14,37,1],[-14,38,1],[-14,39,1],[-15,40,1],[-15,41,1],[-16,41,2],[-15,42,1],[-15,43,1,[[-16,44,1],[-16,45,1],[-15,45,1],[-14,46,1],[-13,46,1],[-12,47,1],[-12,48,2],[-11,48,1],[-10,49,1],[-9,49,1],[-8,50,1],[-7,51,1],[-6,52,2],[-16,46,1],[-16,47,1],[-17,48,1],[-17,49,1],[-18,50,2]]]]],[4,39,1],[4,40,1],[4,41,1],[4,42,1],[3,42,1],[4,43,1],[5,44,1],[5,45,1],[5,46,1],[6,47,1],[7,48,1],[8,49,1],[8,50,2],[5,48,1,[[4,49,1],[3,50,1],[2,51,1],[1,52,1],[1,53,1],[0,53,2],[0,54,1],[0,55,1],[0,56,1],[1,57,1],[2,57,1],[3,57,1],[4,58,2],[-1,57,1],[-2,57,1],[-3,58,1],[-4,59,2]]],[2,43,2]]},{entriesCount:319,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[0,15,1],[0,16,1],[0,17,1],[0,18,1],[-1,18,1],[-2,18,1],[-3,19,1],[-4,20,1],[-5,21,2],[0,19,1],[0,20,1],[0,21,1],[0,22,1],[0,23,1],[1,23,1],[2,23,1],[3,24,1],[4,25,1],[5,25,1],[6,25,1],[7,25,2],[0,24,1],[-1,25,1],[-1,26,1],[-1,27,1],[0,28,1],[0,29,1],[1,30,1,[[2,31,1],[3,31,1],[4,31,2],[2,32,1],[1,33,1],[1,34,1],[0,35,1],[0,36,2]]],[-2,28,1],[-3,29,1],[-4,30,1],[-5,30,2],[-1,-1,4],[-1,0,1],[-1,1,1],[-1,2,1],[-1,3,1],[-1,4,1],[-1,5,1],[-1,6,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[-1,11,1],[-1,12,1],[-1,13,1],[-1,14,1],[-1,15,1],[-1,16,1],[-1,17,1],[-1,19,1],[-2,19,1],[-1,20,1],[-1,21,1],[-1,22,1],[-1,23,1],[-1,24,1],[-2,25,1],[-2,26,1],[-2,27,1],[-1,28,1],[-1,29,1],[-1,30,1],[-1,31,1],[-2,32,1],[-2,33,1],[-2,34,1],[-3,34,1],[-3,35,1],[-4,35,1],[-5,35,1],[-6,36,1,[[-7,36,1],[-8,37,1],[-9,38,1],[-9,39,2],[-10,39,1],[-11,39,1],[-12,40,1],[-13,40,1],[-14,40,1],[-15,40,1],[-16,40,2]]],[-3,36,1],[-3,37,1],[-2,38,1,[[-1,39,1],[0,39,1],[1,40,1],[2,40,1],[3,41,1],[4,41,1],[5,42,1],[6,42,1],[7,43,1],[8,43,1],[9,44,2],[3,42,2],[-2,40,2]]],[-4,38,1],[-5,39,1,[[-6,40,1],[-6,41,1],[-6,42,1],[-7,43,1],[-7,44,2]]],[-3,20,1],[-4,21,1],[-5,21,2],[-5,22,1],[-6,23,1],[-7,24,1],[-8,25,1],[-8,26,2],[-9,26,1,[]],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1],[1,7,1],[1,8,1],[1,9,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[1,18,1],[1,19,1],[1,24,1],[2,25,1],[3,26,1],[4,27,1],[5,27,1],[6,28,1],[7,29,1],[8,30,1],[9,31,1],[9,32,1],[9,33,1],[9,34,1],[8,34,2],[9,35,1],[8,36,1],[7,36,1],[6,36,1],[5,37,2],[8,37,1],[9,38,1],[7,38,1],[7,39,1],[6,40,1],[6,41,1],[-9,27,1],[-10,28,1],[-11,29,1],[-12,30,1],[-13,31,1],[-13,32,1],[-14,33,2],[-12,41,1],[-12,42,1],[-13,43,1],[-13,44,1],[-13,45,1],[-14,46,2],[6,43,1],[5,44,1],[4,44,1],[3,45,1],[2,45,1],[1,45,1],[0,45,2],[1,46,1],[0,47,1],[-1,48,1],[-2,48,1],[-3,48,2],[4,46,1],[5,47,2],[2,-1,4],[2,0,1],[2,1,1],[2,2,1],[2,3,1],[2,4,1],[2,5,1],[2,6,1],[2,7,1],[2,8,1],[2,9,1],[2,10,1],[2,11,1],[2,12,1],[2,13,1],[2,14,1],[2,15,1],[2,16,1],[2,17,1],[2,18,1],[2,19,1],[2,20,1],[1,20,1],[1,21,1],[1,22,1],[2,24,1],[3,25,1],[4,26,1],[5,26,1],[6,27,1],[7,28,1],[8,29,1],[9,30,1],[10,30,2],[10,31,1],[11,32,1],[12,33,1],[13,34,1],[14,35,1],[15,35,1],[16,35,2],[14,36,1],[14,37,1],[14,38,1],[14,39,1],[15,40,1],[15,41,1],[16,41,2],[8,38,1],[9,39,1],[10,40,1],[11,40,1],[12,41,1],[12,42,1],[13,43,1],[14,44,1],[15,45,1],[16,46,1],[16,47,1],[17,48,1],[17,49,1],[18,50,2],[14,46,1],[13,46,1],[12,47,1],[12,48,2],[11,48,1],[10,49,1],[9,49,1],[8,50,1],[7,51,1],[6,52,2],[-4,39,1],[-5,39,1,[[-4,40,1],[-4,41,1],[-4,42,1],[-4,43,1],[-5,44,1],[-5,45,1],[-5,46,1],[-6,47,1],[-6,48,1],[-6,49,1],[-6,50,1],[-7,50,2],[-6,51,1],[-7,52,1],[-8,52,1],[-9,53,1],[-9,54,1],[-10,55,2]]],[-2,49,1],[-2,50,1],[-2,51,1],[-2,52,1],[-1,53,1],[-1,54,1],[0,54,2],[-1,55,1],[0,56,1],[1,56,1],[2,57,1],[3,58,2],[-2,56,1],[-3,56,1],[-4,56,1],[-5,57,2]]},{entriesCount:269,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[0,15,1],[0,16,1],[0,17,1],[0,18,1],[0,19,1],[0,20,1,[[-1,20,1],[0,21,1],[1,21,1],[2,22,1],[2,23,1],[3,24,1],[3,25,1],[2,25,2],[4,26,1],[5,27,1],[6,28,1],[7,28,1],[8,29,1],[9,30,1],[10,31,1],[11,32,2],[3,27,1],[3,28,1],[3,29,1],[2,30,1],[1,31,1],[0,31,2],[0,22,1],[0,23,1],[-1,24,1],[-2,25,1],[-2,26,1],[-3,27,1],[-4,28,1],[-5,29,1],[-6,29,2],[-5,30,1],[-6,31,1],[-7,31,1],[-8,31,1],[-9,32,1],[-10,32,1],[-11,33,2],[-2,21,1],[-3,22,1],[-4,23,1],[-5,23,2]]],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1],[1,7,1],[1,8,1],[1,9,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[1,18,1],[1,19,1],[1,20,1],[0,20,1,[[-1,21,1],[-1,22,1],[-1,23,1]]],[-1,25,1],[-1,26,1],[-1,27,1],[-2,27,1],[-3,28,1],[-4,29,1],[0,28,1,[[1,29,1],[1,30,1],[2,31,1],[3,32,1],[3,33,1],[3,34,1],[4,35,1],[4,36,1],[4,37,1],[3,37,2],[0,31,2]]],[-5,31,1],[-5,32,1],[-5,33,1],[-6,34,1,[[-7,35,1],[-8,36,1],[-8,37,2],[-9,37,1],[-10,38,1],[-10,39,1],[-11,40,1],[-12,41,1],[-11,42,2]]],[-1,-1,4],[-1,0,1],[-1,1,1],[-1,2,1],[-1,3,1],[-1,4,1],[-1,5,1],[-1,6,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[-1,11,1],[-1,12,1],[-1,13,1],[-1,14,1],[-1,15,1],[-1,16,1],[-1,17,1],[-1,18,1],[-1,19,1],[0,20,1,[]],[2,21,1],[3,22,1],[3,23,1],[4,24,1],[4,25,1],[5,26,1],[6,27,1],[6,29,1],[6,30,1],[7,31,1],[7,32,1],[7,33,1],[8,34,1],[8,35,1],[8,36,1],[8,37,1],[9,37,2],[8,38,1],[8,39,1],[9,40,1],[9,41,1],[9,42,1],[10,43,2],[-4,34,1],[-4,35,1],[-4,36,1],[-4,37,1],[-3,38,1],[-2,38,2],[-3,39,1],[-3,40,1],[-3,41,1],[-3,42,1],[-2,42,1],[-1,42,1],[0,43,1],[1,43,1],[2,43,1],[3,44,2],[-3,43,1],[-4,44,2],[2,-1,4],[2,0,1],[2,1,1],[2,2,1],[2,3,1],[2,4,1],[-2,5,1],[-2,6,1],[-2,7,1],[-2,8,1],[-2,9,1],[-2,10,1],[-2,11,1],[-2,12,1],[2,13,1],[2,14,1],[2,15,1],[2,16,1],[2,17,1],[2,18,1],[2,19,1],[2,20,1],[-5,27,1],[-6,27,1],[-7,28,1],[-8,28,1],[-9,29,1],[-10,29,1],[-11,29,1],[-12,29,1],[-13,29,1],[-14,29,2],[-14,30,1],[-15,31,1],[-15,32,1],[-16,33,1],[-16,34,1],[-17,35,1],[-17,36,1],[-18,37,2],[-6,29,2],[9,34,1],[10,35,1],[11,35,1],[12,36,1],[13,37,1],[14,37,1],[15,38,1],[16,38,1],[17,38,2],[-5,38,1],[-6,39,1],[-6,40,1],[-7,41,1],[-7,42,1],[-8,43,1],[-8,44,1],[-9,45,1],[-9,46,1],[-8,47,2],[-10,47,1],[-10,48,1],[-11,49,1],[-11,50,1],[-12,51,2],[7,39,1],[7,40,1],[6,41,1],[6,42,1],[6,43,1],[6,44,1],[5,45,1],[5,46,1],[5,47,1],[4,47,1],[5,48,1],[5,49,1],[4,50,1],[3,51,2],[3,48,1],[2,48,1],[1,48,1],[0,48,1],[-1,49,1],[-2,49,1],[-3,49,2]]},{entriesCount:268,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[0,15,1],[0,16,1],[0,17,1],[0,18,1],[0,19,1],[0,20,1,[[1,20,1],[2,21,1],[3,22,1],[4,23,1],[5,23,2],[0,21,1],[-1,21,1],[0,22,1],[0,23,1],[1,24,1],[2,25,1],[2,26,1],[3,27,1],[4,28,1],[5,29,1],[6,29,2],[5,30,1],[6,31,1],[7,31,1],[8,31,1],[9,32,1],[10,32,1],[11,33,2],[-2,22,1],[-2,23,1],[-3,24,1],[-3,25,1],[-2,25,2],[-4,26,1],[-3,27,1],[-3,28,1],[-3,29,1],[-2,30,1],[-1,31,1],[0,31,2],[-5,27,1],[-6,28,1],[-7,28,1],[-8,29,1],[-9,30,1],[-10,31,1],[-11,31,1],[-12,31,1],[-13,31,2]]],[-1,-1,4],[-1,0,1],[-1,1,1],[-1,2,1],[-1,3,1],[-1,4,1],[-1,5,1],[-1,6,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[-1,11,1],[-1,12,1],[-1,13,1],[-1,14,1],[-1,15,1],[-1,16,1],[-1,17,1],[-1,18,1],[-1,19,1],[-1,20,1],[0,20,1,[[1,21,1],[1,22,1],[1,23,1]]],[1,25,1],[1,26,1],[2,27,1],[3,28,1],[4,29,1],[4,30,1],[5,31,1],[5,32,1],[5,33,1],[6,34,1,[[7,35,1],[8,36,1],[8,37,2],[9,37,1],[10,38,1],[10,39,1],[11,40,1],[12,41,2]]],[-4,27,1],[-4,28,1],[-4,29,1],[-4,30,1],[-4,31,1],[-3,32,1],[-3,33,1],[-3,34,1],[-3,35,1],[-3,36,1],[-3,37,2],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1],[1,7,1],[1,8,1],[1,9,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[1,18,1],[1,19,1],[0,20,1,[]],[-2,21,1],[-3,22,1],[-3,23,1],[-4,24,1],[-4,25,1],[-5,26,1],[-6,27,1],[-6,29,1],[-6,30,1],[-7,31,1],[-7,32,1],[-7,33,1],[-8,34,1],[-8,35,1],[-8,36,1],[-8,37,1],[-9,37,2],[-8,38,1],[-8,39,1],[-9,40,1],[-9,41,1],[-9,42,1],[-10,43,2],[4,34,1],[4,35,1],[4,36,1],[4,37,1],[3,38,1],[2,38,2],[3,39,1],[3,40,1],[3,41,1],[3,42,1],[2,42,1],[1,42,1],[0,43,1],[-1,43,1],[-2,43,1],[-3,44,2],[3,43,1],[4,44,2],[-2,-1,4],[-2,0,1],[-2,1,1],[-2,2,1],[-2,3,1],[-2,4,1],[-2,5,1],[-2,6,1],[-2,7,1],[-2,8,1],[-2,9,1],[-2,10,1],[-2,11,1],[-2,12,1],[-2,13,1],[-2,14,1],[-2,15,1],[-2,16,1],[-2,17,1],[-2,18,1],[-2,19,1],[-2,20,1],[6,25,1],[5,25,1],[4,25,1],[3,25,1],[7,26,1],[8,26,1],[9,27,1],[10,27,1],[11,27,2],[11,28,1],[12,28,1],[13,29,1],[14,30,1],[15,31,1],[16,31,2],[15,32,1],[16,33,1],[16,34,1],[17,35,1],[17,36,1],[17,37,2],[-9,34,1],[-10,35,1],[-11,35,1],[-12,36,1],[-13,37,1],[-14,37,1],[-15,38,1],[-16,39,2],[5,38,1],[6,39,1],[6,40,1],[7,41,1],[7,42,1],[8,43,1],[8,44,1],[9,45,1],[9,46,1],[10,47,1],[10,48,1],[11,49,1],[11,50,1],[12,51,2],[8,47,2],[-7,39,1],[-7,40,1],[-6,41,1],[-6,42,1],[-6,43,1],[-6,44,1],[-5,45,1],[-5,46,1],[-5,47,1],[-5,48,1],[-4,49,1],[-3,49,1],[-2,49,1],[-1,49,1],[0,49,1],[1,49,1],[2,49,2],[-4,50,1],[-5,51,2]]},{entriesCount:169,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[0,15,1],[0,16,1],[0,17,1],[0,18,1],[0,19,1],[0,20,1,[[-1,20,1],[0,21,1],[1,21,1],[2,22,1],[2,23,1],[3,24,1],[3,25,1],[3,26,1],[4,27,1],[4,28,1],[4,29,2],[0,22,1],[0,23,1],[0,24,2],[-2,21,1],[-3,22,1],[-4,23,1],[-4,24,1],[-5,25,1],[-6,26,2]]],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1],[1,7,1],[1,8,1],[1,9,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[1,18,1],[1,19,1],[1,20,1],[0,20,1,[[-1,21,1],[-1,22,1],[-1,23,1],[-1,24,1],[0,24,2],[-2,25,1],[-2,26,1],[-2,27,1],[-2,28,1],[-3,29,1],[-4,30,1],[-5,30,1],[-4,31,1],[-4,32,1],[-3,33,1],[-2,34,1],[-2,35,1],[-1,36,1],[0,36,1],[1,36,2],[-5,33,2],[-6,31,1],[-7,31,1],[-8,31,1],[-9,31,1],[-10,31,2]]],[-1,-1,4],[-1,0,1],[-1,1,1],[-1,2,1],[-1,3,1],[-1,4,1],[-1,5,1],[-1,6,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[-1,11,1],[-1,12,1],[-1,13,1],[-1,14,1],[-1,15,1],[-1,16,1],[-1,17,1],[-1,18,1],[-1,19,1],[0,20,1,[]],[-5,24,1],[-6,24,1],[-7,24,1],[-8,24,1],[-9,24,1],[-10,24,1],[-11,24,2],[6,25,1],[5,25,1],[4,25,1],[7,26,1],[8,26,1],[9,26,2],[-1,25,1],[-1,26,1],[-1,27,1],[-1,28,1],[0,28,1],[1,29,1],[2,30,1],[3,31,1],[4,32,1],[5,32,1],[6,33,1],[7,33,1],[8,34,1],[9,34,2],[5,34,1],[5,35,1],[5,36,1],[5,37,1],[5,38,1],[6,39,2],[-1,29,1],[-1,30,1],[-1,31,1],[-1,32,1],[-1,33,1],[-1,34,1],[-1,35,1],[-3,35,1],[-4,36,1],[-5,37,1],[-6,38,1],[-7,39,2],[-1,37,1],[-1,38,1],[-1,39,1],[-1,40,1],[-2,40,1],[-1,41,1],[-1,42,2],[-3,41,1],[-4,42,1],[-5,42,1],[-6,43,1],[-7,43,2]]},{entriesCount:73,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[-1,14,1,[[-2,14,1],[-3,14,1],[-4,15,1],[-5,16,2],[0,15,1],[0,16,1],[0,17,1],[0,18,1],[1,18,1,[[2,18,1],[3,19,1],[4,20,1],[5,20,2],[0,19,1],[-1,20,1],[-1,21,1],[-1,22,1],[0,23,1],[0,24,1],[1,25,1],[2,26,1],[3,26,1],[4,26,2],[-1,25,1],[-1,26,1],[-1,27,1],[-1,28,1],[0,29,1],[0,30,1],[0,31,2],[-2,23,1],[-3,24,1],[-4,25,1],[-5,25,2]]]]],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[1,5,1],[1,6,1],[1,7,1],[1,8,1],[1,9,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[1,18,1,[]],[0,20,1],[0,21,1],[0,22,1]]},{entriesCount:60,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[0,8,1],[0,9,1],[0,10,1],[0,11,1],[0,12,1],[0,13,1],[0,14,1],[0,15,1],[-1,15,1],[0,16,1],[0,17,1],[1,18,1],[2,19,1],[3,20,1],[4,20,2],[1,20,1],[0,21,1],[0,22,1],[-1,22,1],[-2,23,1],[-3,24,2],[1,23,1],[2,24,1],[2,25,1],[3,26,2],[-2,16,1],[-3,17,1],[-3,18,1],[-3,19,2],[1,-1,4],[1,0,1],[1,1,1],[1,2,1],[1,3,1],[1,4,1],[-1,4,1],[-1,5,1],[-1,6,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[1,10,1],[1,11,1],[1,12,1],[1,13,1],[1,14,1],[1,15,1],[1,16,1],[1,17,1],[0,18,1],[1,19,1]]},{entriesCount:55,entries:[[0,-1,4],[0,1,1],[0,2,1],[0,3,1],[0,4,1],[0,5,1],[0,6,1],[0,7,1],[-1,7,1],[-1,8,1],[-1,9,1],[-1,10,1],[-1,11,1],[-1,12,1],[-1,13,1],[-1,14,1],[-1,15,1],[0,15,1,[[1,16,1],[2,17,1],[3,18,2],[-1,16,1],[-1,17,1],[-1,18,1],[-1,19,1],[-1,20,1],[-1,21,1],[-1,22,1],[0,23,1],[1,24,1],[2,25,2],[-2,23,1],[-3,24,1],[-4,25,2]]],[-2,15,1,[[-3,16,1],[-4,17,1],[-5,18,2]]],[-1,-1,4],[-1,0,1],[-1,1,1],[-1,2,1],[-1,3,1],[-1,4,1],[-1,5,1],[-1,6,1],[-2,7,1],[-2,8,1],[-2,9,1],[-2,10,1],[-2,11,1],[-2,12,1],[-2,13,1],[-2,14,1],[-2,15,1,[]]]}];

    var _ASSET_TREE_CELL_TEMPLATES = [{entriesCount:49,entries:[[1,0,3,[[2,0,3],[1,-1,3],[2,-1,3],[3,0,3],[2,1,3],[3,-1,3],[3,1,3],[4,0,3],[3,-2,3],[3,2,3],[4,1,3],[4,-2,3]]],[-1,0,3,[[-2,0,3],[-3,0,3],[-2,1,3],[-2,-1,3],[-3,1,3],[-3,-1,3],[-4,0,3],[-2,2,3],[-3,2,3],[-2,3,3]]],[0,-1,3,[[-1,-1,3],[0,-2,3],[-1,-2,3],[0,-3,3],[1,-2,3],[-2,-2,3],[-1,-3,3],[1,-3,3],[2,-2,3],[2,-3,3],[3,-3,3]]],[0,1,3,[[1,1,3],[-1,1,3],[0,2,3],[1,2,3],[-1,2,3],[0,3,3],[2,2,3],[1,3,3],[2,3,3],[1,4,3],[3,3,3],[2,4,3]]]]},{entriesCount:55,entries:[[0,-1,3,[[0,-2,3],[-1,-1,3],[0,-3,3],[-1,-2,3],[1,-2,3],[-1,-3,3],[1,-3,3],[-2,-2,3],[2,-2,3]]],[-1,0,3,[[-2,0,3],[-2,-1,3],[-3,0,3],[-3,-1,3],[-4,0,3],[-3,1,3],[-4,-1,3],[-3,-2,3],[-4,1,3],[-3,2,3],[-4,-2,3]]],[1,0,3,[[1,-1,3],[1,1,3],[2,0,3],[2,-1,3],[2,1,3],[3,0,3],[3,-1,3],[3,1,3],[4,0,3],[4,-1,3],[3,-2,3],[4,1,3],[5,0,3],[5,-1,3],[4,-2,3]]],[0,1,3,[[0,2,3],[-1,1,3],[1,2,3],[-1,2,3],[0,3,3],[-2,1,3],[2,2,3],[1,3,3],[-2,2,3],[-1,3,3],[0,4,3],[2,3,3],[3,2,3],[1,4,3],[-1,4,3],[0,5,3]]]]},{entriesCount:82,entries:[[-1,0,3,[[-2,0,3],[-2,1,3],[-3,0,3],[-3,1,3],[-4,0,3],[-3,-1,3],[-4,1,3],[-4,-1,3],[-5,0,3],[-5,1,3],[-4,2,3],[-5,-1,3],[-4,-2,3],[-6,0,3],[-5,2,3],[-6,1,3],[-4,3,3],[-5,3,3]]],[0,1,3,[[0,2,3],[-1,1,3],[1,1,3],[-1,2,3],[1,2,3],[0,3,3],[-2,2,3],[-1,3,3],[1,3,3],[2,2,3],[0,4,3],[-2,3,3],[-1,4,3],[1,4,3],[2,3,3],[0,5,3],[3,3,3],[0,6,3],[3,4,3]]],[0,-1,3,[[1,-1,3],[0,-2,3],[-1,-1,3],[1,-2,3],[-1,-2,3],[0,-3,3],[-2,-1,3],[2,-2,3],[1,-3,3],[-1,-3,3],[-2,-2,3],[0,-4,3],[2,-3,3],[-1,-4,3],[-3,-2,3],[3,-3,3],[4,-3,3]]],[1,0,3,[[2,0,3],[3,0,3],[2,1,3],[2,-1,3],[3,1,3],[3,-1,3],[4,0,3],[4,1,3],[3,2,3],[4,-1,3],[3,-2,3],[5,0,3],[4,2,3],[5,1,3],[5,-1,3],[4,-2,3],[6,0,3],[4,3,3],[6,-1,3],[7,0,3],[4,4,3],[7,-1,3],[5,4,3],[4,5,3]]]]},{entriesCount:63,entries:[[1,0,3,[[2,0,3],[2,1,3],[2,-1,3],[3,0,3],[3,1,3],[3,-1,3],[4,0,3],[4,1,3],[4,-1,3],[3,-2,3],[5,0,3],[5,1,3],[5,-1,3],[6,0,3]]],[0,-1,3,[[-1,-1,3],[0,-2,3],[1,-1,3],[-2,-1,3],[-1,-2,3],[0,-3,3],[1,-2,3],[-2,-2,3],[-1,-3,3],[1,-3,3],[2,-2,3],[-3,-2,3],[2,-3,3]]],[0,1,3,[[1,1,3],[-1,1,3],[0,2,3],[1,2,3],[-1,2,3],[0,3,3],[2,2,3],[1,3,3],[-1,3,3],[-2,2,3],[3,2,3],[-2,3,3],[-1,4,3],[-3,2,3],[-3,3,3],[-2,4,3],[-4,2,3],[-4,3,3]]],[-1,0,3,[[-2,0,3],[-2,1,3],[-3,0,3],[-3,1,3],[-3,-1,3],[-4,0,3],[-4,1,3],[-4,-1,3],[-5,0,3],[-5,1,3],[-5,-1,3],[-6,0,3],[-6,1,3],[-5,2,3]]]]},{entriesCount:48,entries:[[-1,0,3,[[-1,-1,3],[-2,0,3],[-2,-1,3],[-3,0,3],[-3,-1,3],[-4,0,3],[-3,1,3],[-4,-1,3],[-3,-2,3],[-4,1,3],[-3,-3,3]]],[0,-1,3,[[1,-1,3],[0,-2,3],[1,-2,3],[0,-3,3],[-1,-2,3],[2,-2,3],[0,-4,3],[-1,-3,3],[-2,-2,3],[2,-3,3],[-1,-4,3],[-2,-3,3]]],[0,1,3,[[0,2,3],[-1,1,3],[1,2,3],[0,3,3],[-1,2,3],[-2,1,3],[-1,3,3],[-2,2,3],[-3,2,3]]],[1,0,3,[[1,1,3],[2,0,3],[2,1,3],[3,0,3],[2,-1,3],[3,1,3],[2,2,3],[4,0,3],[3,-1,3],[4,1,3],[3,2,3],[5,1,3]]]]},{entriesCount:57,entries:[[0,1,3,[[1,1,3],[0,2,3],[1,2,3],[-1,2,3],[0,3,3],[1,3,3],[2,2,3],[-1,3,3],[0,4,3],[2,3,3],[1,4,3],[-1,4,3],[-2,3,3],[0,5,3],[3,3,3],[2,4,3],[-1,5,3],[3,4,3]]],[-1,0,3,[[-2,0,3],[-1,-1,3],[-1,1,3],[-2,1,3],[-3,0,3],[-2,-1,3],[-2,2,3],[-3,1,3],[-3,-1,3],[-2,-2,3]]],[0,-1,3,[[0,-2,3],[-1,-2,3],[0,-3,3],[1,-2,3],[-1,-3,3],[1,-3,3],[0,-4,3],[-1,-4,3],[-2,-3,3],[2,-3,3],[1,-4,3],[0,-5,3],[-2,-4,3],[-1,-5,3],[3,-3,3],[2,-4,3],[1,-5,3],[3,-4,3]]],[1,0,3,[[1,-1,3],[2,0,3],[2,-1,3],[3,0,3],[2,1,3],[2,-2,3],[3,1,3]]]]},{entriesCount:86,entries:[[0,1,3,[[0,2,3],[-1,1,3],[0,3,3],[1,2,3],[-1,2,3],[1,3,3],[-1,3,3],[2,2,3],[-2,2,3],[2,3,3],[-2,3,3],[-3,2,3]]],[1,0,3,[[1,1,3],[2,0,3],[2,1,3],[3,0,3],[3,1,3],[3,-1,3],[4,0,3],[4,1,3],[3,2,3],[4,-1,3],[5,0,3],[4,2,3],[4,-2,3],[5,-1,3],[5,-2,3],[4,-3,3],[6,-1,3],[5,-3,3],[6,-2,3],[4,-4,3],[7,-1,3],[6,-3,3],[5,-4,3],[7,-2,3],[4,-5,3],[5,-5,3]]],[-1,0,3,[[-2,0,3],[-1,-1,3],[-3,0,3],[-2,1,3],[-2,-1,3],[-4,0,3],[-3,-1,3],[-3,1,3],[-2,-2,3],[-4,1,3],[-4,-1,3],[-3,-2,3],[-4,-2,3],[-3,-3,3],[-4,-3,3],[-5,-2,3],[-4,-4,3],[-5,-3,3],[-5,-4,3],[-6,-3,3],[-6,-4,3]]],[0,-1,3,[[1,-1,3],[0,-2,3],[1,-2,3],[2,-1,3],[-1,-2,3],[0,-3,3],[1,-3,3],[2,-2,3],[-1,-3,3],[1,-4,3],[2,-3,3],[3,-2,3],[-1,-4,3],[-2,-3,3],[2,-4,3],[3,-3,3],[-2,-4,3],[-1,-5,3],[2,-5,3],[-2,-5,3],[-3,-4,3],[-3,-5,3],[-2,-6,3]]]]},{entriesCount:41,entries:[[1,0,3,[[2,0,3],[1,1,3],[3,0,3],[2,1,3],[2,-1,3],[3,1,3],[3,-1,3],[4,0,3],[2,2,3],[4,1,3],[3,-2,3],[4,-2,3]]],[-1,0,3,[[-2,0,3],[-3,0,3],[-2,1,3],[-3,1,3],[-4,1,3],[-4,2,3]]],[0,1,3,[[0,2,3],[-1,1,3],[-1,2,3],[-1,3,3],[-2,2,3],[-2,3,3],[-3,2,3],[-2,4,3],[-3,3,3],[-3,4,3]]],[0,-1,3,[[0,-2,3],[1,-1,3],[-1,-1,3],[-1,-2,3],[1,-2,3],[2,-2,3],[2,-3,3],[3,-3,3],[3,-4,3]]]]},{entriesCount:47,entries:[[0,1,3,[[0,2,3],[1,1,3],[1,2,3],[-1,2,3],[1,3,3],[2,2,3],[-2,2,3]]],[-1,0,3,[[-1,-1,3],[-1,1,3],[-2,0,3],[-2,-1,3],[-2,1,3],[-3,0,3],[-3,-1,3],[-3,1,3],[-4,0,3],[-4,-1,3],[-4,1,3],[-5,0,3],[-5,1,3]]],[0,-1,3,[[1,-1,3],[0,-2,3],[1,-2,3],[-1,-2,3],[0,-3,3],[1,-3,3],[2,-2,3],[2,-3,3],[3,-2,3],[2,-4,3],[3,-3,3],[4,-2,3],[3,-4,3]]],[1,0,3,[[2,0,3],[2,1,3],[2,-1,3],[3,0,3],[3,1,3],[3,-1,3],[4,0,3],[4,-1,3],[5,0,3],[5,-1,3]]]]}];

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-18
     */
    class StructureDefs {

        /** @type {[]} */
        static TREE_TRUNK_TEMPLATES = _ASSET_TREE_TRUNK_TEMPLATES;

        /** @type {[]} */
        static TREE_CLUSTER_TEMPLATES = _ASSET_TREE_CELL_TEMPLATES;
    }

    var _ASSET_PALETTE_SAND = "214,212,154\r\n214,212,154\r\n214,212,154\r\n214,212,154\r\n225,217,171\r\n225,217,171\r\n225,217,171\r\n225,217,171\r\n203,201,142\r\n203,201,142\r\n203,201,142\r\n203,201,142\r\n195,194,134\r\n195,194,134\r\n218,211,165\r\n218,211,165\r\n223,232,201\r\n186,183,128";

    var _ASSET_PALETTE_SOIL = "142,104,72\r\n142,104,72\r\n142,104,72\r\n142,104,72\r\n142,104,72\r\n142,104,72\r\n114,81,58\r\n114,81,58\r\n114,81,58\r\n114,81,58\r\n114,81,58\r\n114,81,58\r\n82,64,30\r\n82,64,30\r\n82,64,30\r\n177,133,87\r\n177,133,87\r\n177,133,87\r\n102,102,102";

    var _ASSET_PALETTE_GRAVEL = "97,94,88\r\n111,110,106\r\n117,116,112\r\n117,117,113\r\n120,118,115\r\n104,102,97\r\n113,112,107\r\n129,128,125\r\n124,124,121\r\n81,80,75\r\n80,76,69\r\n123,119,111\r\n105,104,99\r\n84,82,78\r\n77,74,69\r\n91,88,82\r\n68,65,60\r\n79,75,69\r\n85,82,77\r\n98,94,88\r\n105,102,96\r\n104,97,86\r\n60,55,47\r\n93,89,81";

    var _ASSET_PALETTE_THERMITE = "137,86,89\r\n137,86,89\r\n137,86,89\r\n137,86,89\r\n137,86,89\r\n137,86,89\r\n125,70,72\r\n125,70,72\r\n147,93,96\r\n147,93,96\r\n138,84,86\r\n138,84,86\r\n118,72,75\r\n118,72,75\r\n101,61,65\r\n151,104,106";

    var _ASSET_PALETTE_COAL = "31,31,31\r\n46,44,41\r\n13,13,13\r\n17,17,15";

    var _ASSET_PALETTE_ASH = "131,131,131\r\n131,131,131\r\n131,131,131\r\n131,131,131\r\n131,131,131\r\n131,131,131\r\n135,135,135\r\n135,135,135\r\n135,135,135\r\n135,135,135\r\n135,135,135\r\n135,135,135\r\n145,145,145\r\n145,145,145\r\n145,145,145\r\n145,145,145\r\n145,145,145\r\n145,145,145\r\n148,148,148\r\n148,148,148\r\n148,148,148\r\n148,148,148\r\n148,148,148\r\n148,148,148\r\n160,160,160\r\n160,160,160\r\n160,160,160\r\n160,160,160\r\n160,160,160\r\n160,160,160\r\n114,114,114\r\n193,193,193";

    var _ASSET_PALETTE_WATER = "4,135,186";

    var _ASSET_PALETTE_STEAM = "147,182,217";

    var _ASSET_PALETTE_OIL = "36,26,1";

    var _ASSET_PALETTE_WALL = "55,55,55\r\n57,57,57";

    var _ASSET_PALETTE_TREE_WOOD_LIGHT = "133,108,80\r\n124,97,67";

    var _ASSET_PALETTE_TREE_WOOD_DARK = "94,70,42\r\n109,82,53";

    var _ASSET_PALETTE_TREE_ROOT = "75,54,31\r\n67,53,38";

    var _ASSET_PALETTE_TREE_LEAF_LIGHT = "128,137,79\r\n128,137,79\r\n128,137,79\r\n128,137,79\r\n128,137,79\r\n141,149,91\r\n141,149,91\r\n117,128,71\r\n99,110,65\r\n111,123,68\r\n121,132,73\r\n111,123,74";

    var _ASSET_PALETTE_TREE_LEAF_DARK = "74,86,47\r\n74,86,47\r\n74,86,47\r\n74,86,47\r\n68,77,40\r\n68,77,40\r\n68,77,40\r\n70,82,42\r\n70,82,42\r\n70,82,42\r\n72,82,46\r\n72,82,46\r\n78,90,48\r\n78,90,48\r\n95,106,60\r\n88,100,57\r\n66,74,36\r\n66,67,35\r\n76,87,52\r\n86,100,53\r\n75,89,47";

    var img$i = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAALtJREFUKFNjvHz++P+vn98zfPzwjgEE+AWEwDQ3ryDDs8d3GRi35qb8Bwk8evWawTA7neH81JkMcmKiDL9+/WJgY2NjYJwe7v+fk4sbrEsy0Ivh4pI1DGLcXAz8bCxgMcausID/vIxgQxjkwrwZHq3ayvD5PyNY0fdvXxkYCboBpODRvLlgE0D2gsCLDx8ZQNaCTThxaNv/G/OXgO28/f4T2OhXX7+BFYKsBltxpKMDrAMkARIEuQFEg8QA9mBbK1rMQigAAAAOZVhJZk1NACoAAAAIAAAAAAAAANJTkwAAAABJRU5ErkJggg==";

    var img$h = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAAICAYAAAAvOAWIAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAySURBVChTYyyKsP8vIMTPQAxggtJEAbDJUDZBQJLJYMVcnCxEYdJN/vb9D1GYBJMZGABQ9iJQOWTXQgAAAABJRU5ErkJggg==";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class BrushDefs {

        static NONE = Brushes.custom(() => null);

        // TEST brushes
        // bright color for testing purposes

        static _TEST_SOLID = Brushes.random([
            new Element(
                ElementHead.of(ElementHead.type8(ElementHead.TYPE_STATIC)),
                ElementTail.of(255, 0, 125))
        ]);

        static _TEST_AIR = Brushes.random([
            new Element(
                ElementHead.of(ElementHead.type8(ElementHead.TYPE_AIR)),
                ElementTail.of(255, 0, 125))
        ]);

        // ---

        static AIR = Brushes.random([
            new Element(
                ElementHead.of(ElementHead.type8(ElementHead.TYPE_AIR)),
                ElementTail.of(255, 255, 255, ElementTail.BLUR_TYPE_BACKGROUND))
        ]);

        static WALL = Brushes.colorPaletteRandom(_ASSET_PALETTE_WALL, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(0),
                    ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_2))
        ]));

        static ROCK = Brushes.join([
            Brushes.random([
                new Element(
                    ElementHead.of(
                        ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 1, false)),
                        ElementHead.behaviour8(),
                        ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1)),
                    ElementTail.of(155, 155, 155, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_2))
            ]),
            Brushes.colorNoise([
                { seed: 40, factor: 60, threshold: 0.4, force: 0.9 },
                { seed: 41, factor: 30, threshold: 0.4, force: 0.9 },
                { seed: 42, factor: 15, threshold: 0.4, force: 0.5 },
                { seed: 43, factor: 3, threshold: 0.1, force: 0.1 },
            ], 79, 69, 63),
            Brushes.colorNoise([
                { seed: 51, factor: 30, threshold: 0.4, force: 0.9 },
                { seed: 52, factor: 15, threshold: 0.4, force: 0.5 },
                { seed: 53, factor: 3, threshold: 0.1, force: 0.1 },
            ], 55, 48, 46),
            Brushes.colorNoise([
                { seed: 61, factor: 30, threshold: 0.4, force: 0.9 },
                { seed: 62, factor: 15, threshold: 0.4, force: 0.5 },
                { seed: 63, factor: 3, threshold: 0.1, force: 0.1 },
            ], 33, 29, 28)
        ]);

        static BRICK = Brushes.join([
            Brushes.random([
                new Element(
                    ElementHead.of(
                        ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 4, false)),
                        ElementHead.behaviour8(),
                        ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1)),
                    ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_2))
            ]),
            Brushes.colorTexture(img$i),
            Brushes.colorNoise({ seed: 4011, factor: 10, threshold: 0.5, force: 0.2 })
        ]);

        static WOOD = Brushes.join([
            Brushes.random([
                new Element(
                    ElementHead.of(
                        ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                        ElementHead.behaviour8(),
                        ElementHead.modifiers8(ElementHead.HMI_WOOD_LIKE)),
                    ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1))
            ]),
            Brushes.colorTexture(img$h),
            Brushes.colorNoise({ seed: 1515, factor: 10, threshold: 0.5, force: 0.1 }, 255, 255, 255)
        ]);

        static METAL = Brushes.join([
            Brushes.random([
                new Element(
                    ElementHead.of(
                        ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 2, false)),
                        ElementHead.behaviour8(ElementHead.BEHAVIOUR_LIQUID, ElementHead.SPECIAL_LIQUID_HEAVY_MOLTEN),
                        ElementHead.modifiers8(ElementHead.HMI_METAL)),
                    ElementTail.of(155, 155, 155, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_3))
            ]),
            Brushes.colorNoise([
                { seed: 40, factor: 40, threshold: 0.4, force: 0.75 },
                { seed: 40, factor: 20, threshold: 0.5, force: 0.4 },
                { seed: 40, factor: 10, threshold: 0.4, force: 0.2 },
                { seed: 40, factor: 5, threshold: 0.4, force: 0.1 },
            ], 135, 135, 135),
            Brushes.colorNoise([
                { seed: 41, factor: 10, threshold: 0.4, force: 0.4 },
                { seed: 41, factor: 6, threshold: 0.3, force: 0.3 },
                { seed: 41, factor: 4, threshold: 0.5, force: 0.3 },
            ], 130, 130, 130)
        ]);

        static METAL_MOLTEN = Brushes.join([BrushDefs.METAL, Brushes.temperature(180), Brushes.molten()]);

        static SAND = Brushes.colorPaletteRandom(_ASSET_PALETTE_SAND, Brushes.custom((x, y, random) => {
            const type = random.nextInt(100) < 60 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
            const elementHead = ElementHead.of(
                ElementHead.type8Powder(type, 6),
                ElementHead.behaviour8(),
                ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_2));
            const elementTail = ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_2);
            return new Element(elementHead, elementTail);
        }));

        static SOIL = Brushes.colorPaletteRandom(_ASSET_PALETTE_SOIL, Brushes.custom((x, y, random) => {
            const type = random.nextInt(100) < 40 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
            const elementHead = ElementHead.of(
                ElementHead.type8Powder(type, 5),
                ElementHead.behaviour8(ElementHead.BEHAVIOUR_SOIL),
                ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1));
            const elementTail = ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_1);
            return new Element(elementHead, elementTail);
        }));

        static GRAVEL = Brushes.colorPaletteRandom(_ASSET_PALETTE_GRAVEL, Brushes.custom((x, y, random) => {
            const type = random.nextInt(100) < 20 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
            const elementHead = ElementHead.of(
                ElementHead.type8Powder(type, 3),
                ElementHead.behaviour8(),
                ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_2));
            const elementTail = ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_2);
            return new Element(elementHead, elementTail);
        }));

        static COAL = Brushes.colorPaletteRandom(_ASSET_PALETTE_COAL, Brushes.custom((x, y, random) => {
            const type = random.nextInt(100) < 40 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
            const elementHead = ElementHead.of(
                ElementHead.type8Powder(type, 4),
                ElementHead.behaviour8(),
                ElementHead.modifiers8(ElementHead.HMI_COAL));
            const elementTail = ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_2, 3);
            return new Element(elementHead, elementTail);
        }));

        static THERMITE = Brushes.colorPaletteRandom(_ASSET_PALETTE_THERMITE, Brushes.custom((x, y, random) => {
            const type = random.nextInt(100) < 60 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
            const elementHead = ElementHead.of(
                ElementHead.type8Powder(type, 5),
                ElementHead.behaviour8(),
                ElementHead.modifiers8(ElementHead.HMI_THERMITE));
            const elementTail = ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_2, 3);
            return new Element(elementHead, elementTail);
        }));

        static WATER = Brushes.colorPaletteRandom(_ASSET_PALETTE_WATER, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8Fluid(ElementHead.TYPE_FLUID),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_LIQUID, ElementHead.SPECIAL_LIQUID_WATER),
                    ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_3)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_NONE))
        ]));

        static STEAM = Brushes.colorPaletteRandom(_ASSET_PALETTE_STEAM, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8Fluid(ElementHead.TYPE_GAS),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_LIQUID, ElementHead.SPECIAL_LIQUID_WATER),
                    ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_3)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_NONE))
        ]));

        static OIL = Brushes.colorPaletteRandom(_ASSET_PALETTE_OIL, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8Fluid(ElementHead.TYPE_FLUID),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_LIQUID, ElementHead.SPECIAL_LIQUID_LIGHT_OIL),
                    ElementHead.modifiers8(ElementHead.HMI_OIL)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_NONE, 3))
        ]));

        static GRASS = Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8Powder(ElementHead.TYPE_POWDER, 0),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_GRASS, 5),
                    ElementHead.modifiers8(ElementHead.HMI_GRASS_LIKE)),
                ElementTail.of(56, 126, 38, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_1)),
            new Element(
                ElementHead.of(
                    ElementHead.type8Powder(ElementHead.TYPE_POWDER, 0),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_GRASS, 3),
                    ElementHead.modifiers8(ElementHead.HMI_GRASS_LIKE)),
                ElementTail.of(46, 102, 31, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_1)),
            new Element(
                ElementHead.of(
                    ElementHead.type8Powder(ElementHead.TYPE_POWDER, 0),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_GRASS, 4),
                    ElementHead.modifiers8(ElementHead.HMI_GRASS_LIKE)),
                ElementTail.of(72, 130, 70, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_1))
        ]);

        static TREE = Brushes.colorPaletteRandom(_ASSET_PALETTE_TREE_WOOD_DARK, Brushes.custom((x, y, random) => {
            let treeType = random.nextInt(StructureDefs.TREE_TRUNK_TEMPLATES.length);
            return new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE, treeType),
                    ElementHead.modifiers8(ElementHead.HMI_WOOD_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1));
        }));

        static TREE_ROOT = Brushes.colorPaletteRandom(_ASSET_PALETTE_TREE_ROOT, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE_ROOT, 8),
                    ElementHead.modifiers8(ElementHead.HMI_WOOD_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1)),
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE_ROOT, 5),
                    ElementHead.modifiers8(ElementHead.HMI_WOOD_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1))
        ]));

        static TREE_WOOD = Brushes.colorPaletteRandom(_ASSET_PALETTE_TREE_WOOD_LIGHT, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE_TRUNK, 0),
                    ElementHead.modifiers8(ElementHead.HMI_WOOD_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1))
        ]));

        static TREE_WOOD_DARK = Brushes.colorPaletteRandom(_ASSET_PALETTE_TREE_WOOD_DARK, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE_TRUNK, 0),
                    ElementHead.modifiers8(ElementHead.HMI_WOOD_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1))
        ]));

        static TREE_LEAF_LIGHTER = Brushes.colorPaletteRandom(_ASSET_PALETTE_TREE_LEAF_LIGHT, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE_LEAF, 0),
                    ElementHead.modifiers8(ElementHead.HMI_LEAF_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1))
        ]));

        static TREE_LEAF_DARKER = Brushes.colorPaletteRandom(_ASSET_PALETTE_TREE_LEAF_DARK, Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3)),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_TREE_LEAF, 0),
                    ElementHead.modifiers8(ElementHead.HMI_LEAF_LIKE)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE, ElementTail.HEAT_EFFECT_1))
        ]));

        static #FIRE_ELEMENT_HEAD = ElementHead.of(
                ElementHead.type8(ElementHead.TYPE_EFFECT),
                ElementHead.behaviour8(ElementHead.BEHAVIOUR_FIRE, 0));
        static FIRE = Brushes.random([
            new Element(ElementHead.setTemperature(BrushDefs.#FIRE_ELEMENT_HEAD, 255), ElementTail.of(249, 219, 30)),
            new Element(ElementHead.setTemperature(BrushDefs.#FIRE_ELEMENT_HEAD, 255), ElementTail.of(249, 219, 30)),
            new Element(ElementHead.setTemperature(BrushDefs.#FIRE_ELEMENT_HEAD, 120), ElementTail.of(249, 219, 30))
        ]);

        static ASH = Brushes.colorPaletteRandom(_ASSET_PALETTE_ASH, Brushes.custom((x, y, random) => {
            const type = random.nextInt(100) < 80 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
            const elementHead = ElementHead.of(
                ElementHead.type8Powder(type, 6),
                ElementHead.behaviour8(),
                ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_2));
            const elementTail = ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_1, ElementTail.HEAT_EFFECT_2, 3);
            return new Element(elementHead, elementTail);
        }));

        static METEOR = Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_METEOR, 0)),
                ElementTail.of(249, 219, 30))
        ]);

        static METEOR_FROM_LEFT = Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_METEOR, 1 << 1)),
                ElementTail.of(249, 219, 30))
        ]);

        static METEOR_FROM_RIGHT = Brushes.random([
            new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_METEOR, 2 << 1)),
                ElementTail.of(249, 219, 30))
        ]);

        static EFFECT_BURNT = Brushes.custom((x, y, random, oldElement) => {
            if (VisualEffects.isVisualBurnApplicable(oldElement.elementHead)) {
                const burntLevel = ElementTail.getBurntLevel(oldElement.elementTail);
                if (burntLevel < 3) {
                    return new Element(oldElement.elementHead, VisualEffects.visualBurn(oldElement.elementTail, 1));
                }
            }
            return null;
        });

        static EFFECT_NOISE_LG = Brushes.colorNoise({ seed: 0, factor: 40, threshold: 0.5, force: 0.25 });
        static EFFECT_NOISE_MD = Brushes.colorNoise({ seed: 0, factor: 10, threshold: 0.5, force: 0.25 });
        static EFFECT_NOISE_SM = Brushes.colorNoise({ seed: 0, factor: 4, threshold: 0.5, force: 0.25 });

        static EFFECT_TEMP_0 = Brushes.temperature(0);
        static EFFECT_TEMP_127 = Brushes.temperature(127);
        static EFFECT_TEMP_200 = Brushes.temperature(200);
        static EFFECT_TEMP_255 = Brushes.temperature(255);

        static EFFECT_WET = Brushes.custom((x, y, random, oldElement) => {
            if (oldElement !== null) {
                const typeClass = ElementHead.getTypeClass(oldElement.elementHead);
                if (typeClass === ElementHead.TYPE_POWDER) {
                    const modifiedElementHead = ElementHead.setTypeClass(oldElement.elementHead, ElementHead.TYPE_POWDER_WET);
                    return new Element(modifiedElementHead, oldElement.elementTail);
                } else {
                    return oldElement;
                }
            }
            return null;
        });

        static EFFECT_MOLTEN = Brushes.molten();
        static EFFECT_EXTINGUISH = Brushes.extinguished();

        // --- SEARCH

        static _LIST = {
            none: BrushDefs.NONE,
            air: BrushDefs.AIR,
            ash: BrushDefs.ASH,
            sand: BrushDefs.SAND,
            soil: BrushDefs.SOIL,
            gravel: BrushDefs.GRAVEL,
            wall: BrushDefs.WALL,
            rock: BrushDefs.ROCK,
            wood: BrushDefs.WOOD,
            brick: BrushDefs.BRICK,
            metal: BrushDefs.METAL,
            metal_molten: BrushDefs.METAL_MOLTEN,
            water: BrushDefs.WATER,
            steam: BrushDefs.STEAM,
            oil: BrushDefs.OIL,
            grass: BrushDefs.GRASS,
            tree: BrushDefs.TREE,
            tree_wood: BrushDefs.TREE_WOOD,
            tree_wood_dark: BrushDefs.TREE_WOOD_DARK,
            tree_leaf: BrushDefs.TREE_LEAF_LIGHTER,
            tree_leaf_dark: BrushDefs.TREE_LEAF_DARKER,
            tree_root: BrushDefs.TREE_ROOT,
            fire: BrushDefs.FIRE,
            meteor: BrushDefs.METEOR,
            meteor_l: BrushDefs.METEOR_FROM_LEFT,
            meteor_r: BrushDefs.METEOR_FROM_RIGHT,
            effect_temp_0: BrushDefs.EFFECT_TEMP_0,
            effect_temp_127: BrushDefs.EFFECT_TEMP_127,
            effect_temp_200: BrushDefs.EFFECT_TEMP_200,
            effect_temp_255: BrushDefs.EFFECT_TEMP_255,
            effect_burnt: BrushDefs.EFFECT_BURNT,
            effect_wet: BrushDefs.EFFECT_WET,
            effect_molten: BrushDefs.EFFECT_MOLTEN,
            effect_extinguished: BrushDefs.EFFECT_EXTINGUISH,
        }

        /**
         *
         * @param codeName {string}
         * @returns {Brush|null}
         */
        static byCodeName(codeName) {
            const brush = BrushDefs._LIST[codeName];
            if (brush !== undefined) {
                return brush;
            }
            return null;
        }
    }

    var img$g = "data:image/png;base64,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";

    var img$f = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAUCAYAAAD7s6+GAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGYUlEQVRIS9XWW4jc5hnG8f/oOCNpjrvrnfEu6w3BdkJCsONCa0raJD1AoAE7JS49uE0CLTUmNFtyXdyb1BSHuL0p9KKmLKW5CCQ93ZS0DSTg1HbsTWx317U9Hu96jzOagzTSaD6NpF44WbxZt2nSQNvnSu8rIf34eKVPCv8nUd7f+Djy/UPfTgbxzeNiqcgPf/Tj1MYrPnw+NuhPn3/+idrFt08AhD2fpZVlogjmq7DvCw8n2XyO6Zde+cjgD4Se+NkLk08emqq9Vx858kxh8cKV1nt1Lj+MCAXVCzOYZoZCNoeqqWwtb6G+ZnNxbo5s1iLodtn/xc8lAC//8U8fGrwJ+qufv7DrjVf/fA6gMDxMbXYWIAVw+GuPJa3qErquE0URhqaiyQkFI4umaSCl0DWZtdUViqUSI8MF7t91D3NzlxmtlCkWh7lSvcojn92b5AslXvzNH/5tsALw9KHvJuOjWxB9jwsz71Aeq2AaJsQJlmXyg8NPJa1Wk7vu2km9Ued67TrFUhHiBDmV4LkdlHwePZOh3bRxnTZdz8XImsiKQqmUp91u0vVcJBmGhoo0mg32P/JgYuULTL/4wSOhAJTyBXRVYxD0SCXgez6O4+C7HlE0QNd1tm/fTrvdptVsYZoGqqIiJeC6Lpl0hiQFs3OzSEoK07JwvS5hLFir27g9H0WWMXNZ4hgGCaiaggj7XL58ib2fuDc5eebCv8QqAJqmkYoTVpdWWF6ZZ9u2CRaXVnG7LpUto4xWxrBbHebn57Ftm0KhgB8IhoeH0fQMlbFxVupr6KaFoiuEUYiRz7K6sgqaghppJElMIPr4fg9ZU5AlmUazgev2yFp5Hv7M3mRsbIzpX790W/DNFS0W7zjz5qlrTsem0epwY/mvjIyMICkqSUqi1w8BsHIFDCtLFA+4XruOrKpURkdZs236oaAwVCIQPfq9AcsLi3RcB0lSkGUFWZIYBCGyqqGpGhkjjW23UGQN13VpdVwcx+HTn7w/+dY3D+7+zuGpmU3QQ1NTta8feJyhSoV226bbcchoKjt27iAUAkmGVrNFFEdMbpvE7Xbw/S4Ne41BJFBVlaGhEkgp/nZxjn4UYrc6aKpGLmcQDWL8sI8Qgu077sRxHLpOH10zadSdmxBdIxyEdLs+vzjxy3Off/ABXn3t9fXVXX/rt4xtxXc6pA2DiYkJyuURLNOiulbFymaRlRRLC8uUSgVc1yWbtSiXywRBgKqqLCwtocgqW7aWmb04R1o3sHJ57rvnXsIwpNvz8TyPJJYR/RghBEEgyOcLtFpNen4PVVFJkoR2u0MUxTyw91PJ6yffTG2ATkxMPnT+7Om/jIyMsLwwTxjGSJJCpVym3+8DUClvJegJFFnFMnOk02lAwvd8xraO43sB128sYNttMpZBJm1w9eo1VE1D13V0RUdRVDRFR/QEcZjQCwLSaYMoSej1+siyTLFY5OTpsxtmdR06NTX12hPf+CqqIhPHEfV6nSSJKRSKpFIJzWaTsbExJFnCMi2iaIDjdBFCoKgatt1GlhTWVhvk80X6oSCTMdF1HUmSiKOYQRzRaDSw7SZCCDyvi6yq9Pt9NE2jUChwZuZ8iqu1W4g3s+GDv2fPnv1vnXzj5XK5QhiG1Ot1oigmlyuQzeZ55+3z3Ld7F67nE8cxYhDhdD08z2dychtXqjWC3gAja9JxuzSbHYJAMBhEJEkCwOrqCoaRAcA0LYQYICMTiYgv7fuyeWbm/K2k9WyAPj317CtPfeUxMpaJaVpomkaj0SSOoVqtMj4+ju/3cJwuq6sr+J5PFMekZIkbS8sIMUA3TCYn76TXE4RCsNzpkE6nCYVAUWWCXkAcvfvHAhw48Pju544fnwE4cuTIev/92bSFjo6Osrwwj223yefzbJuYwLQsOm2XMIq5Ur1GKiWj6RmGRkYJgoC206Hd6eB5Puko4fTZt9BUFc/zEEKAlCIKQ0QI8436htl77vjxW8t/mk3QHXfvuGNhYeFarjSE3WwShiHtS3/HUHUG/ZDa4iLZrEWxWOL3v/3d+kN3370zMS0DgFQQ8+i+fQ+hKLWjR4/Wlmx7/f4fNZugTx6aqj37zPc4feoUmYxBSpJpNts03z1/aX7htjvHudlLG/pHjx27tfyPswkKcOz4T1IHDx5Mpqenb4v6b+S2UID/JSTAPwB2TvQFACDmHAAAAABJRU5ErkJggg==";

    var img$e = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAgCAYAAAC7FpAiAAAACXBIWXMAAAsTAAALEwEAmpwYAAALF0lEQVRYR92YW4wk1XnHf6fOqVvfbzPDzLAXyC67GJCVjVnAOMaRcUyABMnGyA+WHOUhDpEiZx+sPOcpT4miPCSRn2LJihziWCYBK2ASA0I43sVcd4dlYWcvM9Nz65nprqru6qo6VScPvbvswnILtuLk/1ZVrfq+X33X04r/B1LvvPF/Ue8L8acPf8PUG3XSNOUv/vKvxTuf/6roEsS3vvlHJssyxqMYx3FI0xQLzdK5RRr1Ot/6k2+Y0XBIqVwmSRJGwyFJklCpVimVfJSyyXPNcDi6/P0URYHruvzNt//hl/YRFMCX7/mcicOAJElQSjGKAiqVCsl4hGtLepvreJ7H3Nwcm5ubOI5Dp91EKYUxBmlJ0iwlHkbUq1VGoxGWZRHHMVmW0axX+fM/+6aJ45hatcGxF45R8kuMs5R/efzHHxtOATQqZaQp8GyFVJJKyWE4GuJIheM7mCyFIifY6lHxXJIkYbvfJ0kSSuUSaZIghMD3S4TbW/h+CSGg2mried4FU4aq77F09i1mOm1eP/k6llLcdvM+87Pjb30sEAUQhQNqlTJRFOK4Lhgbk2dIJdHpGFdJdK6JwoDRcIiwBEIIhLCYbrcYDAaM4phkPCJLU5LxiFazhU7H5PJK/5QlePnVV8m1pre9TaPR4jOHbjad6Sk8t8T3Hn38IwMpgH964jnx+1/6HeM4iu3tHpZlMTPVxpicIIhwlI0lBK6yKLWbKCmxLAthWWz3NnBdl7LvMoxjCpOz3l2jXq+yttKlKAqmp6fxfZ84jrGE4PCnDnH0hReo12pkOsMzBefPnKNSKXPowD7j+B4HbjjIdx75/ocCulTYKTbVchVfZzTqVYzOmJ2ZodA5tpQEgwjP85AIls8v0Wg0GA6HVKtVeoOA8XhMrVHHVQplWfTWN/Bcl1Ecs3TuPDrLEEIwznKGUUSapbiuSzKI2NnZQUqbeDii0DnDIOTnx45y+y2fMG6pzDM/O/a+MJcg/vEH/yq++sB9plWv0l1ZwVESCk2r3mYwGKCUYnllGdd1mZqaotfrIaVEa021WmVubo6lpSVqtRpzs3MYUxAEAZ7n4zgOYRiy1etRrtaZn59HuQ5aF5w7u0SaalKdkYwzdJ4jhMC2FfFwiJQ2n/71T5rnX3rlPUGumBPRcIjrguP7tGtVKDTLy8vYtk3ZK1MrVXAch7VulxsP3sjimUXi4QhH2exsbbF31262+jsoywIsrt97HX65RG9rCyEEjXqd88td8iLHsRSOA7fccgtROKQfRoRhxM52H61zxnGKVIrRKMIt+Ry6+YBpdtrc/8BXmkeOHOlf7vcVEI899bT4+kP3Gcex6YcBvpL0+3127dpFPB5jSetSJAaDAXv37CUMQ8IoBODM2TO0Oh2mp6fp9/uEYUiSpdhKUa1WJ/NlNCIIApTrUSnX2LfvBjwvxxmnZFmGsm0sy6IoJFrnSCmpVCp011YJgoBHf/jIDnBFVN41sZuNJlG4gzaGNJ10qJWVFXSiGQwGHDh4kCIvkJ7C8zzSXF9IDU2e5xRFwebm5qWZI4Rgc3OTZquF53nceeedLCws4JXKbGz0WO6u0Gq1KVdL7Kvv58UXXySOY8qVMnfcfjvdbhflOjiOQxAEpFnOrb/xSXPs52+n17sg1jY2KXsTx/NkjBKKTqdDtVql2WpR8n0AXNe9kLs21oWWa1kWWmuGwyGNRoPxeIwlJZ1OhyzT2Lai3+8TDSOCaIhSLr1ej5WVFWZmZ/FLPq1Wi6IoSNKE1dXVSTORkiQeI6VFFAR0ZmY4fPiQOXr0RQFXgfjeD58QX77308b3fertNnmWMTU1he+4jMdjhGVwHAfLguEoIohCdK7JtUHnGlMY6vU6URTRaNQRlsUgGtJsNVntdtEFVKtVVrrr+D7ESUqapoziEUII6vU6YRiS5zn1Rh2AEydOXNoMbNuaNBX7bdffBQEgLY/9N+xl8dRJRJHT623QbLQRBpIkwbIsjDFE0RDHcxCWwBIGIQSZzi5FAiAMApSSbPV6DAYh3bU19u/fT6ejaTSaLHdXmZubJ8lSMp2xsd6j0+nQbrdoNpoce+EYuijIjSFPMvxyiSKdpOpFXRXikcf+U/zBQw8Zt9xmHPXYf+AAJp8U2ThOyIsCx3Wo2za2rdB5TjCICIKAqZlZarUaWmckScLp02fYs2cvxghmZ+cYhEOWllaYmb2GNEvJiwKtE249fJhjR4+BJWh1pknTlOMLJ9npB1iWhVQKS1oYI5DSYeHEqfeuiYtqtNoIy1CvuqysrlEplUjiMe12G7QmTVMcxyEvCmzlUq1O6iIIArTOsB0H3/OYmZmhVC5hicnzoihQts3i4hkOHjzAbbcd5tzZc2z1tmg0WszMXkuv16Pf77O5uflOt0iSBL9cuuLee0L81d//nfjjr3/NBIMIneR0u2eRWNhOiUq1jNCaJNW0my2UclAqYRynxHGfSqXC7l27WFhYIE0zLCHwPI/z588TBAGj0YhDt36KmZlryPKCWq3GKB6xsbHB7r3Xsb6+ThQNL7RY6wq/hBC88tqJ92+xl+tvv/Nd8Ydfe8iEWrNn735OL77J+tY2WlhUq2XQOYNwSKUCjufSnp4iThOuvXaezc1NSqUyCwsLtFpNbMfhtdeO45cnA3N+fp4iL9jY2CAIAhKdE4R9XnrpRSxLYUwxiXSur/CpXCpfcQ0fAAHw7e8+IgAe+MJdptGZIhgEDOMVlG3TatSYnZ0miCJqtRrb21vMz89x+vQinucxHEY8+OCDnDhxguPP/xTbVpTLZer1Oq1mk83NTZaXlxlnKTrLSHRBUQAixZICMORpgeO6pDrDs/3LVvu39YEQF/Xoj58RX7r3bpMWBQeu38f87Ayvn3ydp3/yLHd/4fMsLi7SarcnHcuxKZdLGGNYXV3jpptuQimb1dUuN950C2fOnmV1bQ0lJVmWobOMTOsJAADykl2/5JPrnFqtRq5znj/27mXwQ0MA/OBHT4n7Pn+XOXf+HItn3mLvrt3c+dnfZGb6GsbjMaMo4uD+A2xvbwGgdU61WuHUqTe5/vrrCIKA06dPMzU1xcLCAnfccQeZ1mRphi7MxIhlgclBTEBc1ya/sO7kMr/oyhX6SBAAj//HMwLg/rs/a84tL9GIGkRRxFS7g5IOve0deuuTM0mpXGZpaYXZ2TleeeU4SabJsozdu3ezEwwIwxCdZeRaY8SkgEVRIC2JQFAIkJZFuVYm1Tl+abItvFMfGeKiHnvqWfHg/b9t1lY3WOuuclK8yc03foJ6vU5uBNdcM0cQBOy57td4+eWXaTSaWGnCG6feYLm7hrQUO9sD8qJAWAJpJidFIQSWEEgpEVIigGgYIaTi6E9fe1cqwceAAPj+Y08KgK/+3j1mZ3uHN958C79UQicpWV6QZhnrvS0s5eB4PvE4wRSC8TglDEesrq9hCoFAoexJ+kx2sMkQlVJd2IIlzXbnCtuX62NBXNRdv/XF6x4+cuTsV+79otna2qLQOW+8dZos04RhSL1eZ2cQEoYhrl/i5Kk3J6lUFBhhIaXEiMlHlkohpY20baSUWHmBKeDJZ5+7ahTgFwTx8JEjZwH++UdPXDL00O/eZ3Z2+sSZJjPQ6/cnu1UyOZZ61RpBECCUBUJgmEQBqbCUg6UUylIoWfBfx199TwD4BUFcTY/82/v/a/HAPfcZvxSws7ONlAqlJFIq4nhEuVrHthWjcPiBAPBLhPggPfrvV4e86zOfM3EaU6lVePKZn1z1N+/U/xrEe+mZ557+UI5frl85iP+J/hsrK0NCDSo5ZgAAAABJRU5ErkJggg==";

    var img$d = "data:image/png;base64,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";

    var img$c = "data:image/png;base64,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";

    var img$b = "data:image/png;base64,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";

    var img$a = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAATCAYAAACdkl3yAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC7UlEQVQ4T62UPW9cRRiFn5k793Pt682yzoq4wOAoFBEyihA0Bgk6CoqkMBU/gAYpQhR0KdOlhAJRpcF/gC5IKCiYEBnHGCKEsVMYO9rY3t27vp8zdyjAa6+ddJzyaM6j94zeGcX/JHXaAFi89oGtdAaiphFNEDVaLC/fZ3VtXZw+e6QzoHfeftPmRYI2FcbkDAYDXpqdotO5wDzY58HU0tKSt7i4WB4Z0tYMDxOkBCktQsD+XpdGI+Dl2TlW19ZP5kdSJyE3bnz2+k/3fqSscoypKMqS2kjS4RPiyRZ1bZh/7fIzpxqr9nSnu/LGlSs8evQb3W4XB4cyKzFVRTz9Ivu9HtPN1snISGOgYZIQxxM0okn2ZQ9TgRISARRZjjUGAby3sGDv3L07NtUYSGtNmh4y1Zxie3uH0lQox8NKzTDpUwsQAkpdnak4BgrCgCRJ6HQu4AhBXRtcRyGFIMtz/DDAWouUknNx82T0GPTRh9esEJL0MOXg6R5BEJANU4zWSEcS+j7GWoqypNU+z2CYjE01AimlaLdfoMwyHEfSbrfZ3d5BOhIHBwAhBFCjTYVyXebmjtdhBHKwNIKIIPCpipzA85iYCNHGYkpzdAyAPM8JopCNjY2RpwA+//QT+9eff2Ctpq4NeZqhteZ8p0O/N2BQJqOAsFCkKY0oojXZ5Itbt2Y/vn59SwGsPviZdrvFw5U1ZmZmcKVHnue4ro9SPmnexfV90jRHa40fhvT2DximGV9+/dUmIBTA3kGfKApI05zNrU2KosBoTRw36ff7xHGM53lkWYFUCmtrhFDUdc3Dtd+PL3t5dV0AFuDixVcIKsPW48c4rk9a5GAlaVGSpilBFOL6Icrx8IKIb2/enH3/6tV/qx3B3l1YsH8/OQAgmogxViCVS1EUKKEIopDp6Q67u10e/HpPANz54Xvg1EJ+99/avzV/2UaT59A1KC/AcX2KouDVS5e4/c3SmQcLz/iPYFT1jO6v/HLaGukfK6ZXUFEV3tAAAAAASUVORK5CYII=";

    var img$9 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAALCAYAAACQy8Z9AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB6klEQVQoU7WSzU4TURiGnzNz5qfTMkEMaFkg0XgXbePCcAWscKXeSG+GRAVvgLgw6J4ASwKr0kCBTmf6M2dmzum4aKhQY1z57M57zvfkTb4j+Q/IxWCRVqNZKjVmefkJtVqVMAzR2lAUOZ/3vorF9/AXaavRLAE8zyHPc4SwiOOYm5sbpLSZ3Xm0Gs1yOIw5Oj55JJ9LW41m+XRlhSxP0dpgjKYoCqS08TwPYzSTyexs25KyLBkOY+r15xwdnzx0zqT3zZIkQTqzJq7rYts2taDKZDxmkqYk05hBP8KREum52LYkSRLetJrl98Mf87YSYL1eZ5KmZFnG0lIVAK0LsixDKYXruqyurvJsbY1Op0OeF0yyFKUUWhcEQZWtrbflwcE3MZcCVHwfKW3G4xFhGOJ5NaR02NzYoNPpcHnZpdfrkRc5QgiwBI4jUUohhCBKBrx++ao8uzgXEuDT3hfx8f2HsuL75IUiDEOMmTIYRJyenNLrXSOEhTaaqTEIYSGwwALf99HaUA2qjOIRj5qqPGNj8wXRXZ9u94rrq2uGoyFRPyKoBjjSwbZsUpUDhnc7O3a73Z7ezz9kLt3d3RXb29ulyQtu726pVAKifkR9fZ3Dn7+XcE+73V6M5jz6p/v7+38Mn12cL0b/5Bf4ONku8uljuAAAAABJRU5ErkJggg==";

    var img$8 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAASCAYAAABfJS4tAAAACXBIWXMAAAsTAAALEwEAmpwYAAADFklEQVQ4T7XUz2ucRRzH8fc8z+zMs88++yvG1GRrhUKLWOKhxTZYqeBBinrwUr34X4l4lyLoqQcFxZLakJb+sF7ExkAuSmh2m/3R7JN95vk9HpYkVkJsDn6Ow3xfDDMfRvI/Rf574ahceuuiPTH/Ckop4shQrwdsbm4CMBgMefzHmtjb+0LwtWvXrNaa4XafJEkYDQakacZoOMSVEsdxmJubY2Fh3t5cXhZwCHz50kWrtQZgYhLuP3wgJuMQ/ZICYH7uBOrkqxRZxsbGBtJxMcagqh5PnmztO/vwB1fftzWvSmQMVc9DCMG8Upx7/awd7jxjNwyx1rKzs4MrJVpKTp16jbW1NVrtFiaOcR2HxTfO2d8e/y4kTO9u1B8Sex5SCl6eaSOEi+/7rK+vI5XCWovWinD8jLIsGQwGaK1pNAPKMqe0lloQYK09OHEYhniug680eZLxtNslTQsAlFK4rkteFNRrAXFkyPJ8OuxKhBCEYYiu+vh+jTiOD+A3Fxfpd7fob/XwfR+bQxD4AGitkLoCgC1yZmfaJFlKq9HEdV1MmlD1PIKgxqDfx1XTvRKg2+sx6j2l3WphjKEoCiITAyVe1SOODMJ1sNbSarWZnZ1lYmKstRSjEYXOUUpRlCVSTBsnAX5euS3eu3zFRvEuwquw8ugXcfXKuzbcDTFJhhCCdr3O9vY2Qgji2JDlGdJ1SbOYWuCTJAnNZpOFkx1W7947aMXynZX9cgP8sHJbLF04b+M4RimF79c4fbrOeDwmtwWeVyUIakRJTKfT4c7qXc6cOctX178+vMf/zL1Hv4qlC+dtsyIZ704QQiCES7PeJM9z/vpzk6DZoLvVo9Fu41Tc/dkjYTjApZQsdDoUZUGcJoQ7YxzHwUSGSTSZVq/R2J/7Txim+GeffmK7vS6TKMJxHMqyxHEcsjTFcVzaszN8/sWXx/srAK5/8634+KMPbUVWSNOUNEuxpUVrjTERt26sPvdGLwwD3Pjue/HO20tWCEHQaLAzHHJr9XlwL8eCAbKsRCmXH3+6eSi4l2PD9x8+OBLcy99QElUk8fCpxwAAAABJRU5ErkJggg==";

    var img$7 = "data:image/png;base64,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";

    var img$6 = "data:image/png;base64,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";

    var img$5 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAC4AAAAkCAYAAAD2IghRAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAFcUlEQVRYR82Y3W4TRxTHf7vetb2Osd2AY18kogqpKkETSC7sUEEAqep9L7jhEfoYfYA+BqqUN6hUKNyUQgnioxcVigOqIR84ITHGG3u9M73YzHr9tXZIgP5udj1n9sx/Zs7MmbHBR2Jp6YpsNBrEYjHu3r2jdduPitFdcFQKhaKMRCIIITCjJq5wKRYXpXBdHvz14Ng6cGzCFxcvSiklZtRESsne3h5CCPSITjqdRkqDQqEodV3n3r0/Ojrww/ffyWjcwjRNIhqsr67x66NHoZ08kvCrV69JIQQArnABqO5VAZg91fDrPduuIqUkeSKJrutcvrwkTdPk1q3fNAApdVxNx2jYtAwTDc9nGB8k/NKly9JxHFzXE4sWFNwCXBJWEoBkMsY3bAMRnlZqaJpGOp2m6TQpFhclQHlnh7NGlpZpEDUMNEIHGzik8Pn5BRkxImi6hhk1/XDQNK1HcCrlPROWQa3mvc+eqgHw5I1A13VS6RS6piOiJk/WN4jHY3w1cRLDjDOMocILhaJ0HAdN00ilUriuy9udtwghuJCTgDfqSrAiYRnU7RZRa4x8zivb2PSec9kaEOHx1luklEQMgy8yGVzh8uzf9fZMhjBQ+MWL30p73yYej2NZFltbW+zv7wP4goNi1Qgr6nYLgN2dPb9M1UkmY9RqDc5PeDMAksdb28RiMVKpFFJKLlyYl/F4vGchK3qEFwpF2Wg2MAyDdCpNpVJBCMF8Xo1ChIRlkc9lfHGHRddN8jnLnwHgoBOCv3dcHMchm80ipGB2dk5alsX9+392dMAXfuXKVbm/v080GsWMmlSrVYQQnJ9wgHYo5HMZ9QmZ8bT/Dt7oqrLgSHfXU+RzELXGAGja79nY3OXcuFoH2+i6TjrjfVssLsp4PM6dO79rAEahUJQArutimIa/4OayLuAykT1JrdboEKxo2u+7i0YuUwQ7mM9l2Nj0QmmOXcDlaWUPNDiRSuEKl0KhKKUQGG6rhSsFTsvBaTrMZZu+I4CtN9sAlF6oePz41O12W7OnvBB9WqliRk2EK7xBfrjy0I+dG9fOyukvJ/2PwFtkCatnKXwG1rl5+4mvtUfRxubuwZTtAt60qWrK9qlRWoL0CK/btY6wqNs1tt607Z8yZDqJdPzqEa52j7ptk7CsLuunJaihbtsdth7h7TDpzV7BvTszng7dLRT9pnl03I6wDdIjPMigbAid21gY3T5GJWEZlF7UBia5UOFBNjY3uosAyOfy3UUjcVR/ocLVQSkznubnX/pfv3768WvZXaYyaPAJXnip95u3/wn1NywMQ4Urwpw07ff+dKqOQjuU1DNhGSOFl/I3LHeEWw8YFGfQaRu1Xhij1gsVHrXGiFrhCzFhGf5BKXjI6mbQAawfg3wECRUeDINB1O0WdbstJExUmC3I7s7e0UJlmOiPybC2Q4VXq7WRLwxqYQ4aqaBtmL+EZfRNOkH6t3JAKpUc2ohC1QurH2YLUrdb5HOZ0HNRqPDg9vZ/I1S42lUAblzrTTQw2g7Qj2H+wnIHDBEeTAbdFwxFdwIKI1hvFH9hhLd0wCiO4HjrDRuEcCsfHgqHYadSASA5ZnXc+sMYKnyYg+MgOda+sHS3l7AMqt7fkh30CC+9KPd9/1y0NQy4ui0tLcnGeBYpJeVymcnJSXRdR9O802epVOLMmTM4jkO5XGZqaopIxHOmaRpS9t0kBqL8qj9Ng5RKJaanpwFotVq8evWKqakprl8/J5eXlzU4ED4/Py+r1Srv3r1DSommabx8+RLw/ihSjp8/fw6AlJK1tTUOy8zMTMdAqM7qus7k5CSvX7/m9OnTzMzM4Louq6ur/rerq6vous7CwoJcWVnR/gMS6rip19cCIwAAAABJRU5ErkJggg==";

    var img$4 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAOCAIAAACtuNvgAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAB5UlEQVQoz1XPy04UURAG4Ko6t+6eGRkl0dGFLly5cOv7+AY+itEVCStDfBg1JhICbCQIiAmCc6FP97mXi9EJXZtK/sqXqkJmhv91/PktM7x49QaGdXm4x0pnZ5++fL1OaDM7P9xTciyFPjv4cNecfNsNXNq+db7bjP6x7193gm+ZgtYm39l/9OW9QIyu7RZXRCJEu87luuWcfAqCBI4m2S83rGqmSjYo+8RBCIopDpjSejJ9kktw3UKresNyDq1tkaCutr1bNM10wLgU2/8uIIiZVLVh3t4KIgAjuDeqRlSD33rf3c7n7B0i9N31yf7OOp9OtsfjSVOJ5eImINjuarDtwfaz7Nu2W6ZUtBzZdnV6sAfF5ZRzSYXTw9lzSiUgDdhq+ROZiFDryvteG/3j9Hz2eAqcYvKVHvlu7r1HMoMjjW6kFjFGH3pTVecXNyH4s4s5AxOqEJ2WtRSKsx8w26+8d1LKVLK1rTENQ/ZuRUjj5p5UCjAT4mRrNmBaGYGaGaaTR3XdWLtS0milS4JbO/fe9a6PzDEsTvd3AQCZ+ejTu7oaMRdEijGQaUK3ICRCAYBAzBliDve3Zi4scyopR/nr+CMAh9gJKQVr57sGBQNoo4Gxd50RlaxlA+M/y0sSJiUrSf0F+OQcr89DEA8AAAAASUVORK5CYII=";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class TemplateDefs {

        static ROCK_SM = {
            info: {
                displayName: "Small Rock",
                category: "template",
                // icon: {
                //     imageData: _ASSET_ROCK_SM_ICON
                // }
            },
            action: {
                type: "random-template",
                actions: [
                    {
                        type: "image-template",
                        imageData: img$a,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true
                    },
                    {
                        type: "image-template",
                        imageData: img$9,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true,
                        randomFlipVertically: true
                    },
                    {
                        type: "image-template",
                        imageData: img$8,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true
                    }
                ]
            }
        };

        static ROCK_MD =  {
            info: {
                displayName: "Medium Rock",
                category: "template",
                // icon: {
                //     imageData: _ASSET_ROCK_ICON
                // }
            },
            action: {
                type: "random-template",
                actions: [
                    {
                        type: "image-template",
                        imageData: img$g,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true
                    },
                    {
                        type: "image-template",
                        imageData: img$f,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true,
                        randomFlipVertically: true
                    },
                    {
                        type: "image-template",
                        imageData: img$e,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true,
                        randomFlipVertically: true
                    },
                    {
                        type: "image-template",
                        imageData: img$d,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true,
                        randomFlipVertically: true
                    },
                    {
                        type: "image-template",
                        imageData: img$c,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true
                    },
                    {
                        type: "image-template",
                        imageData: img$b,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true,
                        randomFlipVertically: true
                    }
                ]
            }
        };

        static ROCK_LG = {
            info: {
                displayName: "Large Rock",
                category: "template",
                // icon: {
                //     imageData: _ASSET_ROCK_LG_ICON
                // }
            },
            action: {
                type: "random-template",
                actions: [
                    {
                        type: "image-template",
                        imageData: img$7,
                        brush: "rock",
                        threshold: 50
                    },
                    {
                        type: "image-template",
                        imageData: img$6,
                        brush: "rock",
                        threshold: 50,
                        randomFlipHorizontally: true
                    }
                ]
            }
        };

        static CABIN = {
            info: {
                displayName: "Cabin",
                category: "template",
                // icon: {
                //     imageData: _ASSET_WOODEN_HOUSE_ICON
                // }
            },
            action: {
                type: "image-template",
                imageData: img$5,
                brush: "wood",
                threshold: 50,
                randomFlipHorizontally: true
            }
        };

        static SAND_CASTLE = {
            info: {
                displayName: "Sand Castle",
                category: "template"
            },
            action: {
                type: "image-template",
                imageData: img$4,
                brush: "sand",
                threshold: 1
            }
        };
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class StateDefinition {

        static #createStateTransition(stateFrom, stateTo) {
            const transitions = [];
            for (let i = 0; i < stateFrom.length; i++) {
                const [ax, ay] = stateFrom[i];
                const [bx, by] = stateTo[i];
                if (ax === bx && ay === by) {
                    continue;  // no change
                }
                transitions.push([[ax, ay], [bx, by]]);
            }
            return transitions;
        }

        static #createStateTransitionTable(states) {
            const stateTransitions = [];
            for (let i = 0; i < states.length; i++) {
                stateTransitions.push(StateDefinition.#createStateTransition(states[i], states[i + 1 < states.length ? i + 1 : 0]));
            }
            return stateTransitions;
        }

        static createCyclic(states) {
            const transitions = StateDefinition.#createStateTransitionTable(states);

            let minX = Number.MAX_VALUE;
            let minY = Number.MAX_VALUE;
            let maxX = Number.MIN_VALUE;
            let maxY = Number.MIN_VALUE;
            for (let state of states) {
                for (let [dx, dy] of state) {
                    minX = Math.min(minX, dx);
                    minY = Math.min(minY, dy);
                    maxX = Math.max(maxX, dx);
                    maxY = Math.max(maxY, dy);
                }
            }

            const masks = [];
            for (let state of states) {
                masks.push(new StateMask(state, minX, maxX, minY, maxY));
            }

            return new StateDefinition(states, masks, transitions, minX, maxX, minY, maxY);
        }


        #states;
        #masks;
        #transitions;
        #minX;
        #maxX;
        #minY;
        #maxY;

        constructor(states, masks, transitions, minX, maxX, minY, maxY) {
            this.#states = states;
            this.#masks = masks;
            this.#transitions = transitions;
            this.#minX = minX;
            this.#maxX = maxX;
            this.#minY = minY;
            this.#maxY = maxY;
        }

        getStates() {
            return this.#states;
        }

        getStatesCount() {
            return this.#states.length;
        }

        getMasks() {
            return this.#masks;
        }

        getTransitions() {
            return this.#transitions;
        }

        getMinX() {
            return this.#minX;
        }

        getMaxX() {
            return this.#maxX;
        }

        getMinY() {
            return this.#minY;
        }

        getMaxY() {
            return this.#maxY;
        }
    }

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class StateMask {

        #minX;
        #maxX;
        #minY;
        #maxY;
        #array

        constructor(state, minX, maxX, minY, maxY) {
            this.#minX = minX;
            this.#maxX = maxX;
            this.#minY = minY;
            this.#maxY = maxY;

            const w = Math.abs(minX) + 1 + maxX;
            const h = Math.abs(minY) + 1 + maxY;
            const array = new Uint8Array(w * h);
            for (const [dx, dy] of state) {
                const x = dx - this.#minX;
                const y = dy - this.#minY;
                const i = x + (w * y);
                array[i] = 1;
            }
            this.#array = array;
        }

        matches(dx, dy) {
            if (dx < this.#minX || dy < this.#minY || dx > this.#maxX || dy > this.#maxY) {
                // out of bounds
                return false;
            }
            const w = Math.abs(this.#minX) + 1 + this.#maxX;
            const x = dx - this.#minX;
            const y = dy - this.#minY;
            const i = x + (w * y);
            return this.#array[i] === 1;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-26
     */
    class EntityUtils {

        static isElementFallingHeavy(elementHead) {
            if (elementHead === null) {
                return false;
            }
            const typeClass = ElementHead.getTypeClass(elementHead);
            if (typeClass === ElementHead.TYPE_POWDER || typeClass === ElementHead.TYPE_POWDER_WET) {
                return true;
            }
            if (typeClass === ElementHead.TYPE_STATIC) {
                if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_ENTITY) {
                    return false;
                }
                if (ElementHead.getTypeModifierSolidBodyId(elementHead) > 0) {
                    return true;
                }
            }
            return false;
        }

        static isElementLight(elementHead) {
            if (elementHead === null) {
                return false;
            }
            const typeClass = ElementHead.getTypeClass(elementHead);
            return typeClass <= ElementHead.TYPE_GAS;

        }

        static isElementWater(elementHead) {
            if (elementHead === null) {
                return false;
            }
            const typeClass = ElementHead.getTypeClass(elementHead);
            return typeClass === ElementHead.TYPE_FLUID
                && ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_LIQUID
                && ElementHead.getSpecial(elementHead) === ElementHead.SPECIAL_LIQUID_WATER;
        }

        static isElementEntity(elementHead) {
            if (elementHead === null) {
                return false;
            }
            const behaviour = ElementHead.getBehaviour(elementHead);
            return behaviour === ElementHead.BEHAVIOUR_ENTITY
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class Entity {

        /**
         * @return {string}
         */
        getType() {
            throw 'Not implemented';
        }

        /**
         * @return {number}
         */
        getX() {
            throw 'Not implemented';
        }

        /**
         * @return {number}
         */
        getY() {
            throw 'Not implemented';
        }

        /**
         * @returns {boolean}
         */
        isActive() {
            throw 'Not implemented';
        }

        /**
         *
         * @returns {object}
         */
        serialize() {
            throw 'Not implemented';
        }

        /**
         *
         * @returns {void}
         */
        initialize() {
            throw 'Not implemented';
        }

        /**
         *
         * @returns {boolean} alive
         */
        performBeforeProcessing() {
            throw 'Not implemented';
        }

        /**
         *
         * @returns {boolean} alive
         */
        performAfterProcessing() {
            throw 'Not implemented';
        }

        /**
         *
         * @param defaultElement {Element}
         * @param rx {number} relative x
         * @param ry {number} relative y
         * @returns {[object, PositionedElement[]]}
         */
        extract(defaultElement, rx, ry) {
            throw 'Not implemented';
        }

        paint(x, y, elementArea, random) {
            throw 'Not implemented';
        }

        /**
         *
         * @returns {[number, number]}
         */
        countMaxBoundaries() {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // TODO: support collisions/interleaving with other entities
    // TODO: support flammability

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class StateBasedAbstractEntity extends Entity {

        /** @type ElementArea */
        _elementArea;
        /** @type DeterministicRandom */
        _random;
        /** @type ProcessorContext */
        _processorContext;

        /** @type StateDefinition */
        _stateDefinition;
        /** @type Brush */
        _brush;
        _areaBoundary;

        /** @type string */
        _type;
        _iteration = 0;
        _x = 0;
        _y = 0;
        _waypoint = null;
        _state = 0;
        _stuck = 0;

        constructor(type, serialized, stateDefinition, brush, gameState) {
            super();
            this._type = type;
            this._stateDefinition = stateDefinition;
            this._brush = brush;
            this._areaBoundary = 2 * (Math.abs(this._stateDefinition.getMinX() - this._stateDefinition.getMaxX()) + 1);

            this._elementArea = gameState.elementArea;
            this._random = gameState.random;
            this._processorContext = gameState.processorContext;

            if (serialized.iteration !== undefined) {
                this._iteration = serialized.iteration;
            } else {
                // set randomly; so state change will not be on the same time
                this._iteration = this._random.nextInt(this._stateDefinition.getStatesCount());
            }
            if (serialized.x !== undefined) {
                this._x = serialized.x;
            }
            if (serialized.y !== undefined) {
                this._y = serialized.y;
            }
            if (serialized.state !== undefined) {
                this._state = serialized.state;
            } else {
                // random state by default
                this._state = this._random.nextInt(this._stateDefinition.getStatesCount());
            }
            if (serialized.stuck !== undefined) {
                this._stuck = serialized.stuck;
            }
        }

        // abstract methods

        _checkIsSpace(elementHead) {
            throw 'Not implemented';
        }

        performBeforeProcessing() {
            return this._state !== -1;
        }

        performAfterProcessing() {
            return this._state !== -1;
        }

        // methods

        serialize() {
            return {
                entity: this._type,
                iteration: this._iteration,
                x: this._x,
                y: this._y,
                state: this._state,
                stuck: this._stuck,
            };
        }

        getType() {
            return this._type;
        }

        getX() {
            return this._x;
        }

        getY() {
            return this._y;
        }

        assignWaypoint(x, y) {
            this._waypoint = {
                x: x,
                y: y,
                stuck: 0
            };
        }

        unassignWaypoint() {
            this._waypoint = null;
        }

        isActive() {
            return this._state !== -1;
        }

        initialize() {
            this.paint(this._x, this._y, this._elementArea, this._random);
        }

        _incrementState() {
            const x = this._x;
            const y = this._y;

            const transitions = this._stateDefinition.getTransitions()[this._state];

            let allowed = true;
            for (const [[dx1, dy1], [dx2, dy2]] of transitions) {
                if (!this._elementArea.isValidPosition(x + dx1, y + dy1) || !this._checkIsSpaceAt(x + dx2, y + dy2)) {
                    allowed = false;
                    break;
                }
            }

            if (allowed) {
                for (const [[dx1, dy1], [dx2, dy2]] of transitions) {
                    this._elementArea.swap(x + dx1, y + dy1, x + dx2, y + dy2);
                }

                this._stuck = 0;
                this._state++;
                if (this._state === this._stateDefinition.getStates().length) {
                    this._state = 0;
                }
            } else {
                // stuck
                this._stuck++;
            }
        }

        _moveRandom(visionExtra) {
            const xChange = this._random.nextInt(3) - 1;
            const yChange = this._random.nextInt(3) - 1;

            return this._move(xChange, yChange, visionExtra);
        }

        _moveInWaypointDirection(visionExtra) {
            let dx = this._waypoint.x - this._x;
            let xChange = 0;
            if (dx > 0) {
                // move right
                xChange += 1;
            } else if (dx < 0) {
                // move left
                xChange -= 1;
            }

            let dy = this._waypoint.y - this._y;
            let yChange = 0;
            if (dy > 0) {
                // move up
                yChange += 1;
            } else if (dy < 0) {
                // move down
                yChange -= 1;
            }

            const moved = this._move(xChange, yChange, visionExtra);
            if (moved) {
                this._waypoint.stuck = 0;
            } else {
                this._waypoint.stuck++;
            }
        }

        _move(xChange, yChange, visionExtra) {
            const x = this._x;
            const y = this._y;

            const newPos = this.#countNewPosition(x, y, xChange, yChange, visionExtra);

            if (newPos !== null) {
                const [nx, ny] = newPos;

                this.#relocate(this._stateDefinition.getStates()[this._state], x, y, nx, ny);

                this._x = nx;
                this._y = ny;

                return true;
            }
            return false;
        }

        #countNewPosition(x, y, xChange, yChange, visionExtra) {
            // check boundaries

            if (x + xChange < this._areaBoundary && xChange < 0) {
                xChange = 0;
            }
            if (x + xChange > this._elementArea.getWidth() - this._areaBoundary && xChange > 0) {
                xChange = 0;
            }

            if (y + yChange < this._areaBoundary && yChange < 0) {
                yChange = 0;
            }
            if (y + yChange > this._elementArea.getHeight() - this._areaBoundary && yChange > 0) {
                yChange = 0;
            }

            // check further obstacles

            if (xChange === 0 && yChange === 0) {
                return null;
            }

            // test right | right
            if (xChange > 0 || xChange < 0) {
                for (let yy = this._stateDefinition.getMinY() - visionExtra; yy <= this._stateDefinition.getMaxY() + visionExtra; yy++) {
                    if (!this._checkIsSpaceAt(x + (xChange * 5), y + yChange + yy)) {
                        xChange = 0;
                        break;
                    }
                }
            }

            // test above | below
            if (yChange > 0 || yChange < 0) {
                for (let xx = this._stateDefinition.getMinX() - visionExtra; xx <= this._stateDefinition.getMaxX() + visionExtra; xx++) {
                    if (!this._checkIsSpaceAt(x + xChange + xx, y + (yChange * 5))) {
                        yChange = 0;
                        break;
                    }
                }
            }

            // check close obstacles

            if (xChange === 0 && yChange === 0) {
                return null;
            }

            const mask = this._stateDefinition.getMasks()[this._state];
            for (const [dx, dy] of this._stateDefinition.getStates()[this._state]) {
                if (mask.matches(xChange + dx, yChange + dy)) ; else if (!this._checkIsSpaceAt(x + xChange + dx, y + yChange + dy)) {
                    return null;
                }
            }

            return [x + xChange, y + yChange];
        }

        _moveForced(xChange, yChange) {
            const x = this._x;
            const y = this._y;

            const newPos = this.#countNewForcedPosition(x, y, xChange, yChange);

            if (newPos !== null) {
                const [nx, ny] = newPos;

                this.#relocate(this._stateDefinition.getStates()[this._state], x, y, nx, ny);

                this._x = nx;
                this._y = ny;

                return true;
            }
            return false;
        }

        #countNewForcedPosition(x, y, xChange, yChange) {
            if (x + xChange < 0 && xChange < 0) {
                xChange = 0;
            }
            if (x + xChange > this._elementArea.getWidth() && xChange > 0) {
                xChange = 0;
            }

            if (y + yChange < 0 && yChange < 0) {
                yChange = 0;
            }
            if (y + yChange > this._elementArea.getHeight() && yChange > 0) {
                yChange = 0;
            }

            if (xChange === 0 && yChange === 0) {
                return null;  // cannot move
            }

            // check is space
            for (const [dx, dy] of this._stateDefinition.getStates()[this._state]) {
                const ex = x + dx + xChange;
                const ey = y + dy + yChange;

                const elementHead = this._elementArea.getElementHeadOrNull(ex, ey);
                if (elementHead === null) {
                    return null;  // cannot move
                }
                if (ElementHead.getBehaviour(elementHead) !== ElementHead.BEHAVIOUR_ENTITY) {
                    if (ElementHead.getTypeClass(elementHead) > ElementHead.TYPE_FLUID) {
                        return null;  // cannot move
                    }
                }
            }

            return [x + xChange, y + yChange];
        }

        _checkIsSpaceAt(tx, ty) {
            const targetElementHead = this._elementArea.getElementHeadOrNull(tx, ty);
            if (targetElementHead === null) {
                return false;
            }
            return this._checkIsSpace(targetElementHead);
        }

        #relocate(state, x, y, nx, ny) {
            const sortedPoints = [...state];

            if (nx > x) {
                sortedPoints.sort((a, b) => b[0] - a[0]);
            } else if (nx < x) {
                sortedPoints.sort((a, b) => a[0] - b[0]);
            }
            if (ny > y) {
                sortedPoints.sort((a, b) => b[1] - a[1]);
            } else if (ny < y) {
                sortedPoints.sort((a, b) => a[1] - b[1]);
            }

            for (const [dx, dy] of sortedPoints) {
                this._elementArea.swap(x + dx, y + dy, nx + dx, ny + dy);
            }
        }

        _kill() {
            const x = this._x;
            const y = this._y;

            for (const [dx, dy] of this._stateDefinition.getStates()[this._state]) {
                const ex = x + dx;
                const ey = y + dy;

                const elementHead = this._elementArea.getElementHeadOrNull(ex, ey);
                if (elementHead === null) {
                    continue;
                }

                if (ElementHead.getBehaviour(elementHead) !== ElementHead.BEHAVIOUR_ENTITY) {
                    continue;
                }

                let newElementHead = elementHead;
                newElementHead = ElementHead.setType(newElementHead, ElementHead.type8Solid(ElementHead.TYPE_STATIC, 4, true));
                newElementHead = ElementHead.setBehaviour(newElementHead, ElementHead.BEHAVIOUR_NONE);
                newElementHead = ElementHead.setSpecial(newElementHead, 0);
                this._elementArea.setElementHead(ex, ey, newElementHead);
            }

            this._state = -1;
            return false;  // not active
        }

        paint(x, y, elementArea, random) {
            for (const [dx, dy] of this._stateDefinition.getStates()[this._state]) {
                const ex = x + dx;
                const ey = y + dy;

                if (!elementArea.isValidPosition(ex, ey)) {
                    continue;  // out of bounds
                }

                const element = this._brush.apply(dx, dy, random);
                elementArea.setElement(ex, ey, element);
            }
        }

        extract(defaultElement, rx, ry) {
            const x = this._x;
            const y = this._y;

            const positionedElements = [];
            for (const [dx, dy] of this._stateDefinition.getStates()[this._state]) {
                const ex = x + dx;
                const ey = y + dy;

                const elementHead = this._elementArea.getElementHeadOrNull(ex, ey);
                if (elementHead === null) {
                    continue;  // out of bounds
                }
                if (ElementHead.getBehaviour(elementHead) !== ElementHead.BEHAVIOUR_ENTITY) {
                    continue;
                }

                const elementTail = this._elementArea.getElementTail(ex, ey);
                positionedElements.push(new PositionedElement(ex, ey, elementHead, elementTail));

                this._elementArea.setElement(ex, ey, defaultElement);
            }

            const serializedEntity = this.serialize();
            // relativize entity position
            serializedEntity.x -= rx;
            serializedEntity.y -= ry;

            this._state = -1;
            return [serializedEntity, positionedElements];
        }

        countMaxBoundaries() {
            const w = Math.abs(this._stateDefinition.getMinX() - this._stateDefinition.getMaxX()) + 1;
            const h = Math.abs(this._stateDefinition.getMinY() - this._stateDefinition.getMaxY()) + 1;
            return [w, h];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class StateBasedBirdLikeEntity extends StateBasedAbstractEntity {

        static #MAX_AVG_TEMPERATURE = 10;

        static #MAX_STUCK_COUNT = 15;

        constructor(type, serialized, stateDefinition, brush, gameState) {
            super(type, serialized, stateDefinition, brush, gameState);
        }

        _checkIsSpace(elementHead) {
            if (ElementHead.getTypeClass(elementHead) > ElementHead.TYPE_GAS) {
                return false;
            }
            if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_FIRE) {
                return false;
            }
            return true;
        }

        performAfterProcessing() {
            this._iteration++;

            let isActive = (this._state !== -1);
            let isFalling = false;

            if (isActive) {
                const [retIsActive, retIsFalling] = this.#doCheckState();
                isActive = retIsActive;
                isFalling = retIsFalling;
            }

            if (isActive) {
                if (isFalling || this._stuck > 0) {
                    const xChange = this._random.nextInt(3) - 1;
                    const yChange = 1;
                    this._moveForced(xChange, yChange);
                } else if (this._iteration % 11 === 0) {
                    if (this._waypoint !== null) {
                        if (this._waypoint.stuck === 10) {
                            this._waypoint.stuck = -20;  // try random walk now...
                        }
                        if (this._waypoint.stuck >= 0) {
                            this._moveInWaypointDirection(2);
                        } else {
                            this._waypoint.stuck++;
                            this._moveRandom(2);
                        }
                    } else {
                        this._moveRandom(2);
                    }
                }
            }

            if (isActive && this._stateDefinition.getStatesCount() > 1 && this._iteration % 10 === 0) {
                this._incrementState();
            }

            return isActive;
        }

        #doCheckState() {
            const x = this._x;
            const y = this._y;
            const points = this._stateDefinition.getStates()[this._state];

            let heavyElementsAbove = false;
            let totalTemperature = 0;
            for (const [dx, dy] of points) {
                const ex = x + dx;
                const ey = y + dy;

                const elementHead = this._elementArea.getElementHeadOrNull(ex, ey);
                if (elementHead === null) {
                    // lost body part / out of bounds
                    return [this._kill(), false];
                }

                if (ElementHead.getBehaviour(elementHead) !== ElementHead.BEHAVIOUR_ENTITY) {
                    // lost body part
                    return [this._kill(), false];
                }

                totalTemperature += ElementHead.getTemperature(elementHead);

                // update
                this._elementArea.setElementHead(ex, ey, ElementHead.setSpecial(elementHead, 0));

                // check element above
                if (!heavyElementsAbove) {
                    heavyElementsAbove = EntityUtils.isElementFallingHeavy(this._elementArea.getElementHeadOrNull(ex, ey - 1));
                }
            }

            if (totalTemperature / points.length > StateBasedBirdLikeEntity.#MAX_AVG_TEMPERATURE) {
                // killed by temperature
                return [this._kill(), false];
            }

            if (this._stuck > StateBasedBirdLikeEntity.#MAX_STUCK_COUNT) {
                // stuck to death
                return [this._kill(), false];
            }

            return [true, heavyElementsAbove];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class StateBasedFishLikeEntity extends StateBasedAbstractEntity {

        static #MAX_AVG_TEMPERATURE = 10;

        static #MAX_STUCK_COUNT = 1000;

        constructor(type, serialized, stateDefinition, brush, gameState) {
            super(type, serialized, stateDefinition, brush, gameState);
        }

        _checkIsSpace(elementHead) {
            if (ElementHead.getTypeClass(elementHead) !== ElementHead.TYPE_FLUID) {
                return false;
            }
            return true;
        }

        performAfterProcessing() {
            this._iteration++;

            let isActive = (this._state !== -1);
            let isFalling = false;

            if (isActive) {
                const [retIsActive, retIsFalling] = this.#doCheckState();
                isActive = retIsActive;
                isFalling = retIsFalling;
            }

            if (isActive) {
                if (isFalling) {
                    this._moveForced(0, 1);
                } else if (this._iteration % 14 === 0) {
                    if (this._waypoint !== null) {
                        if (this._waypoint.stuck === 3) {
                            this._waypoint.stuck = -10;  // try random walk now...
                        }
                        if (this._waypoint.stuck >= 0) {
                            this._moveInWaypointDirection(1);
                        } else {
                            this._waypoint.stuck++;
                            this._moveRandom(1);
                        }
                    } else {
                        this._moveRandom(1);
                    }
                }
            }

            if (isActive && this._stateDefinition.getStatesCount() > 1 && this._iteration % 10 === 0) {
                this._incrementState();
            }

            return isActive;
        }

        #doCheckState() {
            const x = this._x;
            const y = this._y;
            const points = this._stateDefinition.getStates()[this._state];

            let heavyElementAbove = false;  // at least one
            let lightElementsAbove = true;  // all
            let waterElementsAbove = true;  // all

            let lightElementsBelow = true;  // all
            let waterElementsBelow = true;  // all

            let totalTemperature = 0;

            for (const [dx, dy] of points) {
                const ex = x + dx;
                const ey = y + dy;

                const elementHead = this._elementArea.getElementHeadOrNull(ex, ey);
                if (elementHead === null) {
                    // lost body part / out of bounds
                    return [this._kill(), false];
                }

                if (ElementHead.getBehaviour(elementHead) !== ElementHead.BEHAVIOUR_ENTITY) {
                    // lost body part
                    return [this._kill(), false];
                }

                totalTemperature += ElementHead.getTemperature(elementHead);

                // update
                this._elementArea.setElementHead(ex, ey, ElementHead.setSpecial(elementHead, 0));

                // check element above
                if (!heavyElementAbove || lightElementsAbove || waterElementsAbove) {
                    const elementHeadOrNull = this._elementArea.getElementHeadOrNull(ex, ey - 1);
                    if (!heavyElementAbove) {
                        heavyElementAbove = EntityUtils.isElementFallingHeavy(elementHeadOrNull);
                    }
                    if (lightElementsAbove) {
                        lightElementsAbove = EntityUtils.isElementLight(elementHeadOrNull);
                    }
                    if (waterElementsAbove) {
                        waterElementsAbove = EntityUtils.isElementWater(elementHeadOrNull)
                                || EntityUtils.isElementEntity(elementHeadOrNull);
                    }
                }

                // check element below
                if (lightElementsBelow || waterElementsBelow) {
                    const elementHeadOrNull = this._elementArea.getElementHeadOrNull(ex, ey + 1);
                    if (lightElementsBelow) {
                        lightElementsBelow = EntityUtils.isElementLight(elementHeadOrNull);
                    }
                    if (waterElementsBelow) {
                        waterElementsBelow = EntityUtils.isElementWater(elementHeadOrNull)
                                || EntityUtils.isElementEntity(elementHeadOrNull);
                    }
                }
            }

            if (totalTemperature / points.length > StateBasedFishLikeEntity.#MAX_AVG_TEMPERATURE) {
                // killed by temperature
                return [this._kill(), false];
            }

            if (!waterElementsAbove || !waterElementsBelow) {
                // not enough water
                this._stuck++;
            }

            if (this._stuck > StateBasedFishLikeEntity.#MAX_STUCK_COUNT) {
                // stuck to death
                return [this._kill(), false];
            }

            const falling = heavyElementAbove  // dragged
                || lightElementsBelow  // falling
                || (lightElementsAbove && waterElementsBelow);  // force submerge

            return [true, falling];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class EntityFactories {

        // bird

        static #BIRD_STATES = StateDefinition.createCyclic([
            [[0, 0], [1, -1], [-1, -1], [2, -1], [-2, -1], [3, -1], [-3, -1]],
            [[0, 0], [1, -1], [-1, -1], [2, -1], [-2, -1], [3, -2], [-3, -2]],
            [[0, 0], [1, -1], [-1, -1], [2, -2], [-2, -2], [3, -2], [-3, -2]],
            [[0, 0], [1, -1], [-1, -1], [2, -2], [-2, -2], [3, -1], [-3, -1]],
            [[0, 0], [1, -1], [-1, -1], [2, -1], [-2, -1], [3, -1], [-3, -1]],
            [[0, 0], [1, -1], [-1, -1], [2,  0], [-2,  0], [3,  0], [-3,  0]],
            [[0, 0], [1, -1], [-1, -1], [2,  0], [-2,  0], [3,  1], [-3,  1]],
            [[0, 0], [1, -1], [-1, -1], [2,  0], [-2,  0], [3,  0], [-3,  0]],
        ]);

        static #BIRD_BRUSH = Brushes.custom((x, y) => {
            // motion blur - ends of wings only
            const blurType = Math.abs(x) < 2 ? ElementTail.BLUR_TYPE_NONE : ElementTail.BLUR_TYPE_1;
            return new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_ENTITY, 0),
                    ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1)),
                ElementTail.of(0, 0, 0, blurType))
        });

        static birdFactory(serialized, gameState) {
            return new StateBasedBirdLikeEntity('bird', serialized, EntityFactories.#BIRD_STATES, EntityFactories.#BIRD_BRUSH, gameState);
        }

        // butterfly

        static #BUTTERFLY_STATES = StateDefinition.createCyclic([
            [[0, 0], [1, -1], [-1, -1]],
            [[0, 0], [1, -1], [-1, -1]],
            [[0, 0], [1,  0], [-1,  0]],
            [[0, 0], [1,  1], [-1,  1]],
            [[0, 0], [1,  1], [-1,  1]],
        ]);

        static #BUTTERFLY_BRUSH = Brushes.custom((x, y) => {
            // motion blur - ends of wings only
            const blurType = Math.abs(x) === 0 ? ElementTail.BLUR_TYPE_NONE : ElementTail.BLUR_TYPE_1;
            const r = Math.abs(x) === 0 ? 0 : 200;
            return new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_ENTITY, 0),
                    ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1)),
                ElementTail.of(r, 0, 0, blurType));
        });

        static butterflyFactory(serialized, gameState) {
            return new StateBasedBirdLikeEntity('butterfly', serialized, EntityFactories.#BUTTERFLY_STATES, EntityFactories.#BUTTERFLY_BRUSH, gameState);
        }

        // fish

        static #FISH_STATES = StateDefinition.createCyclic([
            [[0, 0], [1, 0]],
        ]);

        static #FISH_BRUSH = Brushes.custom((x, y) => {
            return new Element(
                ElementHead.of(
                    ElementHead.type8(ElementHead.TYPE_STATIC),
                    ElementHead.behaviour8(ElementHead.BEHAVIOUR_ENTITY, 0),
                    ElementHead.modifiers8(ElementHead.HMI_CONDUCTIVE_1)),
                ElementTail.of(0, 0, 0, ElementTail.BLUR_TYPE_NONE))
        });

        static fishFactory(serialized, gameState) {
            return new StateBasedFishLikeEntity('fish', serialized, EntityFactories.#FISH_STATES, EntityFactories.#FISH_BRUSH, gameState);
        }

        // ---

        static findFactoryByEntityType(type) {
            switch (type) {
                case 'bird':
                    return EntityFactories.birdFactory;
                case 'butterfly':
                    return EntityFactories.butterflyFactory;
                case 'fish':
                    return EntityFactories.fishFactory;
            }
            return null;
        }
    }

    var _ASSET_ICON_POWDERS = "<svg class=\"bi\" width=\"16\" height=\"16\" fill=\"currentColor\" xmlns=\"http://www.w3.org/2000/svg\">\r\n  <path fill-rule=\"evenodd\" d=\"M.96 11.78c.44-.76 1.74-5.69 3.38-5.3l1.74.98C7.8 8.64 9.7.4 10.78 1.05l4.96 13.93H.2c.06 0 .14-1.85.75-3.2z\"/>\r\n</svg>";

    var _ASSET_ICON_SOLID = "<svg class=\"bi\" width=\"16\" height=\"16\" viewBox=\"0 0 297 297\" xml:space=\"preserve\" xmlns=\"http://www.w3.org/2000/svg\">\r\n    <path d=\"M165 233H75c-3 0-6 2-6 6v41c0 3 3 6 6 6h90c3 0 6-3 6-6v-41c0-4-3-6-6-6zM291 231h-91c-3 0-6 3-6 6v41c0 3 3 6 6 6h91c3 0 6-3 6-6v-41c0-3-3-6-6-6zM75 137h87c4 0 7-2 7-5V91c0-3-3-5-7-5H75c-3 0-6 2-6 5v41c0 3 3 5 6 5zM289 85h-90c-3 0-6 3-6 6v40c0 3 3 6 6 6h90c4 0 7-3 7-6V91c0-3-3-6-7-6zM135 68h88c4 0 6-3 6-6V23c0-3-2-6-6-6h-88c-4 0-6 3-6 6v39c0 3 2 6 6 6zM138 163v42a6 6 0 0 0 6 6h85a6 6 0 0 0 6-6v-42a6 6 0 0 0-6-6h-85a6 6 0 0 0-6 6zM117 203v-41c0-3-3-6-7-6H13c-4 0-7 3-7 6v41c0 3 3 6 7 6h97c4 0 7-3 7-6z\"/>\r\n</svg>";

    var _ASSET_ICON_EFFECTS = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-fire\" viewBox=\"0 0 16 16\">\r\n  <path d=\"M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16m0-1c-1.657 0-3-1-3-2.75 0-.75.25-2 1.25-3C6.125 10 7 10.5 7 10.5c-.375-1.25.5-3.25 2-3.5-.179 1-.25 2 1 3 .625.5 1 1.364 1 2.25C11 14 9.657 15 8 15\"/>\r\n</svg>";

    var _ASSET_ICON_FLUIDS = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-droplet-fill\" viewBox=\"0 0 16 16\">\r\n  <path d=\"M8 16a6 6 0 0 0 6-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.503 8 0c0 0-6 5.686-6 10a6 6 0 0 0 6 6M6.646 4.646l.708.708c-.29.29-1.128 1.311-1.907 2.87l-.894-.448c.82-1.641 1.717-2.753 2.093-3.13\"/>\r\n</svg>";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class ToolDefs {

        static DEFAULT_SIZE = 6;

        static CATEGORY_NONE = undefined;
        static CATEGORY_POWDER = 'powders';
        static CATEGORY_FLUIDS = 'fluids';
        static CATEGORY_SOLIDS = 'solids';
        static CATEGORY_EFFECTS = 'effects';
        static CATEGORY_BIOLOGICAL = 'biological';

        static DEFAULT_CATEGORY_DEFINITIONS = {};
        static {
            ToolDefs.DEFAULT_CATEGORY_DEFINITIONS[ToolDefs.CATEGORY_POWDER] = {
                displayName: 'Powders',
                icon: {
                    svg: _ASSET_ICON_POWDERS
                },
                badgeStyle: {
                    color: 'black',
                    backgroundColor: '#d9bc7a',
                }
            };
            ToolDefs.DEFAULT_CATEGORY_DEFINITIONS[ToolDefs.CATEGORY_FLUIDS] = {
                displayName: 'Fluids',
                icon: {
                    svg: _ASSET_ICON_FLUIDS
                },
                badgeStyle: {
                    color: 'black',
                    backgroundColor: '#6aa6bd',
                }
            };
            ToolDefs.DEFAULT_CATEGORY_DEFINITIONS[ToolDefs.CATEGORY_SOLIDS] = {
                displayName: 'Solids',
                icon: {
                    svg: _ASSET_ICON_SOLID
                },
                badgeStyle: {
                    color: 'black',
                    backgroundColor: '#adadad',
                }
            };
            ToolDefs.DEFAULT_CATEGORY_DEFINITIONS[ToolDefs.CATEGORY_EFFECTS] = {
                displayName: 'Effects',
                icon: {
                    svg: _ASSET_ICON_EFFECTS
                },
                badgeStyle: {
                    color: 'black',
                    backgroundColor: '#ff945b',
                }
            };
        }


        static NONE = Tools.actionTool(() => {}, {
            codeName: 'none',
            displayName: 'None',
            category: ToolDefs.CATEGORY_NONE,
        });

        static ERASE = Tools.roundBrushTool(BrushDefs.AIR, ToolDefs.DEFAULT_SIZE, {
            codeName: 'erase',
            displayName: 'Erase',
            category: ToolDefs.CATEGORY_NONE,
            badgeStyle: {
                backgroundColor: '#e6e6e6',
                color: 'black'
            }
        });

        static MOVE = Tools.moveTool(13, 2048, {
            codeName: 'move',
            displayName: 'Move',
            category: ToolDefs.CATEGORY_NONE,
            badgeStyle: {
                backgroundColor: '#e6e6e6',
                color: 'black'
            }
        });

        static FLIP_VERTICALLY = Tools.globalActionTool(sg => sg.graphics().flipVertically(), {
            codeName: 'flip_vertically',
            displayName: 'Flip \u2195',
            category: ToolDefs.CATEGORY_NONE,
            badgeStyle: {
                backgroundColor: '#e6e6e6',
                color: 'black'
            }
        });

        static FLIP_HORIZONTALLY = Tools.globalActionTool(sg => sg.graphics().flipHorizontally(), {
            codeName: 'flip_horizontally',
            displayName: 'Flip \u2194',
            category: ToolDefs.CATEGORY_NONE,
            badgeStyle: {
                backgroundColor: '#e6e6e6',
                color: 'black'
            }
        });

        static SAND = Tools.roundBrushTool(BrushDefs.SAND, ToolDefs.DEFAULT_SIZE, {
            codeName: 'sand',
            displayName: 'Sand',
            category: ToolDefs.CATEGORY_POWDER,
            badgeStyle: {
                backgroundColor: '#b7a643',
            }
        });

        static SOIL = Tools.roundBrushTool(BrushDefs.SOIL, ToolDefs.DEFAULT_SIZE, {
            codeName: 'soil',
            displayName: 'Soil',
            category: ToolDefs.CATEGORY_POWDER,
            badgeStyle: {
                backgroundColor: '#8e6848',
            }
        });

        static GRAVEL = Tools.roundBrushTool(BrushDefs.GRAVEL, ToolDefs.DEFAULT_SIZE, {
            codeName: 'gravel',
            displayName: 'Gravel',
            category: ToolDefs.CATEGORY_POWDER,
            badgeStyle: {
                backgroundColor: '#656565',
            }
        });

        static COAL = Tools.roundBrushTool(BrushDefs.COAL, ToolDefs.DEFAULT_SIZE, {
            codeName: 'coal',
            displayName: 'Coal',
            category: ToolDefs.CATEGORY_POWDER,
            badgeStyle: {
                backgroundColor: '#343434',
            }
        });

        static THERMITE = Tools.roundBrushTool(BrushDefs.THERMITE, ToolDefs.DEFAULT_SIZE, {
            codeName: 'thermite',
            displayName: 'Thermite',
            category: ToolDefs.CATEGORY_POWDER,
            badgeStyle: {
                backgroundColor: '#914e47',
            }
        });

        static WALL = Tools.roundBrushTool(BrushDefs.WALL, ToolDefs.DEFAULT_SIZE, {
            codeName: 'wall',
            displayName: 'Static Wall',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#383838',
            }
        });

        static BRICK = Tools.roundBrushToolForSolidBody(BrushDefs.BRICK, ToolDefs.DEFAULT_SIZE, {
            codeName: 'brick',
            displayName: 'Brick',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#B56D64',
            }
        });

        static WOOD = Tools.roundBrushToolForSolidBody(BrushDefs.WOOD, ToolDefs.DEFAULT_SIZE, {
            codeName: 'wood',
            displayName: 'Wood',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#7b6043',
            }
        });

        static ROCK = Tools.roundBrushToolForSolidBody(BrushDefs.ROCK, ToolDefs.DEFAULT_SIZE, {
            codeName: 'rock',
            displayName: 'Rock',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#383838',
            }
        });

        static ROCK_TEMPLATES_SM = Tools.templateSelectionTool(TemplateDefs.ROCK_SM, {
            codeName: 'rock_templates_sm',
            displayName: 'Rock \u2022',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#574F48',
            }
        });

        static ROCK_TEMPLATES_MD = Tools.templateSelectionTool(TemplateDefs.ROCK_MD, {
            codeName: 'rock_templates_md',
            displayName: 'Rock \u25cf',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#574F48',
            }
        });

        static ROCK_TEMPLATES_LG = Tools.templateSelectionTool(TemplateDefs.ROCK_LG, {
            codeName: 'rock_templates_lg',
            displayName: 'Rock \u2b24',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#574F48',
            }
        });

        static METAL = Tools.roundBrushToolForSolidBody(BrushDefs.METAL, ToolDefs.DEFAULT_SIZE, {
            codeName: 'metal',
            displayName: 'Metal',
            category: ToolDefs.CATEGORY_SOLIDS,
            badgeStyle: {
                backgroundColor: '#7c7c7c',
            }
        });

        static METAL_MOLTEN = Tools.roundBrushTool(BrushDefs.METAL_MOLTEN, ToolDefs.DEFAULT_SIZE, {
            codeName: 'metal_molten',
            displayName: 'M. Metal',
            category: ToolDefs.CATEGORY_FLUIDS,
            badgeStyle: {
                backgroundColor: '#e67d00',
            }
        });

        static WATER = Tools.roundBrushTool(BrushDefs.WATER, ToolDefs.DEFAULT_SIZE, {
            codeName: 'water',
            displayName: 'Water',
            category: ToolDefs.CATEGORY_FLUIDS,
            badgeStyle: {
                backgroundColor: '#0487ba',
            }
        });

        static OIL = Tools.roundBrushTool(BrushDefs.OIL, ToolDefs.DEFAULT_SIZE, {
            codeName: 'oil',
            displayName: 'Oil',
            category: ToolDefs.CATEGORY_FLUIDS,
            badgeStyle: {
                backgroundColor: 'rgb(36,26,1)',
            }
        });

        static FIRE = Tools.roundBrushTool(Brushes.temperatureOrBrush(50, BrushDefs.FIRE), ToolDefs.DEFAULT_SIZE, {
            codeName: 'fire',
            displayName: 'Fire',
            category: ToolDefs.CATEGORY_EFFECTS,
            badgeStyle: {
                backgroundColor: '#ff5900',
            }
        });

        static METEOR = Tools.meteorTool(BrushDefs.METEOR, BrushDefs.METEOR_FROM_LEFT, BrushDefs.METEOR_FROM_RIGHT, {
            codeName: 'meteor',
            displayName: 'Meteor',
            category: ToolDefs.CATEGORY_EFFECTS,
            badgeStyle: {
                backgroundColor: '#ff5900',
            }
        });

        static EFFECT_TEMP_MINUS = Tools.roundBrushTool(Brushes.concat(BrushDefs.EFFECT_TEMP_0, BrushDefs.EFFECT_EXTINGUISH),
                ToolDefs.DEFAULT_SIZE, {

            codeName: 'effect_temp_minus',
            displayName: '°C −',
            category: ToolDefs.CATEGORY_EFFECTS,
            badgeStyle: {
                backgroundColor: '#63cffa',
            }
        });

        static EFFECT_TEMP_PLUS = Tools.roundBrushTool(BrushDefs.EFFECT_TEMP_200, ToolDefs.DEFAULT_SIZE, {
            codeName: 'effect_temp_plus',
            displayName: '°C +',
            category: ToolDefs.CATEGORY_EFFECTS,
            badgeStyle: {
                backgroundColor: '#fa9b4e',
            }
        });

        static EFFECT_TEMP_PLUS2 = Tools.roundBrushTool(BrushDefs.EFFECT_TEMP_255, ToolDefs.DEFAULT_SIZE, {
            codeName: 'effect_temp_plus2',
            displayName: '°C ⧺',
            category: ToolDefs.CATEGORY_EFFECTS,
            badgeStyle: {
                backgroundColor: '#fa9b4e',
            }
        });

        /** @type Tool[] */
        static DEFAULT_TOOLS = [
            this.ERASE,
            this.MOVE,
            this.SAND,
            this.SOIL,
            this.GRAVEL,
            this.COAL,
            this.THERMITE,
            this.WALL,
            this.BRICK,
            this.WOOD,
            this.METAL,
            this.ROCK_TEMPLATES_SM,
            this.ROCK_TEMPLATES_MD,
            this.ROCK_TEMPLATES_LG,
            this.WATER,
            this.OIL,
            this.METAL_MOLTEN,
            this.FIRE,
            this.METEOR,
            this.EFFECT_TEMP_MINUS,
            this.EFFECT_TEMP_PLUS,
            this.EFFECT_TEMP_PLUS2
        ];

        static BIRD = Tools.insertEntityTool(EntityFactories.birdFactory, {
            codeName: 'bird',
            displayName: 'Bird',
            category: ToolDefs.CATEGORY_BIOLOGICAL,
        });

        static BUTTERFLY = Tools.insertEntityTool(EntityFactories.butterflyFactory, {
            codeName: 'butterfly',
            displayName: 'Butterfly',
            category: ToolDefs.CATEGORY_BIOLOGICAL,
        });

        static FISH = Tools.insertEntityTool(EntityFactories.fishFactory, {
            codeName: 'fish',
            displayName: 'Fish',
            category: ToolDefs.CATEGORY_BIOLOGICAL,
        });


        static _LIST = {};
        static {
            const tools = [
                ToolDefs.NONE,
                ToolDefs.FLIP_HORIZONTALLY,
                ToolDefs.FLIP_VERTICALLY,
                ...ToolDefs.DEFAULT_TOOLS,
                ToolDefs.ROCK,
                ToolDefs.BIRD,
                ToolDefs.BUTTERFLY,
                ToolDefs.FISH
            ];
            for (const tool of tools) {
                ToolDefs._LIST[tool.getInfo().getCodeName()] = tool;
            }
        }

        static byCodeName(codeName) {
            const tool = ToolDefs._LIST[codeName];
            if (tool !== undefined) {
                return tool;
            }
            return null;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @version 2024-05-07
     * @author Patrik Harag
     */
    class Analytics {

        static EVENT_NAME = 'app_sand_game_js';
        static FEATURE_APP_INITIALIZED = 'initialized';
        static FEATURE_SCENARIO_COMPLETED = 's_completed';
        static FEATURE_RENDERER_FALLBACK = 'renderer_fallback';

        // options bar
        static FEATURE_PAUSE = 'pause';
        static FEATURE_DRAW_PRIMARY = 'draw_primary';
        static FEATURE_DRAW_SECONDARY = 'draw_secondary';
        static FEATURE_DRAW_TERTIARY = 'draw_tertiary';
        static FEATURE_DRAW_LINE = 'draw_line';
        static FEATURE_DRAW_RECT = 'draw_rect';
        static FEATURE_DRAW_FLOOD = 'draw_flood';
        static FEATURE_STATUS_DISPLAYED = 'status_displayed';
        static FEATURE_OPTIONS_DISPLAYED = 'options_displayed';
        static FEATURE_RENDERER_PIXELATED = 'renderer_pixelated';
        static FEATURE_RENDERER_SHOW_CHUNKS = 'renderer_show_chunks';
        static FEATURE_RENDERER_SHOW_HEATMAP = 'renderer_show_heatmap';
        static FEATURE_CANVAS_SIZE_CHANGE = 'canvas_size_change';
        static FEATURE_SWITCH_SCENE = 'switch_scene';
        static FEATURE_RESTART_SCENE = 'restart_scene';
        static FEATURE_SWITCH_SCALE = 'switch_scale';
        static FEATURE_IO_EXPORT = 'io_export';
        static FEATURE_IO_IMPORT = 'io_import';
        static FEATURE_IO_IMAGE_TEMPLATE = 'io_image_template';

        static #USED_FEATURES = new Set();


        static triggerToolUsed(tool) {
            // Note: better feature name would be tool_xxx, but we will keep backward compatibility

            let name = tool.getInfo().getCodeName();
            if (name === undefined) {
                if (tool instanceof InsertElementAreaTool || tool instanceof InsertRandomSceneTool) {
                    name = 'template';
                } else if (tool instanceof InsertEntityTool) {
                    name = 'entity';
                }
            }
            if (name !== undefined) {
                const feature = 'brush_' + name;
                Analytics.triggerFeatureUsed(feature);
            }
        }

        static triggerFeatureUsed(feature) {
            if (!Analytics.#USED_FEATURES.has(feature)) {
                // report only the first usage
                Analytics.#USED_FEATURES.add(feature);
                Analytics.#report({
                    'app_sand_game_js_feature': feature
                });
            }
        }

        static #report(properties) {
            if (typeof gtag === 'function') {
                try {
                    gtag('event', Analytics.EVENT_NAME, properties);
                } catch (e) {
                    console.warn(e);
                }
            }
            // console.log('event: ' + Analytics.EVENT_NAME + ' = ' + JSON.stringify(properties));
        }
    }

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
     *
     * @author Patrik Harag
     * @version 2022-09-25
     */
    class Counter {

        #currentValue = 0;
        #lastValue = 0;
        #start = 0;

        tick(currentTimeMillis) {
            this.#currentValue++;
            if (currentTimeMillis - this.#start >= 1000) {
                this.#lastValue = this.#currentValue;
                this.#currentValue = 0;
                this.#start = currentTimeMillis;
            }
        }

        getValue() {
            return this.#lastValue;
        }

        clear() {
            this.#lastValue = 0;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-24
     */
    class EntityPositionLookup {

        #table;
        #width;
        #height;

        /**
         *
         * @param entities {Entity[]}
         * @param width {number} element area width
         * @param height {number} element area height
         */
        constructor(entities, width, height) {
            this.#width = width;
            this.#height = height;
            const table = new Map();
            for (const entity of entities) {
                const index = (entity.getY() * width) + entity.getX();
                let array = table.get(index);
                if (array === undefined) {
                    array = [];
                    table.set(index, array);
                }
                array.push(entity);
            }
            this.#table = table;
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @return {Entity[]}
         */
        getAt(x, y) {
            if (x < 0 || y < 0) {
                return [];
            }
            if (x >= this.#width || y >= this.#height) {
                return [];
            }
            const array = this.#table.get((y * this.#width) + x);
            return array !== undefined ? array : [];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-04
     */
    class EntityManager {

        /** @type GameState */
        #gameState;

        /** @type Entity[] */
        #entities = [];

        /** @type {EntityPositionLookup} */
        #positionLookupCache = null;

        /**
         *
         * @param serializedEntities {object[]}
         * @param gameState {GameState}
         */
        constructor(serializedEntities, gameState) {
            this.#gameState = gameState;

            for (let serializedEntity of serializedEntities) {
                this.addSerializedEntity(serializedEntity, false);
            }
        }

        addSerializedEntity(serializedEntity, autoInitialize = true) {
            try {
                const entity = this.#deserialize(serializedEntity);
                this.#entities.push(entity);
                if (autoInitialize) {
                    entity.initialize();
                }
                return entity;
            } catch (e) {
                console.warn('Cannot deserialize entity', e);
                return null;
            }
        }

        /**
         *
         * @param serialized {object}
         * @return {Entity}
         */
        #deserialize(serialized) {
            if (typeof serialized !== 'object') {
                throw 'Serialized entity must be an object';
            }
            const factory = EntityFactories.findFactoryByEntityType(serialized.entity);
            if (factory !== null) {
                return factory(serialized, this.#gameState);
            }
            throw 'Entity not recognized';
        }

        performBeforeProcessing() {
            for (let i = 0; i < this.#entities.length; i++) {
                const entity = this.#entities[i];
                entity.performBeforeProcessing();
            }

            this.#positionLookupCache = null;
        }

        performAfterProcessing() {
            let toDelete = null;

            for (let i = 0; i < this.#entities.length; i++) {
                const entity = this.#entities[i];

                let active;
                try {
                    active = entity.performAfterProcessing();
                } catch (e) {
                    // some entities are very complex...
                    // log error and remove broken entity
                    console.error('Entity error', e);
                    // TODO: rethrow + error reporting (when stable)
                    active = false;
                }

                if (active === false) {
                    if (toDelete === null) {
                        toDelete = [];
                    }
                    toDelete.push();
                }
            }

            if (toDelete !== null) {
                for (let i = toDelete.length - 1; i >= 0; i--) {
                    const j = toDelete[i];
                    this.#entities.splice(j, 1);
                }
            }

            this.#positionLookupCache = null;
        }

        serializeEntities() {
            const list = [];
            for (let entity of this.#entities) {
                list.push(entity.serialize());
            }
            return list;
        }

        /**
         *
         * @param x
         * @param y
         * @returns {Entity[]}
         */
        getAt(x, y) {
            if (this.#positionLookupCache === null) {
                const width = this.#gameState.elementArea.getWidth();
                const height = this.#gameState.elementArea.getHeight();
                this.#positionLookupCache = new EntityPositionLookup(this.#entities, width, height);
            }

            return this.#positionLookupCache.getAt(x, y);
        }

        countEntities(type) {
            let count = 0;
            for (let i = 0; i < this.#entities.length; i++) {
                const entity = this.#entities[i];
                if (type === entity.getType()) {
                    count++;
                }
            }
            return count;
        }

        getEntities() {
            return this.#entities;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class GameDefaults {

        /**
         * @returns function(GameState):Extension[]
         */
        getExtensionsFactory() {
            throw 'Not implemented';
        }

        /**
         *
         * @return BrushCollection
         */
        getBrushCollection() {
            throw 'Not implemented';
        }

        /**
         * @return Element
         */
        getDefaultElement() {
            throw 'Not implemented';
        }

        // brushes

        /**
         * @return Brush
         */
        getBrushWater() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushSteam() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushGrass() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushTree() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushTreeWood() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushTreeWoodDark() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushTreeRoot() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushTreeLeaf() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushTreeLeafDark() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushFire() {
            throw 'Not implemented';
        }

        /**
         * @return Brush
         */
        getBrushAsh() {
            throw 'Not implemented';
        }

        // structures

        /**
         * @return []
         */
        getTreeTrunkTemplates() {
            throw 'Not implemented';
        }

        /**
         * @return []
         */
        getTreeLeafClusterTemplates() {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-26
     */
    class ProcessorModuleSolidBody {

        static #QUEUED_PAINT_ID = 255;
        static #NEWLY_CREATED_PAINT_ID = 254;
        static #BODY_SIZE_LIMIT_MAX = 8192;
        static #BODY_SIZE_LIMIT_MIN = 32;


        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        /** @type Uint8Array */
        #elementAreaOverlay;

        /** @type Set */
        #moved;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;
            this.#elementAreaOverlay = new Uint8Array(elementArea.getWidth() * elementArea.getHeight());
            this.#moved = new Set();
            this.#reusableLowerBorderMinY = new Uint16Array(elementArea.getWidth());
        }

        onSolidCreated(elementHead, x, y) {
            this.#elementAreaOverlay[x + (y * this.#elementArea.getWidth())] = ProcessorModuleSolidBody.#NEWLY_CREATED_PAINT_ID;
        }

        onNextIteration() {
            // TODO: optimize - do not clean if not used or needed
            this.#elementAreaOverlay.fill(0);
            this.#moved.clear();
        }

        behaviourSolid(elementHead, x, y) {
            const bodyId = ElementHead.getTypeModifierSolidBodyId(elementHead);
            // TODO: optimize - map paint id
            const paintId = bodyId;

            const point = x + (y * this.#elementArea.getWidth());
            const currentPaintId = this.#elementAreaOverlay[point];
            if (currentPaintId === ProcessorModuleSolidBody.#NEWLY_CREATED_PAINT_ID) {
                // this handles newly created tree branches etc.
                return true;
            }
            if (currentPaintId === paintId) {
                // already processed
                return this.#moved.has(paintId);
            }

            const [
                originalCount, upperBorderStack, lowerBorderStack, lowerBorderMin, properties
            ] = this.#discoverBoundaries(x, y, elementHead, paintId);

            if (this.#processorContext.isFallThroughEnabled()) {
                if (this.#bodyFallthrough(lowerBorderStack.shadowClone(), paintId)) {
                    return true;
                }
            }

            this.#extendUpperBoundaries(upperBorderStack, lowerBorderMin, paintId);

            const [
                borderCount, borderCountCanMove
            ] = this.#determineCanMove(lowerBorderStack.shadowClone(), paintId);

            // if (count >= ProcessorModuleSolidBody.#BODY_SIZE_LIMIT_MAX) {
            //     // too big
            //     return false;
            // }

            // if (count < ProcessorModuleSolidBody.#BODY_SIZE_LIMIT_MIN) {
            //     this.#bodyDestroy(paintId, borderStack);
            //     return true;
            // }

            if (properties.tree) {
                // living trees are more stable
                if (borderCount === borderCountCanMove) {
                    // falling
                    this.#bodyMove(paintId, lowerBorderStack);
                    this.#moved.add(paintId);
                    return true;
                }
            } else {
                if (borderCountCanMove / borderCount > 0.95) {
                    // falling or very unstable
                    this.#bodyMove(paintId, lowerBorderStack);
                    this.#moved.add(paintId);
                    return true;
                }

                if (borderCountCanMove / borderCount > 0.75) {
                    // unstable
                    this.#bodyPush(paintId, lowerBorderStack);
                    return false;
                }
            }

            return false;
        }

        #bodyDestroy(paintId, lowerBorderStack) {
            const w = this.#elementArea.getWidth();

            let point;
            while ((point = lowerBorderStack.pop()) !== null) {
                // process "column"

                if (point === 0xffffffff) {
                    // null point
                    continue;
                }

                const bx = point % w;
                const by = Math.trunc(point / w);

                let i = 0;
                do {
                    let elementHead = this.#elementArea.getElementHead(bx, by + i);

                    const type = this.#random.nextInt(100) < 20 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;
                    elementHead = ElementHead.setType(elementHead, ElementHead.type8Powder(type, 4));

                    let elementTail = this.#elementArea.getElementTail(bx, by + i);
                    this.#elementArea.setElementHead(bx, by + i, elementHead);
                    this.#elementArea.setElementTail(bx, by + i, elementTail);

                    if (by + i >= 0) {
                        const nextPaintId = this.#elementAreaOverlay[bx + ((by + i - 1) * w)];
                        if (nextPaintId === paintId) {
                            i--;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                } while (true);
            }
        }

        #bodyMove(paintId, lowerBorderStack) {
            const w = this.#elementArea.getWidth();
            const h = this.#elementArea.getHeight();

            let point;
            while ((point = lowerBorderStack.pop()) !== null) {
                // process "column"

                if (point === 0xffffffff) {
                    // null point
                    continue;
                }

                const bx = point % w;
                const by = Math.trunc(point / w);

                let elementHeadOld = null;
                let elementTailOld = null;
                if (by + 1 < h) {
                    elementHeadOld = this.#elementArea.getElementHead(bx, by + 1);
                    elementTailOld = this.#elementArea.getElementTail(bx, by + 1);
                }

                let i = 0;
                do {
                    const ty = by + 1 + i;
                    if (ty < h) {
                        this.#elementArea.setElementHead(bx, ty, this.#elementArea.getElementHead(bx, by + i));
                        this.#elementArea.setElementTail(bx, ty, this.#elementArea.getElementTail(bx, by + i));
                        this.#elementAreaOverlay[bx + (ty * w)] = paintId;
                    }

                    if (by + i >= 0) {
                        const nextPaintId = this.#elementAreaOverlay[bx + ((by + i - 1) * w)];
                        if (nextPaintId === paintId) {
                            i--;
                        } else {
                            break;
                        }
                    } else {
                        break;
                    }
                } while (true);

                // deal with the old element

                let reuseElement = false;
                if (elementHeadOld != null) {
                    const typeClass = ElementHead.getTypeClass(elementHeadOld);
                    if (typeClass === ElementHead.TYPE_AIR) {
                        reuseElement = true;
                    } else if (typeClass <= ElementHead.TYPE_FLUID) {
                        reuseElement = this.#reuseFluid(Math.abs(i));
                    }
                }

                if (reuseElement) {
                    // move element above the solid body
                    this.#elementArea.setElementHead(bx, by + i, elementHeadOld);
                    this.#elementArea.setElementTail(bx, by + i, elementTailOld);
                } else {
                    // set default element
                    this.#elementArea.setElement(bx, by + i, this.#processorContext.getDefaults().getDefaultElement());
                }

                // create some movement below

                this.triggerPowderElement(bx, by + 2);
            }
        }

        #reuseFluid(distance) {
            let f = 1 - (1 / (1 + Math.exp(-(0.1) * (distance - 50))));  // https://en.wikipedia.org/wiki/Sigmoid_function
            return this.#random.next() < f;
        }

        #bodyPush(paintId, lowerBorderStack) {
            const w = this.#elementArea.getWidth();

            let point;
            while ((point = lowerBorderStack.pop()) !== null) {
                // process "column"

                if (point === 0xffffffff) {
                    // null point
                    continue;
                }

                const bx = point % w;
                const by = Math.trunc(point / w);

                // create some movement below

                this.triggerPowderElement(bx, by + 1);
            }
        }

        triggerPowderElement(x, y) {
            if (this.#elementArea.isValidPosition(x, y)) {
                const elementHeadUnder = this.#elementArea.getElementHead(x, y);
                const typeUnder = ElementHead.getTypeClass(elementHeadUnder);

                if (typeUnder === ElementHead.TYPE_POWDER || typeUnder === ElementHead.TYPE_POWDER_WET) {
                    let modified = elementHeadUnder;
                    modified = ElementHead.setTypeModifierPowderSliding(modified, 1);
                    if (this.#random.nextInt(15) === 0) {
                        // change direction only once a while to make it less chaotic
                        modified = ElementHead.setTypeModifierPowderDirection(modified, this.#random.nextInt(2));
                    }
                    this.#elementArea.setElementHead(x, y, modified);
                }
            }
        }

        #determineCanMove(lowerBorderStack, paintId) {
            const w = this.#elementArea.getWidth();
            const h = this.#elementArea.getHeight();

            let borderCount = 0;
            let borderCountCanMove = 0;

            let point;
            while ((point = lowerBorderStack.pop()) !== null) {

                const bx = point % w;
                const by = Math.trunc(point / w);

                if (by + 1 < h) {
                    const elementHead = this.#elementArea.getElementHead(bx, by + 1);

                    // check whether is not connected with other "column" by extendUpperBoundaries
                    if (this.#elementAreaOverlay[bx + ((by + 1) * w)] === paintId) {
                        lowerBorderStack.removePrevious();  // remove
                        continue;
                    }

                    borderCount++;

                    // can move here?
                    const typeClass = ElementHead.getTypeClass(elementHead);
                    switch (typeClass) {
                        case ElementHead.TYPE_AIR:
                        case ElementHead.TYPE_EFFECT:
                        case ElementHead.TYPE_GAS:
                        case ElementHead.TYPE_FLUID:
                            borderCountCanMove++;
                    }
                } else {
                    borderCount++;
                }
            }

            return [borderCount, borderCountCanMove];
        }

        #bodyFallthrough(lowerBorderStack, paintId) {
            const w = this.#elementArea.getWidth();
            const h = this.#elementArea.getHeight();

            let applied = false;

            let point;
            while ((point = lowerBorderStack.pop()) !== null) {

                const bx = point % w;
                const by = Math.trunc(point / w);

                if (by === h - 1) {
                    // destroy

                    let elementHead = this.#elementArea.getElementHead(bx, by);
                    elementHead = ElementHead.setType(elementHead, ElementHead.type8Powder(ElementHead.TYPE_POWDER, 5));

                    let elementTail = this.#elementArea.getElementTail(bx, by);
                    elementTail = ElementTail.setBlurType(elementTail, ElementTail.BLUR_TYPE_1);

                    this.#elementArea.setElementHeadAndTail(bx, by, elementHead, elementTail);

                    applied = true;
                }
            }

            return applied;
        }

        #extendUpperBoundaries(upperBorderStack, lowerBorderMinY, paintId) {
            // handles e.g. sand /stuck/ inside a solid body

            const w = this.#elementArea.getWidth();
            this.#elementArea.getHeight();

            let extendedCount = 0;

            let point;
            while ((point = upperBorderStack.pop()) !== null) {
                const bx = point % w;
                const by = Math.trunc(point / w);

                const columnLowerBorderMinY = lowerBorderMinY[bx];
                if (columnLowerBorderMinY >= by) {
                    continue;
                }
                // there is at leas one lower border above this upper border

                let i = 0;
                let ty;
                while ((ty = by - (i + 1)) >= 0 && ty > columnLowerBorderMinY) {
                    const nextPaintId = this.#elementAreaOverlay[bx + (ty * w)];

                    if (nextPaintId === paintId) {
                        // lower boundary reached
                        break;
                    }

                    if (nextPaintId !== 0) {
                        // already in another body
                        break;
                    }

                    const elementHead = this.#elementArea.getElementHead(bx, ty);
                    const typeClass = ElementHead.getTypeClass(elementHead);

                    // TODO: Im not sure here
                    /*if (typeClass <= ElementHead.TYPE_FLUID) {
                        // light element
                        break;
                    } else*/ if (typeClass < ElementHead.TYPE_STATIC) {
                        // extend
                        this.#elementAreaOverlay[bx + (ty * w)] = paintId;
                        extendedCount++;
                        i++;
                    } else {
                        // too heavy element
                        break;
                    }
                }
            }

            return extendedCount;
        }

        #reusableWorkStack = new Uint32Stack();
        #reusableUpperBorderStack = new Uint32Stack();
        #reusableLowerBorderStack = new Uint32Stack();
        #reusableLowerBorderMinY;  // new Uint16Array(width);

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param elementHead {number}
         * @param paintId {number}
         * @return {[number, Uint32Stack, Uint32Stack, Uint16Array, object]} result
         */
        #discoverBoundaries(x, y, elementHead, paintId) {
            const pattern = 0b11110111;  // falling id and type class
            const matcher = this.#elementArea.getElementHead(x, y) & pattern;

            const w = this.#elementArea.getWidth();

            const stack = this.#reusableWorkStack;
            stack.reset();

            const upperBorderStack = this.#reusableUpperBorderStack;
            upperBorderStack.reset();

            const lowerBorderStack = this.#reusableLowerBorderStack;
            lowerBorderStack.reset();

            const lowerBorderMinY = this.#reusableLowerBorderMinY;
            lowerBorderMinY.fill(0xffff);  // not set

            const properties = {
                tree: ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_TREE  // default value
            };

            let count = 0;
            let point = x + y * w;
            do {
                const x = point % w;
                const y = Math.trunc(point / w);

                this.#elementAreaOverlay[point] = paintId;
                count++;

                const upperBorder = this.#discoverNeighbour(x, y - 1, pattern, matcher, stack, paintId, properties);
                if (upperBorder) {
                    upperBorderStack.push(point);
                }

                this.#discoverNeighbour(x + 1, y, pattern, matcher, stack, paintId, properties);
                this.#discoverNeighbour(x - 1, y, pattern, matcher, stack, paintId, properties);

                if (ElementHead.getTypeModifierSolidNeighbourhoodType(this.#elementArea.getElementHead(x, y)) === 0) {
                    // extended neighbourhood
                    this.#discoverNeighbour(x + 1, y - 1, pattern, matcher, stack, paintId, properties);
                    this.#discoverNeighbour(x - 1, y - 1, pattern, matcher, stack, paintId, properties);
                    this.#discoverNeighbour(x + 1, y + 1, pattern, matcher, stack, paintId, properties);
                    this.#discoverNeighbour(x - 1, y + 1, pattern, matcher, stack, paintId, properties);
                }

                const lowerBorder = this.#discoverNeighbour(x, y + 1, pattern, matcher, stack, paintId, properties);
                if (lowerBorder) {
                    lowerBorderStack.push(point);
                    const oldMin = lowerBorderMinY[x];
                    lowerBorderMinY[x] = (oldMin === 0xffff) ? y : Math.min(oldMin, y);
                }

            } while ((point = stack.pop()) != null);

            return [count, upperBorderStack, lowerBorderStack, lowerBorderMinY, properties];
        }

        #discoverNeighbour(x, y, pattern, matcher, stack, targetPaintId, properties) {
            if (x < 0 || y < 0) {
                return true;  // border
            }

            const w = this.#elementArea.getWidth();
            const h = this.#elementArea.getHeight();
            if (x >= w || y >= h) {
                return true;  // border
            }

            const point = x + (y * w);
            const currentPaintId = this.#elementAreaOverlay[point];
            if (currentPaintId === ProcessorModuleSolidBody.#QUEUED_PAINT_ID) {
                // already queued
                return false;  // no border
            }
            if (currentPaintId === targetPaintId) {
                // already done
                return false;  // no border
            }

            const elementHead = this.#elementArea.getElementHead(x, y);

            if (!properties.tree) {
                if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_TREE) {
                    properties.tree = true;
                }
            }

            if ((elementHead & pattern) !== matcher) {
                // no match
                return true;  // border
            }

            this.#elementAreaOverlay[point] = ProcessorModuleSolidBody.#QUEUED_PAINT_ID;
            stack.push(point);
            return false;  // no border
        }
    }

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-23
     */
    class Uint32Stack {
        static create(size) {
            return new Uint32Stack(new Uint32Array(Math.max(1, size)));
        }

        /** @type Uint32Array */
        #array;
        #i = -1;

        constructor(array = new Uint32Array(1)) {
            this.#array = array;
        }

        push(value) {
            if (this.#array.length === this.#i + 1) {
                // increase size
                const newArray = new Uint32Array(this.#array.length * 2);
                newArray.set(this.#array);
                this.#array = newArray;
            }
            this.#array[++this.#i] = value;
        }

        pop() {
            if (this.#i === -1) {
                return null;
            }
            return this.#array[this.#i--];
        }

        shadowClone() {
            const clone = new Uint32Stack(this.#array);
            clone.#i = this.#i;
            return clone;
        }

        removePrevious() {
            this.#array[this.#i + 1] = 0xffffffff;
        }

        reset() {
            this.#i = -1;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-25
     */
    class ProcessorModuleEntity {

        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;
        }

        behaviourEntity(elementHead, x, y) {
            const special = ElementHead.getSpecial(elementHead);

            if (special < 5) {
                // increment
                const newElementHead = ElementHead.setSpecial(elementHead, special + 1);
                this.#elementArea.setElementHead(x, y, newElementHead);
            } else {
                // destroy
                const type = this.#random.nextInt(100) < 20 ? ElementHead.TYPE_POWDER : ElementHead.TYPE_POWDER_WET;

                let newElementHead = elementHead;
                newElementHead = ElementHead.setType(newElementHead, ElementHead.type8Powder(type, 4));
                newElementHead = ElementHead.setBehaviour(newElementHead, ElementHead.BEHAVIOUR_NONE);
                newElementHead = ElementHead.setSpecial(newElementHead, 0);
                this.#elementArea.setElementHead(x, y, newElementHead);
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-01
     */
    class ProcessorModuleFire {

        static #FIRE_MIN_TEMPERATURE = 34;

        static createFireElementHead(temperature) {
            let elementHead = ElementHead.of(ElementHead.TYPE_EFFECT, ElementHead.BEHAVIOUR_FIRE);
            elementHead = ElementHead.setTemperature(elementHead, temperature);
            return elementHead;
        }

        static createFireElementTail(temperature) {
            let elementTail = ElementTail.of(0, 0, 0);

            if (temperature > 213)
                elementTail = ElementTail.setColor(elementTail, 249, 219, 30);
            else if (temperature > 170)
                elementTail = ElementTail.setColor(elementTail, 248, 201,  7);
            else if (temperature > 128)
                elementTail = ElementTail.setColor(elementTail, 250, 150,  3);
            else if (temperature > 85)
                elementTail = ElementTail.setColor(elementTail, 255, 111,  0);
            else if (temperature > 80)
                elementTail = ElementTail.setColor(elementTail, 255,  37,  0);
            else if (temperature > 75)
                elementTail = ElementTail.setColor(elementTail, 250,   4,  5);
            else
                elementTail = ElementTail.setColor(elementTail, 125,   0,  0);

            return elementTail;
        }


        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;
        }

        // FIRE

        behaviourFire(elementHead, x, y) {
            if (this.#random.nextInt(4) !== 0) {
                return;  // it would disappear too quickly...
            }

            // count new temperature
            const temperature = ElementHead.getTemperature(elementHead);
            const newTemperature = this.#countNewTemperature(x, y, temperature);
            if (newTemperature < ProcessorModuleFire.#FIRE_MIN_TEMPERATURE) {
                // the fire will disappear
                this.#elementArea.setElement(x, y, this.#processorContext.getDefaults().getDefaultElement());
                return;
            }

            const elementHeadAbove = this.#elementArea.getElementHeadOrNull(x, y - 1);
            // check is fluid above
            if (ElementHead.getTypeClass(elementHeadAbove) === ElementHead.TYPE_FLUID) {
                this.#elementArea.setElement(x, y, this.#processorContext.getDefaults().getDefaultElement());
                return;
            }

            // spread or update
            if (elementHeadAbove !== null && this.#couldBeReplacedByFire(elementHeadAbove)) {
                this.#elementArea.setElementHead(x, y - 1, ProcessorModuleFire.createFireElementHead(newTemperature));
                this.#elementArea.setElementTail(x, y - 1, ProcessorModuleFire.createFireElementTail(newTemperature));
            } else {
                this.#elementArea.setElementHead(x, y, ElementHead.setTemperature(elementHead, newTemperature));
                this.#elementArea.setElementTail(x, y, ProcessorModuleFire.createFireElementTail(newTemperature));
            }

            // affect near elements:
            //   # #
            //   #O#
            //    #
            this.#fireEffect(x + 1, y - 1, newTemperature);
            this.#fireEffect(x - 1, y - 1, newTemperature);
            this.#fireEffect(x + 1, y, newTemperature);
            this.#fireEffect(x - 1, y, newTemperature);
            this.#fireEffect(x, y + 1, newTemperature);
        }

        #countNewTemperature(x, y, currentTemperature) {
            let newTemperature = currentTemperature
                    + this.#getTemperatureAt(x, y + 1)          // under
                    + this.#getTemperatureAt(x + 1, y + 1)   // under right
                    + this.#getTemperatureAt(x - 1, y + 1);  // under left

            newTemperature = newTemperature / 4;

            if (newTemperature < 76) {
                if (this.#random.nextInt(2) === 0) {
                    newTemperature -= this.#random.nextInt(10);
                }
            } else {
                if (this.#random.nextInt(2) === 0) {
                    newTemperature -= this.#random.nextInt(50);
                }
            }
            if (newTemperature < 0) {
                newTemperature = 0;
            }
            return newTemperature;
        }

        #getTemperatureAt(x, y) {
            const elementHead = this.#elementArea.getElementHeadOrNull(x, y);
            if (elementHead !== null) {
                return ElementHead.getTemperature(elementHead);
            }
            return null;
        }

        #couldBeReplacedByFire(elementHead) {
            return ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_AIR;
        }

        #fireEffect(x, y, temperature) {
            const elementHead = this.#elementArea.getElementHeadOrNull(x, y);
            if (elementHead == null) {
                return;
            }

            if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_FIRE) {
                // affect fire
                const otherTemperature = ElementHead.getTemperature(elementHead);
                if (otherTemperature < temperature) {
                    const newTemperature = Math.trunc((temperature - otherTemperature) / 2);
                    if (newTemperature > ProcessorModuleFire.#FIRE_MIN_TEMPERATURE) {
                        this.#elementArea.setElementHead(x, y, ProcessorModuleFire.createFireElementHead(newTemperature));
                        this.#elementArea.setElementTail(x, y, ProcessorModuleFire.createFireElementTail(newTemperature));
                    }
                }
                return;
            }

            // for air elements...
            if (ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_AIR) {
                // spreading
                const newTemperature = Math.trunc(temperature * 0.7);
                if (newTemperature > ProcessorModuleFire.#FIRE_MIN_TEMPERATURE) {
                    this.#elementArea.setElementHead(x, y, ProcessorModuleFire.createFireElementHead(newTemperature));
                    this.#elementArea.setElementTail(x, y, ProcessorModuleFire.createFireElementTail(newTemperature));
                }
                return;
            }

            // for flammable elements...
            const heatModIndex = ElementHead.getHeatModIndex(elementHead);
            const flammableChance = ElementHead.hmiToFlammableChanceTo10000(heatModIndex);
            if (flammableChance !== 0) {
                if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_FIRE_SOURCE) {
                    // already in fire
                    return;
                }
                if (this.#random.nextInt(10000) < flammableChance) {
                    // ignite
                    this.ignite(elementHead, x, y);
                    return;
                }
            }

            // increase temperature
            if (this.#random.nextInt(5) === 0) {
                const currentTemperature = ElementHead.getTemperature(elementHead);
                if (currentTemperature < temperature) {
                    const modifiedElementHead = ElementHead.setTemperature(elementHead, temperature);
                    this.#elementArea.setElementHead(x, y, modifiedElementHead);
                }
            }

            // visual change
            if (VisualEffects.isVisualBurnApplicable(elementHead)) {
                if (this.#random.nextInt(10) === 0) {
                    const elementTail = this.#elementArea.getElementTail(x, y);
                    this.#elementArea.setElementTail(x, y, VisualEffects.visualBurn(elementTail, 1, 2));
                }
            }
        }

        // FIRE SOURCE

        behaviourFireSource(elementHead, x, y) {
            const heatModIndex = ElementHead.getHeatModIndex(elementHead);
            const flameHeat = ElementHead.hmiToFlameHeat(heatModIndex);
            const burnDownChange = ElementHead.hmiToBurnDownChanceTo10000(heatModIndex);

            if (this.#random.nextInt(10000) < burnDownChange) {
                // burned down
                if (ElementHead.getTypeClass(elementHead) >= ElementHead.TYPE_POWDER && this.#random.nextInt(100) < 8) {
                    // turn into ash
                    const oldTemperature = ElementHead.getTemperature(elementHead);
                    const ashElement = this.#processorContext.getDefaults().getBrushAsh().apply(x, y, this.#random);
                    const modifiedAshElementHead = ElementHead.setTemperature(ashElement.elementHead, oldTemperature);
                    const modifiedAshElementTail = ashElement.elementTail;
                    this.#elementArea.setElementHeadAndTail(x, y, modifiedAshElementHead, modifiedAshElementTail);
                } else {
                    // turn into fire element
                    this.#elementArea.setElementHead(x, y, ProcessorModuleFire.createFireElementHead(flameHeat));
                    this.#elementArea.setElementTail(x, y, ProcessorModuleFire.createFireElementTail(flameHeat));
                }
                return;
            }

            // affect others
            const flags = this.#fireSourceEffect(x, y - 1, flameHeat)
                    | this.#fireSourceEffect(x, y + 1, flameHeat)
                    | this.#fireSourceEffect(x - 1, y, flameHeat)
                    | this.#fireSourceEffect(x + 1, y, flameHeat);

            if (flags === 0b00 || (flags & 0b10) !== 0) {  // no air || some water
                // extinguish
                this.#elementArea.setElementHead(x, y, ElementHead.setBehaviour(elementHead, ElementHead.BEHAVIOUR_NONE));
                return;
            }

            if (ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_STATIC) {
                // occasionally a falling piece...
                if (this.#random.nextInt(10000) < 2) {
                    const type = ElementHead.type8Powder(ElementHead.TYPE_POWDER, 5, 1, this.#random.nextInt(2));
                    this.#elementArea.setElementHead(x, y, ElementHead.setType(elementHead, type));
                    return;
                }
            }

            // update temperature
            this.#elementArea.setElementHead(x, y, ElementHead.setTemperature(elementHead, flameHeat));
        }

        #fireSourceEffect(x, y, temperature) {
            const elementHead = this.#elementArea.getElementHeadOrNull(x, y);
            if (elementHead === null) {
                return 0b00;
            }

            // water => extinguish
            if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_LIQUID
                    && ElementHead.getSpecial(elementHead) === ElementHead.SPECIAL_LIQUID_WATER) {
                return 0b10;
            }

            // air => spawn fire
            if (ElementHead.getTypeClass(elementHead) <= ElementHead.TYPE_EFFECT) {
                // air found
                const actualTemperature = this.#random.nextInt(temperature);
                if (actualTemperature >= ProcessorModuleFire.#FIRE_MIN_TEMPERATURE) {
                    this.#elementArea.setElementHead(x, y, ProcessorModuleFire.createFireElementHead(actualTemperature));
                    this.#elementArea.setElementTail(x, y, ProcessorModuleFire.createFireElementTail(actualTemperature));
                }
                return 0b01;
            }

            // visual change
            if (VisualEffects.isVisualBurnApplicable(elementHead)) {
                if (this.#random.nextInt(1000) === 0) {
                    const elementTail = this.#elementArea.getElementTail(x, y);
                    this.#elementArea.setElementTail(x, y, VisualEffects.visualBurn(elementTail, 1, 2));
                }
            }

            return 0b00;
        }

        // UTILS

        ignite(elementHead, x, y, heatModIndex) {
            let modifiedElementHead = ElementHead.setBehaviour(elementHead, ElementHead.BEHAVIOUR_FIRE_SOURCE);
            modifiedElementHead = ElementHead.setTemperature(modifiedElementHead, ElementHead.hmiToFlameHeat(heatModIndex));
            this.#elementArea.setElementHead(x, y, modifiedElementHead);
            // change visual
            const elementTail = this.#elementArea.getElementTail(x, y);
            this.#elementArea.setElementTail(x, y, VisualEffects.visualBurn(elementTail, 2));
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-07-23
     */
    class CircleIterator {

        // This may look ugly but it's all I need

        // BLUEPRINT_3 and BLUEPRINT_4 are not needed, but they are used frequently

        static BLUEPRINT_3 = [
            '  333',
            ' 32223',
            '3211123',
            '3210123',
            '3211123',
            ' 32223',
            '  333',
        ];

        static BLUEPRINT_4 = [
            '   444   ',
            '  43334',
            ' 4322234',
            '432111234',
            '432101234',
            '432111234',
            ' 4322234',
            '  43334',
            '   444'
        ];

        static BLUEPRINT_9 = [
            '       99999       ',
            '     998888899',
            '   9988777778899',
            '  998776666677899',
            '  987665555566789',
            ' 98766554445566789',
            ' 98765543334556789',
            '9876554322234556789',
            '9876543211123456789',
            '9876543210123456789',
            '9876543211123456789',
            '9876554322234556789',
            ' 98765543334556789',
            ' 98766554445566789',
            '  987665555566789',
            '  998776666677899',
            '   9988777778899',
            '     998888899',
            '       99999'
        ];

        /**
         *
         * @param blueprint {string[]}
         * @param handler {function(dx: number, dy: number, level: number)}
         */
        static iterate(blueprint, handler) {
            const w = blueprint[0].length;
            const h = blueprint.length;
            const offsetX = Math.trunc(w / 2);
            const offsetY = Math.trunc(h / 2);

            for (let i = 0; i < blueprint.length; i++) {
                const row = blueprint[i];
                for (let j = 0; j < row.length; j++) {
                    const char = row.charAt(j);
                    if (char !== ' ') {
                        handler(j - offsetX, i - offsetY, +char);
                    }
                }
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class ProcessorModuleMeteor {

        // TODO: leave some metal behind...
        // TODO: when water hit?

        static DIRECTION_FROM_TOP = 0;
        static DIRECTION_FROM_LEFT = 1;
        static DIRECTION_FROM_RIGHT = 2;

        static #HEAT = 100;

        static #EXPLOSION_MAX_HEAT_LVL_8 = 255;
        static #EXPLOSION_MAX_HEAT_LVL_9 = 220;
        static #EXPLOSION_MAX_HEAT_VARIANCE = 60;

        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;
        }

        behaviourMeteor(elementHead, x, y) {
            this.#spawnFire(elementHead, x, y);

            const special = ElementHead.getSpecial(elementHead);
            const move = special & 0x1;
            let newSpecial = special ^ (!move);
            elementHead = ElementHead.setSpecial(elementHead, newSpecial);
            this.#elementArea.setElementHead(x, y, elementHead);
            if (!move) {
                return;  // move only once per simulation iteration
            }

            // resolve direction
            const slope = 4;
            const direction = (special & (~0x1)) >> 1;
            let tx, ty;
            if (direction === ProcessorModuleMeteor.DIRECTION_FROM_TOP) {
                ty = y + 1;
                tx = x;
            } else if (direction === ProcessorModuleMeteor.DIRECTION_FROM_LEFT) {
                ty = y + 1;
                tx = x + (ty % slope === 0 ? 1 : 0);
            } else if (direction === ProcessorModuleMeteor.DIRECTION_FROM_RIGHT) {
                ty = y + 1;
                tx = x - (ty % slope === 0 ? 1 : 0);
            } else {
                // unknown direction
                ty = y + 1;
                tx = x;
            }

            if (this.#elementArea.isValidPosition(tx, ty)) {
                if (this.#processorContext.isFallThroughEnabled() && ty === this.#elementArea.getHeight() - 1) {
                    // handle meteor in fallthrough mode
                    if (this.#canMove(tx, 0)) {
                        // teleport
                        this.#elementArea.swap(x, y, tx, 0);
                        this.#processorContext.trigger(tx, 0);
                    }
                } else if (this.#canMove(tx, ty)) {
                    // move
                    this.#elementArea.swap(x, y, tx, ty);
                } else {
                   this.#explode(elementHead, x, y);
                }
            } else {
                this.#explode(elementHead, x, y);
            }
        }

        #canMove(x, y) {
            const targetElementHead = this.#elementArea.getElementHead(x, y);
            const typeClass = ElementHead.getTypeClass(targetElementHead);
            if (typeClass <= ElementHead.TYPE_GAS || typeClass === ElementHead.TYPE_FLUID) {
                return true;
            }
            const behaviour = ElementHead.getBehaviour(targetElementHead);
            if (behaviour === ElementHead.BEHAVIOUR_TREE_LEAF) {
                return true;
            }
            if (behaviour === ElementHead.BEHAVIOUR_GRASS) {
                return true;
            }
            return false;
        }

        #spawnFire(elementHead, x, y) {
            CircleIterator.iterate(CircleIterator.BLUEPRINT_4, (dx, dy, level) => {
                if (level === 0) {
                    return;  // ignore center
                }

                const tx = x + dx;
                const ty = y + dy;
                if (this.#elementArea.isValidPosition(tx, ty)) {
                    let targetElementHead = this.#elementArea.getElementHead(tx, ty);
                    if (ElementHead.getTypeClass(targetElementHead) <= ElementHead.TYPE_GAS) {
                        const brush = this.#processorContext.getDefaults().getBrushFire();
                        this.#elementArea.setElement(tx, ty, brush.apply(tx, ty, this.#random));
                    } else {
                        const modifiedElementHead = ElementHead.setTemperature(targetElementHead, ProcessorModuleMeteor.#HEAT);
                        this.#elementArea.setElementHead(tx, ty, modifiedElementHead);
                    }
                }
            });
        }

        #explode(elementHead, x, y) {
            CircleIterator.iterate(CircleIterator.BLUEPRINT_9, (dx, dy, level) => {
                const tx = x + dx;
                const ty = y + dy;
                if (this.#elementArea.isValidPosition(tx, ty)) {
                    let targetElementHead = this.#elementArea.getElementHead(tx, ty);
                    if (level !== 0 && ElementHead.getBehaviour(targetElementHead) === ElementHead.BEHAVIOUR_METEOR) {
                        // do not destroy other meteors
                        return;
                    }

                    if (level <= 7) {
                        // destroy elements & spawn fire
                        const brush = this.#processorContext.getDefaults().getBrushFire();
                        this.#elementArea.setElement(tx, ty, brush.apply(tx, ty, this.#random));
                    } else {
                        // set temperature, apply visual changes, break solid elements

                        // set temperature
                        const maxHeat = (level === 8)
                                ? ProcessorModuleMeteor.#EXPLOSION_MAX_HEAT_LVL_8
                                : ProcessorModuleMeteor.#EXPLOSION_MAX_HEAT_LVL_9;
                        const heat = maxHeat - this.#random.nextInt(ProcessorModuleMeteor.#EXPLOSION_MAX_HEAT_VARIANCE);
                        targetElementHead = ElementHead.setTemperature(targetElementHead, heat);

                        // visual burnt effect (color)
                        if (VisualEffects.isVisualBurnApplicable(targetElementHead)) {
                            let targetElementTail = this.#elementArea.getElementTail(tx, ty);
                            if (level === 8) {
                                targetElementTail = VisualEffects.visualBurn(targetElementTail, 2);
                            } else {
                                targetElementTail = VisualEffects.visualBurn(targetElementTail, 1);
                            }
                            this.#elementArea.setElementTail(tx, ty, targetElementTail);
                        }

                        // turn some solid elements into fragments
                        if (ElementHead.getTypeClass(targetElementHead) === ElementHead.TYPE_STATIC) {
                            if (level === 8 || (level === 9 && this.#random.nextInt(10) < 3)) {
                                const type = ElementHead.type8Powder(ElementHead.TYPE_POWDER, 5);
                                targetElementHead = ElementHead.setType(targetElementHead, type);
                            }
                        }

                        this.#elementArea.setElementHead(tx, ty, targetElementHead);
                    }
                }
            });
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-08
     */
    class ProcessorModuleGrass {

        static #MAX_TEMPERATURE = 20;

        static canGrowUpHere(elementArea, x, y) {
            if (x < 0 || y - 1 < 0) {
                return false;
            }
            if (x >= elementArea.getWidth() || y + 1 >= elementArea.getHeight()) {
                return false;
            }
            let e1 = elementArea.getElementHead(x, y);
            if (ElementHead.getTypeClass(e1) !== ElementHead.TYPE_AIR) {
                return false;
            }
            if (ElementHead.getTemperature(e1) >= this.#MAX_TEMPERATURE) {
                return false;
            }
            let e2 = elementArea.getElementHead(x, y + 1);
            if (ElementHead.getBehaviour(e2) !== ElementHead.BEHAVIOUR_SOIL) {
                return false;
            }
            if (ElementHead.getTemperature(e2) >= this.#MAX_TEMPERATURE) {
                return false;
            }
            let e3 = elementArea.getElementHead(x, y - 1);
            if (ElementHead.getTypeClass(e3) !== ElementHead.TYPE_AIR) {
                return false;
            }
            return true;
        }

        static spawnHere(elementArea, x, y, brush, random) {
            let element = brush.apply(x, y, random);
            let offset = 0;
            for (let i = ElementHead.getSpecial(element.elementHead); i >= 0; i--) {
                if (y - offset < 0) {
                    break;
                }
                elementArea.setElementHead(x, y - offset, ElementHead.setSpecial(element.elementHead, i));
                elementArea.setElementTail(x, y - offset, element.elementTail);
                offset++;
            }
        }


        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;
        }

        behaviourGrass(elementHead, x, y) {
            // check temperature
            if (ElementHead.getTemperature(elementHead) > ProcessorModuleGrass.#MAX_TEMPERATURE) {
                this.#elementArea.setElementHead(x, y, ElementHead.setBehaviour(elementHead, 0));
                const elementTail = this.#elementArea.getElementTail(x, y);
                const visualEffectForce = this.#random.nextInt(2) + 1;
                this.#elementArea.setElementTail(x, y, VisualEffects.visualBurn(elementTail, visualEffectForce));
            }

            let random = this.#random.nextInt(100);
            if (random < 3) {
                // check above
                if (y > 0) {
                    let above1 = this.#elementArea.getElementHead(x, y - 1);
                    if (ElementHead.getBehaviour(above1) !== ElementHead.BEHAVIOUR_GRASS) {
                        let typeAbove1 = ElementHead.getTypeClass(above1);
                        if (typeAbove1 > ElementHead.TYPE_FLUID
                                || (typeAbove1 === ElementHead.TYPE_FLUID && this.#random.nextInt(100) === 0)) {
                            // note: it takes longer for water to suffocate the grass
                            // remove grass
                            this.#elementArea.setElement(x, y, this.#processorContext.getDefaults().getDefaultElement());
                            return;
                        }
                    }
                }

                if (random === 0) {
                    // grow up
                    let growIndex = ElementHead.getSpecial(elementHead);
                    if (growIndex === 0) {
                        // maximum height
                        if (this.#random.nextInt(5) === 0) {
                            // remove top element to create some movement
                            this.#elementArea.setElement(x, y, this.#processorContext.getDefaults().getDefaultElement());
                        }
                        return;
                    }
                    if (y === 0) {
                        return;
                    }
                    let above1 = this.#elementArea.getElementHead(x, y - 1);
                    if (ElementHead.getTypeClass(above1) !== ElementHead.TYPE_AIR) {
                        return;
                    }
                    if (y > 1) {
                        let above2 = this.#elementArea.getElementHead(x, y - 2);
                        if (ElementHead.getTypeClass(above2) !== ElementHead.TYPE_AIR) {
                            return;
                        }
                    }
                    this.#elementArea.setElementHead(x, y - 1, ElementHead.setSpecial(elementHead, growIndex - 1));
                    this.#elementArea.setElementTail(x, y - 1, this.#elementArea.getElementTail(x, y));
                } else if (random === 1) {
                    // grow right
                    if (ProcessorModuleGrass.canGrowUpHere(this.#elementArea, x + 1, y + 1)) {
                        const brush = this.#processorContext.getDefaults().getBrushGrass();
                        this.#elementArea.setElement(x + 1, y + 1, brush.apply(x, y, this.#random));
                    }
                } else if (random === 2) {
                    // grow left
                    if (ProcessorModuleGrass.canGrowUpHere(this.#elementArea, x - 1, y + 1)) {
                        const brush = this.#processorContext.getDefaults().getBrushGrass();
                        this.#elementArea.setElement(x - 1, y + 1, brush.apply(x, y, this.#random));
                    }
                }
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-12
     */
    class ProcessorModuleTree {

        static TYPE_TRUNK = 1;
        static TYPE_BRANCH = 2;
        static TYPE_LEAF = 3;
        static TYPE_ROOT = 4;

        static #MAX_TREE_TEMPERATURE = 100;
        static #MAX_WOOD_TEMPERATURE = 50;
        static #MAX_LEAF_TEMPERATURE = 40;

        static #NOISE = VisualEffects.visualNoiseProvider(7616891641);

        static #LEAF_NOISE = (elementTail, x, y) => {
            return ProcessorModuleTree.#NOISE.visualNoise(elementTail, x, y, 10, 0.5, 1, 68, 77, 40);
        };

        static #TRUNK_NOISE = (elementTail, x, y) => {
            return ProcessorModuleTree.#NOISE.visualNoise(elementTail, x, y, 4, 0.5, 0.9, 87, 61, 39);
        };

        static spawnHere(elementArea, x, y, type, brush, random, processorContext, levelsToGrow = -1) {
            type = type % (1 << ElementHead.FIELD_SPECIAL_SIZE);

            const element = brush.apply(x, y, random);
            element.elementHead = ElementHead.setSpecial(element.elementHead, type);  // override tree type
            elementArea.setElement(x, y, element);

            // tree fast grow
            const template = processorContext.getDefaults().getTreeTrunkTemplates()[type];
            if (template === undefined) {
                throw 'Tree template not found: ' + type;
            }
            const treeModule = new ProcessorModuleTree(elementArea, random, processorContext);
            treeModule.#treeGrow(element.elementHead, x, y, template, levelsToGrow);

            // roots fast grow
            for (let i = 1; i < 10; i++) {
                for (let j = 0; j < 9; j++) {
                    const tx = x + j - 4;
                    const ty = y + i;

                    if (!elementArea.isValidPosition(tx, ty)) {
                        continue;
                    }
                    const targetElement = elementArea.getElementHead(tx, ty);
                    if (ElementHead.getBehaviour(targetElement) !== ElementHead.BEHAVIOUR_TREE_ROOT) {
                        continue;
                    }
                    const growIndex = ElementHead.getSpecial(targetElement);
                    if (growIndex === 0) {
                        continue;
                    }

                    const direction = random.nextInt(10);
                    treeModule.#treeRootGrow(tx, ty, targetElement, growIndex, direction);
                }
            }
        }


        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        #trunkTreeTemplates;
        #leafClusterTemplates;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;

            this.#trunkTreeTemplates = this.#processorContext.getDefaults().getTreeTrunkTemplates();
            this.#leafClusterTemplates = this.#processorContext.getDefaults().getTreeLeafClusterTemplates();
        }

        behaviourTree(elementHead, x, y) {
            // check temperature
            if (ElementHead.getTemperature(elementHead) > ProcessorModuleTree.#MAX_TREE_TEMPERATURE) {
                // => destroy tree instantly
                this.#elementArea.setElementHead(x, y, ElementHead.setBehaviour(elementHead, 0));
                return;
            }

            const random = this.#random.nextInt(ProcessorContext.OPT_CYCLES_PER_SECOND);
            if (random === 0) {
                // check status
                const trunkTemplateId = ElementHead.getSpecial(elementHead);
                const template = this.#trunkTreeTemplates[trunkTemplateId];
                if (template === undefined) {
                    throw 'Tree template not found: ' + trunkTemplateId;
                }
                const level = this.#treeGrow(elementHead, x, y, template, 1);
                this.#treeCheckStatus(x, y, level, template);
            }
        }

        #treeGrow(elementHead, x, y, template, levelsToGrow = 1) {
            let leafClusterIdRndSalt = this.#treeCreateOrGetSeed(x, y - 2);

            let level = 0;
            let levelGrown = 0;

            let parallelBranches = [{
                entries: template.entries,
                index: 0,
                x: 0,
                y: 0,
                brush: null
            }];

            let grow = (nx, ny, brush, noise, increment) => {
                let element = brush.apply(nx, ny, this.#random);
                if (noise === null) {
                    this.#elementArea.setElement(nx, ny, element);
                } else {
                    const tx = (x - nx) + (10 * x);  // unique pattern for each tree
                    const ty = (y - ny) + (10 * y);
                    const modifiedTail = noise(element.elementTail, tx, ty);
                    this.#elementArea.setElementHeadAndTail(nx, ny, element.elementHead, modifiedTail);
                }
                this.#processorContext.trigger(nx, ny);
                this.#processorContext.triggerSolidCreated(element.elementHead, nx, ny);
                if (increment) {
                    level++;
                    levelGrown++;
                }
            };

            while (parallelBranches.length > 0) {
                const length = parallelBranches.length;
                let cleanupBranches = false;

                for (let i = 0; i < length; i++) {
                    const branch = parallelBranches[i];

                    if (branch.index >= branch.entries.length) {
                        // end of branch
                        cleanupBranches = true;
                        continue;
                    }

                    const node = branch.entries[branch.index++];
                    const [templateX, templateY, nodeType] = node;
                    const nx = x + templateX + branch.x;
                    const ny = y - templateY - branch.y;

                    if (this.#elementArea.isValidPosition(nx, ny)) {
                        const currentElementHead = this.#elementArea.getElementHead(nx, ny);
                        const currentElementBehaviour = ElementHead.getBehaviour(currentElementHead);

                        switch (nodeType) {
                            case ProcessorModuleTree.TYPE_LEAF:
                                if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_LEAF) {
                                    // is already here
                                    // update leaf vitality (if not dead already)
                                    if (ElementHead.getSpecial(currentElementHead) < 15) {
                                        this.#elementArea.setElementHead(nx, ny, ElementHead.setSpecial(currentElementHead, 0));
                                    }
                                } else if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_TRUNK) {
                                    // replace trunk
                                    grow(nx, ny, branch.brush, ProcessorModuleTree.#LEAF_NOISE, false);
                                } else if (ElementHead.getTypeClass(currentElementHead) === ElementHead.TYPE_AIR) {
                                    grow(nx, ny, branch.brush, ProcessorModuleTree.#LEAF_NOISE, false);
                                }
                                break;

                            case ProcessorModuleTree.TYPE_TRUNK:
                                if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_TRUNK) {
                                    level++;  // trunk is already here
                                } else if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_LEAF) {
                                    level++;  // leaf is already here
                                }
                                let trunkGrow = false;
                                if (ElementHead.getTypeClass(currentElementHead) === ElementHead.TYPE_AIR) {
                                    trunkGrow = true;
                                } else if (currentElementBehaviour === ElementHead.BEHAVIOUR_SOIL) {
                                    trunkGrow = true;
                                } else if (currentElementBehaviour === ElementHead.BEHAVIOUR_GRASS) {
                                    trunkGrow = true;
                                } else if (templateY < 5) {
                                    // bottom trunk only...
                                    if (ElementHead.getTypeClass(currentElementHead) !== ElementHead.TYPE_STATIC) {
                                        trunkGrow = true;
                                    }
                                }
                                if (trunkGrow) {
                                    const treeBrush = (templateY > 0)
                                        ? this.#processorContext.getDefaults().getBrushTreeWood()
                                        : this.#processorContext.getDefaults().getBrushTreeWoodDark();
                                    grow(nx, ny, treeBrush, ProcessorModuleTree.#TRUNK_NOISE, true);
                                    if (templateY === 2 && templateX === 0) {
                                        // set seed
                                        this.#treeSetSeed(nx, ny, leafClusterIdRndSalt);
                                    }
                                }
                                break;

                            case ProcessorModuleTree.TYPE_BRANCH:
                                let branchGrow = false;
                                if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_LEAF) {
                                    level++;  // is already here
                                    // update leaf vitality (if not dead already)
                                    if (ElementHead.getSpecial(currentElementHead) < 15) {
                                        this.#elementArea.setElementHead(nx, ny, ElementHead.setSpecial(currentElementHead, 0));
                                    }
                                } else if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_TRUNK) {
                                    level++;  // is already here
                                } else if (ElementHead.getTypeClass(currentElementHead) === ElementHead.TYPE_AIR) {
                                    branchGrow = true;
                                } else {
                                    break;  // an obstacle...
                                }

                                let rnd = DeterministicRandom.next(leafClusterIdRndSalt + templateX + templateY);
                                let leafClusterId = Math.trunc(rnd * this.#leafClusterTemplates.length);
                                let leafCluster = this.#leafClusterTemplates[leafClusterId];
                                let leafBrush = (Math.trunc(rnd * 1024) % 2 === 0)
                                        ? this.#processorContext.getDefaults().getBrushTreeLeaf()
                                        : this.#processorContext.getDefaults().getBrushTreeLeafDark();
                                parallelBranches.push({
                                    entries: leafCluster.entries,
                                    index: 0,
                                    x: templateX,
                                    y: templateY,
                                    brush: leafBrush
                                });
                                if (branchGrow) {
                                    grow(nx, ny, leafBrush, ProcessorModuleTree.#LEAF_NOISE, true);
                                }
                                break;

                            case ProcessorModuleTree.TYPE_ROOT:
                                if (currentElementBehaviour === ElementHead.BEHAVIOUR_TREE_ROOT) {
                                    level++;  // is already here
                                } else {
                                    grow(nx, ny, this.#processorContext.getDefaults().getBrushTreeRoot(), null, true);
                                }
                                break;

                            default:
                                throw 'Unknown type: ' + nodeType;
                        }
                    }

                    let newParallelEntries = (node.length > 3) ? node[3] : undefined;
                    if (newParallelEntries !== undefined) {
                        parallelBranches.push({
                            entries: newParallelEntries,
                            index: 0,
                            x: branch.x,
                            y: branch.y,
                            brush: branch.brush
                        });
                    }
                }

                if (levelsToGrow !== -1 && levelGrown >= levelsToGrow) {
                    break;  // terminate
                }

                if (cleanupBranches) {
                    for (let i = parallelBranches.length - 1; i >= 0; i--) {
                        let branch = parallelBranches[i];
                        if (branch.index >= branch.entries.length) {
                            parallelBranches.splice(i, 1);
                        }
                    }
                }
            }
            return level;
        }

        #treeCreateOrGetSeed(x, y) {
            if (this.#elementArea.isValidPosition(x, y)) {
                let elementHead = this.#elementArea.getElementHead(x, y);
                if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_TREE_TRUNK) {
                    return ElementHead.getSpecial(elementHead);
                }
            }
            return this.#random.nextInt(1 << ElementHead.FIELD_SPECIAL_SIZE);
        }

        #treeSetSeed(x, y, seed) {
            // assume point exists
            // assume tree trunk
            let elementHead = this.#elementArea.getElementHead(x, y);
            elementHead = ElementHead.setSpecial(elementHead, seed);
            this.#elementArea.setElementHead(x, y, elementHead);
        }

        #treeCheckStatus(x, y, level, template) {
            // check tree status
            // - last tree status is carried by tree trunk above
            if (y > 0) {
                let carrierElementHead = this.#elementArea.getElementHead(x, y - 1);
                if (ElementHead.getBehaviour(carrierElementHead) === ElementHead.BEHAVIOUR_TREE_TRUNK) {
                    const maxStage = 15;
                    let lastStage = ElementHead.getSpecial(carrierElementHead);
                    let currentStage = Math.trunc(level / template.entriesCount * maxStage);
                    if (lastStage - currentStage > 5) {
                        // too big damage taken => kill tree
                        this.#elementArea.setElementHead(x, y - 1, ElementHead.setSpecial(carrierElementHead, 0));
                        const treeWoodBrush = this.#processorContext.getDefaults().getBrushTreeWoodDark();
                        this.#elementArea.setElement(x, y, treeWoodBrush.apply(x, y, this.#random));
                    } else {
                        // update stage
                        this.#elementArea.setElementHead(x, y - 1, ElementHead.setSpecial(carrierElementHead, currentStage));
                    }
                }
            }
        }

        behaviourTreeRoot(elementHead, x, y) {
            // check temperature
            if (ElementHead.getTemperature(elementHead) > ProcessorModuleTree.#MAX_TREE_TEMPERATURE) {
                // => destroy instantly
                this.#elementArea.setElementHead(x, y, ElementHead.setBehaviour(elementHead, 0));
                return;
            }

            let growIndex = ElementHead.getSpecial(elementHead);
            if (growIndex === 0) {
                // maximum size
                if (this.#processorContext.getIteration() % 1000 === 0) {
                    this.#treeRootHardenSurroundingElements(x, y);
                }
                return;
            }

            let random = this.#random.nextInt(ProcessorContext.OPT_CYCLES_PER_SECOND * 10);
            if (random < 10) {
                this.#treeRootGrow(x, y, elementHead, growIndex, random);
            }
        }

        #treeRootHardenSurroundingElements(x, y) {
            const targetX = x + this.#random.nextInt(3) - 1;
            const targetY = y + this.#random.nextInt(3) - 1;

            if (this.#elementArea.isValidPosition(targetX, targetY)) {
                let targetElementHead = this.#elementArea.getElementHead(targetX, targetY);
                let type = ElementHead.getTypeClass(targetElementHead);
                if (type === ElementHead.TYPE_POWDER || type === ElementHead.TYPE_POWDER_WET || type === ElementHead.TYPE_POWDER_FLOATING) {
                    let newType = ElementHead.type8(ElementHead.type8Solid(ElementHead.TYPE_STATIC, 3));
                    let modifiedElementHead = ElementHead.setType(targetElementHead, newType);
                    this.#elementArea.setElementHead(targetX, targetY, modifiedElementHead);
                }
            }
        }

        #treeRootGrow(x, y, elementHead, growIndex, direction) {
            let doGrow = (nx, ny) => {
                this.#elementArea.setElementHead(x, y, ElementHead.setSpecial(elementHead, 0));

                let element = this.#processorContext.getDefaults().getBrushTreeRoot().apply(nx, ny, this.#random);
                let modifiedHead = ElementHead.setSpecial(element.elementHead, growIndex - 1);
                this.#elementArea.setElementHead(nx, ny, modifiedHead);
                this.#elementArea.setElementTail(nx, ny, element.elementTail);
            };

            // grow down first if there is a free space
            if (y < this.#elementArea.getHeight() - 1) {
                let targetElementHead = this.#elementArea.getElementHead(x, y + 1);
                if (ElementHead.getTypeClass(targetElementHead) === ElementHead.TYPE_AIR) {
                    doGrow(x, y + 1);
                    return;
                }
            }

            // grow in random way
            let nx = x;
            let ny = y;
            if (direction === 9 || direction === 8 || direction === 7) {
                nx += 1;
                ny += 1;
            } else if (direction === 6 || direction === 5 || direction === 4) {
                nx += -1;
                ny += 1;
            } else {
                ny += 1;
            }

            if (this.#elementArea.isValidPosition(nx, ny)) {
                let targetElementHead = this.#elementArea.getElementHead(nx, ny);
                if (ElementHead.getTypeClass(targetElementHead) !== ElementHead.TYPE_STATIC) {
                    doGrow(nx, ny);
                }
            }
        }

        behaviourTreeLeaf(elementHead, x, y) {
            let vitality = ElementHead.getSpecial(elementHead);
            if (vitality < 15) {
                // check temperature
                const temperature = ElementHead.getTemperature(elementHead);
                if (temperature > ProcessorModuleTree.#MAX_LEAF_TEMPERATURE) {
                    // => destroy instantly, keep temperature
                    this.#dryLeaf(elementHead, x, y);
                    return;
                }

                // decrement vitality (if not dead already)
                if (this.#processorContext.getIteration() % 32 === 0) {
                    if (this.#random.nextInt(10) === 0) {
                        vitality++;
                        if (vitality >= 15) {
                            this.#dryLeaf(elementHead, x, y);
                            return;
                        } else {
                            elementHead = ElementHead.setSpecial(elementHead, vitality);
                            this.#elementArea.setElementHead(x, y, elementHead);
                        }
                    }
                }
            }

            // once a while "transport" element from above/left/right/left-above/right-above if possible
            if (this.#processorContext.getIteration() % 4 === 0 && this.#random.nextInt(10) === 0) {

                const directions = [[0, -1], [0, -1], [-1, 0], [1, 0], [-1, -1], [1, -1]];
                const randomDirection = directions[this.#random.nextInt(directions.length)];
                const sourceX = x + randomDirection[0];
                const sourceY = y + randomDirection[1];

                const sourceElementHead = this.#elementArea.getElementHeadOrNull(sourceX, sourceY);
                if (sourceElementHead !== null
                        && ElementHead.getTypeClass(sourceElementHead) >= ElementHead.TYPE_FLUID
                        && ElementHead.getTypeClass(sourceElementHead) < ElementHead.TYPE_STATIC) {

                    let destX = x;
                    let destY = y;
                    for (let step = 0; step < 25; step++) {
                        destX += this.#random.nextInt(3) - 1;  // random walk
                        destY += 1;

                        const destElementHead = this.#elementArea.getElementHeadOrNull(destX, destY);
                        if (destElementHead === null) {
                            break;
                        }
                        const destBehaviour = ElementHead.getBehaviour(destElementHead);
                        if (destBehaviour === ElementHead.BEHAVIOUR_TREE_LEAF) {
                            continue;
                        }
                        const destTypeClass = ElementHead.getTypeClass(destElementHead);
                        if (destTypeClass <= ElementHead.TYPE_GAS) {
                            this.#elementArea.swap(sourceX, sourceY, destX, destY);
                            return;
                        }
                        break;
                    }

                    // destroy buried leaf
                    if (this.#random.nextInt(20) === 0) {
                        this.#elementArea.setElement(x, y, this.#processorContext.getDefaults().getDefaultElement());
                    }
                }
            }
        }

        #dryLeaf(elementHead, x, y) {
            const elementTail = this.#elementArea.getElementTail(x, y);

            // multiplication and alpha blending (for lighter color)
            const alpha = 0.85;
            const whiteBackground = 255 * (1.0 - alpha);
            let newElementTail = ElementTail.setColor(
                Math.trunc(ElementTail.getColorRed(elementTail) * 1.4 * alpha + whiteBackground) & 0xFF,
                Math.trunc(ElementTail.getColorGreen(elementTail) * 0.9 * alpha + whiteBackground) & 0xFF,
                Math.trunc(ElementTail.getColorBlue(elementTail) * 0.8 * alpha + whiteBackground) & 0xFF
            );

            const newElementHead = ElementHead.setSpecial(elementHead, 15);
            this.#elementArea.setElementHeadAndTail(x, y, newElementHead, newElementTail);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-26
     */
    class ProcessorModuleLiquid {

        static RET_FLAG_ACTIVE = 0b10;
        static RET_FLAG_SKIP_TEMP = 0b01;

        static FIRST_LIGHT = ElementHead.SPECIAL_LIQUID_LIGHT_OIL;
        static FIRST_HEAVY = ElementHead.SPECIAL_LIQUID_HEAVY_MOLTEN;


        /** @type ElementArea */
        #elementArea;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        constructor(elementArea, random, processorContext) {
            this.#elementArea = elementArea;
            this.#random = random;
            this.#processorContext = processorContext;
        }

        behaviourLiquid(elementHead, x, y) {
            const special = ElementHead.getSpecial(elementHead);
            switch (special) {
                case ElementHead.SPECIAL_LIQUID_WATER:
                    return this.#behaviourSubtypeWater(elementHead, x, y);
                case ElementHead.SPECIAL_LIQUID_LIGHT_OIL:
                    return this.#behaviourSubtypeLightOil(elementHead, x, y);
                case ElementHead.SPECIAL_LIQUID_HEAVY_MOLTEN:
                    return this.#behaviourSubtypeHeavyMolten(elementHead, x, y);
            }
            return 0;
        }

        testBehaviourLiquid(elementHead, x, y) {
            const special = ElementHead.getSpecial(elementHead);
            switch (special) {
                case ElementHead.SPECIAL_LIQUID_WATER:
                    return this.#testBehaviourSubtypeWater(elementHead, x, y);
                case ElementHead.SPECIAL_LIQUID_LIGHT_OIL:
                    return this.#testBehaviourSubtypeLightOil(elementHead, x, y);
                case ElementHead.SPECIAL_LIQUID_HEAVY_MOLTEN:
                    return this.#testBehaviourSubtypeHeavyMolten(elementHead, x, y);
            }
            return false;
        }

        #behaviourSubtypeWater(elementHead, x, y) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            const temperature = ElementHead.getTemperature(elementHead);

            if (typeClass === ElementHead.TYPE_FLUID) {
                if (temperature > 20) {
                    const brush = this.#processorContext.getDefaults().getBrushSteam();
                    const element = brush.apply(x, y, this.#random);
                    const newElementHead = ElementHead.setTemperature(element.elementHead, temperature);
                    this.#elementArea.setElementHeadAndTail(x, y, newElementHead, element.elementTail);
                    return ProcessorModuleLiquid.RET_FLAG_ACTIVE | ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                }

            } else if (typeClass === ElementHead.TYPE_GAS) {
                if (temperature < 10) {
                    const brush = this.#processorContext.getDefaults().getBrushWater();
                    const element = brush.apply(x, y, this.#random);
                    const newElementHead = ElementHead.setTemperature(element.elementHead, temperature);
                    this.#elementArea.setElementHeadAndTail(x, y, newElementHead, element.elementTail);
                    return ProcessorModuleLiquid.RET_FLAG_ACTIVE | ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                }
            }
            return 0;
        }

        #testBehaviourSubtypeWater(elementHead, x, y) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            const temperature = ElementHead.getTemperature(elementHead);

            if (typeClass === ElementHead.TYPE_FLUID) {
                return temperature > 20;
            } else if (typeClass === ElementHead.TYPE_GAS) {
                return temperature < 10;
            }
            return false;
        }

        #behaviourSubtypeHeavyMolten(elementHead, x, y) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            if (typeClass !== ElementHead.TYPE_FLUID) {
                return 0;
            }

            let skipTemperature = 0;

            const rnd = this.#random.nextInt(8);

            // moving
            if (rnd % 4 === 0) {
                // gravity down...
                if (this.#testMoveHeavyFluid(x, y + 1)) {
                    this.#elementArea.swap(x, y, x, y + 1);
                    skipTemperature = ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                } else {
                    if (rnd === 4) {
                        if (this.#testMoveHeavyFluid(x + 1, y)) {
                            this.#elementArea.swap(x, y, x + 1, y);
                            skipTemperature = ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                        }
                    } else {
                        if (this.#testMoveHeavyFluid(x - 1, y)) {
                            this.#elementArea.swap(x, y, x - 1, y);
                            skipTemperature = ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                        }
                    }
                }
            }

            const active = ProcessorModuleLiquid.RET_FLAG_ACTIVE;  // it doesn't matter because of temperature...
            return active | skipTemperature;
        }

        #testBehaviourSubtypeHeavyMolten(elementHead, x, y) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            if (typeClass !== ElementHead.TYPE_FLUID) {
                return false;
            }
            return true;  // it doesn't matter because of temperature...
        }

        #behaviourSubtypeLightOil(elementHead, x, y) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            if (typeClass !== ElementHead.TYPE_FLUID) {
                return 0;
            }

            let skipTemperature = 0;

            const rnd = this.#random.nextInt(32);

            // moving
            if (rnd % 16 === 0) {
                // gravity down...
                if (this.#testMoveLightFluid(x, y - 1)) {
                    this.#elementArea.swap(x, y, x, y - 1);
                    skipTemperature = ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                } else {
                    if (rnd === 0) {
                        if (this.#testMoveLightFluid(x + 1, y)) {
                            this.#elementArea.swap(x, y, x + 1, y);
                            skipTemperature = ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                        }
                    } else {
                        if (this.#testMoveLightFluid(x - 1, y)) {
                            this.#elementArea.swap(x, y, x - 1, y);
                            skipTemperature = ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP;
                        }
                    }
                }
            }

            // staining
            if (rnd === 7) {
                const targetHead = this.#elementArea.getElementHeadOrNull(x, y + 1);
                if (targetHead !== null) {
                    if (ElementHead.getTypeClass(targetHead) >= ElementHead.TYPE_FLUID) {
                        let targetTail = this.#elementArea.getElementTail(x, y + 1);
                        targetTail = VisualEffects.visualBurn(targetTail, 1, 1);
                        this.#elementArea.setElementTail(x, y + 1, targetTail);
                    }
                }
            }

            return skipTemperature;
        }

        #testBehaviourSubtypeLightOil(elementHead, x, y) {
            const typeClass = ElementHead.getTypeClass(elementHead);
            if (typeClass !== ElementHead.TYPE_FLUID) {
                return false;
            }

            return this.#testMoveLightFluid(x, y - 1)
                || this.#testMoveLightFluid(x + 1, y)
                || this.#testMoveLightFluid(x - 1, y);
        }

        // --- utilities

        #testMoveHeavyFluid(nx, ny) {
            const targetElementHead = this.#elementArea.getElementHeadOrNull(nx, ny);
            if (targetElementHead === null) {
                return false;
            }
            if (ElementHead.getTypeClass(targetElementHead) !== ElementHead.TYPE_FLUID) {
                return false;
            }
            const special = ElementHead.getSpecial(targetElementHead);
            return special < ProcessorModuleLiquid.FIRST_HEAVY;

        }

        #testMoveLightFluid(nx, ny) {
            const targetElementHead = this.#elementArea.getElementHeadOrNull(nx, ny);
            if (targetElementHead === null) {
                return false;
            }
            if (ElementHead.getTypeClass(targetElementHead) !== ElementHead.TYPE_FLUID) {
                return false;
            }
            const special = ElementHead.getSpecial(targetElementHead);
            return !(special >= ProcessorModuleLiquid.FIRST_LIGHT && special <= ProcessorModuleLiquid.FIRST_HEAVY);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-22
     */
    class Processor extends ProcessorContext {

        /** @type ElementArea */
        #elementArea;

        /** @type number */
        #width;
        /** @type number */
        #height;

        /** @type number */
        #chunkSize;
        /** @type number */
        #horChunkCount;
        /** @type number */
        #verChunkCount;

        /** @type boolean[] */
        #activeChunks
        /** @type boolean[] */
        #changedChunks
        /** @type number[] */
        #chunkLastFullTest;

        /** @type number */
        #iteration = 0;

        /** @type DeterministicRandom */
        #random;

        /** @type boolean */
        #fallThroughEnabled = false;
        /** @type boolean */
        #erasingEnabled = false;

        /** @type GameDefaults */
        #defaults;

        static RANDOM_DATA_COUNT = 32;

        /** @type Uint32Array[] */
        #rndChunkOrder = [];
        /** @type Uint32Array[] */
        #rndChunkXRnd = [];
        /** @type Uint32Array[] */
        #rndChunkXOrder = [];

        /** @type ProcessorModuleSolidBody */
        #moduleSolidBody;
        /** @type ProcessorModuleEntity */
        #moduleEntity;
        /** @type ProcessorModuleLiquid */
        #moduleLiquid;
        /** @type ProcessorModuleFire */
        #moduleFire;
        /** @type ProcessorModuleMeteor */
        #moduleMeteor;
        /** @type ProcessorModuleGrass */
        #moduleGrass;
        /** @type ProcessorModuleTree */
        #moduleTree;

        /** @type Extension[] */
        #extensions = [];

        constructor(elementArea, chunkSize, random, defaults, sceneMetadata) {
            super();
            this.#elementArea = elementArea;
            this.#width = elementArea.getWidth();
            this.#height = elementArea.getHeight();

            this.#chunkSize = chunkSize;
            if (this.#chunkSize > 255) {
                throw 'Chunk size limit: 255';
            }
            this.#horChunkCount = Math.ceil(this.#width / this.#chunkSize);
            this.#verChunkCount = Math.ceil(this.#height / this.#chunkSize);
            this.#activeChunks = new Array(this.#horChunkCount * this.#verChunkCount).fill(true);
            this.#changedChunks = new Array(this.#horChunkCount * this.#verChunkCount).fill(true);
            this.#chunkLastFullTest = new Array(this.#horChunkCount * this.#verChunkCount).fill(-1);

            let rndDataRandom = new DeterministicRandom(0);
            this.#rndChunkOrder = Processor.#generateArrayOfOrderData(
                Processor.RANDOM_DATA_COUNT, this.#horChunkCount, rndDataRandom);
            this.#rndChunkXRnd = Processor.#generateArrayOfRandomData(
                Processor.RANDOM_DATA_COUNT, this.#chunkSize, this.#chunkSize, rndDataRandom);
            this.#rndChunkXOrder = Processor.#generateArrayOfOrderData(
                Processor.RANDOM_DATA_COUNT, this.#chunkSize, rndDataRandom);

            this.#random = random;
            this.#defaults = defaults;

            this.#moduleSolidBody = new ProcessorModuleSolidBody(elementArea, random, this);
            this.#moduleEntity = new ProcessorModuleEntity(elementArea, random, this);
            this.#moduleLiquid = new ProcessorModuleLiquid(elementArea, random, this);
            this.#moduleFire = new ProcessorModuleFire(elementArea, random, this);
            this.#moduleMeteor = new ProcessorModuleMeteor(elementArea, random, this);
            this.#moduleGrass = new ProcessorModuleGrass(elementArea, random, this);
            this.#moduleTree = new ProcessorModuleTree(elementArea, random, this);

            if (sceneMetadata) {
                this.#iteration = sceneMetadata.iteration;
                this.#fallThroughEnabled = sceneMetadata.fallThroughEnabled;
                this.#erasingEnabled = sceneMetadata.erasingEnabled;
            }
        }

        static #shuffle(array, iterations, random) {
            for (let i = 0; i < iterations; i++) {
                let a = random.nextInt(array.length);
                let b = random.nextInt(array.length);
                [array[a], array[b]] = [array[b], array[a]];
            }
        }

        static #generateArrayOfOrderData(arrayLength, count, random) {
            let data = Processor.#generateOrderData(count);
            Processor.#shuffle(data, arrayLength, random);

            let array = Array(arrayLength);
            for (let i = 0; i < arrayLength; i++) {
                Processor.#shuffle(data, Math.ceil(arrayLength / 4), random);
                array[i] = new Uint8Array(data);
            }
            return array;
        }

        static #generateOrderData(count) {
            let array = new Uint8Array(count);
            for (let i = 0; i < count; i++) {
                array[i] = i;
            }
            return array;
        }

        static #generateArrayOfRandomData(arrayLength, count, max, random) {
            let array = Array(arrayLength);
            for (let i = 0; i < arrayLength; i++) {
                array[i] = Processor.#generateRandomData(count, max, random);
            }
            return array;
        }

        static #generateRandomData(count, max, random) {
            let array = new Uint8Array(count);
            for (let i = 0; i < count; i++) {
                array[i] = random.nextInt(max);
            }
            return array;
        }

        getIteration() {
            return this.#iteration;
        }

        getDefaults() {
            return this.#defaults;
        }

        setFallThroughEnabled(enabled) {
            this.#fallThroughEnabled = enabled;
        }

        setErasingEnabled(enabled) {
            this.#erasingEnabled = enabled;
        }

        isFallThroughEnabled() {
            return this.#fallThroughEnabled;
        }

        isErasingEnabled() {
            return this.#erasingEnabled;
        }

        /**
         *
         * @param extension {Extension}
         */
        addExtension(extension) {
            this.#extensions.push(extension);
        }

        trigger(x, y) {
            const cx = Math.floor(x / this.#chunkSize);
            const cy = Math.floor(y / this.#chunkSize);
            const chunkIndex = cy * this.#horChunkCount + cx;
            this.#activeChunks[chunkIndex] = true;
            // this.#changedChunks[chunkIndex] = true;
        }

        triggerSolidCreated(elementHead, x, y) {
            this.#moduleSolidBody.onSolidCreated(elementHead, x, y);
        }

        getActiveChunks() {
            return this.#activeChunks;
        }

        getChangedChunks() {
            return this.#changedChunks;
        }

        cleanChangedChunks() {
            this.#changedChunks.fill(false);
        }

        next() {
            this.#moduleSolidBody.onNextIteration();

            const activeChunks = Array.from(this.#activeChunks);
            this.#activeChunks.fill(false);

            // TODO: try extra temperature active chunks with extra loop
            // element temperature is processed once per 9 iterations...
            //   x
            // y 1 2 3
            //   4 5 6
            //   7 8 9
            const temperatureProcessingMod = this.#iteration % 9;
            const temperatureProcessingMod3Y = Math.trunc(temperatureProcessingMod / 3);
            const temperatureProcessingMod3X = temperatureProcessingMod % 3;

            for (let cy = this.#verChunkCount - 1; cy >= 0; cy--) {
                const cyTop = cy * this.#chunkSize;
                const cyBottom = Math.min((cy + 1) * this.#chunkSize - 1, this.#height - 1);

                const chunkOrder = this.#rndChunkOrder[this.#random.nextInt(Processor.RANDOM_DATA_COUNT)];
                const fullChunkLoop = this.#random.nextInt(2) === 0;

                const chunkActiveElements = new Uint16Array(this.#horChunkCount);

                for (let y = cyBottom; y >= cyTop; y--) {
                    for (let i = 0; i < this.#horChunkCount; i++) {
                        const cx = chunkOrder[i];
                        const chunkIndex = cy * this.#horChunkCount + cx;

                        const idx = this.#random.nextInt(Processor.RANDOM_DATA_COUNT);
                        const chunkXOder = (fullChunkLoop) ? this.#rndChunkXOrder[idx] : this.#rndChunkXRnd[idx];

                        if (activeChunks[chunkIndex]) {
                            // standard iteration
                            let activeElements = chunkActiveElements[cx];
                            for (let j = 0; j < this.#chunkSize; j++) {
                                let x = cx * this.#chunkSize + chunkXOder[j];
                                if (x < this.#width) {
                                    const processTemperature = (x % 3 === temperatureProcessingMod3X)
                                            && (y % 3 === temperatureProcessingMod3Y);
                                    const activeElement = this.#nextPoint(x, y, processTemperature);
                                    if (activeElement) {
                                        activeElements++;
                                    }
                                }
                            }
                            chunkActiveElements[cx] = activeElements;
                        }
                    }
                }

                // fast check deactivated chunks (borders only - if they have active neighbours)
                for (let cx = 0; cx < this.#horChunkCount; cx++) {
                    const chunkIndex = cy * this.#horChunkCount + cx;
                    if (!activeChunks[chunkIndex]) {
                        if (this.#fastTest(cx, cy, activeChunks)) {
                            // wake up chunk
                            activeChunks[chunkIndex] = true;
                            chunkActiveElements[cx] = 1;
                        }
                    }
                }

                // deactivate chunks if possible
                if (fullChunkLoop) {
                    for (let cx = 0; cx < this.#horChunkCount; cx++) {
                        const chunkIndex = cy * this.#horChunkCount + cx;
                        if (activeChunks[chunkIndex] && chunkActiveElements[cx] === 0) {
                            // full test before deactivation

                            // this test is quite expensive, so we don't want to perform it every time
                            const lastFullTest = this.#chunkLastFullTest[chunkIndex];
                            if (lastFullTest === -1 || this.#iteration - lastFullTest >= 10) {
                                if (!this.#fullTest(cx, cy)) {
                                    activeChunks[chunkIndex] = false;
                                    this.#changedChunks[chunkIndex] = true;  // last repaint
                                    this.#chunkLastFullTest[chunkIndex] = this.#iteration;
                                }
                            }
                        }
                    }
                }
            }

            // erasing mode
            if (this.#erasingEnabled) {
                const defaultElement = this.#defaults.getDefaultElement();
                for (let x = 0; x < this.#width; x++) {
                    this.#elementArea.setElement(x, 0, defaultElement);
                    this.#elementArea.setElement(x, this.#height - 1, defaultElement);
                }
                for (let y = 1; y < this.#height - 1; y++) {
                    this.#elementArea.setElement(0, y, defaultElement);
                    this.#elementArea.setElement(this.#width - 1, y, defaultElement);
                }
            }

            // merge active chunks
            for (let i = 0; i < this.#horChunkCount * this.#verChunkCount; i++) {
                let active = activeChunks[i];
                if (active) {
                    this.#activeChunks[i] = true;
                    this.#changedChunks[i] = true;
                }
            }

            // run extensions
            for (let extension of this.#extensions) {
                extension.run();
            }

            this.#iteration++;
        }

        #fastTest(cx, cy, activeChunks) {
            // left
            if (cx > 0 && activeChunks[(cy * this.#horChunkCount) + cx - 1]) {
                const x = cx * this.#chunkSize;
                const my = Math.min((cy + 1) * this.#chunkSize, this.#height);
                for (let y = cy * this.#chunkSize; y < my; y++) {
                    if (this.#testPoint(x, y)) {
                        return true;
                    }
                }
            }

            // right
            if (cx < (this.#horChunkCount - 1) && activeChunks[(cy * this.#horChunkCount) + cx + 1]) {
                const x = Math.min(((cx + 1) * this.#chunkSize) - 1, this.#width - 1);
                const my = Math.min((cy + 1) * this.#chunkSize, this.#height);
                for (let y = cy * this.#chunkSize; y < my; y++) {
                    if (this.#testPoint(x, y)) {
                        return true;
                    }
                }
            }

            // top
            if ((cy > 0) && activeChunks[((cy - 1) * this.#horChunkCount) + cx]
                || (this.#fallThroughEnabled
                    && cy === 0
                    && activeChunks[((this.#verChunkCount - 1) * this.#horChunkCount) + cx])) {

                const y = cy * this.#chunkSize;
                const mx = Math.min((cx + 1) * this.#chunkSize, this.#width);
                for (let x = cx * this.#chunkSize; x < mx; x++) {
                    if (this.#testPoint(x, y)) {
                        return true;
                    }
                }
            }

            // bottom
            if (cy < (this.#verChunkCount - 1) && activeChunks[((cy + 1) * this.#horChunkCount) + cx]) {
                const y = (cy + 1) * this.#chunkSize - 1;
                const mx = Math.min((cx + 1) * this.#chunkSize, this.#width);
                for (let x = cx * this.#chunkSize; x < mx; x++) {
                    if (this.#testPoint(x, y)) {
                        return true;
                    }
                }
            }
        }

        #fullTest(cx, cy) {
            const mx = Math.min((cx + 1) * this.#chunkSize, this.#width);
            const my = Math.min((cy + 1) * this.#chunkSize, this.#height);
            for (let y = cy * this.#chunkSize; y < my; y++) {
                for (let x = cx * this.#chunkSize; x < mx; x++) {
                    if (this.#testPoint(x, y)) {
                        return true;
                    }
                }
            }
            return false;
        }

        #testPoint(x, y) {
            const elementHead = this.#elementArea.getElementHead(x, y);

            if (ElementHead.getTemperature(elementHead) > 0) {
                return true;
            }
            if (this.#testMovingBehaviour(elementHead, x, y)) {
                return true;
            }
            switch (ElementHead.getBehaviour(elementHead)) {
                case ElementHead.BEHAVIOUR_NONE:
                case ElementHead.BEHAVIOUR_SOIL:
                case ElementHead.BEHAVIOUR_TREE_TRUNK:
                    return false;
                case ElementHead.BEHAVIOUR_LIQUID:
                    return this.#moduleLiquid.testBehaviourLiquid(elementHead, x, y);
                default:
                    return true;
            }
        }

        /**
         *
         * @param elementHead
         * @param x {number}
         * @param y {number}
         * @returns {boolean}
         */
        #testMovingBehaviour(elementHead, x, y) {
            const type = ElementHead.getTypeClass(elementHead);
            switch (type) {
                case ElementHead.TYPE_AIR:
                    // no action
                    return false;

                case ElementHead.TYPE_POWDER:
                case ElementHead.TYPE_POWDER_FLOATING:
                case ElementHead.TYPE_POWDER_WET:
                    if (ElementHead.getTypeModifierPowderSliding(elementHead)) {
                        return true;
                    } else {
                        return this.#testMove(elementHead, x, y, x, y + 1);
                    }

                case ElementHead.TYPE_FLUID:
                    return this.#testMove(elementHead, x, y, x, y + 1)
                            || this.#testMove(elementHead, x, y, x + 1, y)
                            || this.#testMove(elementHead, x, y, x - 1, y);

                case ElementHead.TYPE_GAS:
                    return this.#testMove(elementHead, x, y, x, y - 1)
                        || this.#testMove(elementHead, x, y, x + 1, y)
                        || this.#testMove(elementHead, x, y, x - 1, y);

                case ElementHead.TYPE_STATIC:
                    const fallingId = ElementHead.getTypeModifierSolidBodyId(elementHead);
                    return (fallingId !== 0);

                default:
                    return true;
            }
            throw "Unknown element type: " + type;
        }

        #testMove(elementHead, x, y, x2, y2) {
            if (!this.#elementArea.isValidPosition(x2, y2)) {
                if (this.#fallThroughEnabled && y === this.#height - 1) {
                    // try fall through
                    y2 = 0;
                    if (!this.#elementArea.isValidPosition(x2, y2)) {
                        return false;
                    }
                    // continue move...
                } else {
                    return false;
                }
            }

            let elementHead2 = this.#elementArea.getElementHead(x2, y2);
            return this.#canMove(elementHead, elementHead2);
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param processTemperature {boolean}
         * @return {boolean} active
         */
        #nextPoint(x, y, processTemperature) {
            const elementHead = this.#elementArea.getElementHead(x, y);
            const moved = this.#performMovingBehaviour(elementHead, x, y);

            if (moved) {
                return true;
            }

            const behaviour = ElementHead.getBehaviour(elementHead);
            let active = false;
            switch (behaviour) {
                case ElementHead.BEHAVIOUR_NONE:
                case ElementHead.BEHAVIOUR_SOIL:
                    break;
                case ElementHead.BEHAVIOUR_LIQUID:
                    const r = this.#moduleLiquid.behaviourLiquid(elementHead, x, y);
                    if ((r & ProcessorModuleLiquid.RET_FLAG_ACTIVE) === ProcessorModuleLiquid.RET_FLAG_ACTIVE) {
                        active = true;
                    }
                    if ((r & ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP) === ProcessorModuleLiquid.RET_FLAG_SKIP_TEMP) {
                        processTemperature = false;
                    }
                    break;
                case ElementHead.BEHAVIOUR_FIRE:
                    this.#moduleFire.behaviourFire(elementHead, x, y);
                    active = true;
                    processTemperature = false;
                    break;
                case ElementHead.BEHAVIOUR_GRASS:
                    this.#moduleGrass.behaviourGrass(elementHead, x, y);
                    active = true;
                    break;
                case ElementHead.BEHAVIOUR_TREE:
                    this.#moduleTree.behaviourTree(elementHead, x, y);
                    active = true;
                    break;
                case ElementHead.BEHAVIOUR_TREE_LEAF:
                    this.#moduleTree.behaviourTreeLeaf(elementHead, x, y);
                    active = true;
                    break;
                case ElementHead.BEHAVIOUR_TREE_TRUNK:
                    break;
                case ElementHead.BEHAVIOUR_TREE_ROOT:
                    this.#moduleTree.behaviourTreeRoot(elementHead, x, y);
                    active = true;
                    break;
                case ElementHead.BEHAVIOUR_FIRE_SOURCE:
                    this.#moduleFire.behaviourFireSource(elementHead, x, y);
                    active = true;
                    processTemperature = false;
                    break;
                case ElementHead.BEHAVIOUR_METEOR:
                    this.#moduleMeteor.behaviourMeteor(elementHead, x, y);
                    active = true;
                    processTemperature = false;
                    break;
                case ElementHead.BEHAVIOUR_ENTITY:
                    this.#moduleEntity.behaviourEntity(elementHead, x, y);
                    processTemperature = true;
                    active = true;
                    break;
                default:
                    throw "Unknown element behaviour: " + behaviour;
            }

            if (processTemperature) {
                const temperatureRelatedActivity = this.#temperature(elementHead, x, y);
                return active || temperatureRelatedActivity;
            } else {
                return active
            }
        }

        /**
         *
         * @param elementHead
         * @param x {number}
         * @param y {number}
         * @return boolean
         */
        #temperature(elementHead, x, y) {
            const temp = ElementHead.getTemperature(elementHead);

            if (temp === 0) {
                const heatModIndex = ElementHead.getHeatModIndex(elementHead);
                if (temp < ElementHead.hmiToHardeningTemperature(heatModIndex)) {
                    this.#tryHardening(elementHead, x, y, heatModIndex, true);
                    return true;
                }
                return false;
            }

            // conduct temperature

            let tx = x, ty = y;
            switch (this.#random.nextInt(4)) {
                case 0: ty--; break;  // Up
                case 1: tx++; break;  // Right
                case 2: ty++; break;  // Down
                case 3: tx--; break;  // Left
            }

            const heatModIndex = ElementHead.getHeatModIndex(elementHead);
            const heatLoss = (this.#random.nextInt(10000) < ElementHead.hmiToHeatLossChanceTo10000(heatModIndex));
            let newTemp;

            if (this.#elementArea.isValidPosition(tx, ty)) {
                const targetElementHead = this.#elementArea.getElementHead(tx, ty);
                const targetTemp = ElementHead.getTemperature(targetElementHead);

                if (temp + targetTemp > 1) {
                    const conductiveIndex = ElementHead.hmiToConductiveIndex(heatModIndex);
                    newTemp = Math.trunc((conductiveIndex * targetTemp) + (1 - conductiveIndex) * temp);
                }

                if (temp - newTemp !== 0) {
                    if (heatLoss) {
                        newTemp--;
                    }
                    newTemp = Math.max(newTemp, 0);

                    // update target temp

                    let newTargetTemp;
                    if (targetTemp - newTemp > 10) {
                        // limit max absolute dec change - it will look more natural...
                        newTargetTemp = targetTemp - 10;
                    } else {
                        newTargetTemp = targetTemp + (temp - newTemp);
                    }

                    newTargetTemp = Math.max(newTargetTemp, 0);
                    this.#elementArea.setElementHead(tx, ty, ElementHead.setTemperature(targetElementHead, newTargetTemp));
                    this.trigger(tx, ty);

                    // update this temp

                    if (temp - newTemp > 10) {
                        // limit max absolute dec change - it will look more natural...
                        newTemp = temp - 10;
                    }
                    elementHead = ElementHead.setTemperature(elementHead, newTemp);
                    this.#elementArea.setElementHead(x, y, elementHead);

                }
            } else {
                if (heatLoss) {
                    newTemp = Math.max(temp - 1, 0);
                    elementHead = ElementHead.setTemperature(elementHead, newTemp);
                    this.#elementArea.setElementHead(x, y, elementHead);
                }
            }

            // self-ignition
            const chanceToIgnite = ElementHead.hmiToSelfIgnitionChanceTo10000(heatModIndex);
            if (newTemp > 100 && chanceToIgnite > 0) {
                if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_FIRE_SOURCE) ; else {
                    if (this.#random.nextInt(10000) < chanceToIgnite) {
                        this.#moduleFire.ignite(elementHead, x, y, heatModIndex);
                        return true;
                    }
                }
            }

            // melting
            if (newTemp > ElementHead.hmiToMeltingTemperature(heatModIndex)) {
                elementHead = ElementHead.setType(elementHead, ElementHead.TYPE_FLUID);
                elementHead = ElementHead.setHeatModIndex(elementHead, ElementHead.hmiToMeltingHMI(heatModIndex));

                let elementTail = this.#elementArea.getElementTail(x, y);
                elementTail = ElementTail.setBlurType(elementTail, ElementTail.BLUR_TYPE_1);

                this.#elementArea.setElementHeadAndTail(x, y, elementHead, elementTail);
                return true;
            }

            // hardening
            if (newTemp < ElementHead.hmiToHardeningTemperature(heatModIndex)) {
                this.#tryHardening(elementHead, x, y, heatModIndex, false);
            }

            return true;
        }

        #tryHardening(elementHead, x, y, heatModIndex, force) {
            // there must be a solid element nearby
            if (force || this.#findHardeningSupport(x, y)) {
                elementHead = ElementHead.setType(elementHead, ElementHead.type8Solid(ElementHead.TYPE_STATIC, 2));
                elementHead = ElementHead.setHeatModIndex(elementHead, ElementHead.hmiToHardeningHMI(heatModIndex));

                let elementTail = this.#elementArea.getElementTail(x, y);
                elementTail = ElementTail.setBlurType(elementTail, ElementTail.BLUR_TYPE_NONE);

                this.#elementArea.setElementHeadAndTail(x, y, elementHead, elementTail);
            }
        }

        #findHardeningSupport(x, y) {
            // below
            if (y !== this.#height - 1) {
                if (this.#isHardeningSupport(this.#elementArea.getElementHead(x, y + 1))) {
                    return true;
                }
            } else {
                // bottom
                if (!this.#fallThroughEnabled && !this.#erasingEnabled) {
                    return true;
                }
            }

            // left
            if (this.#elementArea.isValidPosition(x - 1, y)) {
                if (this.#isHardeningSupport(this.#elementArea.getElementHead(x - 1, y))) {
                    return true;
                }
            }

            // right
            if (this.#elementArea.isValidPosition(x + 1, y)) {
                if (this.#isHardeningSupport(this.#elementArea.getElementHead(x + 1, y))) {
                    return true;
                }
            }

            return false;  // support not found
        }

        #isHardeningSupport(targetElementHead) {
            const typeClass = ElementHead.getTypeClass(targetElementHead);
            if (typeClass > ElementHead.TYPE_FLUID) {
                return true;
            }
            return false;
        }

        /**
         *
         * @param elementHead
         * @param x {number}
         * @param y {number}
         * @returns {boolean}
         */
        #performMovingBehaviour(elementHead, x, y) {
            const type = ElementHead.getTypeClass(elementHead);
            switch (type) {
                case ElementHead.TYPE_AIR:
                    // no action
                    return false;

                case ElementHead.TYPE_POWDER:
                case ElementHead.TYPE_POWDER_WET:
                case ElementHead.TYPE_POWDER_FLOATING:
                    if (this.#move(elementHead, x, y, x, y + 1)) {
                        // moved down

                        if (y % 2 === 0) {
                            this.#wake(x - 1, y + 1, 0);
                        } else {
                            this.#wake(x + 1, y + 1, 1);
                        }

                        this.#wake(x, y + 1, y % 2);

                        if (y % 2 === 0) {
                            this.#wake(x + 1, y, 0);
                        } else {
                            this.#wake(x - 1, y, 1);
                        }

                        return true;
                    } else {
                        if (ElementHead.getTypeModifierPowderSliding(elementHead) === 1) {
                            const momentum = ElementHead.getTypeModifierPowderMomentum(elementHead);

                            const r = this.#random.nextInt(1000000);
                            if (r > Processor.#asMomentumMoveInMillion(momentum)) {
                                // stop - lost momentum
                                this.#elementArea.setElementHead(x, y, ElementHead.setTypeModifierPowderSliding(elementHead, 0));
                                return false;
                            }

                            const direction = ElementHead.getTypeModifierPowderDirection(elementHead);
                            this.#wake(x, y + 1, direction);

                            const directionX = (direction === 0) ? -1 : 1;
                            if (this.#move(elementHead, x, y, x + directionX, y)) {
                                // moved horizontally
                                this.#wake(x + directionX, y + 1, direction);
                                this.#wake(x - directionX, y, direction);
                                return true;
                            } else {
                                // stop - nowhere to go
                                this.#wake(x + directionX, y + 1, direction);
                                this.#elementArea.setElementHead(x, y, ElementHead.setTypeModifierPowderSliding(elementHead, 0));
                                return false;
                            }
                        }
                        return false;
                    }

                case ElementHead.TYPE_FLUID:
                    // slow moving fluid
                    // if (!this.#move(elementHead, x, y, x, y + 1)) {
                    //     let rnd = this.#random.nextInt(2);
                    //     if (rnd === 0) {
                    //         return this.#move(elementHead, x, y, x + 1, y)
                    //     } else {
                    //         return this.#move(elementHead, x, y, x - 1, y)
                    //     }
                    // }
                    // return true;

                    // fast moving fluid (it can move by 3)
                    if (!this.#move(elementHead, x, y, x, y + 1)) {
                        let rnd = this.#random.nextInt(2);
                        if (rnd === 0) {
                            if (this.#move(elementHead, x, y, x + 1, y)) {
                                this.#wake(x + 1, y + 1, 1);
                                if (this.#move(elementHead, x + 1, y, x + 2, y)) {
                                    if (this.#move(elementHead, x + 2, y, x + 3, y)) {
                                        this.trigger(x + 3, y);
                                    } else {
                                        this.trigger(x + 2, y);
                                    }
                                }
                                return true;
                            }
                            return false;
                        } else {
                            if (this.#move(elementHead, x, y, x - 1, y)) {
                                this.#wake(x - 1, y + 1, 0);
                                if (this.#move(elementHead, x - 1, y, x - 2, y)) {
                                    if (this.#move(elementHead, x - 2, y, x - 3, y)) {
                                        this.trigger(x - 3, y);
                                    } else {
                                        this.trigger(x - 2, y);
                                    }
                                }
                                return true;
                            }
                            return false;
                        }
                    }
                    return true;

                case ElementHead.TYPE_GAS:
                    let rnd = this.#random.nextInt(8);
                    if (rnd === 0 || rnd === 2) {
                        if (this.#move(elementHead, x, y, x, y - 1)) {
                            // moved up
                            this.trigger(x, y - 1);
                            return true;
                        }
                    }
                    if (rnd === 3) {
                        if (this.#move(elementHead, x, y, x + 1, y)) {
                            // moved right
                            this.trigger(x + 1, y);
                            return true;
                        }
                    }
                    if (rnd === 4) {
                        if (this.#move(elementHead, x, y, x - 1, y)) {
                            // moved left
                            this.trigger(x - 1, y);
                            return true;
                        }
                    }
                    return false;

                case ElementHead.TYPE_STATIC:
                    const fallingId = ElementHead.getTypeModifierSolidBodyId(elementHead);
                    if (fallingId === 0) {
                        return false;
                    } else {
                        return this.#moduleSolidBody.behaviourSolid(elementHead, x, y);
                    }

                case ElementHead.TYPE_EFFECT:
                    // no action
                    return false;
            }
            throw "Unknown element type: " + type;
        }

        #move(elementHead, x, y, x2, y2) {
            if (!this.#elementArea.isValidPosition(x2, y2)) {
                if (this.#fallThroughEnabled && y === this.#height - 1) {
                    // try fall through
                    y2 = 0;
                    if (!this.#elementArea.isValidPosition(x2, y2)) {
                        return false;
                    }
                    // continue move...
                } else {
                    return false;
                }
            }

            const elementHead2 = this.#elementArea.getElementHead(x2, y2);
            const elementType2 = ElementHead.getTypeClass(elementHead2);
            if (elementType2 === ElementHead.TYPE_POWDER_FLOATING || elementType2 === ElementHead.TYPE_POWDER) {
                return false;
            }

            const elementType1 = ElementHead.getTypeClass(elementHead);
            if (elementType1 > elementType2) {
                // move

                if (elementType1 === ElementHead.TYPE_POWDER && elementType2 === ElementHead.TYPE_FLUID) {
                    // element may cover element2

                    const elementHeadWithAbsorbedFluid = ElementHead.setTypeClass(elementHead, ElementHead.TYPE_POWDER_WET);
                    const elementTail = this.#elementArea.getElementTail(x, y);

                    // sometimes element2 will not be covered - it looks better
                    if (this.#random.nextInt(100) > 9) {
                        this.#elementArea.setElement(x, y, this.#defaults.getDefaultElement());
                    } else {
                        const elementTail2 = this.#elementArea.getElementTail(x2, y2);
                        this.#elementArea.setElementHead(x, y, elementHead2);
                        this.#elementArea.setElementTail(x, y, elementTail2);
                    }
                    this.#elementArea.setElementHead(x2, y2, elementHeadWithAbsorbedFluid);
                    this.#elementArea.setElementTail(x2, y2, elementTail);

                } else {
                    // swap

                    const elementTail = this.#elementArea.getElementTail(x, y);
                    const elementTail2 = this.#elementArea.getElementTail(x2, y2);

                    this.#elementArea.setElementHead(x2, y2, elementHead);
                    this.#elementArea.setElementHead(x, y, elementHead2);
                    this.#elementArea.setElementTail(x2, y2, elementTail);
                    this.#elementArea.setElementTail(x, y, elementTail2);
                }
                return true;
            }
            return false;
        }

        #canMove(elementHead1, elementHead2) {
            const elementType2 = ElementHead.getTypeClass(elementHead2);
            if (elementType2 === ElementHead.TYPE_POWDER_FLOATING || elementType2 === ElementHead.TYPE_POWDER) {
                return false;
            }

            const elementType1 = ElementHead.getTypeClass(elementHead1);
            return elementType1 > elementType2;
        }

        #wake(x, y, direction) {
            if (this.#elementArea.isValidPosition(x, y)) {
                let elementHead = this.#elementArea.getElementHead(x, y);
                const type = ElementHead.getTypeClass(elementHead);
                if (type === ElementHead.TYPE_POWDER
                        || type === ElementHead.TYPE_POWDER_WET
                        || type === ElementHead.TYPE_POWDER_FLOATING) {

                    const momentum = ElementHead.getTypeModifierPowderMomentum(elementHead);
                    if (momentum === 0) {
                        return;  // never wake up
                    }

                    const directionX = (direction === 0) ? -1 : 1;
                    if (this.#elementArea.isValidPosition(x + directionX, y)) {
                        const nextElementHead = this.#elementArea.getElementHead(x + directionX, y);
                        if (!this.#canMove(elementHead, nextElementHead)) {
                            return;  // target element has no space to move
                        }
                    }

                    const r = this.#random.nextInt(1000000);
                    if (r > Processor.#asMomentumWakeupInMillion(momentum)) {
                        return;  // not this time
                    }

                    elementHead = ElementHead.setTypeModifierPowderSliding(elementHead, 1);
                    elementHead = ElementHead.setTypeModifierPowderDirection(elementHead, direction);
                    this.#elementArea.setElementHead(x, y, elementHead);
                }
            }
        }


        static #asMomentumMoveInMillion(momentum) {
            return [0, 400000, 600000, 700000, 700000, 800000, 950000, 950000][momentum];  // none .. almost always
        }

        static #asMomentumWakeupInMillion(momentum) {
            return [0, 400000, 400000, 400000, 600000, 600000, 850000, 900000][momentum];  // never .. almost always
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
     * @typedef {object} MarkerConfig
     * @property {CSSStyleDeclaration} style
     * @property {string|HTMLElement} label
     * @property {string|undefined} group
     * @property {boolean} visible
     */

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class Marker {

        /** @type number */
        #x1;
        /** @type number */
        #y1;
        /** @type number */
        #x2;
        /** @type number */
        #y2;

        /** @type MarkerConfig */
        #config;

        /** @type boolean */
        #visible = true;
        /** @type function(boolean)[] */
        #onVisibleChanged = [];

        constructor(x1, y1, x2, y2, config) {
            this.#x1 = x1;
            this.#y1 = y1;
            this.#x2 = x2;
            this.#y2 = y2;
            this.#config = config;
            this.#visible = config.visible === true;
        }

        getPosition() {
            return [ this.#x1, this.#y1, this.#x2, this.#y2 ];
        }

        /**
         *
         * @returns {MarkerConfig}
         */
        getConfig() {
            return this.#config;
        }

        // visibility

        isVisible() {
            return this.#visible;
        }

        setVisible(visible) {
            if (this.#visible !== visible) {
                // handlers are triggered only on change
                this.#visible = visible;
                for (let handler of this.#onVisibleChanged) {
                    handler(visible);
                }
            }
        }

        addOnVisibleChanged(handler) {
            this.#onVisibleChanged.push(handler);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-08
     */
    class SandGameGraphics {

        /** @type ElementArea */
        #elementArea;

        /** @type SandGameEntities */
        #entities;

        /** @type DeterministicRandom */
        #random;

        /** @type GameDefaults */
        #defaults;

        /** @type {function(number,number)} */
        #triggerFunction;

        constructor(elementArea, entities, random, defaults, triggerFunction) {
            this.#elementArea = elementArea;
            this.#entities = entities;
            this.#random = random;
            this.#defaults = defaults;
            this.#triggerFunction = triggerFunction;
        }

        /**
         *
         * @param aX {number}
         * @param aY {number}
         * @param bX {number}
         * @param bY {number}
         */
        swap(aX, aY, bX, bY) {
            aX = Math.trunc(aX);
            aY = Math.trunc(aY);
            bX = Math.trunc(bX);
            bY = Math.trunc(bY);

            if (this.#elementArea.isValidPosition(aX, aY) && this.#elementArea.isValidPosition(bX, bY)) {
                this.#elementArea.swap(aX, aY, bX, bY);
                this.#triggerFunction(aX, aY);
                this.#triggerFunction(bX, bY);
            }
        }

        /**
         *
         * @param x {number}
         * @param y {number}
         * @param brushOrElement {Brush|Element|null}
         */
        draw(x, y, brushOrElement) {
            x = Math.trunc(x);
            y = Math.trunc(y);

            if (this.#elementArea.isValidPosition(x, y)) {
                if (brushOrElement === null) {
                    this.#elementArea.setElement(x, y, this.#defaults.getDefaultElement());
                    this.#triggerFunction(x, y);
                } else if (brushOrElement instanceof Element) {
                    this.#elementArea.setElement(x, y, brushOrElement);
                    this.#triggerFunction(x, y);
                } else if (brushOrElement instanceof Brush) {
                    let oldElement = this.#elementArea.getElement(x, y);
                    let newElement = brushOrElement.apply(x, y, this.#random, oldElement);
                    this.#elementArea.setElement(x, y, newElement);
                    this.#triggerFunction(x, y);
                } else {
                    throw 'Brush or Element expected';
                }
            }
        }

        drawRectangle(x1, y1, x2, y2, brushOrElement, supportNegativeCoordinates = false) {
            if (!(brushOrElement instanceof Brush || brushOrElement instanceof Element)) {
                throw 'Brush expected';
            }

            x1 = Math.trunc(x1);
            y1 = Math.trunc(y1);
            x2 = Math.trunc(x2);
            y2 = Math.trunc(y2);

            if (supportNegativeCoordinates) {
                x1 = (x1 >= 0) ? x1 : this.getWidth() + x1 + 1;
                x2 = (x2 >= 0) ? x2 : this.getWidth() + x2 + 1;
                y1 = (y1 >= 0) ? y1 : this.getHeight() + y1 + 1;
                y2 = (y2 >= 0) ? y2 : this.getHeight() + y2 + 1;
            }

            x1 = Math.max(Math.min(x1, this.getWidth()), 0);
            x2 = Math.max(Math.min(x2, this.getWidth()), 0);
            y1 = Math.max(Math.min(y1, this.getHeight()), 0);
            y2 = Math.max(Math.min(y2, this.getHeight()), 0);

            for (let y = y1; y < y2; y++) {
                for (let x = x1; x < x2; x++) {
                    this.draw(x, y, brushOrElement);
                }
            }
        }

        drawRectangleWH(x, y, w, h, brush) {
            this.drawRectangle(x, y, x + w, y + h, brush, false);
        }

        drawLine(x1, y1, x2, y2, size, brushOrElement, round=false) {
            if (!(brushOrElement instanceof Brush || brushOrElement instanceof Element)) {
                throw 'Brush expected';
            }

            x1 = Math.trunc(x1);
            y1 = Math.trunc(y1);
            x2 = Math.trunc(x2);
            y2 = Math.trunc(y2);

            let consumer;
            if (round) {
                let maxLevel = Math.trunc(size / 2);

                let blueprint;
                if (maxLevel <= 3) {
                    blueprint = CircleIterator.BLUEPRINT_3;
                } else if (maxLevel === 4) {
                    blueprint = CircleIterator.BLUEPRINT_4;
                } else {
                    blueprint = CircleIterator.BLUEPRINT_9;
                }

                consumer = (x, y) => {
                    CircleIterator.iterate(blueprint, (dx, dy, level) => {
                        if (level <= maxLevel) {
                            this.draw(x + dx, y + dy, brushOrElement);
                        }
                    });
                };
            } else {
                const d = Math.ceil(size / 2);
                consumer = (x, y) => {
                    this.drawRectangle(x - d, y - d, x + d, y + d, brushOrElement);
                };
            }

            SandGameGraphics.#lineAlgorithm(x1, y1, x2, y2, consumer);
        }

        static #lineAlgorithm(x1, y1, x2, y2, consumer) {
            consumer(x1, y1);

            if ((x1 !== x2) || (y1 !== y2)) {
                const moveX = x1 < x2 ? 1 : -1;
                const moveY = y1 < y2 ? 1 : -1;

                const dx = Math.abs(x2 - x1);
                const dy = Math.abs(y2 - y1);
                let diff = dx - dy;

                while ((x1 !== x2) || (y1 !== y2)) {
                    const p = 2 * diff;

                    if (p > -dy) {
                        diff = diff - dy;
                        x1 = x1 + moveX;
                    }
                    if (p < dx) {
                        diff = diff + dx;
                        y1 = y1 + moveY;
                    }
                    consumer(x1, y1);
                }
            }
        }

        /**
         *
         * @param shape {Marker}
         * @param brushOrElement {Brush|Element}
         */
        drawShape(shape, brushOrElement) {
            if (shape instanceof Marker) {
                const [x1, y1, x2, y2] = shape.getPosition();
                this.drawRectangle(x1, y1, x2, y2, brushOrElement, false);
            } else {
                throw 'Shape not supported';
            }
        }

        fill(brush) {
            this.drawRectangle(0, 0, this.#elementArea.getWidth(), this.#elementArea.getHeight(), brush);
        }

        floodFill(x, y, brush, neighbourhood) {
            x = Math.trunc(x);
            y = Math.trunc(y);

            let floodFillPainter = new FloodFillPainter(this.#elementArea, neighbourhood, this);
            floodFillPainter.paint(x, y, brush);
        }

        replace(elementTarget, elementReplacement) {
            const width = this.getWidth();
            const height = this.getHeight();
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const next = this.#elementArea.getElement(x, y);
                    if (next.elementHead === elementTarget.elementHead && next.elementTail === elementTarget.elementTail) {
                        this.#elementArea.setElement(x, y, elementReplacement);
                    }
                }
            }
        }

        flipVertically() {
            const width = this.getWidth();
            const height = this.getHeight();
            const halfHeight = Math.trunc(height / 2);
            for (let x = 0; x < width; x++) {
                for (let yd = 0; yd < halfHeight; yd++) {
                    this.swap(x, yd, x, height - yd - 1);
                }
            }
        }

        flipHorizontally() {
            const width = this.getWidth();
            const height = this.getHeight();
            const halfWidth = Math.trunc(width / 2);
            for (let y = 0; y < height; y++) {
                for (let xd = 0; xd < halfWidth; xd++) {
                    this.swap(xd, y, width - xd - 1, y);
                }
            }
        }

        insertElementArea(elementArea, offsetX = 0, offsetY = 0) {
            for (let y = 0; y < elementArea.getHeight(); y++) {
                for (let x = 0; x < elementArea.getWidth(); x++) {
                    if (this.#elementArea.isValidPosition(x + offsetX, y + offsetY)) {
                        const elementHead = elementArea.getElementHead(x, y);
                        const elementTail = elementArea.getElementTail(x, y);
                        this.#elementArea.setElementHeadAndTail(x + offsetX, y + offsetY, elementHead, elementTail);
                        this.#triggerFunction(x + offsetX, y + offsetY);
                    }
                }
            }
        }

        getWidth() {
            return this.#elementArea.getWidth();
        }

        getHeight() {
            return this.#elementArea.getHeight();
        }

        entities() {
            return this.#entities;
        }

        getDefaults() {
            return this.#defaults;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Public API for working with entities.
     *
     * @author Patrik Harag
     * @version 2024-05-04
     */
    class SandGameEntities {

        /** @type number */
        #width;
        /** @type number */
        #height;

        /** @type EntityManager */
        #entityManager;

        /** @type {function(number,number)} */
        #triggerFunction;

        constructor(width, height, entityManager, triggerFunction) {
            this.#width = width;
            this.#height = height;
            this.#entityManager = entityManager;
            this.#triggerFunction = triggerFunction;
        }

        insertEntity(serializedEntity) {
            if (serializedEntity instanceof Entity) {
                throw 'Entity instance not supported here';
            }

            // check is not out of bounds
            if (typeof serializedEntity.y === 'number') {
                if (serializedEntity.y < 0 || serializedEntity.y >= this.#height) {
                    return;  // out of bounds
                }
            }
            if (typeof serializedEntity.x === 'number') {
                if (serializedEntity.x < 0 || serializedEntity.x >= this.#width) {
                    return;  // out of bounds
                }
            }

            this.#entityManager.addSerializedEntity(serializedEntity);

            if (typeof serializedEntity.x === 'number' && typeof serializedEntity.y === 'number') {
                this.#triggerFunction(serializedEntity.x, serializedEntity.y);
            }
        }

        // TODO: hide _elementArea, etc.
        /**
         *
         * @param x
         * @param y
         * @returns {Entity[]}
         */
        getAt(x, y) {
            return this.#entityManager.getAt(x, y);
        }

        assignWaypoint(x, y) {
            for (const entity of this.#entityManager.getEntities()) {
                if (typeof entity.assignWaypoint === 'function') {
                    entity.assignWaypoint(x, y);
                }
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class SandGameOverlay {

        /** @type number */
        #width;
        /** @type number */
        #height;

        /** @type Marker[] */
        #markers = [];

        /** @type function(Marker)[] */
        #onMarkerAdded = [];

        constructor(width, height) {
            this.#width = width;
            this.#height = height;
        }

        /**
         *
         * @param x1
         * @param y1
         * @param x2
         * @param y2
         * @param config {MarkerConfig}
         * @param supportNegativeCoordinates {boolean}
         * @returns {Marker}
         */
        createRectangle(x1, y1, x2, y2, config, supportNegativeCoordinates = false) {
            x1 = Math.trunc(x1);
            y1 = Math.trunc(y1);
            x2 = Math.trunc(x2);
            y2 = Math.trunc(y2);

            if (supportNegativeCoordinates) {
                x1 = (x1 >= 0) ? x1 : this.#width + x1 + 1;
                x2 = (x2 >= 0) ? x2 : this.#width + x2 + 1;
                y1 = (y1 >= 0) ? y1 : this.#height + y1 + 1;
                y2 = (y2 >= 0) ? y2 : this.#height + y2 + 1;
            }

            x1 = Math.max(Math.min(x1, this.#width - 1), 0);
            x2 = Math.max(Math.min(x2, this.#width - 1), 0);
            y1 = Math.max(Math.min(y1, this.#height - 1), 0);
            y2 = Math.max(Math.min(y2, this.#height - 1), 0);

            const marker = new Marker(x1, y1, x2, y2, config);
            this.#markers.push(marker);
            for (let handler of this.#onMarkerAdded) {
                handler(marker);
            }

            return marker;
        }

        /**
         *
         * @param x
         * @param y
         * @param w
         * @param h
         * @param config {MarkerConfig}
         * @returns {Marker}
         */
        createRectangleWH(x, y, w, h, config) {
            return this.createRectangle(x, y, x + w, y + h, config);
        }

        /**
         *
         * @param group {string|undefined}
         * @returns {Marker[]}
         */
        getMarkers(group = undefined) {
            if (group === undefined) {
                return [...this.#markers];
            } else {
                // TODO: cache?
                return this.#markers.filter(m => m.getConfig().group === group);
            }
        }

        addOnMarkerAdded(handler) {
            this.#onMarkerAdded.push(handler);
        }

        getWidth() {
            return this.#width;
        }

        getHeight() {
            return this.#height
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @typedef {object} SplashConfig
     * @property {HTMLElement|string} content
     * @property {CSSStyleDeclaration} style
     * @property {SplashButton[]} buttons
     * @property {boolean} visible
     */
    /**
     * @typedef {object} SplashButton
     * @property {string} title
     * @property {string} class
     * @property {boolean} focus
     * @property {function(Splash):void} action
     */

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-13
     */
    class Splash {

        /** @type SplashConfig */
        #config;

        /** @type boolean */
        #visible;
        /** @type function(boolean)[] */
        #onVisibleChanged = [];

        /**
         *
         * @param config {SplashConfig}
         */
        constructor(config) {
            this.#config = config;
            this.#visible = config.visible === true;
        }

        getConfig() {
            return this.#config;  // TODO: immutable
        }

        // visibility

        isVisible() {
            return this.#visible;
        }

        setVisible(visible) {
            if (this.#visible !== visible) {
                // handlers are triggered only on change
                this.#visible = visible;
                for (let handler of this.#onVisibleChanged) {
                    handler(visible);
                }
            }
        }

        addOnVisibleChanged(handler) {
            this.#onVisibleChanged.push(handler);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @typedef {object} ObjectiveConfig
     * @property {string} name
     * @property {string} description
     * @property {boolean} visible
     * @property {boolean} active
     * @property {function(iteration:number)} checkHandler
     */

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-13
     */
    class Objective {

        /** @type ObjectiveConfig */
        #config;

        /** @type boolean */
        #visible;
        /** @type function(boolean)[] */
        #onVisibleChanged = [];

        /** @type boolean */
        #active;
        /** @type function(boolean)[] */
        #onActiveChanged = [];

        /** @type boolean */
        #completed = false;
        /** @type function(boolean)[] */
        #onCompletedChanged = [];

        /**
         *
         * @param config {ObjectiveConfig}
         */
        constructor(config) {
            this.#config = config;
            this.#visible = config.visible === true;
            this.#active = config.active === true;
        }

        getConfig() {
            return this.#config;  // TODO: immutable
        }

        // visible

        isVisible() {
            return this.#visible;
        }

        setVisible(visible) {
            if (this.#visible !== visible) {
                // handlers are triggered only on change
                this.#visible = visible;
                for (let handler of this.#onVisibleChanged) {
                    handler(visible);
                }
            }
        }

        addOnVisibleChanged(handler) {
            this.#onVisibleChanged.push(handler);
        }

        // active

        isActive() {
            return this.#active;
        }

        setActive(active) {
            if (this.#active !== active) {
                // handlers are triggered only on change
                this.#active = active;
                for (let handler of this.#onActiveChanged) {
                    handler(active);
                }
            }
        }

        addOnActiveChanged(handler) {
            this.#onActiveChanged.push(handler);
        }

        // status

        isCompleted() {
            return this.#completed;
        }

        setCompleted(completed) {
            if (this.#completed !== completed) {
                // handlers are triggered only on change
                this.#completed = completed;
                for (let handler of this.#onCompletedChanged) {
                    handler(completed);
                }
            }
        }

        addOnCompleted(handler) {
            this.#onCompletedChanged.push(handler);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-11
     */
    class SandGameScenario {

        /** @type Splash[] */
        #splashes = [];

        /** @type function(Splash)[] */
        #onSplashAdded = [];

        /** @type Objective[] */
        #objectives = [];

        /** @type function(Objective)[] */
        #onObjectiveAdded = [];

        #statusCompleted = false;

        /** @type function()[] */
        #onStatusCompleted = [];

        constructor() {
            // empty
        }

        // splash

        /**
         *
         * @param config {SplashConfig}
         * @returns {Splash}
         */
        createSplash(config) {
            const splash = new Splash(config);
            this.#splashes.push(splash);
            for (let handler of this.#onSplashAdded) {
                handler(splash);
            }
            return splash;
        }

        getSplashes() {
            return [...this.#splashes];
        }

        /**
         *
         * @param handler {function(Splash)}
         */
        addOnSplashAdded(handler) {
            this.#onSplashAdded.push(handler);
        }

        // objectives

        /**
         *
         * @param config {ObjectiveConfig}
         * @returns {Objective}
         */
        createObjective(config) {
            const objective = new Objective(config);
            this.#objectives.push(objective);
            for (let handler of this.#onObjectiveAdded) {
                handler(objective);
            }
            return objective;
        }

        getObjectives() {
            return [...this.#objectives];
        }

        /**
         *
         * @param handler {function(Objective)}
         */
        addOnObjectiveAdded(handler) {
            this.#onObjectiveAdded.push(handler);
        }

        // status

        setCompleted() {
            if (!this.#statusCompleted) {
                this.#statusCompleted = true;
                Analytics.triggerFeatureUsed(Analytics.FEATURE_SCENARIO_COMPLETED);
                for (let handler of this.#onStatusCompleted) {
                    handler();
                }
            }
        }

        addOnStatusCompleted(handler) {
            this.#onStatusCompleted.push(handler);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class Snapshot {

        /** @type SnapshotMetadata */
        metadata;

        /** @type ArrayBuffer */
        dataHeads;

        /** @type ArrayBuffer */
        dataTails;

        /** @type object[] */
        serializedEntities;

    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class SnapshotMetadata {

        static CURRENT_FORMAT_VERSION = 7;


        /** @type number */
        formatVersion;

        /** @type string */
        appVersion;

        /** @type number|undefined */
        created;

        /** @type number|undefined */
        width;

        /** @type number|undefined */
        height;

        /** @type number|undefined */
        scale;

        /** @type number|undefined */
        random;

        /** @type number|undefined */
        iteration;

        /** @type boolean|undefined */
        fallThroughEnabled;

        /** @type boolean|undefined */
        erasingEnabled;
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2022-09-21
     */
    class TemplateBlockPainter {

        /** @type SandGameGraphics */
        #graphics;

        /** @type string|string[]|null */
        #blueprint = null;
        /** @type object|null */
        #brushes = null;

        /** @type number */
        #maxHeight = Number.MAX_SAFE_INTEGER;

        /** @type string */
        #verticalAlign = 'bottom';

        /**
         *
         * @param graphics {SandGameGraphics}
         */
        constructor(graphics) {
            this.#graphics = graphics;
        }

        /**
         *
         * @param blueprint {string|string[]}
         * @returns {TemplateBlockPainter}
         */
        withBlueprint(blueprint) {
            this.#blueprint = blueprint;
            return this;
        }

        /**
         *
         * @param brushes
         * @returns {TemplateBlockPainter}
         */
        withBrushes(brushes) {
            this.#brushes = brushes;
            return this;
        }

        /**
         *
         * @param maxHeight max template height
         * @param align {string} bottom|top
         * @returns {TemplateBlockPainter}
         */
        withMaxHeight(maxHeight, align = 'bottom') {
            this.#maxHeight = maxHeight;
            this.#verticalAlign = align;
            return this;
        }

        paint() {
            if (this.#blueprint === null || this.#blueprint.length === 0) {
                throw 'Blueprint not set';
            }
            if (this.#brushes === null) {
                throw 'Brushes not set';
            }

            const blueprint = (typeof this.#blueprint === 'string')
                ? this.#blueprint.split('\n')
                : this.#blueprint;

            const w = blueprint[0].length;
            const h = blueprint.length;

            const ww = Math.ceil(this.#graphics.getWidth() / w);
            const hh = Math.ceil(Math.min(this.#graphics.getHeight(), this.#maxHeight) / h);
            // note: rounding up is intentional - we don't want gaps, drawRectangle can handle drawing out of canvas

            const verticalOffset = (this.#verticalAlign === 'bottom' ? this.#graphics.getHeight() - (hh * h) : 0);

            for (let y = 0; y < h; y++) {
                const line = blueprint[y];
                for (let x = 0; x < Math.min(w, line.length); x++) {
                    const char = line.charAt(x);
                    let brush = this.#brushes[char];
                    if (brush === undefined) {
                        if (char === ' ') {
                            // let this cell empty
                            continue;
                        }
                        throw 'Brush not found: ' + char;
                    }
                    this.#graphics.drawRectangle(
                        x * ww, verticalOffset + (y * hh),
                        x * ww + ww + 1, verticalOffset + (y * hh) + hh + 1, brush);
                }
            }
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var cubicSpline = class Spline {
      constructor(xs, ys) {
        this.xs = xs;
        this.ys = ys;
        this.ks = this.getNaturalKs(new Float64Array(this.xs.length));
      }

      getNaturalKs(ks) {
        const n = this.xs.length - 1;
        const A = zerosMat(n + 1, n + 2);

        for (
          let i = 1;
          i < n;
          i++ // rows
        ) {
          A[i][i - 1] = 1 / (this.xs[i] - this.xs[i - 1]);
          A[i][i] =
            2 *
            (1 / (this.xs[i] - this.xs[i - 1]) + 1 / (this.xs[i + 1] - this.xs[i]));
          A[i][i + 1] = 1 / (this.xs[i + 1] - this.xs[i]);
          A[i][n + 1] =
            3 *
            ((this.ys[i] - this.ys[i - 1]) /
              ((this.xs[i] - this.xs[i - 1]) * (this.xs[i] - this.xs[i - 1])) +
              (this.ys[i + 1] - this.ys[i]) /
                ((this.xs[i + 1] - this.xs[i]) * (this.xs[i + 1] - this.xs[i])));
        }

        A[0][0] = 2 / (this.xs[1] - this.xs[0]);
        A[0][1] = 1 / (this.xs[1] - this.xs[0]);
        A[0][n + 1] =
          (3 * (this.ys[1] - this.ys[0])) /
          ((this.xs[1] - this.xs[0]) * (this.xs[1] - this.xs[0]));

        A[n][n - 1] = 1 / (this.xs[n] - this.xs[n - 1]);
        A[n][n] = 2 / (this.xs[n] - this.xs[n - 1]);
        A[n][n + 1] =
          (3 * (this.ys[n] - this.ys[n - 1])) /
          ((this.xs[n] - this.xs[n - 1]) * (this.xs[n] - this.xs[n - 1]));

        return solve(A, ks);
      }

      /**
       * inspired by https://stackoverflow.com/a/40850313/4417327
       */
      getIndexBefore(target) {
        let low = 0;
        let high = this.xs.length;
        let mid = 0;
        while (low < high) {
          mid = Math.floor((low + high) / 2);
          if (this.xs[mid] < target && mid !== low) {
            low = mid;
          } else if (this.xs[mid] >= target && mid !== high) {
            high = mid;
          } else {
            high = low;
          }
        }
        return low + 1;
      }

      at(x) {
        let i = this.getIndexBefore(x);
        const t = (x - this.xs[i - 1]) / (this.xs[i] - this.xs[i - 1]);
        const a =
          this.ks[i - 1] * (this.xs[i] - this.xs[i - 1]) -
          (this.ys[i] - this.ys[i - 1]);
        const b =
          -this.ks[i] * (this.xs[i] - this.xs[i - 1]) +
          (this.ys[i] - this.ys[i - 1]);
        const q =
          (1 - t) * this.ys[i - 1] +
          t * this.ys[i] +
          t * (1 - t) * (a * (1 - t) + b * t);
        return q;
      }
    };

    function solve(A, ks) {
      const m = A.length;
      let h = 0;
      let k = 0;
      while (h < m && k <= m) {
        let i_max = 0;
        let max = -Infinity;
        for (let i = h; i < m; i++) {
          const v = Math.abs(A[i][k]);
          if (v > max) {
            i_max = i;
            max = v;
          }
        }

        if (A[i_max][k] === 0) {
          k++;
        } else {
          swapRows(A, h, i_max);
          for (let i = h + 1; i < m; i++) {
            const f = A[i][k] / A[h][k];
            A[i][k] = 0;
            for (let j = k + 1; j <= m; j++) A[i][j] -= A[h][j] * f;
          }
          h++;
          k++;
        }
      }

      for (
        let i = m - 1;
        i >= 0;
        i-- // rows = columns
      ) {
        var v = 0;
        if (A[i][i]) {
          v = A[i][m] / A[i][i];
        }
        ks[i] = v;
        for (
          let j = i - 1;
          j >= 0;
          j-- // rows
        ) {
          A[j][m] -= A[j][i] * v;
          A[j][i] = 0;
        }
      }
      return ks;
    }

    function zerosMat(r, c) {
      const A = [];
      for (let i = 0; i < r; i++) A.push(new Float64Array(c));
      return A;
    }

    function swapRows(m, k, l) {
      let p = m[k];
      m[k] = m[l];
      m[l] = p;
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class TemplateLayeredPainter {

        /** @type ElementArea */
        #elementArea;

        /** @type SandGameGraphics */
        #graphics;

        /** @type DeterministicRandom */
        #random;

        /** @type ProcessorContext */
        #processorContext;

        #lastLevel;

        /**
         *
         * @param elementArea {ElementArea}
         * @param graphics {SandGameGraphics}
         * @param random {DeterministicRandom}
         * @param processorContext {ProcessorContext}
         */
        constructor(elementArea, graphics, random, processorContext) {
            this.#elementArea = elementArea;
            this.#graphics = graphics;
            this.#random = random;
            this.#processorContext = processorContext;
            this.#lastLevel = new Array(elementArea.getWidth()).fill(0);
        }

        /**
         *
         * @param constant {number}
         * @param relative {boolean}
         * @param brush {Brush}
         * @param shuffleWithLevelBelow {number}
         * @returns {TemplateLayeredPainter}
         */
        layer(constant, relative, brush, shuffleWithLevelBelow = 0) {
            function func(x) {
                return Math.trunc(constant);
            }

            this.layerFunction(func, relative, brush, shuffleWithLevelBelow);
            return this;
        }

        /**
         *
         * @param points {[number,number][]}
         * @param relative {boolean}
         * @param brush {Brush}
         * @param shuffleWithLevelBelow {number}
         * @returns {TemplateLayeredPainter}
         */
        layerSpline(points, relative, brush, shuffleWithLevelBelow = 0) {
            const xs = new Array(points.length);
            const ys = new Array(points.length);
            for (let i = 0; i < points.length; i++) {
                xs[i] = points[i][0];
                ys[i] = points[i][1];
            }
            const spline = new cubicSpline(xs, ys);
            function func (x) {
                return Math.max(Math.trunc(spline.at(x)), 0);
            }

            this.layerFunction(func, relative, brush, shuffleWithLevelBelow);
            return this;
        }

        /**
         *
         * @param config {{seed:number,factor:number,threshold:number,force:number}[]}
         * @param relative {boolean}
         * @param brush {Brush}
         * @param shuffleWithLevelBelow {number}
         * @returns {TemplateLayeredPainter}
         */
        layerPerlin(config, relative, brush, shuffleWithLevelBelow = 0) {
            const levels = [];
            for (let levelConfig of config) {
                if (levelConfig.seed === undefined) {
                    DeterministicRandom.DEFAULT.next();
                    levelConfig.seed = DeterministicRandom.DEFAULT.getState();
                }
                if (levelConfig.factor === undefined) {
                    throw 'factor not defined';
                }
                if (levelConfig.threshold === undefined) {
                    throw 'threshold not defined';
                }
                if (levelConfig.force === undefined) {
                    throw 'force not defined';
                }

                const random = new DeterministicRandom(levelConfig.seed);
                const noise2d = createNoise2D(() => random.next());

                levels.push({ instance: noise2d, levelConfig: levelConfig });
            }

            function func(x) {
                let result = 0;
                for (const { instance, levelConfig } of levels) {
                    const { factor, threshold, force } = levelConfig;

                    let value = (instance(x / factor, 0) + 1) / 2;  // 0..1

                    // apply threshold
                    if (value < threshold) {
                        value = 0;
                    }
                    value = (value - threshold) * (1 / (1 - threshold));  // normalized 0..1

                    // apply force
                    value = value * force;

                    result += value;
                }
                return Math.trunc(result);
            }

            this.layerFunction(func, relative, brush, shuffleWithLevelBelow);
            return this;
        }

        /**
         *
         * @param func {function(x:number):number}
         * @param relative {boolean}
         * @param brush {Brush}
         * @param shuffleWithLevelBelow {number}
         * @returns {TemplateLayeredPainter}
         */
        layerFunction(func, relative, brush, shuffleWithLevelBelow = 0) {
            for (let x = 0; x < this.#elementArea.getWidth(); x++) {
                const lastLevel = this.#lastLevel[x];

                const level = (relative)
                        ? lastLevel + func(x)
                        : func(x);

                if (lastLevel < level) {
                    let count = 0;
                    for (let i = lastLevel; i < level && i < this.#elementArea.getHeight(); i++) {
                        let y = this.#elementArea.getHeight() - 1 - i;
                        this.#graphics.draw(x, y, brush);
                        count++;
                    }

                    // shuffle
                    if (shuffleWithLevelBelow > 0 && count > 0) {
                        for (let i = 0; i < shuffleWithLevelBelow; i++) {
                            const max = Math.min(Math.trunc(count / 2), 10);
                            if (max > 1) {
                                const r = this.#random.nextInt(Math.ceil(max)) - Math.trunc(max / 2);
                                const y1 = this.#elementArea.getHeight() - 1 - lastLevel + r;
                                const y2 = this.#elementArea.getHeight() - 1 - lastLevel + r + 1;
                                if (y1 < this.#elementArea.getHeight() && y2 < this.#elementArea.getHeight()) {
                                    this.#elementArea.swap(x, y1, x, y2);
                                }
                            }
                        }
                    }

                    this.#lastLevel[x] = level;
                }
            }
            return this;
        }

        grass(from = 0, to = -1) {
            if (to === -1) {
                to = this.#elementArea.getWidth();
            }
            for (let x = from; x < to; x++) {
                const lastLevel = this.#lastLevel[x];
                const y = this.#elementArea.getHeight() - 1 - lastLevel;

                if (ProcessorModuleGrass.canGrowUpHere(this.#elementArea, x, y)) {
                    const brush = this.#processorContext.getDefaults().getBrushGrass();
                    ProcessorModuleGrass.spawnHere(this.#elementArea, x, y, brush, this.#random);
                }
            }

            // TODO: update lastLevel
            return this;
        }

        tree(x, type = undefined, levelsToGrow = undefined, force = false) {
            if (x <= 5 || x >= this.#elementArea.getWidth() - 5) {
                return this;  // out of bounds
            }

            const lastLevel = this.#lastLevel[x];
            const y = this.#elementArea.getHeight() - 1 - lastLevel;

            const brush = this.#processorContext.getDefaults().getBrushTree();

            // check element under
            if (this.#elementArea.isValidPosition(x, y + 1)) {
                if (!force) {
                    const elementHeadUnder = this.#elementArea.getElementHead(x, y + 1);
                    if (ElementHead.getBehaviour(elementHeadUnder) !== ElementHead.BEHAVIOUR_SOIL) {
                        return this;
                    }
                }
            } else {
                return this;
            }

            if (type === undefined) {
                type = this.#random.nextInt(8);
            }

            ProcessorModuleTree.spawnHere(this.#elementArea, x, y, type, brush, this.#random, this.#processorContext, levelsToGrow);

            // TODO: update lastLevel
            return this;
        }

        tool(x, relativeY, tool) {
            if (x < 0 || x >= this.#elementArea.getWidth()) {
                return this;  // out of bounds
            }

            const lastLevel = this.#lastLevel[x];
            const y = this.#elementArea.getHeight() - relativeY - lastLevel;
            if (y < 0 || y >= this.#elementArea.getHeight()) {
                return this;  // out of bounds
            }

            tool.applyPoint(x, y, this.#graphics, false);

            // TODO: update lastLevel
            return this;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-04
     */
    class SandGame {

        /** @type ElementArea */
        #elementArea;

        /** @type number */
        #width;

        /** @type number */
        #height;

        /** @type EntityManager */
        #entityManager;

        /** @type DeterministicRandom */
        #random;

        /** @type Counter */
        #framesCounter;

        /** @type Counter */
        #iterationsCounter;

        /** @type Processor */
        #processor;

        /** @type Renderer */
        #renderer;

        /** @type number|null */
        #processorIntervalHandle = null;

        /** @type number|null */
        #rendererIntervalHandle = null;

        /** @type function[] */
        #onRendered = [];
        /** @type function[] */
        #onRenderingFailed = [];

        /** @type function(number)[] */
        #onProcessed = [];

        /** @type SandGameGraphics */
        #graphics;

        /** @type SandGameEntities */
        #entities;

        /** @type SandGameOverlay */
        #overlay;

        /** @type SandGameScenario */
        #scenario;

        /**
         *
         * @param elementArea {ElementArea}
         * @param serializedEntities {object[]}
         * @param sceneMetadata {SnapshotMetadata|null}
         * @param gameDefaults {GameDefaults}
         * @param context {CanvasRenderingContext2D|WebGLRenderingContext}
         * @param rendererInitializer {RendererInitializer}
         */
        constructor(elementArea, serializedEntities, sceneMetadata, gameDefaults,
                context, rendererInitializer) {

            this.#random = new DeterministicRandom((sceneMetadata) ? sceneMetadata.random : 0);
            this.#elementArea = elementArea;
            this.#width = elementArea.getWidth();
            this.#height = elementArea.getHeight();
            this.#framesCounter = new Counter();
            this.#iterationsCounter = new Counter();
            this.#processor = new Processor(this.#elementArea, 16, this.#random, gameDefaults, sceneMetadata);
            this.#renderer = rendererInitializer.initialize(this.#elementArea, 16, context);
            this.#entityManager = new EntityManager(serializedEntities, new GameState(elementArea, this.#random, this.#processor, null));
            const triggerFunction = (x, y) => {
                this.#processor.trigger(x, y);
                this.#renderer.trigger(x, y);
            };
            this.#entities = new SandGameEntities(elementArea.getWidth(), elementArea.getHeight(), this.#entityManager, triggerFunction);
            this.#graphics = new SandGameGraphics(this.#elementArea, this.#entities, this.#random, gameDefaults, triggerFunction);
            this.#overlay = new SandGameOverlay(elementArea.getWidth(), elementArea.getHeight());
            this.#scenario = new SandGameScenario();

            this.#initExtensions(gameDefaults);
            this.#initObjectives();
        }

        #initObjectives() {
            let activeObjectives = [];
            const updateActiveObjectives = () => {
                activeObjectives = this.#scenario.getObjectives().filter(o => {
                    return o.isActive() && (typeof o.getConfig().checkHandler === 'function');
                });
            };

            this.#scenario.addOnObjectiveAdded(objective => {
                updateActiveObjectives();
                objective.addOnActiveChanged(() => updateActiveObjectives());
                objective.addOnCompleted(() => updateActiveObjectives());
            });
            this.#onProcessed.push(() => {
                for (let objective of activeObjectives) {
                    objective.getConfig().checkHandler(this.#processor.getIteration() - 1);
                }
            });
        }

        #initExtensions(gameDefaults) {
            const gameState = new GameState(this.#elementArea, this.#random, this.#processor, this.#entityManager);
            const extensionsFactory = gameDefaults.getExtensionsFactory();
            const extensions = extensionsFactory(gameState);
            for (const extension of extensions) {
                this.#processor.addExtension(extension);
            }
        }

        getBrushCollection() {
            return this.#processor.getDefaults().getBrushCollection();
        }

        startProcessing() {
            if (this.#processorIntervalHandle === null) {
                const interval = Math.trunc(1000 / Processor.OPT_CYCLES_PER_SECOND);  // ms
                this.#processorIntervalHandle = setInterval(() => this.doProcessing(), interval);
            }
        }

        startRendering() {
            if (this.#rendererIntervalHandle === null) {
                const interval = Math.trunc(1000 / Processor.OPT_FRAMES_PER_SECOND);  // ms
                this.#rendererIntervalHandle = setInterval(() => this.doRendering(), interval);
            }
        }

        stopProcessing() {
            if (this.#processorIntervalHandle !== null) {
                clearInterval(this.#processorIntervalHandle);
                this.#processorIntervalHandle = null;
            }
            this.#iterationsCounter.clear();
        }

        stopRendering() {
            if (this.#rendererIntervalHandle !== null) {
                clearInterval(this.#rendererIntervalHandle);
                this.#rendererIntervalHandle = null;
            }
            this.#framesCounter.clear();
        }

        doProcessing() {
            // TODO: error reporting

            this.#entityManager.performBeforeProcessing();
            this.#processor.next();
            this.#entityManager.performAfterProcessing();

            const t = Date.now();
            this.#iterationsCounter.tick(t);
            for (let func of this.#onProcessed) {
                func(this.#processor.getIteration());
            }
        }

        doRendering() {
            const changedChunks = this.#processor.getChangedChunks();
            try {
                this.#renderer.render(changedChunks);
            } catch (e) {
                this.stopRendering();
                for (let func of this.#onRenderingFailed) {
                    func(e);
                }
                return;
            }
            const t = Date.now();
            this.#framesCounter.tick(t);
            for (let func of this.#onRendered) {
                func(changedChunks);
            }
            this.#processor.cleanChangedChunks();
        }

        /**
         *
         * @returns {SandGameGraphics}
         */
        graphics() {
            return this.#graphics;
        }

        /**
         *
         * @returns {SandGameEntities}
         */
        entities() {
            return this.#entities;
        }

        /**
         *
         * @returns {SandGameOverlay}
         */
        overlay() {
            return this.#overlay;
        }

        /**
         *
         * @returns {SandGameScenario}
         */
        scenario() {
            return this.#scenario;
        }

        /**
         *
         * @returns {TemplateBlockPainter}
         */
        blockTemplate() {
            return new TemplateBlockPainter(this.graphics());
        }

        /**
         *
         * @returns {TemplateLayeredPainter}
         */
        layeredTemplate() {
            return new TemplateLayeredPainter(this.#elementArea, this.graphics(), this.#random, this.#processor);
        }

        setBoxedMode() {
            this.#processor.setFallThroughEnabled(false);
            this.#processor.setErasingEnabled(false);
        }

        setFallThroughMode() {
            this.#processor.setFallThroughEnabled(true);
            this.#processor.setErasingEnabled(false);
        }

        setErasingMode() {
            this.#processor.setFallThroughEnabled(false);
            this.#processor.setErasingEnabled(true);
        }

        /**
         *
         * @param handler {function(iteration:number)}
         */
        addOnProcessed(handler) {
            this.#onProcessed.push(handler);
        }

        addOnRendered(handler) {
            this.#onRendered.push(handler);
        }

        addOnRenderingFailed(handler) {
            this.#onRenderingFailed.push(handler);
        }

        getFramesPerSecond() {
            return this.#framesCounter.getValue();
        }

        getIterationsPerSecond() {
            return this.#iterationsCounter.getValue();
        }

        getWidth() {
            return this.#width;
        }

        getHeight() {
            return this.#height;
        }

        getChunkSize() {
            return 16;
        }

        /**
         * @returns {Snapshot}
         */
        createSnapshot() {
            let metadata = new SnapshotMetadata();
            metadata.formatVersion = SnapshotMetadata.CURRENT_FORMAT_VERSION;
            metadata.created = new Date().getTime();
            metadata.width = this.#width;
            metadata.height = this.#height;
            metadata.random = this.#random.getState();
            metadata.iteration = this.#processor.getIteration();
            metadata.fallThroughEnabled = this.#processor.isFallThroughEnabled();
            metadata.erasingEnabled = this.#processor.isErasingEnabled();

            let snapshot = new Snapshot();
            snapshot.metadata = metadata;
            snapshot.dataHeads = this.#elementArea.getDataHeads();
            snapshot.dataTails = this.#elementArea.getDataTails();
            snapshot.serializedEntities = this.#entityManager.serializeEntities();
            return snapshot;
        }

        debugElementAt(x, y) {
            if (!this.#elementArea.isValidPosition(x, y)) {
                return 'Out of bounds';
            }

            const elementHead = this.#elementArea.getElementHead(x, y);
            const elementTail = this.#elementArea.getElementTail(x, y);

            function toHex(n) {
                let t = n.toString(16).padStart(8, '0');
                return '0x' + t;
            }
            let hex = toHex(elementHead) + ' ' + toHex(elementTail);

            const json = {
                type: {
                    class: ElementHead.getTypeClass(elementHead),
                },
                behaviour: {
                    type: ElementHead.getBehaviour(elementHead),
                    special: ElementHead.getSpecial(elementHead)
                },
                heatModIndex: ElementHead.getHeatModIndex(elementHead),
                temperature: ElementHead.getTemperature(elementHead),
                color: [
                    ElementTail.getColorRed(elementTail),
                    ElementTail.getColorGreen(elementTail),
                    ElementTail.getColorBlue(elementTail)
                ],
                blurType: ElementTail.getBlurType(elementTail),
                burntLevel: ElementTail.getBurntLevel(elementTail),
                heatEffect: ElementTail.getHeatEffect(elementTail)
            };

            if (json.type.class === ElementHead.TYPE_STATIC) {
                json.type.neighbourhood = ElementHead.getTypeModifierSolidNeighbourhoodType(elementHead);
                json.type.body = ElementHead.getTypeModifierSolidBodyId(elementHead);
            }

            let structure = JSON.stringify(json)
                    .replaceAll('"', '')
                    .replaceAll(',', ', ')
                    .replaceAll(':', '=');
            structure = structure.substring(1, structure.length - 1);  // remove {}

            return hex + '\n' + structure;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-05-08
     */
    class Scene {

        /**
         * @returns [width: number, height: number]
         */
        countSize(prefWidth, prefHeight) {
            throw 'Not implemented';
        }

        /**
         * @param prefWidth {number}
         * @param prefHeight {number}
         * @param defaults {GameDefaults}
         * @param context {CanvasRenderingContext2D|WebGLRenderingContext}
         * @param rendererInitializer {RendererInitializer}
         * @returns Promise<SandGame>
         */
        createSandGame(prefWidth, prefHeight, defaults, context, rendererInitializer) {
            throw 'Not implemented';
        }

        /**
         * @param prefWidth
         * @param prefHeight
         * @param defaultElement
         * @returns ElementArea
         */
        createElementArea(prefWidth, prefHeight, defaultElement) {
            throw 'Not implemented';
        }

        /**
         * Creates entities in serialized state.
         * It may not be supported, but it doesn't mean that there are none - they man be generated in createSandGame.
         *
         * @returns {object[]}
         */
        createEntities() {
            return null;
        }

        executeOnOpened(sandGame) {
            // no action by default
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class SceneImplTmpResize extends Scene {

        /**
         * @type Snapshot
         */
        #snapshot;

        constructor(snapshot) {
            super();
            this.#snapshot = snapshot;
        }

        countSize(prefWidth, prefHeight) {
            return [prefWidth, prefHeight];
        }

        async createSandGame(prefWidth, prefHeight, defaults, context, rendererInitializer) {
            const oldWidth = this.#snapshot.metadata.width;
            const oldHeight = this.#snapshot.metadata.height;
            const oldMetadata = this.#snapshot.metadata;
            const oldElementArea = ElementArea.from(oldWidth, oldHeight, this.#snapshot.dataHeads, this.#snapshot.dataTails);
            const oldSerializedEntities = this.#snapshot.serializedEntities;

            const newElementArea = this.createElementArea(prefWidth, prefHeight, defaults.getDefaultElement());
            const newSandGame = new SandGame(newElementArea, [], oldMetadata, defaults, context, rendererInitializer);

            let offsetY;
            if (prefHeight === oldHeight) {
                offsetY = 0;
            } else if (prefHeight > oldHeight) {
                offsetY = prefHeight - oldHeight;
            } else {
                offsetY = -(oldHeight - prefHeight);
            }

            // copy elements
            newSandGame.graphics().insertElementArea(oldElementArea, 0, offsetY);

            // copy entities
            for (let serializedEntity of oldSerializedEntities) {
                // map entity position
                const serializedClone = Object.assign({}, serializedEntity);
                if (offsetY !== 0) {
                    if (typeof serializedClone.y === 'number') {
                        serializedClone.y += offsetY;
                    }
                }
                newSandGame.entities().insertEntity(serializedClone);
            }

            return newSandGame;
        }

        createElementArea(prefWidth, prefHeight, defaultElement) {
            return ElementArea.create(prefWidth, prefHeight, defaultElement);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-15
     */
    class ServiceToolManager {

        #primaryTool;
        #secondaryTool;
        #tertiaryTool;

        /** @type function(Tool)[] */
        #onPrimaryToolChanged = [];


        /** @type boolean */
        #inputDisabled;
        /** @type function(boolean)[] */
        #onInputDisabledChanged = [];

        constructor(primaryTool, secondaryTool, tertiaryTool) {
            this.#primaryTool = primaryTool;
            this.#secondaryTool = secondaryTool;
            this.#tertiaryTool = tertiaryTool;
        }

        /**
         *
         * @param tool {Tool}
         * @returns void
         */
        setPrimaryTool(tool) {
            this.#primaryTool = tool;
            for (let handler of this.#onPrimaryToolChanged) {
                handler(tool);
            }
        }

        /**
         *
         * @param tool {Tool}
         * @returns void
         */
        setSecondaryTool(tool) {
            this.#secondaryTool = tool;
        }

        /**
         *
         * @param tool {Tool}
         * @returns void
         */
        setTertiaryTool(tool) {
            this.#tertiaryTool = tool;
        }

        /**
         * @returns {Tool}
         */
        getPrimaryTool() {
            return this.#primaryTool;
        }

        /**
         * @returns {Tool}
         */
        getSecondaryTool() {
            return this.#secondaryTool;
        }

        /**
         * @returns {Tool}
         */
        getTertiaryTool() {
            return this.#tertiaryTool;
        }

        /**
         *
         * @param handler {function(Tool)}
         */
        addOnPrimaryToolChanged(handler) {
            this.#onPrimaryToolChanged.push(handler);
        }

        /**
         *
         * @returns {boolean}
         */
        isInputDisabled() {
            return this.#inputDisabled;
        }

        /**
         *
         * @param handler {function(boolean)}
         */
        addOnInputDisabledChanged(handler) {
            this.#onInputDisabledChanged.push(handler);
        }

        setInputDisabled(disabled) {
            if (this.#inputDisabled !== disabled) {
                this.#inputDisabled = disabled;
                for (let handler of this.#onInputDisabledChanged) {
                    handler(disabled);
                }
            }
        }

        createRevertAction() {
            const oldPrimary = this.getPrimaryTool();
            const oldSecondary = this.getSecondaryTool();
            const oldTertiary = this.getTertiaryTool();
            return () => {
                this.setPrimaryTool(oldPrimary);
                this.setSecondaryTool(oldSecondary);
                this.setTertiaryTool(oldTertiary);
            };
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class SceneImplSnapshot extends Scene {

        /**
         * @type Snapshot
         */
        #snapshot;

        /**
         *
         * @param snapshot {Snapshot}
         */
        constructor(snapshot) {
            super();
            this.#snapshot = snapshot;
        }

        countSize(prefWidth, prefHeight) {
            return [this.#snapshot.metadata.width, this.#snapshot.metadata.height];
        }

        async createSandGame(prefWidth, prefHeight, defaults, context, rendererInitializer) {
            const elementArea = this.createElementArea(prefWidth, prefHeight, defaults.getDefaultElement());
            const serializedEntities = this.createEntities();
            const metadata = this.#snapshot.metadata;
            return new SandGame(elementArea, serializedEntities, metadata, defaults, context, rendererInitializer);
        }

        createElementArea(prefWidth, prefHeight, defaultElement) {
            return ElementArea.from(
                    this.#snapshot.metadata.width,
                    this.#snapshot.metadata.height,
                    this.#snapshot.dataHeads,
                    this.#snapshot.dataTails);
        }

        createEntities() {
            return this.#snapshot.serializedEntities;
        }
    }

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
    var _b = freb(fdeb, 0), fd = _b[0], revfd = _b[1];
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
    var flm = /*#__PURE__*/ hMap(flt, 9, 0), flrm = /*#__PURE__*/ hMap(flt, 9, 1);
    // fixed distance map
    var fdm = /*#__PURE__*/ hMap(fdt, 5, 0), fdrm = /*#__PURE__*/ hMap(fdt, 5, 1);
    // find max of array
    var max = function (a) {
        var m = a[0];
        for (var i = 1; i < a.length; ++i) {
            if (a[i] > m)
                m = a[i];
        }
        return m;
    };
    // read d, starting at bit p and mask with m
    var bits = function (d, p, m) {
        var o = (p / 8) | 0;
        return ((d[o] | (d[o + 1] << 8)) >> (p & 7)) & m;
    };
    // read d, starting at bit p continuing for at least 16 bits
    var bits16 = function (d, p) {
        var o = (p / 8) | 0;
        return ((d[o] | (d[o + 1] << 8) | (d[o + 2] << 16)) >> (p & 7));
    };
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
    // expands raw DEFLATE data
    var inflt = function (dat, buf, st) {
        // source length
        var sl = dat.length;
        if (!sl || (st && st.f && !st.l))
            return buf || new u8(0);
        // have to estimate size
        var noBuf = !buf || st;
        // no state
        var noSt = !st || st.i;
        if (!st)
            st = {};
        // Assumes roughly 33% compression ratio average
        if (!buf)
            buf = new u8(sl * 3);
        // ensure buffer can fit at least l elements
        var cbuf = function (l) {
            var bl = buf.length;
            // need to increase size to fit
            if (l > bl) {
                // Double or set to necessary, whichever is greater
                var nbuf = new u8(Math.max(bl * 2, l));
                nbuf.set(buf);
                buf = nbuf;
            }
        };
        //  last chunk         bitpos           bytes
        var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
        // total bits
        var tbts = sl * 8;
        do {
            if (!lm) {
                // BFINAL - this is only 1 when last chunk is next
                final = bits(dat, pos, 1);
                // type: 0 = no compression, 1 = fixed huffman, 2 = dynamic huffman
                var type = bits(dat, pos + 1, 3);
                pos += 3;
                if (!type) {
                    // go to end of byte boundary
                    var s = shft(pos) + 4, l = dat[s - 4] | (dat[s - 3] << 8), t = s + l;
                    if (t > sl) {
                        if (noSt)
                            err(0);
                        break;
                    }
                    // ensure size
                    if (noBuf)
                        cbuf(bt + l);
                    // Copy over uncompressed data
                    buf.set(dat.subarray(s, t), bt);
                    // Get new bitpos, update byte count
                    st.b = bt += l, st.p = pos = t * 8, st.f = final;
                    continue;
                }
                else if (type == 1)
                    lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
                else if (type == 2) {
                    //  literal                            lengths
                    var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
                    var tl = hLit + bits(dat, pos + 5, 31) + 1;
                    pos += 14;
                    // length+distance tree
                    var ldt = new u8(tl);
                    // code length tree
                    var clt = new u8(19);
                    for (var i = 0; i < hcLen; ++i) {
                        // use index map to get real code
                        clt[clim[i]] = bits(dat, pos + i * 3, 7);
                    }
                    pos += hcLen * 3;
                    // code lengths bits
                    var clb = max(clt), clbmsk = (1 << clb) - 1;
                    // code lengths map
                    var clm = hMap(clt, clb, 1);
                    for (var i = 0; i < tl;) {
                        var r = clm[bits(dat, pos, clbmsk)];
                        // bits read
                        pos += r & 15;
                        // symbol
                        var s = r >>> 4;
                        // code length to copy
                        if (s < 16) {
                            ldt[i++] = s;
                        }
                        else {
                            //  copy   count
                            var c = 0, n = 0;
                            if (s == 16)
                                n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
                            else if (s == 17)
                                n = 3 + bits(dat, pos, 7), pos += 3;
                            else if (s == 18)
                                n = 11 + bits(dat, pos, 127), pos += 7;
                            while (n--)
                                ldt[i++] = c;
                        }
                    }
                    //    length tree                 distance tree
                    var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
                    // max length bits
                    lbt = max(lt);
                    // max dist bits
                    dbt = max(dt);
                    lm = hMap(lt, lbt, 1);
                    dm = hMap(dt, dbt, 1);
                }
                else
                    err(1);
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
            }
            // Make sure the buffer can hold this + the largest possible addition
            // Maximum chunk size (practically, theoretically infinite) is 2^17;
            if (noBuf)
                cbuf(bt + 131072);
            var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
            var lpos = pos;
            for (;; lpos = pos) {
                // bits read, code
                var c = lm[bits16(dat, pos) & lms], sym = c >>> 4;
                pos += c & 15;
                if (pos > tbts) {
                    if (noSt)
                        err(0);
                    break;
                }
                if (!c)
                    err(2);
                if (sym < 256)
                    buf[bt++] = sym;
                else if (sym == 256) {
                    lpos = pos, lm = null;
                    break;
                }
                else {
                    var add = sym - 254;
                    // no extra bits needed if less
                    if (sym > 264) {
                        // index
                        var i = sym - 257, b = fleb[i];
                        add = bits(dat, pos, (1 << b) - 1) + fl[i];
                        pos += b;
                    }
                    // dist
                    var d = dm[bits16(dat, pos) & dms], dsym = d >>> 4;
                    if (!d)
                        err(3);
                    pos += d & 15;
                    var dt = fd[dsym];
                    if (dsym > 3) {
                        var b = fdeb[dsym];
                        dt += bits16(dat, pos) & ((1 << b) - 1), pos += b;
                    }
                    if (pos > tbts) {
                        if (noSt)
                            err(0);
                        break;
                    }
                    if (noBuf)
                        cbuf(bt + 131072);
                    var end = bt + add;
                    for (; bt < end; bt += 4) {
                        buf[bt] = buf[bt - dt];
                        buf[bt + 1] = buf[bt + 1 - dt];
                        buf[bt + 2] = buf[bt + 2 - dt];
                        buf[bt + 3] = buf[bt + 3 - dt];
                    }
                    bt = end;
                }
            }
            st.l = lm, st.p = lpos, st.b = bt, st.f = final;
            if (lm)
                final = 1, st.m = lbt, st.d = dm, st.n = dbt;
        } while (!final);
        return bt == buf.length ? buf : slc(buf, 0, bt);
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
    // read 2 bytes
    var b2 = function (d, b) { return d[b] | (d[b + 1] << 8); };
    // read 4 bytes
    var b4 = function (d, b) { return (d[b] | (d[b + 1] << 8) | (d[b + 2] << 16) | (d[b + 3] << 24)) >>> 0; };
    var b8 = function (d, b) { return b4(d, b) + (b4(d, b + 4) * 4294967296); };
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
    /**
     * Expands DEFLATE data with no wrapper
     * @param data The data to decompress
     * @param out Where to write the data. Saves memory if you know the decompressed size and provide an output buffer of that length.
     * @returns The decompressed version of the data
     */
    function inflateSync(data, out) {
        return inflt(data, out);
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
    // decode UTF8
    var dutf8 = function (d) {
        for (var r = '', i = 0;;) {
            var c = d[i++];
            var eb = (c > 127) + (c > 223) + (c > 239);
            if (i + eb > d.length)
                return [r, slc(d, i - 1)];
            if (!eb)
                r += String.fromCharCode(c);
            else if (eb == 3) {
                c = ((c & 15) << 18 | (d[i++] & 63) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63)) - 65536,
                    r += String.fromCharCode(55296 | (c >> 10), 56320 | (c & 1023));
            }
            else if (eb & 1)
                r += String.fromCharCode((c & 31) << 6 | (d[i++] & 63));
            else
                r += String.fromCharCode((c & 15) << 12 | (d[i++] & 63) << 6 | (d[i++] & 63));
        }
    };
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
    /**
     * Converts a Uint8Array to a string
     * @param dat The data to decode to string
     * @param latin1 Whether or not to interpret the data as Latin-1. This should
     *               not need to be true unless encoding to binary string.
     * @returns The original UTF-8/Latin-1 string
     */
    function strFromU8(dat, latin1) {
        if (latin1) {
            var r = '';
            for (var i = 0; i < dat.length; i += 16384)
                r += String.fromCharCode.apply(null, dat.subarray(i, i + 16384));
            return r;
        }
        else if (td)
            return td.decode(dat);
        else {
            var _a = dutf8(dat), out = _a[0], ext = _a[1];
            if (ext.length)
                err(8);
            return out;
        }
    }
    // skip local zip header
    var slzh = function (d, b) { return b + 30 + b2(d, b + 26) + b2(d, b + 28); };
    // read zip header
    var zh = function (d, b, z) {
        var fnl = b2(d, b + 28), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl, bs = b4(d, b + 20);
        var _a = z && bs == 4294967295 ? z64e(d, es) : [bs, b4(d, b + 24), b4(d, b + 42)], sc = _a[0], su = _a[1], off = _a[2];
        return [b2(d, b + 10), sc, su, fn, es + b2(d, b + 30) + b2(d, b + 32), off];
    };
    // read zip64 extra field
    var z64e = function (d, b) {
        for (; b2(d, b) != 1; b += 4 + b2(d, b + 2))
            ;
        return [b8(d, b + 12), b8(d, b + 4), b8(d, b + 20)];
    };
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
    /**
     * Synchronously decompresses a ZIP archive. Prefer using `unzip` for better
     * performance with more than one file.
     * @param data The raw compressed ZIP file
     * @param opts The ZIP extraction options
     * @returns The decompressed files
     */
    function unzipSync(data, opts) {
        var files = {};
        var e = data.length - 22;
        for (; b4(data, e) != 0x6054B50; --e) {
            if (!e || data.length - e > 65558)
                err(13);
        }
        var c = b2(data, e + 8);
        if (!c)
            return {};
        var o = b4(data, e + 16);
        var z = o == 4294967295 || c == 65535;
        if (z) {
            var ze = b4(data, e - 12);
            z = b4(data, ze) == 0x6064B50;
            if (z) {
                c = b4(data, ze + 32);
                o = b4(data, ze + 48);
            }
        }
        var fltr = opts && opts.filter;
        for (var i = 0; i < c; ++i) {
            var _a = zh(data, o, z), c_2 = _a[0], sc = _a[1], su = _a[2], fn = _a[3], no = _a[4], off = _a[5], b = slzh(data, off);
            o = no;
            if (!fltr || fltr({
                name: fn,
                size: sc,
                originalSize: su,
                compression: c_2
            })) {
                if (!c_2)
                    files[fn] = slc(data, b, b + sc);
                else if (c_2 == 8)
                    files[fn] = inflateSync(data.subarray(b, b + sc), new u8(su));
                else
                    err(14, 'unknown compression type ' + c_2);
            }
        }
        return files;
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class ResourceSnapshot {

        static METADATA_JSON_NAME = 'snapshot.json';
        static LEGACY_METADATA_JSON_NAME = 'metadata.json';

        /**
         *
         * @param snapshot {Snapshot}
         * @returns Uint8Array
         */
        static createZip(snapshot) {
            const metadata = strToU8(JSON.stringify(snapshot.metadata, null, 2));
            const entities = strToU8(JSON.stringify(snapshot.serializedEntities, null, 2));

            let zipData = {
                'snapshot.json': metadata,
                'data-heads.bin': new Uint8Array(snapshot.dataHeads),
                'data-tails.bin': new Uint8Array(snapshot.dataTails),
                'data-entities.json': entities,
            };
            return zipSync(zipData, {level: 9});
        }

        /**
         *
         * @param zip {{[path: string]: Uint8Array}}
         * @returns Snapshot
         */
        static parse(zip) {
            function parseJson(fileName) {
                return JSON.parse(strFromU8(zip[fileName]));
            }

            // load metadata
            let metadataJson;
            if (zip[ResourceSnapshot.METADATA_JSON_NAME]) {
                // snapshot | legacy snapshot
                metadataJson = parseJson(ResourceSnapshot.METADATA_JSON_NAME);
            } else if (zip[ResourceSnapshot.LEGACY_METADATA_JSON_NAME]) {
                // legacy snapshot
                metadataJson = parseJson(ResourceSnapshot.LEGACY_METADATA_JSON_NAME);
            } else {
                throw 'Metadata not found';
            }
            let snapshot = new Snapshot();
            snapshot.metadata = Object.assign(new SnapshotMetadata(), metadataJson);

            if (typeof snapshot.metadata.width !== "number") {
                throw 'Metadata property wrong format: width';
            }
            if (typeof snapshot.metadata.height !== "number") {
                throw 'Metadata property wrong format: height';
            }

            // load element data
            if (snapshot.metadata.formatVersion < 3) {
                // ensure backward compatibility
                // legacy interleaving buffer (element head 1, element tail 1, element head 2, element tail 2, ...)
                const dataRaw = zip['data.bin'];
                if (dataRaw) {
                    if (dataRaw.byteLength % 8 !== 0) {
                        throw 'Buffer length is not divisible by 8';
                    }
                    const elements = dataRaw.byteLength / 8;
                    const dataHeads = new Uint8Array(new ArrayBuffer(elements * 4));
                    const dataTails = new Uint8Array(new ArrayBuffer(elements * 4));
                    for (let i = 0; i < elements; i++) {
                        for (let j = 0; j < 4; j++) {  // 4 bytes
                            dataHeads[(i * 4) + j] = dataRaw[(i * 8) + j];
                            dataTails[(i * 4) + j] = dataRaw[(i * 8) + j + 4];
                        }
                    }
                    snapshot.dataHeads = dataHeads.buffer;
                    snapshot.dataTails = dataTails.buffer;
                } else {
                    throw 'data.bin not found';
                }
            } else {
                // one buffer for element heads and one for element tails
                const dataRawHeads = zip['data-heads.bin'];
                if (dataRawHeads) {
                    snapshot.dataHeads = dataRawHeads.buffer;
                } else {
                    throw 'data-heads.bin not found';
                }
                const dataRawTails = zip['data-tails.bin'];
                if (!dataRawTails) {
                    throw 'data-tails.bin not found';
                }
                snapshot.dataTails = dataRawTails.buffer;
            }

            // load entities
            if (snapshot.metadata.formatVersion > 6) {
                snapshot.serializedEntities = parseJson('data-entities.json');
                if (!Array.isArray(snapshot.serializedEntities)) {
                    throw 'Entities corrupted';
                }
            } else {
                snapshot.serializedEntities = [];
            }

            // ensure backward compatibility
            if (snapshot.metadata.formatVersion === 1) {
                // after 23w32a first byte of element head was changed (powder elements reworked)
                ResourceSnapshot.#convertToV2(snapshot);
                snapshot.metadata.formatVersion = 2;
            }
            if (snapshot.metadata.formatVersion === 2) {
                // interleaving buffer >> element head buffer & element tail buffer
                snapshot.metadata.formatVersion = 3;
            }
            if (snapshot.metadata.formatVersion === 3) {
                // temperature conducting, element type class changes
                ResourceSnapshot.#convertToV4(snapshot);
                snapshot.metadata.formatVersion = 4;
            }
            if (snapshot.metadata.formatVersion === 4) {
                // new trees
                ResourceSnapshot.#convertToV5(snapshot);
                snapshot.metadata.formatVersion = 5;
            }
            if (snapshot.metadata.formatVersion === 5) {
                // conductivity, flammability... >> heat mod index
                ResourceSnapshot.#convertToV6(snapshot);
                snapshot.metadata.formatVersion = 6;
            }
            if (snapshot.metadata.formatVersion === 6) {
                // entities, fish head & fish body behaviour removed
                ResourceSnapshot.#convertToV7(snapshot);
                snapshot.metadata.formatVersion = 7;
            }

            return snapshot;
        }

        static #convertToV2(snapshot) {
            const elementArea = ElementArea.from(
                snapshot.metadata.width, snapshot.metadata.height,
                snapshot.dataHeads, snapshot.dataTails);

            for (let y = 0; y < snapshot.metadata.height; y++) {
                for (let x = 0; x < snapshot.metadata.width; x++) {

                    // TODO: dry flag ignored
                    let elementHead = elementArea.getElementHead(x, y);
                    let oldType = elementHead & 0b111;  // type without dry flag
                    let oldWeight = (elementHead >> 4) & 0x0000000F;

                    if (oldType === 0x0 && oldWeight === 0x0) ; else if (oldType === 0x0) {
                        // static
                        elementArea.setElementHead(x, y, ElementHead.setType(elementHead, 0x7));
                    } else if (oldType === 0x1) {
                        // falling (grass only)
                        elementArea.setElementHead(x, y, ElementHead.setType(elementHead, 0x5));
                    } else if (oldType === 0x2) {
                        // sand 1 (soil, gravel)
                        elementArea.setElementHead(x, y, ElementHead.setType(elementHead, 0x5 | (4 << 5)));
                    } else if (oldType === 0x3) {
                        // sand 2 (sand)
                        elementArea.setElementHead(x, y, ElementHead.setType(elementHead, 0x5 | (6 << 5)));
                    } else if (oldType === 0x4 || oldType === 0x5) {
                        // fluid 1 (not used) or fluid 2 (water)
                        elementArea.setElementHead(x, y, ElementHead.setType(elementHead, 0x3));
                    }
                }
            }

            snapshot.dataHeads = elementArea.getDataHeads();
            snapshot.dataTails = elementArea.getDataTails();
        }

        static #convertToV4(snapshot) {
            const elementArea = ElementArea.from(
                snapshot.metadata.width, snapshot.metadata.height,
                snapshot.dataHeads, snapshot.dataTails);

            for (let y = 0; y < snapshot.metadata.height; y++) {
                for (let x = 0; x < snapshot.metadata.width; x++) {
                    let elementHead = elementArea.getElementHead(x, y);
                    let elementTail = elementArea.getElementTail(x, y);

                    let typeClass = elementHead & 0b111;

                    // element type class changes
                    if (typeClass > 0x1 && typeClass < 0x7) {
                        typeClass++;
                        elementHead = (elementHead & 0xFFFFFFF8) | typeClass;
                    }

                    // set at least some conductivity type and heat effect type
                    switch (typeClass) {
                        case 0x5: // powder element
                        case 0x6: // powder element wet
                        case 0x7: // static
                            elementHead = elementHead | 0x00400000;
                            elementTail = elementTail | 0x10000000;
                            break;
                    }

                    // set water behaviour
                    if (typeClass === 0x4) {
                        elementHead = (elementHead & 0xFFFFF0FF) | (0xC << 8);
                    }

                    elementArea.setElementHead(x, y, elementHead);
                    elementArea.setElementTail(x, y, elementTail);
                }
            }

            snapshot.dataHeads = elementArea.getDataHeads();
            snapshot.dataTails = elementArea.getDataTails();
        }

        static #convertToV5(snapshot) {
            const elementArea = ElementArea.from(
                snapshot.metadata.width, snapshot.metadata.height,
                snapshot.dataHeads, snapshot.dataTails);

            for (let y = 0; y < snapshot.metadata.height; y++) {
                for (let x = 0; x < snapshot.metadata.width; x++) {
                    let elementHead = elementArea.getElementHead(x, y);

                    // unset tree and leaf behaviour and special
                    let behaviour = (elementHead >> 8) & 0x0000000F;
                    if (behaviour === 0x5 || behaviour === 0x8) {
                        elementHead = (elementHead & 0xFFFF00FF);
                    }

                    elementArea.setElementHead(x, y, elementHead);
                }
            }

            snapshot.dataHeads = elementArea.getDataHeads();
            snapshot.dataTails = elementArea.getDataTails();
        }

        static #convertToV6(snapshot) {
            const elementArea = ElementArea.from(
                snapshot.metadata.width, snapshot.metadata.height,
                snapshot.dataHeads, snapshot.dataTails);

            for (let y = 0; y < snapshot.metadata.height; y++) {
                for (let x = 0; x < snapshot.metadata.width; x++) {
                    const elementHead = elementArea.getElementHead(x, y);

                    // map old 4 constants to heat mod index

                    const flammableType = (elementHead >> 16) & 0x00000003;
                    const flameHeatType = (elementHead >> 18) & 0x00000003;
                    const burnableType = (elementHead >> 20) & 0x00000003;
                    const conductivityType = (elementHead >> 22) & 0x00000003;

                    // [0.2, 0.25, 0.3, 0.45][conductivityType];  // small .. big    conductiveIndex
                    // [2500, 500, 20, 10][conductivityType];  // big .. small       heatLossChanceTo10000
                    // [0, 100, 4500, 10000][flammableType];  // never .. quickly    flammableChanceTo10000
                    // [0, 2, 3, 5][flammableType];  // never .. quickly             selfIgnitionChanceTo10000
                    // [0, 165, 220, 255][flameHeatType];  // none .. very hot       flameHeat
                    // [0, 2, 100, 1000][burnableType];  // none .. fast             burnDownChanceTo10000

                    // all used combinations
                    let heatModIndex = 0;  // default
                    if (flammableType === 0 && flameHeatType === 0 && burnableType === 0 && conductivityType === 0) {
                        heatModIndex = 0;
                    } else if (flammableType === 0 && flameHeatType === 0 && burnableType === 0 && conductivityType === 1) {
                        heatModIndex = 1;
                    } else if (flammableType === 0 && flameHeatType === 0 && burnableType === 0 && conductivityType === 2) {
                        heatModIndex = 2;
                    } else if (flammableType === 0 && flameHeatType === 0 && burnableType === 0 && conductivityType === 3) {
                        heatModIndex = 3;
                    } else if (flammableType === 2 && flameHeatType === 1 && burnableType === 3 && conductivityType === 0) {
                        heatModIndex = 4;
                    } else if (flammableType === 1 && flameHeatType === 1 && burnableType === 1 && conductivityType === 0) {
                        heatModIndex = 5;
                    } else if (flammableType === 2 && flameHeatType === 1 && burnableType === 2 && conductivityType === 0) {
                        heatModIndex = 6;
                    }

                    const newElementHead = (elementHead & 0xFF00FFFF) | (heatModIndex << 16);
                    elementArea.setElementHead(x, y, newElementHead);
                }
            }

            snapshot.dataHeads = elementArea.getDataHeads();
            snapshot.dataTails = elementArea.getDataTails();
        }

        static #convertToV7(snapshot) {
            const elementArea = ElementArea.from(
                snapshot.metadata.width, snapshot.metadata.height,
                snapshot.dataHeads, snapshot.dataTails);

            for (let y = 0; y < snapshot.metadata.height; y++) {
                for (let x = 0; x < snapshot.metadata.width; x++) {
                    let elementHead = elementArea.getElementHead(x, y);

                    // map fish elements to fish entity
                    let behaviour = (elementHead >> 8) & 0x0000000F;
                    if (behaviour === 0x3) {
                        snapshot.serializedEntities.push({ entity: 'fish', x: x, y: y });
                    }

                    // unset fish head & fish body behaviour and special
                    // set entity behaviour
                    if (behaviour === 0x3 || behaviour === 0x4) {
                        elementHead = (elementHead & 0xFFFF00FF) | (0xD << 8);
                    }

                    elementArea.setElementHead(x, y, elementHead);
                }
            }

            snapshot.dataHeads = elementArea.getDataHeads();
            snapshot.dataTails = elementArea.getDataTails();
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Create flipped scene using object composition.
     *
     * @author Patrik Harag
     * @version 2023-12-20
     */
    class SceneImplModFlip extends Scene {

        /**
         * @type Scene
         */
        #original;

        #flipHorizontally;
        #flipVertically;

        constructor(scene, flipHorizontally, flipVertically) {
            super();
            this.#original = scene;
            this.#flipHorizontally = flipHorizontally;
            this.#flipVertically = flipVertically;
        }

        countSize(prefWidth, prefHeight) {
            this.#original.countSize(prefWidth, prefHeight);
        }

        async createSandGame(prefWidth, prefHeight, defaults, context, rendererInitializer) {
            let elementArea = this.createElementArea(prefWidth, prefHeight, defaults.getDefaultElement());
            return new SandGame(elementArea, [], null, defaults, context, rendererInitializer);
            // TODO: sceneMetadata not set
            // TODO: entities support
        }

        createElementArea(prefWidth, prefHeight, defaultElement) {
            const elementArea = this.#original.createElementArea(prefWidth, prefHeight, defaultElement);

            const width = elementArea.getWidth();
            const height = elementArea.getHeight();

            if (this.#flipHorizontally) {
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < Math.trunc(width / 2); x++) {
                        elementArea.swap(x, y, width - 1 - x, y);
                    }
                }
            }

            if (this.#flipVertically) {
                for (let y = 0; y < Math.trunc(height / 2); y++) {
                    for (let x = 0; x < width; x++) {
                        elementArea.swap(x, y, x, height - 1 - y);
                    }
                }
            }

            return elementArea;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-20
     */
    class SceneImplTemplate extends Scene {

        /**
         * @type ElementArea
         */
        #elementArea;

        /**
         *
         * @param elementArea {ElementArea}
         */
        constructor(elementArea) {
            super();
            this.#elementArea = elementArea;
        }

        countSize(prefWidth, prefHeight) {
            return [this.#elementArea.getWidth(), this.#elementArea.getHeight()];
        }

        async createSandGame(prefWidth, prefHeight, defaults, context, rendererInitializer) {
            let elementArea = this.createElementArea(prefWidth, prefHeight, defaults.getDefaultElement());
            return new SandGame(elementArea, [], null, defaults, context, rendererInitializer);
        }

        createElementArea(prefWidth, prefHeight, defaultElement) {
            return ElementArea.from(
                    this.#elementArea.getWidth(),
                    this.#elementArea.getHeight(),
                    this.#elementArea.getDataHeads(),
                    this.#elementArea.getDataTails());
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-09
     */
    class ResourceUtils {

        /**
         *
         * @param objectUrl
         * @param maxWidth
         * @param maxHeight
         * @returns {Promise<ImageData>}
         */
        static loadImageData(objectUrl, maxWidth, maxHeight) {
            // TODO: security - it will also fetch an external image
            return Assets.asImageData(objectUrl, maxWidth, maxHeight);
        }

        /**
         *
         * @param data {ArrayBuffer} ArrayBuffer
         * @param type {string} type
         * @returns {string}
         */
        static asObjectUrl(data, type='image/png') {
            // https://gist.github.com/candycode/f18ae1767b2b0aba568e
            const arrayBufferView = new Uint8Array(data);
            const blob = new Blob([ arrayBufferView ], { type: type });
            const urlCreator = window.URL || window.webkitURL;
            return urlCreator.createObjectURL(blob);
        }

        /**
         *
         * @param imageData {ImageData}
         * @param brush {Brush}
         * @param defaultElement {Element}
         * @param threshold {number} 0-255
         * @returns Scene
         */
        static createSceneFromImageTemplate(imageData, brush, defaultElement, threshold) {
            const width = imageData.width;
            const height = imageData.height;

            const elementArea = ElementArea.create(width, height, defaultElement);

            const random = new DeterministicRandom(0);

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const index = (y * width + x) * 4;

                    let red = imageData.data[index];
                    let green = imageData.data[index + 1];
                    let blue = imageData.data[index + 2];
                    const alpha = imageData.data[index + 3];

                    // perform alpha blending if needed
                    if (alpha !== 0xFF) {
                        red = Math.trunc((red * alpha) / 0xFF) + 0xFF - alpha;
                        green = Math.trunc((green * alpha) / 0xFF) + 0xFF - alpha;
                        blue = Math.trunc((blue * alpha) / 0xFF) + 0xFF - alpha;
                    }

                    // filter out background
                    if (red > 0xFF-threshold && green > 0xFF-threshold && blue > 0xFF-threshold) {
                        continue;  // white
                    }

                    const element = brush.apply(x, y, random);
                    const elementHead = element.elementHead;
                    const elementTail = ElementTail.setColor(element.elementTail, red, green, blue);
                    elementArea.setElementHeadAndTail(x, y, elementHead, elementTail);
                }
            }

            return new SceneImplTemplate(elementArea);
        }

        static getImageTypeOrNull(filename) {
            filename = filename.toLowerCase();
            if (filename.endsWith('.png')) {
                return 'image/png'
            }
            if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                return 'image/jpg'
            }
            if (filename.endsWith('.bmp')) {
                return 'image/bmp'
            }
            if (filename.endsWith('.gif')) {
                return 'image/gif'
            }
            return null;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-11
     */
    class ResourceTool {

        static METADATA_JSON_NAME = 'tool.json';

        /**
         *
         * @param metadataJson {any}
         * @param zip {{[path: string]: Uint8Array}|null}
         * @returns {Promise<Tool>}
         */
        static async parse(metadataJson, zip) {
            const info = metadataJson.info;
            const action = metadataJson.action;

            if (action === undefined) {
                throw 'Tool definition: action not set';
            }
            const type = action.type;

            if (type === 'image-template') {
                const scenes = await this.#parseImageTemplate(action, zip);
                return Tools.insertScenesTool(scenes, undefined, info);

            } else if (type === 'random-template') {
                const scenes = await this.#parseRandomTemplate(action, zip);
                return Tools.insertScenesTool(scenes, undefined, info);

            } else {
                throw 'Tool action not supported: ' + type;
            }
        }

        static async #parseRandomTemplate(json, zip) {
            const actions = json.actions;
            if (actions === undefined || actions.length === undefined || actions.length === 0) {
                throw 'Image template: actions not set';
            }

            let scenes = [];
            for (let i = 0; i < actions.length; i++) {
                const action = actions[i];
                const type = action.type;
                if (type === 'image-template') {
                    const items = await this.#parseImageTemplate(action, zip);
                    scenes.push(...items);
                } else {
                    throw 'Tool action not supported: ' + type;
                }
            }
            return scenes;
        }

        static async #parseImageTemplate(json, zip) {
            let imageData = await this.#parseImageData(json, zip);

            const thresholdPar = json.threshold;
            if (thresholdPar === undefined) {
                throw 'Image template: threshold not set';
            }
            const threshold = parseInt(thresholdPar);

            const brushPar = json.brush;
            if (brushPar === undefined) {
                throw 'Image template: brush not set';
            }
            let brush = null;
            if (typeof brushPar === 'string') {
                brush = BrushDefs.byCodeName(brushPar);
            } else if (typeof brushPar === 'object' && brushPar instanceof Brush) {
                brush = brushPar;
            }
            if (brush === null) {
                throw 'Image template: brush not found: ' + brushPar;
            }

            const defaultElement = ElementArea.TRANSPARENT_ELEMENT;
            const scene = ResourceUtils.createSceneFromImageTemplate(imageData, brush, defaultElement, threshold);
            const scenes = [scene];

            const randomFlipHorizontally = json.randomFlipHorizontally;
            if (randomFlipHorizontally) {
                scenes.push(new SceneImplModFlip(scene, true, false));
            }

            const randomFlipVertically = json.randomFlipVertically;
            if (randomFlipVertically) {
                for (const s of [...scenes]) {
                    scenes.push(new SceneImplModFlip(s, false, true));
                }
            }

            return scenes;
        }

        static async #parseImageData(json, zip) {
            const imageDataPar = json.imageData;
            if (imageDataPar !== undefined) {
                return await ResourceUtils.loadImageData(imageDataPar, undefined, undefined);
            }

            const imageFilePar = json.imageFile;
            if (imageFilePar !== undefined && zip !== null && zip[imageFilePar]) {
                const imageType = ResourceUtils.getImageTypeOrNull(imageFilePar);
                if (imageType !== null) {
                    const objectUrl = ResourceUtils.asObjectUrl(zip[imageFilePar].buffer);
                    return ResourceUtils.loadImageData(objectUrl, undefined, undefined);
                }
            }
            throw 'Image template: imageData/imageFile not set';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-09
     */
    class Resources {

        static JSON_RESOURCE_TYPE_FIELD = 'resourceType';

        /**
         *
         * @param snapshot {Snapshot}
         * @returns Uint8Array
         */
        static createResourceFromSnapshot(snapshot) {
            return ResourceSnapshot.createZip(snapshot);
        }

        /**
         *
         * @param content {ArrayBuffer}
         * @returns Promise<Scene|Tool>
         */
        static async parseZipResource(content) {
            const zip = unzipSync(new Uint8Array(content));

            function parseJson(fileName) {
                return JSON.parse(strFromU8(zip[fileName]));
            }

            if (zip[ResourceSnapshot.METADATA_JSON_NAME] || zip[ResourceSnapshot.LEGACY_METADATA_JSON_NAME]) {
                // snapshot | legacy snapshot
                const snapshot = ResourceSnapshot.parse(zip);
                return new SceneImplSnapshot(snapshot);
            }
            if (zip[ResourceTool.METADATA_JSON_NAME]) {
                // tool
                const metadataJson = parseJson(ResourceTool.METADATA_JSON_NAME);
                return await ResourceTool.parse(metadataJson, zip);
            }
            throw 'Wrong format';
        }

        /**
         *
         * @param content {ArrayBuffer}
         * @returns Promise<Tool>
         */
        static async parseJsonResource(content) {
            const text = strFromU8(new Uint8Array(content));
            const metadataJson = JSON.parse(text);

            const type = metadataJson[Resources.JSON_RESOURCE_TYPE_FIELD];
            if (type === 'tool') {
                return await ResourceTool.parse(metadataJson, null);
            }
            throw 'Wrong json format';
        }

        /**
         *
         * @param json
         * @returns {Promise<Tool>}
         */
        static async parseToolDefinition(json) {
            return ResourceTool.parse(json, null);
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
     * Creates template form and remembers last values.
     *
     * @author Patrik Harag
     * @version 2024-05-19
     */
    class ComponentFormTemplate extends Component {

        #thresholdValue = 50;
        #maxWidth = 300;
        #maxHeight = 200;
        #materialValue = 'sand';
        #materialBrush = BrushDefs.SAND;

        createNode() {
            return DomBuilder.element('form', null, [
                DomBuilder.element('fieldset', {class: 'mb-3 row'}, [
                    DomBuilder.element('legend', {class: 'col-form-label col-sm-3 float-sm-left pt-0'}, 'Material'),
                    DomBuilder.div({class: 'col-sm-9', style: 'column-count: 2;'}, [
                        this.#creatMaterialFormGroup(BrushDefs.SAND, ToolDefs.SAND.getInfo()),
                        this.#creatMaterialFormGroup(BrushDefs.SOIL, ToolDefs.SOIL.getInfo()),
                        this.#creatMaterialFormGroup(BrushDefs.THERMITE, ToolDefs.THERMITE.getInfo()),
                        this.#creatMaterialFormGroup(BrushDefs.WALL, ToolDefs.WALL.getInfo()),
                        this.#creatMaterialFormGroup(BrushDefs.METAL, ToolDefs.METAL.getInfo()),
                        this.#creatMaterialFormGroup(BrushDefs.WOOD, ToolDefs.WOOD.getInfo()),
                    ])
                ]),
                DomBuilder.element('fieldset', {class: 'mb-3 row'}, [
                    DomBuilder.element('legend', {class: 'col-form-label col-sm-3 float-sm-left pt-0'}, 'Background threshold'),
                    DomBuilder.div({class: 'col-sm-9'}, [
                        this.#createThresholdSliderFormGroup(),
                    ])
                ]),
                DomBuilder.element('fieldset', {class: 'mb-3 row'}, [
                    DomBuilder.element('legend', {class: 'col-form-label col-sm-3 float-sm-left pt-0'}, 'Max size'),
                    DomBuilder.div({class: 'col-sm-9'}, [
                        this.#createMaxWidthFormGroup(),
                        this.#createMaxHeightFormGroup(),
                    ])
                ])
            ]);
        }

        #createThresholdSliderFormGroup() {
            const id = 'image-template_threshold-slider';

            const label = DomBuilder.element('label', {'for': id}, 'Value: ' + this.#thresholdValue);

            const slider = DomBuilder.element('input', {
                id: id,
                class: 'form-range',
                type: 'range',
                min: 0, max: 255, value: this.#thresholdValue
            });
            slider.addEventListener('input', (e) => {
                this.#thresholdValue = e.target.value;
                label.textContent = 'Value: ' + this.#thresholdValue;
            });

            return DomBuilder.div({class: 'mb-3'}, [
                slider,
                DomBuilder.element('small', null, label)
            ]);
        }

        #createMaxWidthFormGroup() {
            const id = 'image-template_max-width';

            const label = DomBuilder.element('label', {'for': id}, 'Width: ' + this.#maxWidth);

            const slider = DomBuilder.element('input', {
                id: id,
                class: 'form-range',
                type: 'range',
                min: 25, max: 800, value: this.#maxWidth
            });
            slider.addEventListener('input', (e) => {
                this.#maxWidth = e.target.value;
                label.textContent = 'Width: ' + this.#maxWidth;
            });

            return DomBuilder.div({class: 'mb-3'}, [
                slider,
                DomBuilder.element('small', null, label)
            ]);
        }

        #createMaxHeightFormGroup() {
            const id = 'image-template_max-height';

            const label = DomBuilder.element('label', {'for': id}, 'Height: ' + this.#maxHeight);

            const slider = DomBuilder.element('input', {
                id: id,
                class: 'form-range',
                type: 'range',
                min: 25, max: 800, value: this.#maxHeight
            });
            slider.addEventListener('input', (e) => {
                this.#maxHeight = e.target.value;
                label.textContent = 'Height: ' + this.#maxHeight;
            });

            return DomBuilder.div({class: 'mb-3'}, [
                slider,
                DomBuilder.element('small', null, label)
            ]);
        }

        #creatMaterialFormGroup(brush, toolInfo) {
            const codename = toolInfo.getCodeName();

            const checked = (this.#materialValue === codename);
            const id = 'image-template_checkbox-material-' + codename;

            const input = DomBuilder.element('input', {
                class: 'form-check-input',
                type: 'radio',
                name: 'template-material',
                id: id,
                value: codename,
                checked: (checked) ? checked : null
            });
            input.addEventListener('click', () => {
                this.#materialBrush = brush;
                this.#materialValue = codename;
            });

            const labelAttributes = {
                class: 'form-check-label btn btn-secondary btn-sm',
                'for': id,
                style: toolInfo.getBadgeStyle()
            };
            return DomBuilder.div({class: 'form-check'}, [
                input,
                DomBuilder.element('label', labelAttributes, toolInfo.getDisplayName())
            ]);
        }

        getThresholdValue() {
            return this.#thresholdValue;
        }

        getMaterialBrush() {
            return this.#materialBrush;
        }

        getMaxWidth() {
            return this.#maxWidth;
        }

        getMaxHeight() {
            return this.#maxHeight;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // TODO: refactor

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-06
     */
    class ServiceIO {

        /** @type Controller */
        #controller;

        /** @type ComponentFormTemplate */
        #templateForm;

        constructor(controller) {
            this.#controller = controller;
            this.#templateForm = new ComponentFormTemplate();
        }

        initFileDragAndDrop(domNode) {
            ['dragenter', 'dragover'].forEach(eventName => {
                domNode.addEventListener(eventName, e => {
                    e.preventDefault();
                    e.stopPropagation();
                    domNode.classList.add('drag-and-drop-highlight');
                });
            });

            domNode.addEventListener('dragleave', e => {
                e.preventDefault();
                e.stopPropagation();
                domNode.classList.remove('drag-and-drop-highlight');
            });

            domNode.addEventListener('drop', e => {
                e.preventDefault();
                e.stopPropagation();
                domNode.classList.remove('drag-and-drop-highlight');

                this.loadFromFiles(e.dataTransfer.files);
            });
        }

        loadFromFiles(files) {
            if (!files) {
                return;
            }
            let file = files[0];

            let reader = new FileReader();
            reader.onload = (readerEvent) => {
                let content = readerEvent.target.result;
                this.loadFromArrayBuffer(content, file.name);
            };
            reader.readAsArrayBuffer(file);
        }

        /**
         *
         * @param content {ArrayBuffer}
         * @param filename {string}
         */
        loadFromArrayBuffer(content, filename) {
            try {
                let imageTypeOrNull = ResourceUtils.getImageTypeOrNull(filename);
                if (imageTypeOrNull !== null) {
                    this.#loadImageTemplate(content, imageTypeOrNull);
                } else if (filename.endsWith(".json")) {
                    Resources.parseJsonResource(content)
                            .then(resource => this.#importResource(resource))
                            .catch(e => this.#handleError(e));
                } else {
                    Resources.parseZipResource(content)
                            .then(resource => this.#importResource(resource))
                            .catch(e => this.#handleError(e));
                }
            } catch (e) {
                this.#handleError(e);
            }
        }

        #loadImageTemplate(content, imageType) {
            const handleImageTemplate = (brush, threshold, maxWidth, maxHeight) => {
                const objectUrl = ResourceUtils.asObjectUrl(content, imageType);
                const defaultElement = ElementArea.TRANSPARENT_ELEMENT;
                ResourceUtils.loadImageData(objectUrl, maxWidth, maxHeight)
                    .then(imageData => {
                        try {
                            const scene = ResourceUtils.createSceneFromImageTemplate(imageData, brush, defaultElement, threshold);
                            this.#importImageTemplate(scene);
                        } catch (e) {
                            this.#handleError(e);
                        }
                    })
                    .catch(e => this.#handleError(e));
            };

            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Image template');
            dialog.setBodyContent(this.#templateForm.createNode());
            dialog.addSubmitButton('Place', () => {
                let materialBrush = this.#templateForm.getMaterialBrush();
                let thresholdValue = this.#templateForm.getThresholdValue();
                let maxWidth = this.#templateForm.getMaxWidth();
                let maxHeight = this.#templateForm.getMaxHeight();
                handleImageTemplate(materialBrush, thresholdValue, maxWidth, maxHeight);
            });
            dialog.addCloseButton('Close');
            dialog.show(this.#controller.getDialogAnchor());
        }

        #importImageTemplate(scene) {
            this.#controller.pasteScene(scene);
            Analytics.triggerFeatureUsed(Analytics.FEATURE_IO_IMAGE_TEMPLATE);
        }

        #importResource(resource) {
            if (resource instanceof Scene) {
                this.#importScene(resource);

            } else if (resource instanceof Tool) {
                const tool = resource;
                const toolManager = this.#controller.getToolManager();
                if (tool instanceof InsertElementAreaTool || tool instanceof InsertRandomSceneTool) {
                    const revert = toolManager.createRevertAction();
                    toolManager.setPrimaryTool(tool);
                    toolManager.setSecondaryTool(Tools.actionTool(revert));
                } else {
                    toolManager.setPrimaryTool(tool);
                }

            } else {
                this.#handleError('Unknown resource type');
            }
        }

        #importScene(scene) {
            try {
                let dialog = DomBuilder.bootstrapDialogBuilder();
                dialog.setHeaderContent('Import scene');
                dialog.setBodyContent([
                    DomBuilder.par(null, "The imported scene can be opened or placed on the current scene.")
                ]);
                dialog.addSubmitButton('Open', () => {
                    Analytics.triggerFeatureUsed(Analytics.FEATURE_IO_IMPORT);
                    return this.#controller.openScene(scene);
                });
                dialog.addSubmitButton('Place', () => {
                    Analytics.triggerFeatureUsed(Analytics.FEATURE_IO_IMPORT);
                    return this.#controller.pasteScene(scene);
                });
                dialog.addCloseButton('Close');
                dialog.show(this.#controller.getDialogAnchor());
            } catch (ex) {
                this.#handleError(ex);
            }
        }

        #handleError(e) {
            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Error');
            dialog.setBodyContent([
                DomBuilder.par(null, "Error while loading resource:"),
                DomBuilder.element('code', null, '' + e)
            ]);
            dialog.addCloseButton('Close');
            dialog.show(this.#controller.getDialogAnchor());
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * Double buffered renderer. With motion blur.
     *
     * @author Patrik Harag
     * @version 2023-08-27
     */
    class Renderer2D extends Renderer {

        /**
         *
         * @param elementArea {ElementArea}
         * @param context {CanvasRenderingContext2D}
         * @param alpha 0x00 = fully transparent, 0xFF = fully opaque
         */
        static renderPreview(elementArea, context, alpha=0xFF) {
            const w = elementArea.getWidth();
            const h = elementArea.getHeight();

            const buffer = context.createImageData(w, h);
            const data = buffer.data;

            for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) {
                    const pixelIndex = w * y + x;
                    const dataIndex = pixelIndex * 4;

                    const elementTail = elementArea.getElementTail(x, y);

                    if (elementTail === ElementArea.TRANSPARENT_ELEMENT.elementTail
                            && elementArea.getElementHead(x, y) === ElementArea.TRANSPARENT_ELEMENT.elementHead) {

                        // transparent
                        data[dataIndex + 3] = 0;
                    } else {
                        data[dataIndex] = ElementTail.getColorRed(elementTail);
                        data[dataIndex + 1] = ElementTail.getColorGreen(elementTail);
                        data[dataIndex + 2] = ElementTail.getColorBlue(elementTail);
                        data[dataIndex + 3] = alpha;
                    }
                }
            }

            context.putImageData(buffer, 0, 0, 0, 0, w, h);
        }


        /** @type CanvasRenderingContext2D */
        #context;

        /** @type RenderingMode|null */
        #mode = null;

        /** @type ElementArea */
        #elementArea;

        /** @type number */
        #width;
        /** @type number */
        #height;

        /** @type number */
        #chunkSize;
        /** @type number */
        #horChunkCount;
        /** @type number */
        #verChunkCount;

        /** @type boolean[] */
        #triggeredChunks

        /** @type ImageData */
        #buffer;

        /** @type boolean[] */
        #blur;

        /** @type boolean[] */
        #canBeBlurred;

        constructor(elementArea, chunkSize, context) {
            super();
            this.#context = context;
            this.#elementArea = elementArea;
            this.#width = elementArea.getWidth();
            this.#height = elementArea.getHeight();

            this.#chunkSize = chunkSize;
            this.#horChunkCount = Math.ceil(this.#width / this.#chunkSize);
            this.#verChunkCount = Math.ceil(this.#height / this.#chunkSize);
            this.#triggeredChunks = new Array(this.#horChunkCount * this.#verChunkCount).fill(true);

            this.#buffer = this.#context.createImageData(this.#width, this.#height);
            // set up alpha color component
            const data = this.#buffer.data;
            for (let y = 0; y < this.#height; y++) {
                for (let x = 0; x < this.#width; x++) {
                    let index = 4 * (this.#width * y + x);
                    data[index + 3] = 0xFF;
                }
            }

            this.#blur = new Array(this.#width * this.#height).fill(false);
            this.#canBeBlurred = new Array(this.#width * this.#height).fill(false);
        }

        trigger(x, y) {
            const cx = Math.trunc(x / this.#chunkSize);
            const cy = Math.trunc(y / this.#chunkSize);
            const chunkIndex = cy * this.#horChunkCount + cx;
            this.#triggeredChunks[chunkIndex] = true;
        }

        triggerChunk(cx, cy) {
            const chunkIndex = cy * this.#horChunkCount + cx;
            this.#triggeredChunks[chunkIndex] = true;
        }

        triggerChunks(activeChunks) {
            if (activeChunks.length !== this.#triggeredChunks.length) {
                throw 'Array must be of the same size';
            }
            for (let i = 0; i < activeChunks.length; i++) {
                const active = activeChunks[i];
                if (active) {
                    this.#triggeredChunks[i] = active;
                }
            }
        }

        setMode(mode) {
            this.#mode = mode;
            // ensure repaint
            this.#triggeredChunks.fill(true);
            this.#blur.fill(false);
            this.#canBeBlurred.fill(false);
        }

        /**
         *
         * @param changedChunks {boolean[]}
         * @return {void}
         */
        render(changedChunks) {
            for (let cy = 0; cy < this.#verChunkCount; cy++) {
                for (let cx = 0; cx < this.#horChunkCount; cx++) {
                    const chunkIndex = cy * this.#horChunkCount + cx;

                    const triggered = this.#triggeredChunks[chunkIndex];
                    if (triggered) {
                        // unset
                        this.#triggeredChunks[chunkIndex] = false;
                    }

                    const changed = changedChunks[chunkIndex];
                    if (changed) {
                        // repaint at least once
                        this.#triggeredChunks[chunkIndex] = true;
                    }

                    if (triggered || changed) {

                        // neighbours can be changed without triggering
                        let includeRowUnder = false;
                        if (cy + 1 < this.#horChunkCount) {
                            const chunkIndexUnder = (cy + 1) * this.#horChunkCount + cx;
                            if (!this.#triggeredChunks[chunkIndexUnder] && !changedChunks[chunkIndexUnder]) {
                                includeRowUnder = true;
                            }
                        }

                        this.#renderChunk(cx, cy, includeRowUnder);
                    }
                }
            }

            // TODO: ? multiple partial putImageData
            this.#context.putImageData(this.#buffer, 0, 0, 0, 0, this.#width, this.#height);
        }

        #renderChunk(cx, cy, includeRowUnder) {
            const mx = Math.min((cx + 1) * this.#chunkSize, this.#width);
            const my = Math.min((cy + 1) * this.#chunkSize + (includeRowUnder ? 1 : 0), this.#height);
            for (let y = cy * this.#chunkSize; y < my; y++) {
                for (let x = cx * this.#chunkSize; x < mx; x++) {
                    this.#renderPixel(x, y, this.#buffer.data);
                }
            }
        }

        #renderPixel(x, y, data) {
            const elementTail = this.#elementArea.getElementTail(x, y);

            const pixelIndex = this.#width * y + x;
            const dataIndex = pixelIndex * 4;

            const blurBehaviour = ElementTail.getBlurType(elementTail);

            if (blurBehaviour === ElementTail.BLUR_TYPE_BACKGROUND) {
                // motion blur

                if (this.#canBeBlurred[pixelIndex] && Renderer2D.#isWhite(elementTail)) {
                    // init fading here

                    this.#blur[pixelIndex] = true;
                    this.#canBeBlurred[pixelIndex] = false;
                }

                if (this.#blur[pixelIndex]) {
                    // paint - continue fading

                    const r = data[dataIndex];
                    const g = data[dataIndex + 1];
                    const b = data[dataIndex + 2];

                    const alpha = 0.875 + (Math.random() * 0.1 - 0.05);
                    const whiteBackground = 255 * (1.0 - alpha);

                    const nr = Math.trunc((r * alpha) + whiteBackground);
                    const ng = Math.trunc((g * alpha) + whiteBackground);
                    const nb = Math.trunc((b * alpha) + whiteBackground);

                    if (r === nr && g === ng && b === nb) {
                        // no change => fading completed
                        this.#blur[pixelIndex] = false;
                        data[dataIndex] = 0xFF;
                        data[dataIndex + 1] = 0xFF;
                        data[dataIndex + 2] = 0xFF;
                    } else {
                        data[dataIndex] = nr;
                        data[dataIndex + 1] = ng;
                        data[dataIndex + 2] = nb;
                        this.trigger(x, y);  // request next repaint
                    }
                    return;
                }
            }

            // paint - no blur
            if (this.#mode === null) {
                data[dataIndex] = ElementTail.getColorRed(elementTail);
                data[dataIndex + 1] = ElementTail.getColorGreen(elementTail);
                data[dataIndex + 2] = ElementTail.getColorBlue(elementTail);
                this.#canBeBlurred[pixelIndex] = (blurBehaviour === ElementTail.BLUR_TYPE_1);
                this.#blur[pixelIndex] = false;
            } else {
                // custom rendering mode
                let elementHead = this.#elementArea.getElementHead(x, y);
                this.#mode.apply(data, dataIndex, elementHead, elementTail);
            }
        }

        static #isWhite(element) {
            return ElementTail.getColorRed(element) === 255
                && ElementTail.getColorGreen(element) === 255
                && ElementTail.getColorBlue(element) === 255;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-06
     */
    class RendererInitializer2D extends RendererInitializer {

        #mode;

        constructor(mode) {
            super();
            this.#mode = mode;
        }

        getContextType() {
            return '2d';
        }

        initialize(elementArea, chunkSize, context) {
            let renderer = new Renderer2D(elementArea, chunkSize, context);
            if (this.#mode !== null) {
                renderer.setMode(this.#mode);
            }
            return renderer;
        }
    }

    var _ASSET_PALETTE_TEMPERATURE_COLORS = "255,51,0\r\n255,69,0\r\n255,82,0\r\n255,93,0\r\n255,102,0\r\n255,111,0\r\n255,118,0\r\n255,124,0\r\n255,130,0\r\n255,135,0\r\n255,141,11\r\n255,146,29\r\n255,152,41\r\n255,157,51\r\n255,162,60\r\n255,166,69\r\n255,170,77\r\n255,174,84\r\n255,178,91\r\n255,182,98\r\n255,185,105\r\n255,189,111\r\n255,192,118\r\n255,195,124\r\n255,198,130\r\n255,201,135\r\n255,203,141\r\n255,206,146\r\n255,208,151\r\n255,211,156\r\n255,213,161\r\n255,215,166\r\n255,217,171\r\n255,219,175\r\n255,221,180\r\n255,223,184\r\n255,225,188\r\n255,226,192\r\n255,228,196\r\n255,229,200\r\n255,231,204\r\n255,232,208\r\n255,234,211\r\n255,235,215\r\n255,237,218\r\n255,238,222\r\n255,239,225\r\n255,240,228\r\n255,241,231\r\n255,243,234\r\n255,244,237\r\n255,245,240\r\n255,246,243\r\n255,247,245\r\n255,248,248\r\n255,249,251\r\n255,249,253\r\n254,250,255\r\n252,248,255\r\n250,247,255\r\n247,245,255\r\n245,244,255\r\n243,243,255\r\n241,241,255\r\n239,240,255\r\n238,239,255\r\n236,238,255\r\n234,237,255\r\n233,236,255\r\n231,234,255\r\n229,233,255\r\n228,233,255\r\n227,232,255\r\n225,231,255\r\n224,230,255\r\n223,229,255\r\n221,228,255\r\n220,227,255\r\n219,226,255\r\n218,226,255\r\n217,225,255\r\n216,224,255\r\n215,223,255\r\n214,223,255\r\n213,222,255\r\n212,221,255\r\n211,221,255\r\n210,220,255\r\n209,220,255\r\n208,219,255\r\n207,218,255";

    var _SHADER_BLUR_VERT = "#version 300 es\n#define GLSLIFY 1\nin vec4 a_position;out vec2 v_texcoord;void main(){gl_Position=a_position;v_texcoord=a_position.xy*vec2(0.5,0.5)+0.5;}"; // eslint-disable-line

    var _SHADER_BLUR_FRAG = "#version 300 es\nprecision mediump float;\n#define GLSLIFY 1\nin vec2 v_texcoord;out vec4 v_color;uniform float u_time;uniform sampler2D u_element_heads;uniform sampler2D u_element_tails;uniform sampler2D u_blur;uniform sampler2D u_temperature_palette;\n#define TEMP_PALETTE_SIZE 91.0\nfloat countTemperaturePaletteIndex(float c){float k=c+273.0;if(k<1000.0){return 0.0;}else{return floor(k/100.0-10.0);}}void applyTemperature(float temperature,int heatType,inout float r,inout float g,inout float b){float tFactor;float aFactor=0.001;if(heatType==0x01){tFactor=0.5;}else if(heatType==0x02){tFactor=1.0;}else{tFactor=1.45;}float sTemp=(temperature*255.0*10.0)*tFactor;float i=countTemperaturePaletteIndex(sTemp);vec4 color=texture(u_temperature_palette,vec2((i+0.5)/TEMP_PALETTE_SIZE,0.5));float cr=color[0];float cg=color[1];float cb=color[2];float alpha=1.0-sTemp*aFactor;r=(r*alpha)+(cr*(1.0-alpha));g=(g*alpha)+(cg*(1.0-alpha));b=(b*alpha)+(cb*(1.0-alpha));}float noise_func(float x,float y){return fract(sin(x+y*10000.)*10000.);}float noise_smooth(vec2 p){vec2 interp=smoothstep(0.,1.,fract(p));float s=mix(noise_func(floor(p.x),floor(p.y)),noise_func(ceil(p.x),floor(p.y)),interp.x);float n=mix(noise_func(floor(p.x),ceil(p.y)),noise_func(ceil(p.x),ceil(p.y)),interp.x);return mix(s,n,interp.y);}float noise_fractal(vec2 p){float x=0.;x+=noise_smooth(p);x+=noise_smooth(p*2.)/2.;x+=noise_smooth(p*4.)/4.;x+=noise_smooth(p*8.)/8.;x+=noise_smooth(p*16.)/16.;x/=1.+1./2.+1./4.+1./8.+1./16.;return x;}float noise_moving(vec2 p,float timeMod){float x=noise_fractal(p+(u_time*timeMod));float y=noise_fractal(p-(u_time*timeMod));return noise_fractal(p+vec2(x,y));}float noiseA(vec2 p,float timeMod){float x=noise_moving(p,timeMod);float y=noise_moving(p+100.,timeMod);return noise_moving(p+vec2(x,y),timeMod);}float rand(vec2 co){return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453);}void main(){vec4 elementTail=texture(u_element_tails,v_texcoord);int flags=int(floor(elementTail[3]*255.0+0.5));int blurType=(flags&0x3);if(blurType==0x0){v_color=vec4(1.0,1.0,1.0,1.0);}else if(blurType==0x1){vec4 oldPixel=texture(u_blur,v_texcoord);float r=oldPixel[0];float g=oldPixel[1];float b=oldPixel[2];float alpha;float m=max(r,max(g,b));if(m>0.9){alpha=0.875+(rand(v_texcoord.xy)*0.1-0.05);}else{alpha=0.775+(rand(v_texcoord.xy)*0.04-0.02);}float whiteBackground=1.0-alpha;float nr=(r*alpha)+whiteBackground;float ng=(g*alpha)+whiteBackground;float nb=(b*alpha)+whiteBackground;if(int(nr*255.0)==int(r*255.0)&&int(ng*255.0)==int(g*255.0)&&int(nb*255.0)==int(b*255.0)){v_color=vec4(1.0,1.0,1.0,1.0);}else{v_color=vec4(nr,ng,nb,1.0);}}else{float r=elementTail[2];float g=elementTail[1];float b=elementTail[0];vec4 elementHead=texture(u_element_heads,v_texcoord);int heatType=(flags>>4)&0x3;if(heatType>0){float temperature=elementHead[3];if(temperature>=0.001){applyTemperature(temperature,heatType,r,g,b);}}int type=int(floor(elementHead[0]*255.0+0.5));int typeClass=type&0x7;if(typeClass==0x4){float n=0.2*noiseA(v_texcoord.xy*20.,0.5);v_color=vec4(mix(vec3(r,g,b),vec3(1.,1.,1.),n),1.);}else if(typeClass==0x2){float n=noiseA(v_texcoord.xy*10.,0.6);v_color=vec4(mix(vec3(r,g,b),vec3(1.,1.,1.),n),1.);}else{v_color=vec4(r,g,b,1.0);}}}"; // eslint-disable-line

    var _SHADER_MERGING_VERT = "#version 300 es\n#define GLSLIFY 1\nin vec4 a_position;out vec2 v_texcoord;void main(){gl_Position=a_position;v_texcoord=a_position.xy*vec2(0.5,-0.5)+0.5;}"; // eslint-disable-line

    var _SHADER_MERGING_FRAG = "#version 300 es\nprecision mediump float;\n#define GLSLIFY 1\nin vec2 v_texcoord;out vec4 v_color;uniform sampler2D u_element_heads;uniform sampler2D u_element_tails;uniform sampler2D u_blur;uniform sampler2D u_temperature_palette;\n#define TEMP_PALETTE_SIZE 91.0\nfloat countTemperaturePaletteIndex(float c){float k=c+273.0;if(k<1000.0){return 0.0;}else{return floor(k/100.0-10.0);}}void applyTemperature(float temperature,int heatType,inout float r,inout float g,inout float b){float tFactor;float aFactor=0.001;if(heatType==0x01){tFactor=0.5;}else if(heatType==0x02){tFactor=1.0;}else{tFactor=1.45;}float sTemp=(temperature*255.0*10.0)*tFactor;float i=countTemperaturePaletteIndex(sTemp);vec4 color=texture(u_temperature_palette,vec2((i+0.5)/TEMP_PALETTE_SIZE,0.5));float cr=color[0];float cg=color[1];float cb=color[2];float alpha=1.0-sTemp*aFactor;r=(r*alpha)+(cr*(1.0-alpha));g=(g*alpha)+(cg*(1.0-alpha));b=(b*alpha)+(cb*(1.0-alpha));}void main(){vec4 elementTail=texture(u_element_tails,v_texcoord);int flags=int(floor(elementTail[3]*255.0+0.5));int blurType=(flags&0x3);if(blurType==0x00){float r=elementTail[2];float g=elementTail[1];float b=elementTail[0];int heatType=(flags>>4)&0x3;if(heatType>0){vec4 elementHead=texture(u_element_heads,v_texcoord);float temperature=elementHead[3];if(temperature>=0.001){applyTemperature(temperature,heatType,r,g,b);}}v_color=vec4(r,g,b,1.0);}else{v_color=texture(u_blur,v_texcoord);}}"; // eslint-disable-line

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved


    // TODO: Currently element tail bytes are stored as floats (0..1) in texture and then transformed back to integers
    // TODO: https://www.khronos.org/webgl/wiki/HandlingContextLost

    /**
     * WebGL renderer.
     *
     * @author Patrik Harag
     * @version 2024-06-02
     */
    class RendererWebGL extends Renderer {

        /** @type WebGLRenderingContext */
        #context;

        /** @type ElementArea */
        #elementArea;

        /** @type number */
        #width;
        /** @type number */
        #height;

        #doRendering;

        #timeStartMs;

        constructor(elementArea, chunkSize, context) {
            super();
            this.#context = context;
            this.#elementArea = elementArea;
            this.#width = elementArea.getWidth();
            this.#height = elementArea.getHeight();
            this.#timeStartMs = new Date().getTime();

            const gl = this.#context;

            // --- build programs

            const temperaturePaletteData = this.#parsePalette(_ASSET_PALETTE_TEMPERATURE_COLORS);
            const temperaturePaletteSize = temperaturePaletteData.byteLength / 4;

            const blurProgram = this.#loadProgram(gl, _SHADER_BLUR_VERT, _SHADER_BLUR_FRAG);
            const blurProgramLocationTime = gl.getUniformLocation(blurProgram, "u_time");
            const blurProgramLocationElementHeads = gl.getUniformLocation(blurProgram, "u_element_heads");
            const blurProgramLocationElementTails = gl.getUniformLocation(blurProgram, "u_element_tails");
            const blurProgramLocationBlur = gl.getUniformLocation(blurProgram, "u_blur");
            const blurProgramLocationTemperaturePalette = gl.getUniformLocation(blurProgram, "u_temperature_palette");

            const mergeProgram = this.#loadProgram(gl, _SHADER_MERGING_VERT, _SHADER_MERGING_FRAG);
            const mergeProgramLocationElementHeads = gl.getUniformLocation(mergeProgram, "u_element_heads");
            const mergeProgramLocationElementTails = gl.getUniformLocation(mergeProgram, "u_element_tails");
            const mergeProgramLocationBlur = gl.getUniformLocation(mergeProgram, "u_blur");
            const mergeProgramLocationTemperaturePalette = gl.getUniformLocation(mergeProgram, "u_temperature_palette");

            // --- setup a unit quad

            const positions = [
                1,  1,
                -1,  1,
                -1, -1,
                1,  1,
                -1, -1,
                1, -1,
            ];
            const vertBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

            // --- prepare texture and associated frame buffer for motion blur
            // it is not possible to sample a texture and render to that same texture at the same time
            // two textures needs to be used - "ping-pong" approach

            const createTextureAndFrameBuffer = (textureId) => {
                const motionBlurData = new Uint8Array(this.#elementArea.getDataTails().byteLength).fill(0xFF);
                const motionBlurTexture = gl.createTexture();
                gl.activeTexture(textureId);
                gl.bindTexture(gl.TEXTURE_2D, motionBlurTexture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.#width, this.#height, 0, gl.RGBA, gl.UNSIGNED_BYTE, motionBlurData);

                const motionBlurFrameBuffer = gl.createFramebuffer();
                gl.bindFramebuffer(gl.FRAMEBUFFER, motionBlurFrameBuffer);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, motionBlurTexture, 0);

                return motionBlurFrameBuffer;
            };

            const motionBlurFrameBuffer1 = createTextureAndFrameBuffer(gl.TEXTURE2);
            const motionBlurFrameBuffer2 = createTextureAndFrameBuffer(gl.TEXTURE3);

            // --- prepare element heads texture - TEXTURE0
            // move the texture definition into rendering loop to create a memory leak - to test WebGL failure recovery

            const elementHeadsTexture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, elementHeadsTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            // --- prepare element tails texture - TEXTURE1
            const elementTailsTexture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, elementTailsTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            // --- prepare temperature colors

            const temperaturePaletteTexture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, temperaturePaletteTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            // ---

            let blurTextureIndex = 2;  // "ping-pong" approach - see above
            this.#doRendering = () => {

                // update element heads texture
                const elementHeads = new Uint8Array(this.#elementArea.getDataHeads());
                gl.bindTexture(gl.TEXTURE_2D, elementHeadsTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.#width, this.#height, 0, gl.RGBA, gl.UNSIGNED_BYTE, elementHeads);

                // update element tails texture
                const elementTails = new Uint8Array(this.#elementArea.getDataTails());
                gl.bindTexture(gl.TEXTURE_2D, elementTailsTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.#width, this.#height, 0, gl.RGBA, gl.UNSIGNED_BYTE, elementTails);

                // update color palette texture
                gl.bindTexture(gl.TEXTURE_2D, temperaturePaletteTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, temperaturePaletteSize, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, temperaturePaletteData);

                // render blurrable elements and blur into a texture
                // - reduce blur from previous iterations (fading out) and render blurrable elements over
                gl.bindFramebuffer(gl.FRAMEBUFFER, blurTextureIndex === 2 ? motionBlurFrameBuffer1 : motionBlurFrameBuffer2);

                gl.useProgram(blurProgram);
                gl.uniform1f(blurProgramLocationTime, (new Date().getTime() - this.#timeStartMs) * 0.001);  // in seconds...
                gl.uniform1i(blurProgramLocationElementHeads, 0);  // texture 0
                gl.uniform1i(blurProgramLocationElementTails, 1);  // texture 1
                gl.uniform1i(blurProgramLocationBlur, (blurTextureIndex === 2) ? 3 : 2);  // texture 3 or 2
                gl.uniform1i(blurProgramLocationTemperaturePalette, 4);  // texture 4

                gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);

                // render to canvas
                // - blurrable elements and blur will be merged with elements that cannot be blurred
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                gl.useProgram(mergeProgram);
                gl.uniform1i(mergeProgramLocationElementHeads, 0);  // texture 0
                gl.uniform1i(mergeProgramLocationElementTails, 1);  // texture 1
                gl.uniform1i(mergeProgramLocationBlur, blurTextureIndex);  // texture 2 or 3
                gl.uniform1i(mergeProgramLocationTemperaturePalette, 4);  // texture 4

                gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);

                blurTextureIndex = (blurTextureIndex === 2) ? 3 : 2;  // swap textures 2 and 3
            };
        }

        trigger(x, y) {
            // ignore
        }

        /**
         *
         * @param changedChunks {boolean[]}
         * @return {void}
         */
        render(changedChunks) {
            this.#doRendering();
        }

        /**
         *
         * @param gl {WebGLRenderingContext} The WebGLRenderingContext to use.
         * @param vertexShader {string} vertex shader code
         * @param fragmentShader {string} fragment shader code
         * @return {WebGLProgram}
         */
        #loadProgram(gl, vertexShader, fragmentShader) {
            const program = gl.createProgram();

            gl.attachShader(program, this.#loadShader(gl, vertexShader, gl.VERTEX_SHADER));
            gl.bindAttribLocation(program, 0, "a_position");

            gl.attachShader(program, this.#loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER));

            gl.linkProgram(program);

            // Check the link status
            if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
                // Something went wrong with the link
                const lastError = gl.getProgramInfoLog(program);
                throw `Error in program linking: ${lastError}`;
            }

            return program;
        }

        /**
         *
         * @param gl {WebGLRenderingContext} The WebGLRenderingContext to use.
         * @param shaderSource {string} The shader source.
         * @param shaderType {number} The type of shader.
         * @return {WebGLShader}
         */
        #loadShader(gl, shaderSource, shaderType) {
            // Create the shader object
            const shader = gl.createShader(shaderType);
            if (shader === null) {
                throw 'Error compiling shader: cannot create shader';
            }

            // Load the shader source
            gl.shaderSource(shader, shaderSource);

            // Compile the shader
            gl.compileShader(shader);

            // Check the compile status
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
                // Something went wrong during compilation; get the error
                const lastError = gl.getShaderInfoLog(shader);
                throw `Error compiling shader: ${lastError}`;
            }

            return shader;
        }

        #parsePalette(palette) {
            const colors = palette.split('\n').map(line => line.split(',').map(Number));
            const array = new Uint8Array(colors.length * 4);
            for (let i = 0; i < colors.length; i++) {
                const color = colors[i];
                array[i * 4] = color[0];  // r
                array[i * 4 + 1] = color[1];  // g
                array[i * 4 + 2] = color[2];  // b
            }
            return array;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-06
     */
    class RenderingWebGLException {

        #error;

        constructor(error) {
            this.#error = error;
        }

        getError() {
            return this.#error;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-06
     */
    class RendererInitializerWebGL extends RendererInitializer {

        getContextType() {
            return 'webgl2';
        }

        initialize(elementArea, chunkSize, context) {
            try {
                return new RendererWebGL(elementArea, chunkSize, context);
            } catch (e) {
                throw new RenderingWebGLException(e);
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class RendererInitializerDefs {

        static canvas2d(renderingMode = null) {
            return new RendererInitializer2D(renderingMode);
        }

        static canvasWebGL() {
            return new RendererInitializerWebGL();
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-04-12
     */
    class BrushCollection {

        /**
         *
         * @returns {Object.<string,Brush>}
         */
        getExtraBrushes() {
            throw 'Not implemented';
        }

        /**
         *
         * @param codeName {string}
         * @returns {Brush|null}
         */
        byCodeName(codeName) {
            throw 'Not implemented';
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-12
     */
    class BrushCollectionImpl extends BrushCollection {

        /**
         * @type {Object.<string,Brush>}
         */
        #extraBrushes;

        constructor(extraBrushes) {
            super();
            this.#extraBrushes = extraBrushes;
        }

        getExtraBrushes() {
            return { ...this.#extraBrushes };
        }

        byCodeName(codeName) {
            const brush = this.#extraBrushes[codeName];
            if (brush !== undefined) {
                return brush;
            }
            return BrushDefs.byCodeName(codeName);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class GameDefaultsImpl extends GameDefaults {

        /** @type function(GameState):Extension[] */ #extensionsFactory;

        /** @type BrushCollection */ #brushCollection;

        /** @type Element */ #defaultElement;

        /** @type Brush */ #brushWater;
        /** @type Brush */ #brushSteam;
        /** @type Brush */ #brushGrass ;
        /** @type Brush */ #brushTree;
        /** @type Brush */ #brushTreeWood;
        /** @type Brush */ #brushTreeWoodDark;
        /** @type Brush */ #brushTreeLeaf;
        /** @type Brush */ #brushTreeLeafDark;
        /** @type Brush */ #brushTreeRoot;
        /** @type Brush */ #brushFire;
        /** @type Brush */ #brushAsh;

        /**
         *
         * @param extraBrushes {Object.<string, Brush>}
         * @param extensionsFactory {function(GameState):Extension[]}
         */
        constructor(extraBrushes = {}, extensionsFactory = () => []) {
            super();

            this.#extensionsFactory = extensionsFactory;
            this.#brushCollection = new BrushCollectionImpl(extraBrushes);

            function resolveBrush(codeName) {
                const brush = extraBrushes[codeName];
                if (brush === undefined || brush === null) {
                    const byCodeName = BrushDefs.byCodeName(codeName);
                    if (byCodeName === null) {
                        throw `Brush '${codeName}' not found`;
                    }
                    return byCodeName;
                } else {
                    if (brush instanceof Brush) {
                        return brush;
                    }
                    throw `Provided brush '${codeName}' is not instance of Brush`;
                }
            }

            this.#defaultElement = resolveBrush('air').apply(0, 0, undefined);

            this.#brushWater = resolveBrush('water');
            this.#brushSteam = resolveBrush('steam');
            this.#brushGrass = resolveBrush('grass');
            this.#brushTree = resolveBrush('tree');
            this.#brushTreeWood = resolveBrush('tree_wood');
            this.#brushTreeWoodDark = resolveBrush('tree_wood_dark');
            this.#brushTreeLeaf = resolveBrush('tree_leaf');
            this.#brushTreeLeafDark = resolveBrush('tree_leaf_dark');
            this.#brushTreeRoot = resolveBrush('tree_root');
            this.#brushFire = resolveBrush('fire');
            this.#brushAsh = resolveBrush('ash');
        }

        getExtensionsFactory() {
            return this.#extensionsFactory;
        }

        getBrushCollection() {
            return this.#brushCollection;
        }

        getDefaultElement() {
            return this.#defaultElement;
        }

        // brushes

        getBrushWater() {
            return this.#brushWater;
        }

        getBrushSteam() {
            return this.#brushSteam;
        }

        getBrushGrass() {
            return this.#brushGrass;
        }

        getBrushTree() {
            return this.#brushTree;
        }

        getBrushTreeLeaf() {
            return this.#brushTreeLeaf;
        }

        getBrushTreeLeafDark() {
            return this.#brushTreeLeafDark;
        }

        getBrushTreeWood() {
            return this.#brushTreeWood;
        }

        getBrushTreeWoodDark() {
            return this.#brushTreeWoodDark;
        }

        getBrushTreeRoot() {
            return this.#brushTreeRoot;
        }

        getBrushFire() {
            return this.#brushFire;
        }

        getBrushAsh() {
            return this.#brushAsh;
        }

        // structures

        getTreeTrunkTemplates() {
            return StructureDefs.TREE_TRUNK_TEMPLATES;
        }

        getTreeLeafClusterTemplates() {
            return StructureDefs.TREE_CLUSTER_TEMPLATES;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class Controller {

        #init = {
            scale: 0.5,
            canvasWidthPx: 700,
            canvasHeightPx: 400,
            scene: 'empty'
        };

        /** @type number */
        #currentWidthPoints;
        /** @type number */
        #currentHeightPoints;
        /** @type number */
        #currentScale;

        /** @type SandGame */
        #sandGame = null;
        /** @type GameDefaults */
        #gameDefaults;
        /** @type string */
        #imageRendering = 'pixelated';
        /** @type function[] */
        #onImageRenderingStyleChanged = [];
        /** @type boolean */
        #simulationEnabled = false;
        #rendererInitializer = RendererInitializerDefs.canvasWebGL();

        /** @type Scene|null */
        #initialScene = null;

        /** @type ServiceToolManager */
        #serviceToolManager;
        /** @type ServiceIO */
        #serviceIO = new ServiceIO(this);

        /** @type HTMLElement */
        #dialogAnchor;

        /**
         * @typedef {Object} CanvasProvider
         * @property {function():HTMLElement} initialize
         * @property {function():HTMLElement} getCanvasNode
         */
        /** @type CanvasProvider|null */
        #canvasProvider = null;

        /**
         *
         * @param init
         * @param dialogAnchor
         * @param toolManager
         * @param gameDefaults {GameDefaults}
         */
        constructor(init, dialogAnchor, toolManager, gameDefaults) {
            if (init) {
                this.#init = init;
            }

            this.#dialogAnchor = dialogAnchor;
            this.#serviceToolManager = toolManager;
            this.#gameDefaults = gameDefaults;

            this.#currentWidthPoints = Math.trunc(this.#init.canvasWidthPx * this.#init.scale);
            this.#currentHeightPoints = Math.trunc(this.#init.canvasHeightPx * this.#init.scale);
            this.#currentScale = this.#init.scale;
        }

        getVersion() {
            return this.#init.version;
        }

        /**
         *
         * @param canvasProvider {CanvasProvider}
         */
        registerCanvasProvider(canvasProvider) {
            this.#canvasProvider = canvasProvider;
        }

        /**
         * Returns initial scene definition - this is needed for restart etc.
         *
         * @returns {Scene|null}
         */
        getInitialScene() {
            return this.#initialScene;
        }

        setInitialScene(scene) {
            this.#initialScene = scene;
        }

        /**
         *
         * @param scene {Scene}
         */
        setup(scene) {
            this.setInitialScene(scene);
            this.#initialize(scene);
        }

        /**
         *
         * @param scene {Scene}
         */
        #initialize(scene) {
            if (this.#canvasProvider == null) {
                throw 'Illegal state: canvas provider not registered!';
            }
            if (this.#dialogAnchor == null) {
                throw 'Illegal state: dialog anchor not registered!';
            }

            const [w, h] = scene.countSize(this.#currentWidthPoints, this.#currentHeightPoints);
            if (w !== this.#currentWidthPoints || h !== this.#currentHeightPoints) {
                this.#currentWidthPoints = w;
                this.#currentHeightPoints = h;
                this.#currentScale = +(w / this.#init.canvasWidthPx).toFixed(3);
            }

            // init game
            const context = this.#initializeContext();
            this.#sandGame = null;
            let promise;
            try {
                promise = scene.createSandGame(w, h, this.#gameDefaults, context, this.#rendererInitializer);
            } catch (e) {
                this.#reportSeriousFailure('Initialization failed', e);
                return;
            }

            promise.then(sandGame => {
                this.#sandGame = sandGame;
                this.#sandGame.graphics().replace(ElementArea.TRANSPARENT_ELEMENT, this.#gameDefaults.getDefaultElement());

                // call on opened
                if (this.#initialScene !== null) {
                    this.#initialScene.executeOnOpened(this.#sandGame);
                }

                // handlers
                this.#onInitialized.forEach(f => f(this.#sandGame));

                // start rendering
                this.#sandGame.addOnRenderingFailed((e) => {
                    this.#reportSeriousFailure('Rendering failure', e);
                });
                this.#sandGame.startRendering();

                // start processing - if enabled
                if (this.#simulationEnabled) {
                    this.#sandGame.startProcessing();
                    this.#onStarted.forEach(f => f());
                }
            }).catch(e => {
                if (e instanceof RenderingWebGLException) {
                    setTimeout(() => {
                        const cause = 'WebGL renderer initialization failed (' + e.getError() + '). '
                                + 'Using fallback renderer; game performance and visuals will be affected!';
                        this.#restartAfterInitializationRendererFailure(cause, scene);
                    }, 100);
                } else {
                    this.#reportSeriousFailure('Initialization failed', e);
                }
            });
        }

        #initializeContext() {
            const canvas = this.#canvasProvider.initialize();
            let contextType = this.#rendererInitializer.getContextType();
            let context = this.#initializeContextAs(canvas, contextType);
            if ((contextType === 'webgl2') && (context === null || context === undefined)) {
                // WebGL is not supported - unsupported at all / unsupported after recent failure
                // - to test this, run Chrome with --disable-3d-apis
                this.#reportFirstRenderingFailure("Unable to get WebGL context. Using fallback renderer; game performance and visual will be affected");
                this.#rendererInitializer = RendererInitializerDefs.canvas2d();
                contextType = this.#rendererInitializer.getContextType();
                context = this.#initializeContextAs(canvas, contextType);
                Analytics.triggerFeatureUsed(Analytics.FEATURE_RENDERER_FALLBACK);
            }
            return context;
        }

        #initializeContextAs(canvasDomNode, contextId) {
            if (contextId === 'webgl2') {
                // handle WebGL failures

                let contextLossHandled = false;
                canvasDomNode.addEventListener('webglcontextlost', (e) => {
                    // GPU memory leak, GPU failure, etc.
                    // - to test this move the texture definition into rendering loop to create a memory leak

                    if (this.#sandGame !== null) {
                        this.#sandGame.stopRendering();  // stop rendering immediately
                    }

                    if (!contextLossHandled) {
                        contextLossHandled = true;
                    } else {
                        return;  // already handled
                    }

                    const cause = 'WebGL context loss detected. Using fallback renderer; game performance and visuals will be affected';
                    e.preventDefault();
                    setTimeout(() => {
                        this.#restartAfterRenderingFailure(cause);
                    }, 2000);
                }, false);
            }
            return canvasDomNode.getContext(contextId);
        }

        close() {
            if (this.#sandGame !== null) {
                this.#sandGame.stopProcessing();
                this.#sandGame.stopRendering();
            }
            for (let func of this.#onBeforeClosed) {
                func();
            }
        }

        enableGlobalShortcuts() {
            document.onkeydown = (e) => {
                // handle start stop
                if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'Enter') {
                    e.preventDefault();
                    this.switchStartStop();
                }
                // handle next step
                if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key === ' ') {
                    e.preventDefault();
                    if (this.#sandGame !== null) {
                        this.#sandGame.doProcessing();
                    }
                }
                // handle fast execute
                if (e.ctrlKey && !e.altKey && e.shiftKey && e.key === ' ') {
                    e.preventDefault();
                    if (this.#sandGame !== null) {
                        const input = prompt('Enter the number of iterations to run', '10000');
                        const iterations = Math.abs(parseInt(input));
                        const timeBefore = new Date();
                        for (let i = 0; i < iterations; i++) {
                            this.#sandGame.doProcessing();
                            if (i % 2500 === 0) {
                                console.log(`Performed ${i} of ${iterations} iterations`);
                            }
                        }
                        const timeAfter = new Date();
                        const elapsedMs = timeAfter.getTime() - timeBefore.getTime();
                        console.log(`Performed ${iterations} iterations in ${elapsedMs} ms`);
                    }
                }
            };
        }

        /**
         *
         * @returns {SandGame|null}
         */
        getSandGame() {
            return this.#sandGame;
        }

        /**
         *
         * @returns {HTMLElement|null}
         */
        getCanvas() {
            if (this.#canvasProvider !== null) {
                return this.#canvasProvider.getCanvasNode();
            }
            return null;
        }

        // controller - simulation state

        /** @type function(SandGame)[] */
        #onInitialized = [];
        /** @type function(SandGame)[] */
        #onBeforeClosed = [];
        /** @type function(Scene)[] */
        #onBeforeNewSceneLoaded = [];
        /** @type function[] */
        #onStarted = [];
        /** @type function[] */
        #onStopped = [];
        /** @type function(type:string,message:string)[] */
        #onFailure = [];

        /**
         *
         * @param handler {function(SandGame)}
         * @returns void
         */
        addOnInitialized(handler) {
            this.#onInitialized.push(handler);
        }

        /**
         *
         * @param handler {function(Scene)}
         * @returns void
         */
        addOnBeforeNewSceneLoaded(handler) {
            this.#onBeforeNewSceneLoaded.push(handler);
        }

        /**
         *
         * @param handler {function}
         * @returns void
         */
        addOnBeforeClosed(handler) {
            this.#onBeforeClosed.push(handler);
        }

        /**
         *
         * @param handler {function}
         * @returns void
         */
        addOnStarted(handler) {
            this.#onStarted.push(handler);
        }

        /**
         *
         * @param handler {function}
         * @returns void
         */
        addOnStopped(handler) {
            this.#onStopped.push(handler);
        }

        /**
         *
         * @param handler {function(type:string,message:string)}
         * @returns void
         */
        addOnFailure(handler) {
            this.#onFailure.push(handler);
        }

        #restartAfterInitializationRendererFailure(cause, scene) {
            this.#reportFirstRenderingFailure(cause);
            this.#rendererInitializer = RendererInitializerDefs.canvas2d();  // fallback to classic CPU renderer
            this.#initialize(scene);
            Analytics.triggerFeatureUsed(Analytics.FEATURE_RENDERER_FALLBACK);
        }

        #restartAfterRenderingFailure(cause) {
            this.#reportFirstRenderingFailure(cause);
            const snapshot = this.createSnapshot();
            this.#rendererInitializer = RendererInitializerDefs.canvas2d();  // fallback to classic CPU renderer
            this.openScene(new SceneImplSnapshot(snapshot));
            Analytics.triggerFeatureUsed(Analytics.FEATURE_RENDERER_FALLBACK);
        }

        #reportFirstRenderingFailure(message) {
            console.warn(message);
            for (let handler of this.#onFailure) {
                handler('rendering-warning', message);
            }

            let toast = DomBuilder.bootstrapToastBuilder();
            toast.setHeaderContent(DomBuilder.element('strong', { style: 'color: orange;' }, 'Warning'));
            toast.setBodyContent(DomBuilder.par(null, message));
            toast.setDelay(60000);
            toast.show(this.#dialogAnchor);
        }

        #reportSeriousFailure(message, e) {
            console.error(message, e);

            // normalize exception
            if (e instanceof RenderingWebGLException) {
                e = e.getError();
            }
            if (typeof e === 'object') {
                if (e.message !== undefined) {
                    e = '' + e.message;
                } else {
                    e = JSON.stringify(e);
                }
            }

            const fullMessage = message + ': ' + e;
            for (let handler of this.#onFailure) {
                handler('serious', fullMessage);
            }

            let toast = DomBuilder.bootstrapToastBuilder();
            toast.setHeaderContent(DomBuilder.element('strong', { style: 'color: red;' }, 'Error'));
            toast.setBodyContent(DomBuilder.par(null, fullMessage));
            toast.show(this.#dialogAnchor);
        }

        start() {
            if (this.#sandGame !== null) {
                if (!this.#simulationEnabled) {
                    this.#sandGame.startProcessing();
                    this.#onStarted.forEach(f => f());
                }
            }
            this.#simulationEnabled = true;
        }

        switchStartStop() {
            this.#simulationEnabled = !this.#simulationEnabled;
            if (this.#sandGame !== null) {
                if (this.#simulationEnabled) {
                    this.#simulationEnabled = true;
                    this.#sandGame.startProcessing();
                    this.#onStarted.forEach(f => f());
                } else {
                    this.#sandGame.stopProcessing();
                    this.#onStopped.forEach(f => f());
                }
            }
        }

        /**
         * @returns Snapshot
         */
        createSnapshot() {
            if (this.#sandGame !== null) {
                let snapshot = this.#sandGame.createSnapshot();
                snapshot.metadata.scale = this.getCurrentScale();
                if (this.#init.version !== undefined) {
                    snapshot.metadata.appVersion = this.#init.version;
                }
                return snapshot;
            } else {
                return null;
            }
        }

        openScene(scene) {
            for (let handler of this.#onBeforeNewSceneLoaded) {
                handler(scene);
            }
            this.close();

            this.#initialize(scene);
        }

        pasteScene(scene) {
            const toolManager = this.getToolManager();
            const revert = toolManager.createRevertAction();

            toolManager.setPrimaryTool(Tools.insertScenesTool([ scene ], revert));
            toolManager.setSecondaryTool(Tools.actionTool(revert));
        }

        // controller / canvas size

        /**
         *
         * @returns {number}
         */
        getCurrentWidthPoints() {
            return this.#currentWidthPoints;
        }

        /**
         *
         * @returns {number}
         */
        getCurrentHeightPoints() {
            return this.#currentHeightPoints;
        }

        /**
         *
         * @returns {number}
         */
        getCurrentScale() {
            return this.#currentScale;
        }

        /**
         *
         * @param width
         * @param height
         * @param scale
         * @returns void
         */
        changeCanvasSize(width, height, scale) {
            if (typeof width !== 'number' || !(width > 0 && width < 2048)) {
                throw 'Incorrect width';
            }
            if (typeof height !== 'number' || !(height > 0 && height < 2048)) {
                throw 'Incorrect height';
            }
            if (typeof scale !== 'number' || !(scale > 0 && scale <= 1)) {
                throw 'Incorrect scale';
            }

            this.close();

            this.#currentWidthPoints = width;
            this.#currentHeightPoints = height;
            this.#currentScale = scale;

            this.#initialize(new SceneImplTmpResize(this.#sandGame.createSnapshot()));
        }

        // controller / options

        /**
         *
         * @param initializer {RendererInitializer}
         * @returns void
         */
        setRendererInitializer(initializer) {
            this.#rendererInitializer = initializer;
            if (this.#sandGame) {
                this.close();
                this.#initialize(new SceneImplSnapshot(this.#sandGame.createSnapshot()));
            }
        }

        /**
         * @returns {RendererInitializer}
         */
        getRendererInitializer() {
            return this.#rendererInitializer;
        }

        /**
         *
         * @param style {string}
         * @returns void
         */
        setCanvasImageRenderingStyle(style) {
            this.#imageRendering = style;
            for (let func of this.#onImageRenderingStyleChanged) {
                func(style);
            }
        }

        /**
         * @returns {string}
         */
        getCanvasImageRenderingStyle() {
            return this.#imageRendering;
        }

        /**
         *
         * @param handler {function(string)}
         * @returns void
         */
        addOnImageRenderingStyleChanged(handler) {
            this.#onImageRenderingStyleChanged.push(handler);
        }

        // controller / services

        /**
         *
         * @returns {ServiceToolManager}
         */
        getToolManager() {
            return this.#serviceToolManager;
        }

        /**
         *
         * @returns {ServiceIO}
         */
        getIOManager() {
            return this.#serviceIO;
        }

        // controller / ui

        /**
         *
         * @returns {HTMLElement}
         */
        getDialogAnchor() {
            return this.#dialogAnchor;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-08
     */
    class SceneImplHardcoded extends Scene {

        name;
        description;

        /** @type function(SandGame):Promise<any>|any */
        #onCreated;

        /** @type function(SandGame) */
        #onOpened;

        constructor({name, description, onCreated, onOpened}) {
            super();
            this.#onCreated = onCreated;
            this.#onOpened = onOpened;
            this.name = name;
            this.description = description;
        }

        countSize(prefWidth, prefHeight) {
            return [prefWidth, prefHeight];
        }

        async createSandGame(prefWidth, prefHeight, defaults, context, rendererInitializer) {
            let elementArea = this.createElementArea(prefWidth, prefHeight, defaults.getDefaultElement());
            let sandGame = new SandGame(elementArea, [], null, defaults, context, rendererInitializer);
            await this.#onCreated(sandGame);
            return sandGame;
        }

        createElementArea(prefWidth, prefHeight, defaultElement) {
            return ElementArea.create(prefWidth, prefHeight, defaultElement);
        }

        executeOnOpened(sandGame) {
            if (this.#onOpened !== undefined) {
                this.#onOpened(sandGame);
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-08
     */
    class Scenes {

        /**
         *
         * @param name {string}
         * @param onCreated {function(SandGame):Promise<any>|any}
         * @param onOpened {(function(SandGame):void)|undefined}
         */
        static custom(name, onCreated, onOpened = undefined) {
            return new SceneImplHardcoded({
                name: name,
                onCreated: onCreated,
                onOpened: onOpened
            });
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-20
     */
    class SceneDefs {

        /** @type Scene */
        static SCENE_EMPTY = new SceneImplHardcoded({
            name: 'Empty',
            description: 'Boxed mode',
            onCreated: function (sandGame) {
                sandGame.setBoxedMode();
                // empty
            }
        });

        /** @type Scene */
        static SCENE_LANDSCAPE_1 = new SceneImplHardcoded({
            name: 'Landscape 1',
            description: 'Boxed mode',
            onCreated: async function (sandGame) {
                sandGame.setBoxedMode();

                const soil = sandGame.getBrushCollection().byCodeName('soil');
                const sand = sandGame.getBrushCollection().byCodeName('sand');
                const water = sandGame.getBrushCollection().byCodeName('water');

                const m = 40;
                let layeredPainter = sandGame.layeredTemplate()
                    .layerSpline([[0, 35], [60, 35], [40 + m, 40], [60 + m, 50], [80 + m, 40], [200 + m, 20], [400 + m, 20], [1000 + m, 20]],
                        true, Brushes.concat(soil, BrushDefs.EFFECT_NOISE_LG))
                    .layerSpline([[0, 0], [90 + m, 0], [110 + m, 10], [150 + m, 10], [250 + m, 0]],
                            true, sand, 2)
                    .tool(30, 17, await Resources.parseToolDefinition(TemplateDefs.CABIN))
                    .tool(120 + m, 5, await Resources.parseToolDefinition(TemplateDefs.SAND_CASTLE))
                    .tree(60 + m, 1, 200)
                    .tree(30 + m, 5)
                    .grass(20 + m, 40 + m)
                    .grass(50 + m, 70 + m);

                if (sandGame.getWidth() / sandGame.getHeight() > 1.5) {
                    // wide screens only
                    sandGame.blockTemplate()
                        .withMaxHeight(120)
                        .withBlueprint([
                            '          ',
                            '        ww',
                            '          ',
                            '       1  ',
                            '     111111',
                            '          ',
                            '          ',
                            '          ',
                            '          ',
                        ])
                        .withBrushes({
                            w: Brushes.withIntensity(0.5, water),
                            1: sand
                        })
                        .paint();
                } else {
                    layeredPainter
                        .layer(26, false, water)
                        .layer(27, false, Brushes.withIntensity(0.33, water));
                }

                layeredPainter.tool(65, 45, ToolDefs.BIRD);
                layeredPainter.tool(70, 70, ToolDefs.BIRD);
                layeredPainter.tool(71, 75, ToolDefs.BIRD);
                layeredPainter.tool(125, 55, ToolDefs.BIRD);
                layeredPainter.tool(130, 50, ToolDefs.BIRD);
            }
        });

        static SCENE_LANDSCAPE_2 = new SceneImplHardcoded({
            name: 'Landscape 2',
            description: 'Boxed mode',
            onCreated: function (sandGame) {
                sandGame.setBoxedMode();

                const water = sandGame.getBrushCollection().byCodeName('water');
                const sand = sandGame.getBrushCollection().byCodeName('sand');
                const soil = sandGame.getBrushCollection().byCodeName('soil');
                const gravel = sandGame.getBrushCollection().byCodeName('gravel');

                sandGame.layeredTemplate()
                    .layerSpline([[0, 20], [50, 15], [100, 10], [150, 10], [200, 10], [250, 10], [1250, 10]],
                        true, Brushes.concat(gravel, BrushDefs.EFFECT_NOISE_LG))
                    .layerSpline([[0, 30], [25, 31], [50, 27], [100, 15], [150, 0], [200, 5], [220, 15], [300, 35], [330, 37],
                            [370, 50], [400, 45], [500, 40], [1250, 40]],
                        true, Brushes.concat(soil, BrushDefs.EFFECT_NOISE_LG), 30)
                    .layerSpline([[0, 0], [50, 0], [100, 10], [150, 10], [200, 9], [275, 0], [1250, 0]],
                        true, sand, 5)
                    .layer(35, false, water)
                    .layer(36, false, Brushes.withIntensity(0.33, water))
                    .tool(150, -8, ToolDefs.FISH)
                    .tool(270, 20, ToolDefs.BUTTERFLY)
                    .tool(280, 15, ToolDefs.BUTTERFLY)
                    .grass()
                    .tree(16, 6)
                    .tree(28, 3, 70)
                    .tree(45, 5)
                    .tree(309, 1)
                    .tree(336, 4)
                    .tree(361, 0);
            }
        });

        /** @type Scene */
        static SCENE_FALLTHROUGH = new SceneImplHardcoded({
            name: 'Fall-through',
            description: 'Fall-through mode',
            onCreated: function (sandGame) {
                sandGame.setFallThroughMode();

                const wall = sandGame.getBrushCollection().byCodeName('wall');
                const water = sandGame.getBrushCollection().byCodeName('water');
                const sand = sandGame.getBrushCollection().byCodeName('sand');

                const graphics = sandGame.graphics();
                const xo = Math.trunc((sandGame.getWidth() - 150) / 2 - 15);
                const yo = Math.trunc((sandGame.getHeight() - 150) / 2);
                graphics.drawRectangle(40 + xo, 20 + yo, 60 + xo, 40 + yo, water);
                graphics.drawLine(30 + xo, 30 + yo, 30 + xo, 50 + yo, 5, wall, true);
                graphics.drawLine(30 + xo, 50 + yo, 70 + xo, 80 + yo, 5, wall, true);
                graphics.drawLine(65 + xo, 90 + yo, 100 + xo, 100 + yo, 5, wall, true);
                graphics.drawLine(55 + xo, 140 + yo, 125 + xo, 140 + yo, 10, wall, false);
                graphics.drawLine(55 + xo, 130 + yo, 55 + xo, 140 + yo, 10, wall, false);
                graphics.drawLine(70 + xo, 125 + yo, 90 + xo, 125 + yo, 10, sand, false);
                graphics.draw(120 + xo, 130 + yo, sand);
                graphics.drawLine(150 + xo, 10 + yo, 80 + xo, 35 + yo, 5, wall, true);
                graphics.drawLine(80 + xo, 35 + yo, 80 + xo, 15 + yo, 5, wall, true);
            }
        });

        /** @type Scene */
        static SCENE_PLATFORM = new SceneImplHardcoded({
            name: 'Platform',
            description: 'Erasing mode',
            onCreated: function (sandGame) {
                sandGame.setErasingMode();

                const sand = sandGame.getBrushCollection().byCodeName('sand');
                const wall = sandGame.getBrushCollection().byCodeName('wall');

                sandGame.blockTemplate()
                    .withBlueprint([
                        '          ',
                        '          ',
                        '        w ',
                        '        w ',
                        '          ',
                        '          ',
                        ' ssssssss ',
                        '          ',
                        '          ',
                    ])
                    .withBrushes({
                        w: sand,
                        s: wall
                    })
                    .paint();
            }
        });

        static SCENES = {
            empty: SceneDefs.SCENE_EMPTY,
            landscape_1: SceneDefs.SCENE_LANDSCAPE_1,
            landscape_2: SceneDefs.SCENE_LANDSCAPE_2,
            fallthrough: SceneDefs.SCENE_FALLTHROUGH,
            platform: SceneDefs.SCENE_PLATFORM
        };
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class Entities {

        static bird(x = undefined, y = undefined) {
            return { entity: 'bird', x: x, y: y };
        }

        static butterfly(x = undefined, y = undefined) {
            return { entity: 'butterfly', x: x, y: y };
        }

        static fish(x = undefined, y = undefined) {
            return { entity: 'fish', x: x, y: y };
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
     *
     * @author Patrik Harag
     * @version 2024-02-08
     */
    class ComponentViewTemplateSelection extends Component {

        #templateDefinitions;

        constructor(templateDefinitions) {
            super();
            this.#templateDefinitions = templateDefinitions;
        }

        createNode(controller) {
            let buttons = [];

            for (const toolDefinition of this.#templateDefinitions) {
                const name = toolDefinition.info.displayName;
                let loadedTool = null;

                let button = DomBuilder.button(name, { class: 'btn btn-light template-button', 'data-bs-dismiss': 'modal'}, () => {
                    if (loadedTool !== null) {

                        const toolManager = controller.getToolManager();
                        const revert = toolManager.createRevertAction();

                        toolManager.setPrimaryTool(loadedTool);
                        toolManager.setSecondaryTool(Tools.actionTool(revert));

                    }
                });
                if (toolDefinition.info.icon !== undefined) {
                    button.style.backgroundImage = `url(${ toolDefinition.info.icon.imageData })`;
                }

                buttons.push(button);

                Resources.parseToolDefinition(toolDefinition).then(tool => {
                    loadedTool = tool;
                }).catch(e => {
                    console.warn('Template loading failed: ' + e);
                });
            }

            return DomBuilder.div({ class: 'sand-game-templates' }, buttons);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-08
     */
    class ActionDialogTemplateSelection extends Action {

        #templateDefinitions;
        #additionalInfo;

        constructor(templateDefinitions, additionalInfo = null) {
            super();
            this.#templateDefinitions = templateDefinitions;
            this.#additionalInfo = additionalInfo;
        }

        performAction(controller) {
            let templatesComponent = new ComponentViewTemplateSelection(this.#templateDefinitions);

            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Templates');
            dialog.setBodyContent(DomBuilder.div({ class: 'sand-game-component' }, [
                DomBuilder.par(null, "Select a template"),
                templatesComponent.createNode(controller),
                this.#additionalInfo
            ]));
            dialog.addCloseButton('Close');
            dialog.show(controller.getDialogAnchor());
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class ComponentViewTools extends Component {

        /** @type Tool[] */
        #tools;
        /** @type boolean */
        #importEnabled;

        /**
         * @param tools {Tool[]}
         * @param importEnabled {boolean}
         */
        constructor(tools, importEnabled = false) {
            super();
            this.#tools = tools;
            this.#importEnabled = importEnabled;
        }

        createNode(controller) {
            let buttons = [];

            const buttonType = 'btn-sand-game-tool';

            const initButton = (button, tool) => {
                button.addEventListener('click', () => {
                    this.#selectTool(tool, controller);
                });

                controller.getToolManager().addOnPrimaryToolChanged(newTool => {
                    if (newTool === tool) {
                        button.classList.add('selected');
                    } else {
                        button.classList.remove('selected');
                    }
                });

                // initial select
                if (tool === controller.getToolManager().getPrimaryTool()) {
                    button.classList.add('selected');
                }

                controller.getToolManager().addOnInputDisabledChanged(disabled => {
                    button.disabled = disabled;
                });
            };

            for (let tool of this.#tools) {
                const info = tool.getInfo();
                let codeName = info.getCodeName();
                let badgeStyle = info.getBadgeStyle();

                if (tool instanceof SelectionFakeTool) {

                    const ulContent = [];
                    for (const innerTool of tool.getTools()) {
                        const innerInfo = innerTool.getInfo();
                        innerInfo.getCodeName();
                        let innerDisplayName = innerInfo.getDisplayName();
                        let innerBadgeStyle = innerInfo.getBadgeStyle();

                        const innerLabel = DomBuilder.span(innerDisplayName, {
                            class: 'btn btn-secondary ' + buttonType + ' ' + codeName,
                            style: innerBadgeStyle,
                        });
                        const innerToolAttributes = {
                            class: 'dropdown-item',
                        };
                        const innerButton = DomBuilder.button(innerLabel, innerToolAttributes);
                        initButton(innerButton, innerTool);
                        ulContent.push(DomBuilder.element('li', null, innerButton));
                    }

                    const buttonContent = this.#createButtonContent(info);
                    const button = DomBuilder.div({ class: 'btn-group' }, [
                        DomBuilder.button(buttonContent, {
                            class: 'btn btn-secondary dropdown-toggle ' + buttonType + ' ' + codeName,
                            style: badgeStyle,
                            'data-bs-toggle': 'dropdown',
                            'aria-expanded': 'false'
                        }),
                        DomBuilder.element('ul', {
                            class: 'dropdown-menu ' + (ulContent.length > 10 ? 'sand-game-column-count-2' : '')
                        }, ulContent)
                    ]);

                    buttons.push(button);

                } else {
                    const attributes = {
                        class: 'btn btn-secondary ' + buttonType + ' ' + codeName,
                        style: badgeStyle
                    };
                    const buttonContent = this.#createButtonContent(info);
                    const button = DomBuilder.button(buttonContent, attributes);
                    initButton(button, tool);
                    buttons.push(button);
                }
            }

            return DomBuilder.div({ class: 'sand-game-tools' }, buttons);
        }

        #selectTool(tool, controller) {
            if (tool instanceof TemplateSelectionFakeTool) {
                let additionalInfo = null;
                if (this.#importEnabled) {
                    additionalInfo = DomBuilder.div(null, [
                        DomBuilder.par(null, ""),
                        DomBuilder.par(null, "You can also create your own template using an image. See the Import button.")
                    ]);
                }
                const templateDefinitions = tool.getTemplateDefinitions();
                if (Array.isArray(templateDefinitions)) {
                    // multiple templates
                    const action = new ActionDialogTemplateSelection(templateDefinitions, additionalInfo);
                    action.performAction(controller);
                } else {
                    // single template
                    Resources.parseToolDefinition(templateDefinitions).then(tool => {
                        const toolManager = controller.getToolManager();
                        const revert = toolManager.createRevertAction();
                        toolManager.setPrimaryTool(tool);
                        toolManager.setSecondaryTool(Tools.actionTool(revert));
                    }).catch(e => {
                        console.warn('Template loading failed: ' + e);
                    });
                }
            } else if (tool instanceof GlobalActionTool) {
                const handler = tool.getHandler();
                const sandGame = controller.getSandGame();
                if (sandGame !== null) {
                    handler(sandGame);
                }
            } else {
                controller.getToolManager().setPrimaryTool(tool);
                controller.getToolManager().setSecondaryTool(ToolDefs.ERASE);
            }
        }

        #createButtonContent(info) {
            let displayName = info.getDisplayName();
            const svgIcon = info.getSvgIcon();
            if (svgIcon !== undefined) {
                return [ DomBuilder.create(svgIcon),  displayName ];
            } else {
                return displayName;
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-17
     */
    class ComponentViewCanvasOverlayMarker extends Component {

        /** @type Controller */
        #controller;

        #nodeOverlay;

        #w;
        #h;
        #scale;

        constructor(w, h, scale, controller) {
            super();
            this.#w = w;
            this.#h = h;
            this.#scale = scale;
            const wPx = w / scale;
            const hPx = h / scale;
            this.#nodeOverlay = DomBuilder.div({
                style: {
                    display: 'none',  // hidden by default
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: `${wPx}px`,
                    height: `${hPx}px`
                },
                class: 'sand-game-canvas-overlay',
                width: w + 'px',
                height: h + 'px',
            });
            this.#controller = controller;
        }

        /**
         *
         * @param overlay {SandGameOverlay}
         */
        register(overlay) {
            const markers = overlay.getMarkers();
            if (markers.length > 0) {
                for (const marker of markers) {
                    this.#nodeOverlay.append(this.#createMarkerNode(marker));
                }
                this.#nodeOverlay.style.display = 'initial';
            }

            // future markers
            overlay.addOnMarkerAdded((marker) => {
                this.#nodeOverlay.append(this.#createMarkerNode(marker));
                this.#nodeOverlay.style.display = 'initial';
            });
        }

        /**
         *
         * @param marker {Marker}
         * @returns {HTMLElement}
         */
        #createMarkerNode(marker) {
            const config = marker.getConfig();

            const [x1, y1, x2, y2] = marker.getPosition();
            const rectangle = this.#createRectangle(x1, y1, x2, y2, config.label);
            if (typeof config.style === 'object') {
                for (const [key, value] of Object.entries(config.style)) {
                    rectangle.style[key] = value;
                }
            }
            if (!marker.isVisible()) {
                rectangle.style.display = 'none';
            }
            marker.addOnVisibleChanged((visible) => {
                rectangle.style.display = visible ? 'initial' : 'none';
            });
            return rectangle;
        }

        #createRectangle(x1, y1, x2, y2, content = null) {
            const xPx = x1 / this.#scale;
            const yPx = y1 / this.#scale;
            const wPx = (x2 - x1) / this.#scale;
            const hPx = (y2 - y1) / this.#scale;

            const attributes = {
                class: 'sand-game-marker',
                style: {
                    left: xPx + 'px',
                    top: yPx + 'px',
                    width: wPx + 'px',
                    height: hPx + 'px',
                    position: 'absolute',
                }
            };

            return DomBuilder.div(attributes, content);
        }

        createNode(controller) {
            return this.#nodeOverlay;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-07
     */
    class ComponentViewCanvasOverlayCursor extends Component {

        /** @type Controller */
        #controller;

        #nodeOverlay;

        /** @type {{node:any,width:number,height:number}|null} */
        #cursor = null;

        constructor(w, h, scale, controller) {
            super();
            const wPx = w / scale;
            const hPx = h / scale;
            this.#nodeOverlay = DomBuilder.div({
                style: {
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: `${wPx}px`,
                    height: `${hPx}px`
                },
                class: 'sand-game-canvas-overlay',
                width: w + 'px',
                height: h + 'px',
            });
            this.#controller = controller;
        }

        createNode(controller) {
            return this.#nodeOverlay;
        }

        hideCursors() {
            this.#nodeOverlay.innerHTML = '';
            this.#cursor = null;
        }

        repaintRectangleSelection(lastX, lastY, x, y, scale) {
            this.#nodeOverlay.innerHTML = '';

            let xPx = Math.min(lastX, x) / scale;
            let yPx = Math.min(lastY, y) / scale;
            let wPx = Math.abs(x - lastX) / scale;
            let hPx = Math.abs(y - lastY) / scale;

            const selection = DomBuilder.div({
                style: {
                    left: xPx + 'px',
                    top: yPx + 'px',
                    width: wPx + 'px',
                    height: hPx + 'px',
                    position: 'absolute',
                    outline: 'black 1px solid',
                    pointerEvents: 'none'
                }
            });
            this.#nodeOverlay.append(selection);
        }

        repaintLineSelection(lastX, lastY, x, y, scale) {
            this.#nodeOverlay.innerHTML = '';

            const w = this.#controller.getCurrentWidthPoints();
            const h = this.#controller.getCurrentHeightPoints();

            const line = DomBuilder.create(`
            <svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
              <line x1="${lastX}" y1="${lastY}" x2="${x}" y2="${y}" stroke="black" />
            </svg>
        `);
            line.style.pointerEvents = 'none';
            this.#nodeOverlay.append(line);
        }

        showCursor(x, y, scale, cursorDefinition) {
            if (cursorDefinition instanceof CursorDefinitionElementArea) {
                const wPx = Math.trunc(cursorDefinition.getWidth() / scale);
                const hPx = Math.trunc(cursorDefinition.getHeight() / scale);

                const node = DomBuilder.element('canvas', {
                    width: cursorDefinition.getWidth() + 'px',
                    height: cursorDefinition.getHeight() + 'px',
                    style: {
                        width: `${wPx}px`,
                        height: `${hPx}px`,
                        outline: 'black 1px solid'
                    }
                });

                // render preview
                node.style.imageRendering = 'pixelated';
                Renderer2D.renderPreview(cursorDefinition.getElementArea(), node.getContext('2d'), 0xBB);

                this.#cursor = {
                    width: wPx,
                    height: hPx,
                    node: node
                };
            } else {
                return;
            }

            this.#cursor.node.style.position = 'absolute';
            this.#cursor.node.style.pointerEvents = 'none';

            this.moveCursor(x, y, scale);
        }

        hasCursor() {
            return this.#cursor !== null;
        }

        moveCursor(x, y, scale) {
            const cursor = this.#cursor;

            const pxW = this.#controller.getCurrentWidthPoints() / scale;
            const pxH = this.#controller.getCurrentHeightPoints() / scale;

            const pxTop = y / scale - Math.trunc(cursor.height / 2);
            const pxLeft = x / scale - Math.trunc(cursor.width / 2);

            const UNSET = -1;  // expect border
            const pxClipTop = pxTop < 0 ? -pxTop : UNSET;
            const pxClipRight = pxLeft + cursor.width >= pxW ? pxLeft + cursor.width - pxW : UNSET;
            const pxClipBottom = pxTop + cursor.height >= pxH ? pxTop + cursor.height - pxH : UNSET;
            const pxClipLeft = pxLeft < 0 ? -pxLeft : UNSET;

            cursor.node.style.top = pxTop + 'px';
            cursor.node.style.left = pxLeft + 'px';
            cursor.node.style.clipPath = `inset(${pxClipTop}px ${pxClipRight}px ${pxClipBottom}px ${pxClipLeft}px)`;

            this.#nodeOverlay.innerHTML = '';
            this.#nodeOverlay.append(cursor.node);
        }
    }

    var _ASSET_ICON_SQUARE = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-square\" viewBox=\"0 0 16 16\">\r\n    <path d=\"M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z\"/>\r\n</svg>";

    var _ASSET_ICON_SQUARE_CHECK = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-check-square-fill\" viewBox=\"0 0 16 16\">\r\n    <path d=\"M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm10.03 4.97a.75.75 0 0 1 .011 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.75.75 0 0 1 1.08-.022z\"/>\r\n</svg>";

    var _ASSET_ICON_SQUARE_DOTTED = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-square-dotted\" viewBox=\"0 0 16 16\">\r\n    <path d=\"m2.5 0q-.25 0-.487.048l.194.98a1.5 1.5 0 01.293-.028h.458v-1zm2.292 0h-.917v1h.917zm1.833 0h-.917v1h.917zm1.833 0h-.916v1h.916zm1.834 0h-.917v1h.917zm1.833 0h-.917v1h.917zm1.375 0h-.458v1h.458q.151 0 .293.029l.194-.981a2.5 2.5 0 00-.487-.048m2.079 1.11a2.5 2.5 0 00-.69-.689l-.556.831q.248.167.415.415l.83-.556zm-14.469-.689a2.5 2.5 0 00-.689.69l.831.556c.11-.164.251-.305.415-.415zm14.89 2.079q0-.25-.048-.487l-.98.194q.027.141.028.293v.458h1zm-15.952-.487a2.5 2.5 0 00-.048.487v.458h1v-.458q0-.151.029-.293zm-.048 1.862v.917h1v-.917zm16 .917v-.917h-1v.917zm-16 .916v.917h1v-.917zm16 .917v-.917h-1v.917zm-16 .917v.916h1v-.916zm15 .916h1v-.916h-1zm-15 .917v.917h1v-.917zm16 .917v-.917h-1v.917zm-16 .916v.917h1v-.917zm16 .917v-.917h-1v.917zm-16 .917v.458q0 .25.048.487l.98-.194a1.5 1.5 0 01-.028-.293v-.458zm16 .458v-.458h-1v.458q0 .151-.029.293l.981.194q.048-.237.048-.487m-15.579 1.39c.183.272.417.506.69.689l.556-.831a1.5 1.5 0 01-.415-.415zm14.469.689c.272-.183.506-.417.689-.69l-.831-.556c-.11.164-.251.305-.415.415l.556.83zm-12.877.373q.237.048.487.048h.458v-1h-.458q-.151 0-.293-.029zm11.487.048q.25 0 .487-.048l-.194-.98a1.5 1.5 0 01-.293.028h-.458v1zm-9.625 0h.917v-1h-.917zm1.833 0h.917v-1h-.917zm1.834 0h.916v-1h-.916zm1.833 0h.917v-1h-.917zm1.833 0h.917v-1h-.917z\"/>\r\n</svg>";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-19
     */
    class ComponentViewCanvasOverlayScenario extends Component {

        /** @type Controller */
        #controller;

        #nodeOverlay;

        #w;
        #h;
        #scale;

        constructor(w, h, scale, controller) {
            super();
            this.#w = w;
            this.#h = h;
            this.#scale = scale;
            const wPx = w / scale;
            const hPx = h / scale;
            this.#nodeOverlay = DomBuilder.div({
                style: {
                    display: 'none',  // hidden by default
                    position: 'absolute',
                    left: '0',
                    top: '0',
                    width: `${wPx}px`,
                    height: `${hPx}px`,
                    pointerEvents: 'none'
                },
                class: 'sand-game-canvas-overlay',
                width: w + 'px',
                height: h + 'px',
            });
            this.#controller = controller;
        }

        /**
         *
         * @param overlay {SandGameScenario}
         */
        register(overlay) {
            let visible = false;
            const addNode = (node) => {
                this.#nodeOverlay.append(node);
                if (!visible) {
                    visible = true;
                    this.#nodeOverlay.style.display = null;
                }
            };

            // handles splashes
            for (const splash of overlay.getSplashes()) {
                addNode(this.#createSplashNode(splash));
            }
            overlay.addOnSplashAdded((splash) => {
                addNode(this.#createSplashNode(splash));
            });

            // handle objectives
            let objectiveParent = null;
            let visibleNodes = 0;
            const addObjective = (objective) => {
                const node = this.#createObjectiveNode(objective);
                if (objectiveParent === null) {
                    if (objective.isVisible()) {
                        visibleNodes++;
                    }
                    objectiveParent = this.#createObjectivesListNode();
                    objectiveParent.style.display = (visibleNodes > 0) ? null : 'none';
                    addNode(objectiveParent);
                }
                objectiveParent.append(node);
                objective.addOnVisibleChanged(visible => {
                    visibleNodes += (visible) ? 1 : -1;
                    objectiveParent.style.display = (visibleNodes > 0) ? null : 'none';
                });
            };
            for (const objective of overlay.getObjectives()) {
                addObjective(objective);
            }
            overlay.addOnObjectiveAdded((objective) => {
                addObjective(objective);
            });
        }

        /**
         *
         * @param splash {Splash}
         * @returns {HTMLElement}
         */
        #createSplashNode(splash) {
            let config = splash.getConfig();

            let splashAttributes = {
                class: 'sand-game-splash',
                style: {
                    display: splash.isVisible() ? null : 'none'
                }
            };
            Object.assign(splashAttributes.style, config.style);

            let contentAttributes = {
                class: 'sand-game-splash-content'
            };

            let footerAttributes = {
                class: 'sand-game-splash-footer'
            };

            let splashNode = DomBuilder.div(splashAttributes, [
                DomBuilder.div(contentAttributes, config.content),
                DomBuilder.div(footerAttributes, config.buttons.filter(button => button !== null).map(button => {
                    let buttonNode;
                    if (typeof button.action === 'string') {
                        buttonNode = DomBuilder.element('a', {
                            href: button.action,
                            class: button.class
                        }, button.title);
                    } else if (typeof button.action === 'function') {
                        buttonNode = DomBuilder.button(button.title, {
                            class: button.class,
                        }, () => button.action(splash));
                    } else {
                        throw 'Button action type not supported: ' + (typeof button.action);
                    }

                    if (button.focus) {
                        setTimeout(() => {
                            buttonNode.focus({
                                preventScroll: true
                            });
                        }, 0);
                    }
                    return buttonNode;
                }))
            ]);

            splash.addOnVisibleChanged((visible) => {
                 splashNode.style.display = visible ? null : 'none';
            });

            return splashNode;
        }

        #createObjectivesListNode() {
            return DomBuilder.div({ class: 'sand-game-objectives-list' }, null);
        }

        /**
         *
         * @param objective {Objective}
         * @returns {HTMLElement}
         */
        #createObjectiveNode(objective) {
            const iconNode = DomBuilder.span(null, { class: 'sand-game-objective-icon' });
            if (objective.isVisible()) {
                DomBuilder.setContent(iconNode, this.#createObjectiveIcon(objective));
            }

            const attributes = {
                style: {
                    display: objective.isVisible() ? null : 'none'
                }
            };
            const objectiveNode = DomBuilder.div(attributes, [
                iconNode,
                objective.getConfig().name
            ]);

            objective.addOnVisibleChanged((visible) => {
                objectiveNode.style.display = visible ? null : 'none';
                if (visible) {
                    DomBuilder.setContent(iconNode, this.#createObjectiveIcon(objective));
                }
            });

            objective.addOnActiveChanged((active) => {
                if (objective.isVisible()) {
                    DomBuilder.setContent(iconNode, this.#createObjectiveIcon(objective));
                }
            });

            objective.addOnCompleted(() => {
                if (objective.isVisible()) {
                    DomBuilder.setContent(iconNode, this.#createObjectiveIcon(objective));
                }
            });

            return objectiveNode;
        }

        #createObjectiveIcon(objective) {
            if (objective.isCompleted()) {
                return DomBuilder.create(_ASSET_ICON_SQUARE_CHECK);
            }
            if (objective.isActive()) {
                return DomBuilder.create(_ASSET_ICON_SQUARE);
            }
            return DomBuilder.create(_ASSET_ICON_SQUARE_DOTTED);
        }

        createNode(controller) {
            return this.#nodeOverlay;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     *
     * @author Patrik Harag
     * @version 2024-05-25
     */
    class ComponentViewCanvasInner extends Component {

        /** @type Controller */
        #controller;

        #nodeCanvas;

        /** @type ComponentViewCanvasOverlayMarker */
        #markerOverlayComponent;
        #nodeMarkerOverlay;

        /** @type ComponentViewCanvasOverlayCursor */
        #cursorOverlayComponent;
        #nodeCursorOverlay;

        /** @type ComponentViewCanvasOverlayScenario */
        #scenarioOverlayComponent;
        #nodeScenarioOverlay;

        /**
         * @param controller {Controller}
         */
        constructor(controller) {
            super();
            this.#controller = controller;

            const w = this.#controller.getCurrentWidthPoints();
            const h = this.#controller.getCurrentHeightPoints();
            const scale = this.#controller.getCurrentScale();
            this.#nodeCanvas = this.#createCanvas(w, h, scale);

            this.#markerOverlayComponent = new ComponentViewCanvasOverlayMarker(w, h, scale, controller);
            this.#nodeMarkerOverlay = this.#markerOverlayComponent.createNode();

            this.#cursorOverlayComponent = new ComponentViewCanvasOverlayCursor(w, h, scale, controller);
            this.#nodeCursorOverlay = this.#cursorOverlayComponent.createNode();

            this.#scenarioOverlayComponent = new ComponentViewCanvasOverlayScenario(w, h, scale, controller);
            this.#nodeScenarioOverlay = this.#scenarioOverlayComponent.createNode();
        }

        #createCanvas(w, h, scale) {
            const wPx = w / scale;
            const hPx = h / scale;
            const canvas = DomBuilder.element('canvas', {
                style: `position: relative; width: ${wPx}px; height: ${hPx}px;`,
                class: 'sand-game-canvas',
                width: w + 'px',
                height: h + 'px'
            });

            // rendering style
            canvas.style.imageRendering = this.#controller.getCanvasImageRenderingStyle();

            return canvas;
        }

        createNode(controller) {
            return DomBuilder.div({
                style: 'position: relative;',
                class: 'sand-game-canvas-component'
            }, [
                this.#nodeCanvas,
                this.#nodeMarkerOverlay,
                this.#nodeCursorOverlay,
                this.#nodeScenarioOverlay,
            ]);
        }

        /**
         *
         * @param sandGame {SandGame}
         */
        register(sandGame) {
            this.#markerOverlayComponent.register(sandGame.overlay());
            this.#scenarioOverlayComponent.register(sandGame.scenario());

            this.#initMouseHandling(sandGame);
        }

        #initMouseHandling(sandGame) {
            const domNode = this.#nodeCursorOverlay;
            const scale = this.#controller.getCurrentScale();

            const toolManager = this.#controller.getToolManager();

            let getActualMousePosition = (e) => {
                const rect = domNode.getBoundingClientRect();
                const x = Math.max(0, Math.trunc((e.clientX - rect.left) * scale));
                const y = Math.max(0, Math.trunc((e.clientY - rect.top) * scale));
                return [x, y];
            };

            let lastX, lastY;
            let lastTool = null;  // drawing is not active if null
            let drag = false;
            let ctrlPressed = false;
            let shiftPressed = false;

            let repeatingInterval = null;
            const startRepeatingIfEnabled = (x, y, altKey) => {
                if (lastTool.isRepeatingEnabled()) {
                    repeatingInterval = setInterval(() => {
                        lastTool.applyPoint(x, y, sandGame.graphics(), altKey);
                    }, 80);
                }
            };
            const cancelRepeatingIfNeeded = () => {
                if (repeatingInterval !== null) {
                    clearInterval(repeatingInterval);
                    repeatingInterval = null;
                }
            };

            // disable context menu
            this.#nodeCursorOverlay.addEventListener('contextmenu', e => {
                e.preventDefault();
                return false;
            });

            domNode.addEventListener('mousedown', (e) => {
                if (toolManager.isInputDisabled()) {
                    return;
                }

                const [x, y] = getActualMousePosition(e);
                lastX = x;
                lastY = y;
                lastTool = null;
                drag = false;
                ctrlPressed = false;
                shiftPressed = false;

                if (e.buttons === 1) {
                    // primary button
                    lastTool = toolManager.getPrimaryTool();
                    Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_PRIMARY);

                } else if (e.buttons === 2) {
                    // secondary button
                    let primaryTool = toolManager.getPrimaryTool();
                    if (primaryTool.isSecondaryActionEnabled()) {
                        // special secondary action

                        primaryTool.applySecondaryAction(x, y, sandGame.graphics(), e.altKey);

                        // hide cursors
                        this.#cursorOverlayComponent.hideCursors();

                        cancelRepeatingIfNeeded();

                        return;
                    } else {
                        lastTool = toolManager.getSecondaryTool();
                        Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_SECONDARY);
                    }
                } else if (e.buttons === 4) {
                    // middle button
                    e.preventDefault();

                    if (!e.altKey && !e.ctrlKey && !e.shiftKey) {
                        const tool = toolManager.getTertiaryTool();
                        tool.applyPoint(x, y, sandGame.graphics(), false);
                        Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_TERTIARY);
                        Analytics.triggerToolUsed(tool);
                    } else if (e.altKey && e.ctrlKey && e.shiftKey) {
                        console.log('' + x + 'x' + y + ': ' + sandGame.debugElementAt(x, y));
                    }
                    return;
                } else {
                    // mouse wheel, other combinations, etc.
                    return;
                }

                if (!e.ctrlKey && !e.shiftKey) {
                    lastTool.applyPoint(x, y, sandGame.graphics(), e.altKey);
                    Analytics.triggerToolUsed(lastTool);

                    // repeating when holding mouse down on a position
                    startRepeatingIfEnabled(x, y, e.altKey);

                    // show/recreate cursor
                    this.#cursorOverlayComponent.hideCursors();
                    const cursorDefinition = toolManager.getPrimaryTool().createCursor();
                    if (cursorDefinition !== null) {
                        this.#cursorOverlayComponent.showCursor(x, y, scale, cursorDefinition);
                    }

                } else if (e.ctrlKey && e.shiftKey) {
                    lastTool.applySpecial(x, y, sandGame.graphics(), e.altKey);
                    Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_FLOOD);
                    Analytics.triggerToolUsed(lastTool);
                    lastTool = null;
                } else {
                    if (e.ctrlKey && lastTool.isAreaModeEnabled()) {
                        ctrlPressed = e.ctrlKey;
                    }
                    if (e.shiftKey && lastTool.isLineModeEnabled()) {
                        shiftPressed = e.shiftKey;
                    }
                }
            });
            domNode.addEventListener('mousemove', (e) => {
                // cancel repeating
                cancelRepeatingIfNeeded();

                if (toolManager.isInputDisabled()) {
                    lastTool = null;
                    this.#cursorOverlayComponent.hideCursors();
                    return;
                }

                if (!ctrlPressed && !shiftPressed) {
                    // drawing while dragging...

                    // show / move cursor
                    if (this.#cursorOverlayComponent.hasCursor()) {
                        const [x, y] = getActualMousePosition(e);
                        this.#cursorOverlayComponent.moveCursor(x, y, scale);
                    } else {
                        const cursorDefinition = toolManager.getPrimaryTool().createCursor();
                        if (cursorDefinition !== null) {
                            const [x, y] = getActualMousePosition(e);
                            this.#cursorOverlayComponent.showCursor(x, y, scale, cursorDefinition);
                        }
                    }

                    if (lastTool === null) {
                        return;
                    }

                    const [x, y] = getActualMousePosition(e);

                    // drag action
                    if (!drag) {
                        lastTool.onDragStart(lastX, lastY, sandGame.graphics(), e.altKey);
                        drag = true;
                    }

                    // stroke action
                    lastTool.applyStroke(lastX, lastY, x, y, sandGame.graphics(), e.altKey);
                    Analytics.triggerToolUsed(lastTool);

                    // repeating when holding mouse down on a position
                    startRepeatingIfEnabled(x, y, e.altKey);

                    lastX = x;
                    lastY = y;

                    return;
                }

                if (lastTool === null) {
                    return;
                }
                if (ctrlPressed && shiftPressed) {
                    return;
                }
                if (ctrlPressed) {
                    const [x, y] = getActualMousePosition(e);
                    this.#cursorOverlayComponent.repaintRectangleSelection(lastX, lastY, x, y, scale);
                    return;
                }
                if (shiftPressed) {
                    const [x, y] = getActualMousePosition(e);
                    this.#cursorOverlayComponent.repaintLineSelection(lastX, lastY, x, y, scale);
                    return;
                }
            });
            domNode.addEventListener('mouseup', (e) => {
                // cancel repeating
                cancelRepeatingIfNeeded();

                if (toolManager.isInputDisabled()) {
                    return;
                }

                if (lastTool !== null) {
                    // click, dragging, rectangle or line
                    if (drag) {
                        lastTool.onDragEnd(lastX, lastY, sandGame.graphics(), e.altKey);
                        drag = false;
                        if (!lastTool.hasCursor()) {
                            this.#cursorOverlayComponent.hideCursors();
                        }

                    } else if (ctrlPressed) {
                        // rectangle
                        const [x, y] = getActualMousePosition(e);
                        let minX = Math.min(lastX, x);
                        let minY = Math.min(lastY, y);
                        let maxX = Math.max(lastX, x);
                        let maxY = Math.max(lastY, y);
                        lastTool.applyArea(minX, minY, maxX, maxY, sandGame.graphics(), e.altKey);
                        this.#cursorOverlayComponent.hideCursors();

                        Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_RECT);
                        Analytics.triggerToolUsed(lastTool);

                    } else if (shiftPressed) {
                        // line
                        const [x, y] = getActualMousePosition(e);
                        lastTool.applyStroke(lastX, lastY, x, y, sandGame.graphics(), e.altKey);
                        this.#cursorOverlayComponent.hideCursors();

                        Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_LINE);
                        Analytics.triggerToolUsed(lastTool);
                    }
                    lastTool = null;
                    ctrlPressed = false;
                    shiftPressed = false;
                }
            });
            domNode.addEventListener('mouseout', (e) => {
                // disable drag
                // lastTool = null;

                // cancel repeating
                cancelRepeatingIfNeeded();

                // hide cursors
                this.#cursorOverlayComponent.hideCursors();
            });
            domNode.addEventListener('mouseenter', (e) => {
                if (lastTool !== null && e.buttons === 0) {
                    // mouse released outside...
                    lastTool = null;
                    this.#cursorOverlayComponent.hideCursors();
                    e.preventDefault();
                }
            });

            // touch support

            let getActualTouchPosition = (e) => {
                let touch = e.touches[0];
                return getActualMousePosition(touch);
            };
            domNode.addEventListener('touchstart', (e) => {
                if (toolManager.isInputDisabled()) {
                    return;
                }

                const [x, y] = getActualTouchPosition(e);
                lastX = x;
                lastY = y;
                lastTool = toolManager.getPrimaryTool();
                lastTool.applyPoint(x, y, sandGame.graphics(), false);
                Analytics.triggerFeatureUsed(Analytics.FEATURE_DRAW_PRIMARY);
                Analytics.triggerToolUsed(lastTool);

                e.preventDefault();
            });
            domNode.addEventListener('touchmove', (e) => {
                if (toolManager.isInputDisabled()) {
                    lastTool = null;
                    return;
                }

                if (lastTool === null) {
                    return;
                }
                const [x, y] = getActualTouchPosition(e);
                lastTool.applyStroke(lastX, lastY, x, y, sandGame.graphics(), false);
                Analytics.triggerToolUsed(lastTool);
                lastX = x;
                lastY = y;

                e.preventDefault();
            });
            domNode.addEventListener('touchend', (e) => {
                lastTool = null;

                e.preventDefault();
            });
        }

        getCanvasNode() {
            return this.#nodeCanvas;
        }

        setImageRenderingStyle(style) {
            this.#nodeCanvas.style.imageRendering = style;
        }

        onInputDisabledChanged(disabled) {
            this.#nodeCursorOverlay.style.cursor = disabled ? 'not-allowed' : null;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-15
     */
    class ComponentViewCanvas extends Component {

        /** @type {HTMLElement} */
        #canvasHolderNode = DomBuilder.div({ class: 'sand-game-canvas-holder' });
        /** @type {ComponentViewCanvasInner} */
        #currentCanvas = null;

        createNode(controller) {
            controller.registerCanvasProvider({
                initialize: () => {
                    this.#canvasHolderNode.innerHTML = '';

                    this.#currentCanvas = new ComponentViewCanvasInner(controller);
                    this.#canvasHolderNode.append(this.#currentCanvas.createNode(controller));
                    return this.#currentCanvas.getCanvasNode();
                },
                getCanvasNode: () => {
                    if (this.#currentCanvas !== null) {
                        return this.#currentCanvas.getCanvasNode();
                    }
                    return null;
                }
            });

            controller.addOnImageRenderingStyleChanged((imageRenderingStyle) => {
                if (this.#currentCanvas !== null) {
                    this.#currentCanvas.setImageRenderingStyle(imageRenderingStyle);
                }
            });

            controller.addOnInitialized((sandGame) => {
                if (this.#currentCanvas === null) {
                    throw 'Illegal state: canvas is not initialized';
                }

                // register mouse handling and overlays
                this.#currentCanvas.register(sandGame);
            });

            controller.addOnBeforeClosed(() => {
                this.#currentCanvas = null;
                this.#canvasHolderNode.innerHTML = '';
            });

            controller.getToolManager().addOnInputDisabledChanged(disabled => {
                if (this.#currentCanvas !== null) {
                    this.#currentCanvas.onInputDisabledChanged(disabled);
                }
            });

            return this.#canvasHolderNode;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-08-19
     */
    class ActionDialogChangeCanvasSize extends Action {

        performAction(controller) {
            let formBuilder = DomBuilder.bootstrapSimpleFormBuilder();
            formBuilder.addInput('Width', 'width', '' + controller.getCurrentWidthPoints());
            formBuilder.addInput('Height', 'height', '' + controller.getCurrentHeightPoints());
            formBuilder.addInput('Scale', 'scale', '' + controller.getCurrentScale());

            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Change canvas size manually');
            dialog.setBodyContent(formBuilder.createNode());
            dialog.addSubmitButton('Submit', () => {
                let data = formBuilder.getData();
                let w = Number.parseInt(data['width']);
                let h = Number.parseInt(data['height']);
                let s = Number.parseFloat(data['scale']);
                controller.changeCanvasSize(w, h, s);
                Analytics.triggerFeatureUsed(Analytics.FEATURE_CANVAS_SIZE_CHANGE);
            });
            dialog.addCloseButton('Close');
            dialog.show(controller.getDialogAnchor());
        }
    }

    var img$3 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAYAAADSm7GJAAAACXBIWXMAAA7DAAAOwwHHb6hkAAACHUlEQVR4Xu3WQW6EMBBEUSJx3jkMF55s4ogQG2zTxeDi/10ijdxTb5HME1k3b39BXgFsHsDmAWwewOYBbB7A5gFsHsDmAWwewOYBbB7A5gFsHsDmAWwewOYBbB7A5gFsHsCrlmV5r39+vV5f659HDOCftrjpd6MjAzzlcVOjIz8eeA83NTLyo4FrcFOjIj8WuAU3NSLyI4F7cFOjIT8O+AxuaiTkRwFH4KZGQX4McCRuagTkjwGvB1ePpMBN3R35I8DbwZUjbd9SpLz/bJcDlwZXjFR6S5Hi/oguBT4aPHKko7cURd4f1WXAtYNHjFT7lqKI+yO7BLh18DMjtb6l6Mz90cmBewfvGan3LUU99yuSAp8dvGWks28parlflQw4avCakaLeUlRzvzIJcPTgeyNFv6Vo73514cCqwXMjqd5SlLu/1Pp71X6mVCiwevD1SOq3FNUgb79XzWf2CgPeHqbqqndU7YGVvtveZ44KAS4dRvlyYEcb5j5T02ngo8MoX8+fmx7kU8C1h1G+nv1akbuBe46jmFqQu4DB/Xy1yM3A4N6nGuQmYHDv1xFyNTC4920PuQoY3PtXQj4EBneccsi7wOCO1xa5CAzuuK2Rs8Dgjl9C/gcMrk/Lsrz/AIPr1y8wuJ7N0wSuczO43v37J4u8Atg8gM0D2DyAzQPYPIDNA9g8gM0D2DyAzQPYPIDNA9g8gM0D2DyAzQPYvG9K/XJS29iPWwAAAABJRU5ErkJggg==";

    var img$2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAYAAADSm7GJAAAACXBIWXMAAA7DAAAOwwHHb6hkAAABSElEQVR4Xu3WQQ6EIBAFUUw8L4fxwjN78xedQBDLeksiYbAysc8mtPO+IBYDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwK2167p+97Wk937c13ZnYDgDwxkYzsBwnwtcHaiStHf3wetzgb/GwHAGhjMw3JLAaThJZg8s1XNHpDNm32PEksB6joHhDAxnYLjpgdPQUZX2VgeWtPcp6bdU7zHb9MDai4HhDAxnYLihwGmYmG3FGSuke6TBq/pc1VBg7c/AcAaGMzBcOXD6+GtM9Z2m56qDVzmw3snAcAaGMzBcDJw+6tpLapQGrxhYHAaGMzCcgeHO9LHWO6WW/oPhDAxnYDgDwxkYzsBwBoYzMJyB4QwMZ2A4A8MZGM7AcAaGMzCcgeEMDGdgOAPDGRjOwHAGhjMw3B/1T0cI5HMokgAAAABJRU5ErkJggg==";

    var img$1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAYAAADSm7GJAAAACXBIWXMAAA7DAAAOwwHHb6hkAAABGklEQVR4Xu3YMU7EMBQAUZBy3hwmF4Y+BforGcNO3itdOFZGLvyPD9KO+wItAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxAscJHCdwnMBxjw58XdfXfe3uPM/P+9o7eXTgJxA4TuA4geMEjhM4TuA4geO2Bt45WJh8a2Kyz6oz/4atgdlP4DiB4wSOEzhO4DiB4wSOWxZ4MhCYWLXPTpMz/9UwZFlg/ieB4wSOEzhO4DiB4wSOEzhuFHjykOdnq/7hqwOTUWDel8BxAscJHCdwnMBxAscJHHeseoCzx6u93OA4geMEjhM4TuA4geMEjhM4TuA4geMEjhM4TuA4geMEjhM4TuA4geMEjhM4TuA4geMEjhM4TuC4b6YQJX8pLssnAAAAAElFTkSuQmCC";

    var img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABQCAYAAADSm7GJAAAACXBIWXMAAA7DAAAOwwHHb6hkAAAA+ElEQVR4Xu3ZsQ3DMAwAwRjwvBpGCye9KgMq7LzvSnbiQxXPD2nnOqBF4DiB4wSOEzhO4DiB4wSOEzhO4DiB4wSOEzhO4LjXBZ5zftfZVWOMY5093esCv43AcQLHCRwncJzAcQLHCRwncJzAcQLHCRwncJzAcVuBd05v/2jnvXedGrcC83wCxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECx507JzCuu2vPfnCcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHECxwkcJ3CcwHE/D68RYAgtpF0AAAAASUVORK5CYII=";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-12-22
     */
    class ComponentViewElementSizeSelection extends Component {

        static CLASS_SELECTED = 'selected-size';

        static SIZES = [
            { scale: 0.75,  image: img$3, description: 'Very small elements' },
            { scale: 0.5,   image: img$2, description: 'Small elements' },
            { scale: 0.375, image: img$1, description: 'Medium elements' },
            { scale: 0.25,  image: img, description: 'Big elements' },
        ];


        #nodes = [];

        #selected = null;
        #selectedScale = null;

        createNode(controller) {
            for (let sizeDef of ComponentViewElementSizeSelection.SIZES) {
                let node = this.#createSizeCard(sizeDef.scale, sizeDef.image, sizeDef.description);

                // initial scale
                if (sizeDef.scale === controller.getCurrentScale()) {
                    this.#mark(node, sizeDef.scale);
                }

                node.addEventListener('click', e => {
                    this.#select(node, sizeDef.scale, controller);
                });

                this.#nodes.push(node);
            }

            return DomBuilder.div(null, [
                DomBuilder.par(null, "Increasing the size of the elements will result in the top and right" +
                    " parts of the canvas being clipped."),
                DomBuilder.par(null, "Reducing the size of the elements will result in an expansion of" +
                    " the canvas in the upper and right parts."),
                DomBuilder.par(null, "Only the scale of the current scene and the initial setting for new" +
                    " scenes will be changed. Scene can be regenerated by clicking on the scene card."),

                DomBuilder.div({ class: 'element-size-options' }, this.#nodes)
            ]);
        }

        #select(node, newScale, controller) {
            if (this.#selectedScale === newScale) {
                return;  // already selected
            }

            // mark selected
            if (this.#selected) {
                this.#selected.classList.remove(ComponentViewElementSizeSelection.CLASS_SELECTED);
            }
            this.#mark(node, newScale);

            // change scale
            let w = Math.trunc(controller.getCurrentWidthPoints() / controller.getCurrentScale() * newScale);
            let h = Math.trunc(controller.getCurrentHeightPoints() / controller.getCurrentScale() * newScale);
            controller.changeCanvasSize(w, h, newScale);

            Analytics.triggerFeatureUsed(Analytics.FEATURE_SWITCH_SCALE);
        }

        #mark(node, scale) {
            node.classList.add(ComponentViewElementSizeSelection.CLASS_SELECTED);
            this.#selected = node;
            this.#selectedScale = scale;
        }

        /**
         *
         * @param scale {number}
         * @param image {string}
         * @param description {string}
         */
        #createSizeCard(scale, image, description) {
            return DomBuilder.div({ class: 'card' }, [
                DomBuilder.element('img', { src: image, alt: description })
            ]);
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-08-19
     */
    class ActionDialogChangeElementSize extends Action {

        performAction(controller) {
            let elementSizeComponent = new ComponentViewElementSizeSelection();

            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Adjust Scale');
            dialog.setBodyContent(DomBuilder.div({ class: 'sand-game-component' }, [
                elementSizeComponent.createNode(controller)
            ]));
            dialog.addSubmitButton("Set size manually", () => {
                new ActionDialogChangeCanvasSize().performAction(controller);
            });
            dialog.addCloseButton('Close');
            dialog.show(controller.getDialogAnchor());
        }
    }

    var _ASSET_SVG_ADJUST_SCALE = "<!-- @author Patrik Harag -->\r\n<svg width=\"64\" height=\"64\" viewBox=\"0 0 64 64\" xmlns=\"http://www.w3.org/2000/svg\">\r\n <g>\r\n  <rect stroke=\"#505050\" stroke-width=\"4\" id=\"svg_1\" height=\"24\" width=\"24\" y=\"35.5\" x=\"4.5\" fill=\"none\"/>\r\n  <rect stroke=\"#505050\" stroke-width=\"2\" stroke-dasharray=\"3,5\" id=\"svg_2\" height=\"54\" width=\"54\" y=\"4.5\" x=\"4.5\" fill=\"none\"/>\r\n  <line stroke=\"#505050\" id=\"svg_3\" y2=\"10.65089\" x2=\"51.9999\" y1=\"27.9524\" x1=\"34.38094\" stroke-width=\"4\" fill=\"none\"/>\r\n  <line stroke=\"#505050\" id=\"svg_4\" y2=\"11.28581\" x2=\"50.73007\" y1=\"13.98421\" x1=\"37.87298\" stroke-width=\"4\" fill=\"none\"/>\r\n  <line stroke=\"#505050\" id=\"svg_5\" y2=\"11.762\" x2=\"51.36499\" y1=\"23.82543\" x1=\"48.82531\" stroke-width=\"4\" fill=\"none\"/>\r\n </g>\r\n</svg>";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-08-19
     */
    class ComponentButtonAdjustScale extends Component {

        createNode(controller) {
            return DomBuilder.button(DomBuilder.create(_ASSET_SVG_ADJUST_SCALE), {
                class: 'btn btn-outline-secondary adjust-scale',
                'aria-label': 'Adjust scale'
            }, () => {
                new ActionDialogChangeElementSize().performAction(controller);
            });
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    // TODO: support external restart

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-08
     */
    class ComponentViewSceneSelection extends Component {

        static CLASS_SELECTED = 'selected-scene';
        static CLASS_VISITED = 'visited-scene';


        /** @type Controller */
        #controller;

        #ignoreOnBeforeNewSceneLoaded = false;

        #scenes;
        #initialSceneId;

        #selected = null;
        #selectedSceneId = null;

        #closedScenes = new Map();

        /**
         * @param controller {Controller}
         * @param scenes {Object<string,Scene>}}
         * @param initialSceneId
         */
        constructor(controller, scenes, initialSceneId) {
            super();
            this.#controller = controller;
            this.#scenes = scenes;
            this.#initialSceneId = initialSceneId;

            this.#controller.addOnBeforeNewSceneLoaded(() => {
                if (!this.#ignoreOnBeforeNewSceneLoaded) {
                    this.#store();
                    this.#unselect();
                }
            });
        }

        createNode(controller) {
            let content = DomBuilder.div({ class: 'scenes' }, []);

            for (const [id, scene] of Object.entries(this.#scenes)) {
                let label = DomBuilder.element('span', { class: 'scene-title' }, scene.name);
                let node = DomBuilder.button(label, { class: 'btn btn-outline-secondary scene' }, () => {
                    this.#onSelect(id, node, scene);
                });

                // mark initial scene
                if (id === this.#initialSceneId) {
                    this.#selected = node;
                    this.#selectedSceneId = id;
                    node.classList.add(ComponentViewSceneSelection.CLASS_SELECTED);
                    node.classList.add(ComponentViewSceneSelection.CLASS_VISITED);
                }

                content.append(node);
            }

            return content;
        }

        #onSelect(id, node, scene) {
            if (this.#selected) {
                if (this.#selectedSceneId === id) {
                    // already opened - rebuild scene
                    this.#rebuildConfirm(() => {
                        this.#select(node, id, scene);
                        Analytics.triggerFeatureUsed(Analytics.FEATURE_RESTART_SCENE);
                    });
                } else {
                    // store snapshot of the old scene and open...
                    this.#store();
                    this.#select(node, id, scene);
                    Analytics.triggerFeatureUsed(Analytics.FEATURE_SWITCH_SCENE);
                }
            } else {
                // open
                this.#select(node, id, scene);
                Analytics.triggerFeatureUsed(Analytics.FEATURE_SWITCH_SCENE);
            }
        }

        #rebuildConfirm(onConfirm) {
            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Restart scene');
            dialog.setBodyContent([
                DomBuilder.par(null, "Do you want to restart the scene?")
            ]);
            dialog.addSubmitButton('Confirm', onConfirm);
            dialog.addCloseButton('Close');
            dialog.show(this.#controller.getDialogAnchor());
        }

        #select(node, id, scene) {
            this.#unselect();

            this.#selected = node;
            this.#selectedSceneId = id;
            node.classList.add(ComponentViewSceneSelection.CLASS_SELECTED);
            node.classList.add(ComponentViewSceneSelection.CLASS_VISITED);

            // restore or build scene
            let snapshot = this.#closedScenes.get(id);
            if (snapshot) {
                this.#closedScenes.delete(id);

                this.#ignoreOnBeforeNewSceneLoaded = true;
                this.#controller.setInitialScene(scene);
                this.#controller.openScene(new SceneImplSnapshot(snapshot));
                this.#ignoreOnBeforeNewSceneLoaded = false;
            } else {
                this.#ignoreOnBeforeNewSceneLoaded = true;
                this.#controller.setInitialScene(scene);
                this.#controller.openScene(scene);
                this.#ignoreOnBeforeNewSceneLoaded = false;
            }
        }

        #unselect() {
            if (this.#selected) {
                this.#selected.classList.remove(ComponentViewSceneSelection.CLASS_SELECTED);
            }
            this.#selected = null;
            this.#selectedSceneId = null;
        }

        #store() {
            if (this.#selected) {
                this.#closedScenes.set(this.#selectedSceneId, this.#controller.createSnapshot());
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-04
     */
    class ComponentContainer extends Component {

        #cssClass;
        #components;

        /**
         *
         * @param cssClass {string|null}
         * @param components {Component[]}
         */
        constructor(cssClass, components) {
            super();
            this.#cssClass = cssClass;
            this.#components = components;
        }

        createNode(controller) {
            const content = DomBuilder.div({ class: this.#cssClass }, []);
            for (let component of this.#components) {
                if (component !== null) {
                    content.append(component.createNode(controller));
                }
            }
            return content;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-04
     */
    class ComponentSimple extends Component {

        #node;

        /**
         *
         * @param node {HTMLElement}
         */
        constructor(node) {
            super();
            this.#node = node;
        }

        createNode(controller) {
            return this.#node;
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

    var _ASSET_SVG_PAUSE = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-pause-fill\" viewBox=\"0 0 16 16\">\r\n    <path d=\"M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z\"/>\r\n</svg>";

    var _ASSET_SVG_PLAY = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-play-fill\" viewBox=\"0 0 16 16\">\r\n    <path d=\"m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z\"/>\r\n</svg>";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-10
     */
    class ComponentButtonStartStop extends ComponentButton {

        constructor(cssClass) {
            super('', cssClass, Action.create(controller => {
                controller.switchStartStop();
                Analytics.triggerFeatureUsed(Analytics.FEATURE_PAUSE);
            }));
        }

        createNode(controller) {
            const btn = super.createNode(controller);
            DomBuilder.setContent(btn, [DomBuilder.create(_ASSET_SVG_PLAY), 'Start']);

            controller.addOnStarted(() => {
                DomBuilder.setContent(btn, [DomBuilder.create(_ASSET_SVG_PAUSE), 'Pause']);
            });
            controller.addOnStopped(() => {
                DomBuilder.setContent(btn, [DomBuilder.create(_ASSET_SVG_PLAY), 'Start']);
            });

            return btn;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-23
     */
    class ComponentStatusIndicator extends Component {

        #additionalInfo;

        constructor(additionalInfo = null) {
            super();
            this.#additionalInfo = additionalInfo;
        }

        createNode(controller) {
            let currenStatus = '';

            const nodeStatusLabel = DomBuilder.span('');
            const nodeLabel = [
                DomBuilder.span('Performance: ', { class: 'visible-on-big-screen-only' }),
                nodeStatusLabel
            ];

            const node = DomBuilder.div({ class: 'btn-group' }, [
                DomBuilder.element('button', {
                    type: 'button',
                    class: 'btn btn-link dropdown-toggle',
                    'data-bs-toggle': 'dropdown',
                    'aria-expanded': 'false'
                }, nodeLabel),
                DomBuilder.element('form', { class: 'dropdown-menu p-2' }, this.#createStatusContent(controller))
            ]);
            node.addEventListener('show.bs.dropdown', function () {
                Analytics.triggerFeatureUsed(Analytics.FEATURE_STATUS_DISPLAYED);
            });

            let updateStatus = (node, status) => {
                if (status !== currenStatus) {
                    nodeStatusLabel.textContent = (status.toUpperCase());
                    nodeStatusLabel.classList.remove('status-' + currenStatus);
                    nodeStatusLabel.classList.add('status-' + status);
                    currenStatus = status;
                }
            };

            controller.addOnStopped(() => updateStatus(node, 'stopped'));
            controller.addOnStarted(() => updateStatus(node, 'started'));
            controller.addOnInitialized(sandGame => {
                sandGame.addOnRendered(() => {
                    const ips = controller.getSandGame().getIterationsPerSecond();
                    if (ips === 0) {
                        updateStatus(node, 'stopped');
                        return;
                    }
                    if (ips > 105) {
                        updateStatus(node, 'best');
                        return;
                    }
                    if (ips > 80) {
                        updateStatus(node, 'good');
                        return;
                    }
                    if (ips > 50) {
                        updateStatus(node, 'medium');
                        return;
                    }
                    if (ips > 40) {
                        updateStatus(node, 'low');
                        return;
                    }
                    updateStatus(node, 'poor');
                });
            });

            return node;
        }

        #createStatusContent(controller) {
            const labelCPS = DomBuilder.span();
            const labelFPS = DomBuilder.span();
            controller.addOnInitialized(sandGame => {
                sandGame.addOnRendered(() => {
                    const fps = controller.getSandGame().getFramesPerSecond();
                    const ips = controller.getSandGame().getIterationsPerSecond();
                    labelFPS.textContent = ' = ' + fps;
                    labelCPS.textContent = ' = ' + ips;
                });
            });

            const labelCanvasSize = DomBuilder.span();
            const updateCanvasSize = () => {
                const w = controller.getCurrentWidthPoints();
                const h = controller.getCurrentHeightPoints();
                labelCanvasSize.textContent = ` = ${w.toLocaleString()}\u00D7${h.toLocaleString()} = ${(w * h).toLocaleString()}`;
            };
            controller.addOnInitialized(() => {
                updateCanvasSize();
            });
            updateCanvasSize();

            return [
                DomBuilder.span('Sand Game JS ' + controller.getVersion(), { style: 'font-weight: bold;' }),
                DomBuilder.element('br'),

                DomBuilder.span('Simulated elements'),
                labelCanvasSize,
                DomBuilder.element('br'),

                DomBuilder.span('Simulation iterations /s'),
                labelCPS,
                DomBuilder.span(' (target: ' + Processor.OPT_CYCLES_PER_SECOND + ')', { style: 'color: lightgray;' }),
                DomBuilder.element('br'),

                DomBuilder.span('Rendered frames /s'),
                labelFPS,
                DomBuilder.span(' (target: ' + Processor.OPT_FRAMES_PER_SECOND + ')', { style: 'color: lightgray;' }),
                DomBuilder.element('br'),

                this.#additionalInfo
            ];
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-17
     */
    class ActionRestart extends Action {

        performAction(controller) {
            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Restart');
            dialog.setBodyContent([
                DomBuilder.par(null, "Are you sure?")
            ]);
            dialog.addSubmitButton('Restart', () => {
                const scene = controller.getInitialScene();
                controller.openScene(scene);
                Analytics.triggerFeatureUsed(Analytics.FEATURE_RESTART_SCENE);
            });
            dialog.addCloseButton('Close');
            dialog.show(controller.getDialogAnchor());
        }
    }

    var _ASSET_SVG_RESTART = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" fill=\"currentColor\" class=\"bi bi-arrow-clockwise\" viewBox=\"0 0 16 16\">\r\n    <path fill-rule=\"evenodd\" d=\"M8 3.5a4.5 4.5 0 104.546 2.914.5.5 0 011.454-.414A6 6 0 118 2z\"/>\r\n    <path d=\"M8 6V0l5 3L8 6\"/>\r\n</svg>";

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-01-17
     */
    class ComponentButtonRestart extends ComponentButton {

        constructor(cssClass) {
            super('', cssClass, new ActionRestart());
        }

        createNode(controller) {
            const btn = super.createNode(controller);
            DomBuilder.setContent(btn, [DomBuilder.create(_ASSET_SVG_RESTART), 'Restart']);
            return btn;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-08-19
     */
    class ActionIOImport extends Action {

        performAction(controller) {
            let input = document.createElement('input');
            input.type = 'file';
            input.onchange = e => {
                controller.getIOManager().loadFromFiles(e.target.files);
            };
            input.click();
        }
    }

    var FileSaver_minExports = {};
    var FileSaver_min = {
      get exports(){ return FileSaver_minExports; },
      set exports(v){ FileSaver_minExports = v; },
    };

    (function (module, exports) {
    	(function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c);},d.onerror=function(){console.error("could not download file");},d.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null;},k.readAsDataURL(b);}else {var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m);},4E4);}});f.saveAs=g.saveAs=g,(module.exports=g);});

    	
    } (FileSaver_min));

    var FileSaver = FileSaver_minExports;

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2023-08-19
     */
    class ActionIOExport extends Action {

        performAction(controller) {
            const snapshot = controller.createSnapshot();
            const bytes = Resources.createResourceFromSnapshot(snapshot);
            FileSaver.saveAs(new Blob([bytes]), this.#createFilename());
            Analytics.triggerFeatureUsed(Analytics.FEATURE_IO_EXPORT);
        }

        #createFilename() {
            let date = new Date().toISOString().slice(0, 10);
            return `sand-game-js_${date}.sgjs`;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-02-04
     */
    class ActionReportProblem extends Action {

        /** @type function(type:string,message:string,controller:Controller) */
        #handler;

        constructor(handler) {
            super();
            this.#handler = handler;
        }

        performAction(controller) {
            let formBuilder = DomBuilder.bootstrapSimpleFormBuilder();
            formBuilder.addTextArea('Message', 'message');

            let dialog = DomBuilder.bootstrapDialogBuilder();
            dialog.setHeaderContent('Report a problem');
            dialog.setBodyContent(formBuilder.createNode());
            dialog.addSubmitButton('Submit', () => {
                let data = formBuilder.getData();
                let message = data['message'];
                if (message.trim() !== '') {
                    this.#handler("user", message, controller);
                }
            });
            dialog.addCloseButton('Close');
            dialog.show(controller.getDialogAnchor());
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-03-23
     */
    class ComponentButtonReport extends ComponentButton {

        constructor(cssClass, errorReporter) {
            const label = [
                'Report',
                DomBuilder.span(' a\xa0problem', { class: 'visible-on-big-screen-only' })
            ];
            super(label, cssClass, new ActionReportProblem(errorReporter));
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     * @interface
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class Extension {

        run() {
            throw 'Not implemented'
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class ExtensionSpawnGrass extends Extension {

        /** @type ElementArea */
        #elementArea;
        /** @type DeterministicRandom */
        #random;
        /** @type ProcessorContext */
        #processorContext;

        /**
         *
         * @param gameState {GameState}
         */
        constructor(gameState) {
            super();
            this.#elementArea = gameState.elementArea;
            this.#random = gameState.random;
            this.#processorContext = gameState.processorContext;
        }

        run() {
            if (this.#processorContext.getIteration() % 3 === 0) {

                const x = this.#random.nextInt(this.#elementArea.getWidth());
                const y = this.#random.nextInt(this.#elementArea.getHeight() - 3) + 2;

                if (ProcessorModuleGrass.canGrowUpHere(this.#elementArea, x, y)) {
                    const brush = this.#processorContext.getDefaults().getBrushGrass();
                    this.#elementArea.setElement(x, y, brush.apply(x, y, this.#random));
                    this.#processorContext.trigger(x, y);
                }
            }
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-26
     */
    class ExtensionSpawnFish extends Extension {

        /** @type ElementArea */
        #elementArea;
        /** @type DeterministicRandom */
        #random;
        /** @type ProcessorContext */
        #processorContext;
        /** @type EntityManager */
        #entityManager;

        /**
         *
         * @param gameState {GameState}
         */
        constructor(gameState) {
            super();
            this.#elementArea = gameState.elementArea;
            this.#random = gameState.random;
            this.#processorContext = gameState.processorContext;
            this.#entityManager = gameState.entityManager;
        }

        run() {
            if ((this.#processorContext.getIteration() + 200) % 1000 === 0) {
                const fishCount = this.#entityManager.countEntities('fish');

                if (fishCount >= 8) {
                    return;
                }

                const x = this.#random.nextInt(this.#elementArea.getWidth() - 20) + 10;
                const y = this.#findSpawnY(this.#elementArea, x);
                if (y !== null) {
                    this.#entityManager.addSerializedEntity(Entities.fish(x, y));
                    this.#processorContext.trigger(x, y);
                }
            }
        }

        #findSpawnY(elementArea, x) {
            let waterCount = 0;

            for (let y = 0; y < elementArea.getHeight(); y++) {
                const elementHead = elementArea.getElementHead(x, y);
                const typeClass = ElementHead.getTypeClass(elementHead);
                if (typeClass === ElementHead.TYPE_AIR) {
                    waterCount = 0;
                } else if (typeClass === ElementHead.TYPE_FLUID) {
                    if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_LIQUID
                            && ElementHead.getSpecial(elementHead) === ElementHead.SPECIAL_LIQUID_WATER) {
                        waterCount++;
                    }
                } else if (typeClass === ElementHead.TYPE_POWDER || typeClass === ElementHead.TYPE_POWDER_WET) {
                    if (waterCount > 7 && this.#isSpaceAround(x, y - 1)) {
                        return y - 1;
                    }
                    break;
                }
            }

            return null;
        }

        #isSpaceAround(x, y) {
            for (let dy = 0; dy < 6; dy++) {
                for (let dx = -(dy + 1); dx < dy + 1; dx++) {
                    const ex = x + dx;
                    const ey = y - dy;
                    const elementHead = this.#elementArea.getElementHeadOrNull(ex, ey);
                    if (elementHead === null) {
                        return false;
                    }
                    if (ElementHead.getTypeClass(elementHead) !== ElementHead.TYPE_FLUID) {
                        return false;
                    }
                    if (ElementHead.getTemperature(elementHead) > 0) {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-04-27
     */
    class ExtensionSpawnTrees extends Extension {

        /** @type ElementArea */
        #elementArea;
        /** @type DeterministicRandom */
        #random;
        /** @type ProcessorContext */
        #processorContext;

        /**
         *
         * @param gameState {GameState}
         */
        constructor(gameState) {
            super();
            this.#elementArea = gameState.elementArea;
            this.#random = gameState.random;
            this.#processorContext = gameState.processorContext;
        }

        run() {
            const iteration = this.#processorContext.getIteration();
            if (iteration > 1000 && iteration % 4 === 0) {

                const x = this.#random.nextInt(this.#elementArea.getWidth() - 12) + 6;
                const y = this.#random.nextInt(this.#elementArea.getHeight() - 16) + 15;

                if (ExtensionSpawnTrees.couldGrowUpHere(this.#elementArea, x, y)) {
                    const brush = this.#processorContext.getDefaults().getBrushTree();
                    this.#elementArea.setElement(x, y, brush.apply(x, y, this.#random));
                    this.#processorContext.trigger(x, y);
                }
            }
        }

        static couldGrowUpHere(elementArea, x, y) {
            if (x < 0 || y < 12) {
                return false;
            }
            if (x > elementArea.getWidth() - 5 || y > elementArea.getHeight() - 2) {
                return false;
            }
            let e1 = elementArea.getElementHead(x, y);
            if (ElementHead.getBehaviour(e1) !== ElementHead.BEHAVIOUR_GRASS) {
                return false;
            }
            if (ElementHead.getTemperature(e1) > 0) {
                return false;
            }
            let e2 = elementArea.getElementHead(x, y + 1);
            if (ElementHead.getBehaviour(e2) !== ElementHead.BEHAVIOUR_SOIL) {
                return false;
            }
            if (ElementHead.getTemperature(e2) > 0) {
                return false;
            }

            // check space directly above
            for (let dy = 1; dy < 18; dy++) {
                if (!ExtensionSpawnTrees.#isSpaceHere(elementArea, x, y - dy)) {
                    return false;
                }
            }

            // check trees around
            for (let dx = -15; dx < 15; dx++) {
                if (ExtensionSpawnTrees.#isOtherThreeThere(elementArea, x + dx, y - 4)) {
                    return false;
                }
            }

            // check space above - left & right
            for (let dy = 10; dy < 15; dy++) {
                if (!ExtensionSpawnTrees.#isSpaceHere(elementArea, x - 8, y - dy)) {
                    return false;
                }
                if (!ExtensionSpawnTrees.#isSpaceHere(elementArea, x + 8, y - dy)) {
                    return false;
                }
            }

            return true;
        }

        static #isSpaceHere(elementArea, tx, ty) {
            let targetElementHead = elementArea.getElementHead(tx, ty);
            if (ElementHead.getTypeClass(targetElementHead) === ElementHead.TYPE_AIR) {
                return true;
            }
            if (ElementHead.getBehaviour(targetElementHead) === ElementHead.BEHAVIOUR_GRASS) {
                return true;
            }
            return false;
        }

        static #isOtherThreeThere(elementArea, tx, ty) {
            let targetElementHead = elementArea.getElementHead(tx, ty);
            let behaviour = ElementHead.getBehaviour(targetElementHead);
            if (behaviour === ElementHead.BEHAVIOUR_TREE_TRUNK || behaviour === ElementHead.BEHAVIOUR_TREE) {
                return true;
            }
            return false;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class ExtensionSpawnButterflies extends Extension {

        /** @type ElementArea */
        #elementArea;
        /** @type DeterministicRandom */
        #random;
        /** @type ProcessorContext */
        #processorContext;
        /** @type EntityManager */
        #entityManager;

        /**
         *
         * @param gameState {GameState}
         */
        constructor(gameState) {
            super();
            this.#elementArea = gameState.elementArea;
            this.#random = gameState.random;
            this.#processorContext = gameState.processorContext;
            this.#entityManager = gameState.entityManager;
        }

        run() {
            if ((this.#processorContext.getIteration() + 500) % 1000 === 0) {
                const butterflyCount = this.#entityManager.countEntities('butterfly');

                if (butterflyCount > 3) {
                    return;
                }

                const x = this.#random.nextInt(this.#elementArea.getWidth() - 20) + 10;
                const y = this.#findSpawnY(this.#elementArea, x);
                if (y !== null) {
                    this.#entityManager.addSerializedEntity(Entities.butterfly(x, y));
                    this.#processorContext.trigger(x, y);
                }
            }
        }

        #findSpawnY(elementArea, x) {
            let airCount = 0;

            for (let y = 0; y < elementArea.getHeight(); y++) {
                const elementHead = elementArea.getElementHead(x, y);
                if (ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_AIR) {
                    airCount++;
                } else if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_GRASS) {
                    if (airCount >= 15 && this.#isSpaceAround(x, y - 4)) {
                        return y - 4;
                    }
                    break;
                } else {
                    airCount = 0;
                }
            }

            return null;
        }

        #isSpaceAround(x, y) {
            for (let dy = -5; dy <= 2; dy++) {
                for (let dx = -5; dx <= 5; dx++) {
                    const ex = x + dx;
                    const ey = y + dy;
                    const elementHead = this.#elementArea.getElementHeadOrNull(ex, ey);
                    if (elementHead === null) {
                        return false;
                    }
                    if (ElementHead.getTypeClass(elementHead) !== ElementHead.TYPE_AIR) {
                        return false;
                    }
                    if (ElementHead.getTemperature(elementHead) > 0) {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-05
     */
    class ExtensionSpawnBirds extends Extension {

        /** @type ElementArea */
        #elementArea;
        /** @type DeterministicRandom */
        #random;
        /** @type ProcessorContext */
        #processorContext;
        /** @type EntityManager */
        #entityManager;

        /**
         *
         * @param gameState {GameState}
         */
        constructor(gameState) {
            super();
            this.#elementArea = gameState.elementArea;
            this.#random = gameState.random;
            this.#processorContext = gameState.processorContext;
            this.#entityManager = gameState.entityManager;
        }

        run() {
            if ((this.#processorContext.getIteration() + 700) % 1000 === 0) {
                const birdCount = this.#entityManager.countEntities('bird');

                if (birdCount > 4) {
                    return;
                }

                const x = this.#random.nextInt(this.#elementArea.getWidth() - 20) + 10;
                const y = this.#findSpawnY(this.#elementArea, x);
                if (y !== null) {
                    this.#entityManager.addSerializedEntity(Entities.bird(x, y));
                    this.#processorContext.trigger(x, y);
                }
            }
        }

        #findSpawnY(elementArea, x) {
            let airCount = 0;

            for (let y = 0; y < elementArea.getHeight(); y++) {
                const elementHead = elementArea.getElementHead(x, y);
                if (ElementHead.getTypeClass(elementHead) === ElementHead.TYPE_AIR) {
                    airCount++;
                } else if (ElementHead.getBehaviour(elementHead) === ElementHead.BEHAVIOUR_TREE_LEAF) {
                    if (airCount >= 15 && this.#isSpaceAround(x, y - 5)) {
                        return y - 5;
                    }
                    break;
                } else {
                    airCount = 0;
                }
            }

            return null;
        }

        #isSpaceAround(x, y) {
            for (let dy = -6; dy <= 2; dy++) {
                for (let dx = -5; dx <= 5; dx++) {
                    const ex = x + dx;
                    const ey = y + dy;
                    const elementHead = this.#elementArea.getElementHeadOrNull(ex, ey);
                    if (elementHead === null) {
                        return false;
                    }
                    if (ElementHead.getTypeClass(elementHead) !== ElementHead.TYPE_AIR) {
                        return false;
                    }
                    if (ElementHead.getTemperature(elementHead) > 0) {
                        return false;
                    }
                }
            }
            return true;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    /**
     *
     * @author Patrik Harag
     * @version 2024-05-08
     */
    class ExtensionGenWaypoints extends Extension {

        /** @type GameState */
        #gameState;

        /**
         *
         * @param gameState {GameState}
         */
        constructor(gameState) {
            super();
            this.#gameState = gameState;
        }

        run() {
            if ((this.#gameState.processorContext.getIteration() + 700) % 1000 === 0) {
                this.#generateWaypoint('fish', 20, 5, 2);
            }
            if ((this.#gameState.processorContext.getIteration() + 800) % 1000 === 0) {
                this.#generateWaypoint('butterfly', 20, 5, 4);
            }
            if ((this.#gameState.processorContext.getIteration() + 900) % 1000 === 0) {
                this.#generateWaypoint('bird', 100, 50, 8);
            }
        }

        #generateWaypoint(entityType, maxHorDiff, maxVerDiff, maxVar) {
            const entities = this.#gameState.entityManager.getEntities().filter(e => e.getType() === entityType);
            if (entities.length > 0) {
                const random = this.#gameState.random;

                let groups;
                if (entities.length === 1) {
                    groups = [[entities[0].getX(), entities[0].getY(), entities]];
                } else {
                    let k = entities.length === 2 ? 1 : 2;
                    if (random.next() < 0.2) {
                        // break groups sometimes...
                        k++;
                    }
                    groups = this.#kMeans(entities, k);
                }

                for (const [cx, cy, list] of groups) {
                    let wx = cx + random.nextInt(2 * maxHorDiff) - maxHorDiff;
                    let wy = cy + random.nextInt(2 * maxVerDiff) - maxVerDiff;

                    const maxWidth = this.#gameState.elementArea.getWidth();
                    wx = Math.abs(wx);
                    if (wx >= maxWidth) {
                        wx = maxWidth - (wx - maxWidth);
                    }

                    const maxHeight = this.#gameState.elementArea.getHeight();
                    wy = Math.abs(wy);
                    if (wy >= maxHeight) {
                        wy = maxHeight - (wy - maxHeight);
                    }

                    for (let entity of list) {
                        if (typeof entity.assignWaypoint === 'function') {
                            const wyy = wy + random.nextInt(2 * maxVar) - maxVar;
                            const wxx = wx + random.nextInt(2 * maxVar) - maxVar;
                            entity.assignWaypoint(wxx, wyy);
                        }
                    }
                }
            }
        }

        #kMeans(entities, k) {
            // Initialize centroids randomly
            let centroids = entities.slice(0, k);

            let assignment = new Array(entities.length);
            let clusters = new Array(k);

            while (true) {
                // Assign each entity to the closest centroid
                for (let i = 0; i < entities.length; i++) {
                    let minDistance = Infinity;
                    for (let j = 0; j < k; j++) {
                        let dx = entities[i].getX() - centroids[j].getX();
                        let dy = entities[i].getY() - centroids[j].getY();
                        let distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < minDistance) {
                            minDistance = distance;
                            assignment[i] = j;
                        }
                    }
                }

                // Calculate new centroids
                let newCentroids = new Array(k);
                for (let i = 0; i < k; i++) {
                    clusters[i] = [];
                    let sumX = 0, sumY = 0, count = 0;
                    for (let j = 0; j < entities.length; j++) {
                        if (assignment[j] === i) {
                            sumX += entities[j].getX();
                            sumY += entities[j].getY();
                            count++;
                            clusters[i].push(entities[j]);
                        }
                    }
                    const cx = Math.round(sumX / count);
                    const cy = Math.round(sumY / count);
                    newCentroids[i] = { getX: () => cx, getY: () => cy };
                }

                // Check for convergence
                let converged = true;
                for (let i = 0; i < k; i++) {
                    if (centroids[i].getX() !== newCentroids[i].getX() || centroids[i].getY() !== newCentroids[i].getY()) {
                        converged = false;
                        break;
                    }
                }

                if (converged) {
                    break;
                }

                centroids = newCentroids;
            }

            // Return the result
            let result = [];
            for (let i = 0; i < k; i++) {
                result.push([centroids[i].getX(), centroids[i].getY(), clusters[i]]);
            }
            return result;
        }
    }

    // Sand Game JS; Patrik Harag, https://harag.cz; all rights reserved

    const brushes = BrushDefs._LIST;
    const tools = ToolDefs._LIST;

    /**
     * Initialize Sand Game JS.
     *
     * @param root {HTMLElement}
     * @param config {{
     *     version: undefined|string,
     *     debug: undefined|boolean,
     *     canvas: undefined|{
     *         scale: undefined|number,
     *         maxWidthPx: undefined|number,
     *         maxHeightPx: undefined|number
     *     },
     *     autoStart: undefined|boolean,
     *     scene: undefined|string|{init:(function(SandGame, Controller):Promise<any>|any)},
     *     scenes: undefined|Scene[]|Object.<string,Scene>,
     *     extensions: undefined|Object.<string,boolean>,
     *     brushes: undefined|Object.<string,Brush>,
     *     tools: undefined|(string|Tool)[],
     *     primaryTool: undefined|string|Tool,
     *     secondaryTool: undefined|string|Tool,
     *     tertiaryTool: undefined|string|Tool,
     *     disableRestart: undefined|boolean,
     *     disableStartStop: undefined|boolean,
     *     disableImport: undefined|boolean,
     *     disableExport: undefined|boolean,
     *     disableSizeChange: undefined|boolean,
     *     disableSceneSelection: undefined|boolean,
     *     disableGlobalShortcuts: undefined|boolean,
     *     errorReporter: undefined|function(type:string,message:string,controller:Controller),
     * }}
     * @returns {Controller}
     *
     * @author Patrik Harag
     * @version 2024-05-19
     */
    function init(root, config) {
        if (config === undefined) {
            config = {};
        }

        let controller;

        const {width, height, scale} = SizeUtils.determineOptimalSizes(root, config.canvas);

        const init = {
            scale: scale,
            canvasWidthPx: width,
            canvasHeightPx: height,
            version: config.version
        };

        const enableDebug = config.debug === true;
        const enableAutoStart = config.autoStart === undefined || config.autoStart === true;
        const enableRestart = !(config.disableRestart === true);
        const enableStartStop = !(config.disableStartStop === true);
        const enableImport = !(config.disableImport === true);
        const enableExport = !(config.disableExport === true);
        const enableSizeChange = !(config.disableSizeChange === true);
        const enableSceneSelection = !(config.disableSceneSelection === true);
        const enableGlobalShortcuts = !(config.disableGlobalShortcuts === true);
        const enableUserErrorReporting = config.errorReporter !== undefined;

        const errorReporter = config.errorReporter;

        // resolve processor defaults - brushes & extensions

        let brushes;
        if (typeof config.brushes === 'object') {
            brushes = config.brushes;
        } else if (config.brushes === undefined) {
            brushes = undefined;
        } else {
            throw "config.brushes - wrong type, expected object";
        }

        let extensions;
        if (typeof config.extensions === 'object') {
            extensions = config.extensions;
        } else if (config.extensions === undefined) {
            extensions = {
                spawnFish: true,
                spawnGrass: true,
                spawnTrees: true,
                spawnButterflies: true,
                spawnBirds: true,
                generateWaypoints: true,
            };
        } else {
            throw "config.extensions - wrong type, expected object";
        }

        const extensionsFactory = (gameState) => {
            const array = [];
            if (extensions.spawnFish === true) {
                array.push(new ExtensionSpawnFish(gameState));
            }
            if (extensions.spawnGrass === true) {
                array.push(new ExtensionSpawnGrass(gameState));
            }
            if (extensions.spawnTrees === true) {
                array.push(new ExtensionSpawnTrees(gameState));
            }
            if (extensions.spawnButterflies === true) {
                array.push(new ExtensionSpawnButterflies(gameState));
            }
            if (extensions.spawnBirds === true) {
                array.push(new ExtensionSpawnBirds(gameState));
            }
            if (extensions.generateWaypoints === true) {
                array.push(new ExtensionGenWaypoints(gameState));
            }
            return array;
        };

        const defaults = new GameDefaultsImpl(brushes, extensionsFactory);

        // resolve scene list

        let scenes;
        let customScenes;
        if (Array.isArray(config.scenes)) {
            scenes = {};
            for (let i = 0; i < config.scenes.length; i++) {
                scenes['scene_' + i] = config.scenes[i];
            }
            customScenes = true;
        } else if (typeof config.scenes === "object") {
            scenes = config.scenes;
            customScenes = true;
        } else {
            // build-in scenes
            scenes = SceneDefs.SCENES;
            customScenes = false;
        }

        // resolve current scene

        let scene;
        let sceneName;
        if (typeof config.scene === 'string') {
            // from scene list
            sceneName = config.scene;
            scene = scenes[sceneName];
            if (scene === undefined) {
                throw 'Scene not found: ' + sceneName;
            }
        } else if (typeof config.scene === 'object') {
            // custom scene
            sceneName = 'n/a';
            const sceneFunc = (typeof config.scene.init === 'function')
                ? (sandGame) => config.scene.init(sandGame, controller)
                : () => {};
            scene = Scenes.custom('n/a', sceneFunc);
        } else {
            // default scene
            if (customScenes) {
                // select first
                sceneName = Object.keys(scenes)[0];
                scene = Object.values(scenes)[0];
            } else {
                if (enableDebug) {
                    sceneName = 'landscape_1';  // always the same
                } else {
                    sceneName = (Math.random() > 0.1) ? 'landscape_1' : 'landscape_2';
                }
                scene = scenes[sceneName];
            }
        }

        // resolve tools

        function resolveTool(t, defaultTool = null) {
            if (typeof t === 'string') {
                let tool = ToolDefs.byCodeName(t);
                if (tool !== null) {
                    return tool;
                } else if (enableDebug) {
                    throw 'Tool not found: ' + t;
                }
                return defaultTool;
            } else if (typeof t === 'object' && t instanceof Tool) {
                return t;
            } else {
                if (enableDebug) {
                    throw 'Unexpected tool type';
                }
                return defaultTool;
            }
        }

        let tools;
        if (Array.isArray(config.tools)) {
            tools = [];
            for (let t of config.tools) {
                let tool = resolveTool(t, null);
                if (tool !== null) {
                    tools.push(tool);
                }
            }
        } else {
            tools = Tools.grouping(ToolDefs.DEFAULT_TOOLS, ToolDefs.DEFAULT_CATEGORY_DEFINITIONS);
        }

        let primaryTool;
        if (config.primaryTool === undefined || (primaryTool = resolveTool(config.primaryTool)) === null) {
            primaryTool = ToolDefs.SAND;
        }

        let secondaryTool;
        if (config.secondaryTool === undefined || (secondaryTool = resolveTool(config.secondaryTool)) === null) {
            secondaryTool = ToolDefs.ERASE;
        }

        let tertiaryTool;
        if (config.tertiaryTool === undefined || (tertiaryTool = resolveTool(config.tertiaryTool)) === null) {
            tertiaryTool = ToolDefs.METEOR;
        }

        // init controller

        const dialogAnchorNode = DomBuilder.div({ class: 'sand-game-dialog-anchor sand-game-component' });
        document.body.prepend(dialogAnchorNode);
        const toolManager = new ServiceToolManager(primaryTool, secondaryTool, tertiaryTool);
        controller = new Controller(init, dialogAnchorNode, toolManager, defaults);

        // init error reporting

        if (errorReporter !== undefined) {
            controller.addOnFailure((type, message) => errorReporter(type, message, controller));
        }

        // init components

        const mainComponent = new ComponentContainer('sand-game-component', [
            new ComponentViewTools(tools, enableImport),
            new ComponentViewCanvas(),
            new ComponentContainer('sand-game-options', [
                new ComponentContainer('sand-game-options-left', [
                    (enableImport) ? new ComponentButton('Import', ComponentButton.CLASS_LIGHT, new ActionIOImport()) : null,
                    (enableExport) ? new ComponentButton('Export', ComponentButton.CLASS_LIGHT, new ActionIOExport()) : null,
                    (enableRestart && !enableSceneSelection) ? new ComponentButtonRestart(ComponentButton.CLASS_LIGHT) : null,
                    (enableStartStop) ? new ComponentButtonStartStop(ComponentButton.CLASS_LIGHT) : null,
                    new ComponentStatusIndicator((enableSizeChange)
                            ? DomBuilder.element('span', null, [DomBuilder.element('br'), 'Tip: adjust scale if needed'])
                            : null),
                ]),
                new ComponentContainer('sand-game-options-right', [
                    (enableUserErrorReporting) ? new ComponentButtonReport(ComponentButton.CLASS_LIGHT, errorReporter) : null,
                ]),
            ]),
            new ComponentContainer('sand-game-views', [
                (enableSizeChange || enableSceneSelection) ? new ComponentContainer(null, [
                    (enableSizeChange) ? new ComponentButtonAdjustScale() : null,
                    (enableSceneSelection) ? new ComponentSimple(DomBuilder.span('Scenes', { class: 'scenes-label' })) : null,
                    (enableSceneSelection) ? new ComponentViewSceneSelection(controller, scenes, sceneName) : null,
                ]) : null,
                (enableDebug && window.SandGameJS_ModuleDev !== undefined) ? SandGameJS_ModuleDev.createComponent() : null,
            ])
        ]);

        // build HTML nodes and start

        const node = mainComponent.createNode(controller);
        root.innerHTML = '';
        root.append(node);

        controller.setup(scene);
        if (enableImport) {
            controller.getIOManager().initFileDragAndDrop(node);
        }
        if (enableGlobalShortcuts) {
            controller.enableGlobalShortcuts();
        }
        if (enableAutoStart) {
            controller.start();
        }

        Analytics.triggerFeatureUsed(Analytics.FEATURE_APP_INITIALIZED);

        return controller;
    }

    exports.BrushDefs = BrushDefs;
    exports.Brushes = Brushes;
    exports.Entities = Entities;
    exports.PredicateDefs = PredicateDefs;
    exports.RendererInitializerDefs = RendererInitializerDefs;
    exports.Resources = Resources;
    exports.SceneDefs = SceneDefs;
    exports.Scenes = Scenes;
    exports.ToolDefs = ToolDefs;
    exports.Tools = Tools;
    exports.brushes = brushes;
    exports.init = init;
    exports.tools = tools;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=sand-game-js.umd.js.map
