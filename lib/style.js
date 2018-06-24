/// @ts-check
const parse = require('./parse.js');
const b2u = require('./b2u.js')
/**
 * @typedef {Object} Style
 * @prop {string} front
 * @prop {string} back
 * @prop {string} frontCode
 * @prop {string} backCode
 * @prop {boolean} blink
 * @prop {boolean} light
 */

/**
 * @typedef {Object} Charater
 * @prop {string} char
 * @prop {1|2} width
 * @prop {Style[]} styles
 */

/**
 * color map of terminal
 */
const MAP = {
    FOREGROUNG: {
        "0_30": "black",
        "0_31": "maroon",
        "0_32": "green",
        "0_33": "olive",
        "0_34": "navy",
        "0_35": "purple",
        "0_36": "teal",
        "0_37": "silver",
        "1_30": "grey",
        "1_31": "red",
        "1_32": "#0f0",
        "1_33": "#ff0",
        "1_34": "#00f",
        "1_35": "#f0f",
        "1_36": "#00f",
        "1_37": "#fff"
    },
    BACKGROUND: {
        "40": "black",
        "41": "maroon",
        "42": "green",
        "43": "olive",
        "44": "navy",
        "45": "purple",
        "46": "teal",
        "47": "silver"
    },
    SPECIAL: {
        "5": "blink"
    }
}

/**
 * parse string and compare to number
 * @param {string} str 
 * @param {number} num 
 */
function StringEqualOrBiggerThan(str, num) {
    return parseInt(str, 10) >= num;
}

/**
 * parse string and compare to number
 * @param {string} str 
 * @param {number} num 
 */
function StringEqualOrSmallerThan(str, num) {
    return parseInt(str, 10) <= num;
}

/**
 * get the default terminal style
 * @returns {Style}
 */
function getNewStyle() {
    return {
        front: MAP.FOREGROUNG["0_37"],
        back: MAP.BACKGROUND["40"],
        frontCode: "37",
        backCode: "40",
        blink: false,
        light: false
    }
}

/**
 * parse the context and map it to styles
 * @param {parse.Context} ctx
 * @param {boolean?} forceSingleColorEmoji
 * @returns {Charater[][]}
 */
function style (ctx, forceSingleColorEmoji = false) {
    // remove extra empty line
    if (ctx.sequences[ctx.sequences.length - 1].text[0] === 0 &&
        ctx.sequences[ctx.sequences.length - 2].text[0] === '\n'.codePointAt(0)
    ) {
        ctx.sequences = ctx.sequences.slice(0, -2)
    }

    /**
     * @type {Charater[][]}
     */
    const lines = [[]];
    
    /**
     * @type {Style}
     */
    let currentStyle = getNewStyle();

    const sequences = ctx.sequences.slice(0);

    /** @type {parse.Entity} */
    let tile;
    while (tile = sequences.shift()) {
        let text = b2u(tile.text);
        
        if (b2u(tile.text).charCodeAt(0) >= 128) {
            // double width
            
            let leftControl = [];
            let rightControl = [];
            
            {
                let ptr = 0;
                
                for (let current = tile.sequence[ptr]; 
                    current.type !== 'text'; 
                    current = tile.sequence[++ptr]) {
                    
                    leftControl.push(current.textConverted);
                }

                ptr++;
                
                for (let current = tile.sequence[ptr]; 
                    current.type !== 'text'; 
                    current = tile.sequence[++ptr]) {
                    
                    rightControl.push(current.textConverted);
                }
            }
            
            let leftStyle = leftControl.reduce((prev, ctrl)=>mergeStyle(prev, ctrl), currentStyle);
            let rightStyle = rightControl.reduce((prev, ctrl)=>mergeStyle(prev, ctrl), leftStyle);
            
            currentStyle = rightStyle;
            
            lines[lines.length - 1].push({
                char: b2u(tile.text) + (forceSingleColorEmoji ? '\ufe0e' : ''),
                width: 2,
                styles: [leftStyle, rightStyle]
            })
        } else {
            if (text === '\r') continue;
            if (text === '\n') {
                // reset style when new line
                currentStyle = getNewStyle()
                lines.push([]);
                continue;
            }
            // single width
            
            let controls = []
            {
                let ptr = 0;
                
                for (let current = tile.sequence[ptr]; 
                    current.type !== 'text'; 
                    current = tile.sequence[++ptr]) {
                    
                    controls.push(current.textConverted);
                }
            }
            
            let newStyle = controls.reduce((prev, ctrl)=>mergeStyle(prev, ctrl), currentStyle);
            currentStyle = newStyle;

            lines[lines.length - 1].push({
                char: b2u(tile.text),
                width: 1,
                styles: [newStyle]
            })
        }
    }

    return lines;
}

/**
 * merge original style with the new control sequence
 * @param {Style} style
 * @param {string[]} texts
 * @returns {Style}
 */
function mergeStyle(style, texts) {
    const newStyle = Object.assign({}, style);
    
    /*
     * ^C[m and ^C[0m will reset all attribute
     */
    if (texts.length === 1 && (texts[0] === '' || texts[0] === '0')) {
        return getNewStyle()
    }
    
    for (let i = 0; i < texts.length; i++) {
        /**
         * all position can be optional, 
         * so wee just ignore the position and parse by number range
         */

        if (texts[i] === "0" || texts[i] === "") {
            /**
             * ^C[;30m and ^C[0;30m actully mean the same thing
             */
            newStyle.light = false;
            newStyle.front = MAP.FOREGROUNG["0_" + newStyle.frontCode];
        
        } else if (texts[i] === "1") {
            /**
             * it is light color ^C[;30m
             */
            newStyle.light = true;
            newStyle.front = MAP.FOREGROUNG["1_" + newStyle.frontCode];
        } else if (texts[i] === "5") {
            /**
             * it is blinking
             */
            newStyle.blink = !newStyle.blink;
        } else if (StringEqualOrBiggerThan(texts[i], 30) && StringEqualOrSmallerThan(texts[i], 37)) {
            /**
             * it is the color code of foreground color
             */
            newStyle.frontCode = texts[i];
            if (newStyle.light) {
                newStyle.front = MAP.FOREGROUNG["1_" + texts[i]]
            } else {
                newStyle.front = MAP.FOREGROUNG["0_" + texts[i]]
            }
        } else if (StringEqualOrBiggerThan(texts[i], 40) && StringEqualOrSmallerThan(texts[i], 47)) {
            /**
             * it is the color code of background color
             */
            newStyle.backCode = texts[i];
            newStyle.back = MAP.BACKGROUND[texts[i]]
        }
    }

    return newStyle;
}

 module.exports = style