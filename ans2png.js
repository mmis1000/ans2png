#!/usr/bin/env node

/// @ts-check
const fs = require("fs");
const path = require("path");

if (process.argv.length < 3) {
    console.error(`
Ansi Art to PNG converter

Generate png from ans file
  usage: ans2png <ans file location> [output file name]`)
    process.exit(1);
}

const fileName = process.argv[2];
const fullPath = path.resolve(process.cwd(), fileName);
const b2uTable = require("./b2u_table.js");
const { createCanvas } = require('canvas')
const output = process.argv.length >= 4 ? process.argv[3]: path.basename(fileName).replace(/\.[^\.]+$/, '.png')
const outputPath = path.resolve(process.cwd(), output)


/**
 * @typedef {Object} Style
 * @prop {string} front
 * @prop {string} back
 * @prop {string} frontCode
 * @prop {string} backCode
 * @prop {boolean} blink
 * @prop {boolean} light
 */

const FONT_SIZE = 16;

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

function b2u(buffer) {
    var res = "";
    
    var highPart = null;
    var nextLowPart = false;
    
    for (var i = 0; i < buffer.length; i++) {
        if (nextLowPart) {
            var code = highPart.toString(16).toUpperCase() + buffer[i].toString(16).toUpperCase();
            if (b2uTable['x' + code]) {
                res += b2uTable['x' + code];
            } else {
                res += String.fromCharCode(highPart)
                res += String.fromCharCode(buffer[i])
            }
            
            nextLowPart = false;
        } else if (buffer[i] >= 128) {
            highPart = buffer[i]
            nextLowPart = true;
        } else {
            res += String.fromCharCode(buffer[i]);
        }
    }
    
    return res;
}

/**
 * 
 * @param {string} str 
 * @param {number} num 
 */
function StringEqualOrBiggerThan(str, num) {
    return parseInt(str, 10) >= num;
}

/**
 * 
 * @param {string} str 
 * @param {number} num 
 */
function StringEqualOrSmallerThan(str, num) {
    return parseInt(str, 10) <= num;
}

fs.readFile(fullPath, function onload(err, buffer) {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    
    var ESC = 0x1b;
    var LEFT_BRANKET = "[".charCodeAt(0);
    var NUMBER_0 = "0".charCodeAt(0);
    var NUMBER_9 = "9".charCodeAt(0);
    var SEMICOLON = ";".charCodeAt(0);
    var M = "m".charCodeAt(0);
    
    function read(ctx) {
        while (ctx.ptr < ctx.length) {
            if (ctx.buffer[ctx.ptr] !== ESC) {
                readChar(ctx);
            } else {
                readControlCode(ctx);
            }
        }
    }
    
    function readChar(ctx) {
        var start = ctx.ptr;
        
        if (ctx.nextIsLowPart) {
            ctx.position += 0.5;
            ctx.nextIsLowPart = false;
        } else if (ctx.buffer[ctx.ptr] > 127) {
            ctx.position += 0.5;
            ctx.nextIsLowPart = true;
        } else {
            ctx.position += 1;
        }
        
        ctx.out.push(ctx.buffer[ctx.ptr])
        ctx.currentSegment.push(ctx.buffer[ctx.ptr])
        ctx.ptr++;
        
        ctx.currentSequence.push({
            type: "text",
            // data: ctx.buffer.slice(start, ctx.ptr)
        });
        
        if (ctx.position % 1 === 0) {
            ctx.sequences.push({
                sequence: ctx.currentSequence,
                text: ctx.currentSegment,
                length: ctx.position - ctx.prevEnd,
                position: ctx.prevEnd
            });
            
            ctx.prevEnd = ctx.position;
            ctx.currentSequence = [];
            ctx.currentSegment = [];
        }
    }
    
    function readControlCode(ctx) {
        var start = ctx.ptr;
        var numbers = [];
        
        // remove ^C
        if (ctx.buffer[ctx.ptr] !== ESC) {
            throw new Error(`terminated unexpectedly ${ctx.ptr.toString(16)}, ${ctx.buffer[ctx.ptr].toString(16)}`)
        }
        
        ctx.ptr++;
        
        // remove [
        if (ctx.buffer[ctx.ptr] !== LEFT_BRANKET) {
            throw new Error(`terminated unexpectedly ${ctx.ptr.toString(16)}, ${ctx.buffer[ctx.ptr].toString(16)}`)
        }
        
        ctx.ptr++
        
        // remove first number
        {
            let start = ctx.ptr;
            
            while (ctx.buffer[ctx.ptr] <= NUMBER_9 && buffer[ctx.ptr] >= NUMBER_0) {
                ctx.ptr++;
            }
            
            let slice = b2u(ctx.buffer.slice(start, ctx.ptr));
            numbers.push(slice);
        }
        
        // remove other number if any
        while (ctx.buffer[ctx.ptr] === SEMICOLON) {
            ctx.ptr++;
            
            let start = ctx.ptr;
            
            while (ctx.buffer[ctx.ptr] <= NUMBER_9 && ctx.buffer[ctx.ptr] >= NUMBER_0) {
                ctx.ptr++;
            }
            
            let slice = b2u(ctx.buffer.slice(start, ctx.ptr));
            numbers.push(slice);
        }
        
        if (ctx.buffer[ctx.ptr] !== M) {
            throw new Error(`terminated unexpectedly ${ctx.ptr.toString(16)}, ${ctx.buffer[ctx.ptr].toString(16)}`)
        }
        
        ctx.ptr++;
        ctx.currentSequence.push({
            position: ctx.position,
            type: "control",
            // data: ctx.buffer.slice(start, ctx.ptr),
            textConverted: numbers
        })
    }
    
    var ctx = {
        nextIsLowPart: false,
        position: 0,
        out: [],
        sequences: [],
        ptr: 0,
        prevEnd: 0,
        currentSequence: [],
        currentSegment: [],
        length: buffer.length,
        buffer: buffer
    }
    
    read(ctx);
    
    var str = b2u(ctx.out);
    
    // console.log(str)
    // console.log(`charater count ${str.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|(?:.|\r|\n)/g).length}`)
    // console.log(`total sequences ${ctx.sequences.length}`)
    
    ctx.sequences.forEach((seq, index)=>{
        // console.log(JSON.stringify(b2u(seq.text)) + ' ' + JSON.stringify(seq))
        if (b2u(seq.text).length !== seq.length) {
            console.log('bad sequence', index, seq.length, seq.position, seq.text, b2u(seq.text), JSON.stringify(seq))
        }
    });
    
    render(ctx)
})

/**
 * @returns Style
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

function render (info) {
    var dimension = b2u(info.out).split(/\r?\n/g).map((str)=>{
        str = str.replace(/[\u0000]/g, '');
        return str.split('').reduce((prev, char)=> prev + (char.charCodeAt(0) >= 128 ? 2: 1), 0)
    }).reduce((prev, curr, i, arr)=>{
        if (i === arr.length - 1 && curr === 0) {
            prev.height = arr.length - 1;
            return prev;
        } else {
            prev.lines.push(curr)
            prev.height = arr.length;
            prev.width = curr > prev.width ? curr : prev.width;
            return prev;
        }
    }, {lines: [], width: 0, height: 0})
    
    // console.log(dimension);
    
    const canvas = createCanvas(dimension.width * FONT_SIZE / 2, dimension.height * FONT_SIZE);
    const ctx = canvas.getContext('2d');
    
    ctx.textBaseline = 'middle';
    ctx.textAlign = "center";
    ctx.imageSmoothingEnabled = false;
    // ctx.translate(-0.5, -0.5)
    
    ctx.fillStyle = MAP.BACKGROUND["40"];
    ctx.fillRect(0, 0, dimension.width * FONT_SIZE / 2, dimension.height * FONT_SIZE);
    
    const sequences = info.sequences.slice(0);
    
    let cursor = {
        x: 0,
        y: 0,
    }
    
    /**
     * @type {Style}
     */
    let currentStyle = getNewStyle()
    
    ctx.font = FONT_SIZE + "px MingLiU";
    
    let tile;
    while (tile = sequences.shift()) {
        let sequence = tile.sequence.slice(0);
        
        var text = b2u(tile.text);
        
        if (b2u(tile.text).charCodeAt(0) >= 128) {
            // double width
            
            ctx.save();
            
            ctx.translate(
                cursor.x * FONT_SIZE / 2,
                cursor.y * FONT_SIZE
            )
            var leftControl = [];
            var rightControl = [];
            
            {
                let ptr = 0;
                
                while (tile.sequence[ptr].type !== 'text') {
                    leftControl.push(tile.sequence[ptr].textConverted);
                    ptr++;
                }
                
                ptr++;
                
                while (tile.sequence[ptr].type !== 'text') {
                    rightControl.push(tile.sequence[ptr].textConverted);
                    ptr++;
                }
            }
            
            var leftStyle = leftControl.reduce((prev, ctrl)=>applyStyle(prev, ctrl), currentStyle);
            var rightStyle = rightControl.reduce((prev, ctrl)=>applyStyle(prev, ctrl), leftStyle);
            
            // console.log(`${text} left ${JSON.stringify(leftStyle)}, right ${JSON.stringify(rightStyle)}, ${JSON.stringify(leftControl)}, ${JSON.stringify(rightControl)}`)
            
            currentStyle = rightStyle;
            
            drawDoubleWidth(ctx, text, FONT_SIZE, FONT_SIZE, leftStyle.front, leftStyle.back, rightStyle.front, rightStyle.back)
            
            ctx.restore();
            
            cursor.x += 2
        } else {
            if (text === '\r') continue;
            if (text === '\n') {
                // reset style when new line
                currentStyle = getNewStyle();
                
                cursor.x = 0
                cursor.y ++;
                continue;
            }
            // single width
            
            var textRealWidth = ctx.measureText(text).width;
            
            ctx.save();
            
            ctx.translate(
                cursor.x * FONT_SIZE / 2,
                cursor.y * FONT_SIZE
            )
            
            var controls = []
            {
                let ptr = 0;
                
                while (tile.sequence[ptr].type !== 'text') {
                    controls.push(tile.sequence[ptr].textConverted);
                    ptr++;
                }
            }
            
            var newStyle = controls.reduce((prev, ctrl)=>applyStyle(prev, ctrl), currentStyle);
            currentStyle = newStyle;
            
            // console.log(`${text} current ${JSON.stringify(newStyle)}`)
            
            drawSingleWidth(ctx, text, FONT_SIZE / 2, FONT_SIZE, currentStyle.front, currentStyle.back) 
            
            ctx.restore();
            
            cursor.x += 1
        }
    }
    
    console.log('PNG file outputed at ' + outputPath);
    canvas.createPNGStream().pipe(fs.createWriteStream(outputPath))
}

/**
 * @param {Style} style
 * @param {string[]} texts
 * @returns Style
 */
function applyStyle(style, texts) {
    /**
     * @type {Style}
     */
    var newStyle = Object.assign({}, style);
    
    if (texts.length === 1 && (texts[0] === '' || texts[0] === '0')) {
        return getNewStyle()
    }
    
    var hasLight = false;
    
    for (let i = 0; i < texts.length; i++) {
        if (texts[i] === "0" || texts[i] === "") {
            newStyle.light = false;
            newStyle.front = MAP.FOREGROUNG["0_" + newStyle.frontCode];
        } else if (texts[i] === "1") {
            newStyle.light = true;
            newStyle.front = MAP.FOREGROUNG["1_" + newStyle.frontCode];
        } else if (texts[i] === "5") {
            newStyle.blink = !newStyle.blink;
        } else if (StringEqualOrBiggerThan(texts[i], 30) && StringEqualOrSmallerThan(texts[i], 37)) {
            if (newStyle.light) {
                newStyle.front = MAP.FOREGROUNG["1_" + texts[i]]
            } else {
                newStyle.front = MAP.FOREGROUNG["0_" + texts[i]]
            }
            newStyle.frontCode = texts[i]
            if (!newStyle.front) throw new Error(texts[i])
        } else if (StringEqualOrBiggerThan(texts[i], 40) && StringEqualOrSmallerThan(texts[i], 47)) {
            newStyle.back = MAP.BACKGROUND[texts[i]]
            if (!newStyle.back) throw new Error(texts[i])
        }
    }
    
    return newStyle;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 */
function drawDoubleWidth(ctx, char, width, height, leftFG, leftBG, rightFG, rightBG) {
    
    function tallBlock(heightMultiply) {
        return function (FG, BG) {
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            var headPad = ~~(height * (1 - heightMultiply));
            
            ctx.fillStyle = FG;
            ctx.fillRect(0, headPad, width, height - headPad);
        }
    }
    
    function wideBlock(wideMultiply) {
        return function (FG, BG) {
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            var wide = ~~(width * wideMultiply);
            
            ctx.fillStyle = FG;
            ctx.fillRect(0, 0, wide, height);
        }
    }
    
    const handles = {
        '█': function (FG, BG) {
            ctx.fillStyle = FG;
            ctx.fillRect(0, 0, width, height);
        },
        '▇': tallBlock(7 / 8),
        '▆': tallBlock(6 / 8),
        '▅': tallBlock(5 / 8),
        '▄': tallBlock(4 / 8),
        '▃': tallBlock(3 / 8),
        '▂': tallBlock(2 / 8),
        '▁': tallBlock(1 / 8),
        "▉": wideBlock(7 / 8),
        "▊": wideBlock(6 / 8),
        "▋": wideBlock(5 / 8),
        "▌": wideBlock(4 / 8),
        "▍": wideBlock(3 / 8),
        "▎": wideBlock(2 / 8),
        "▏": wideBlock(1 / 8),
        "▲": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(0, height);
            ctx.lineTo(width, height);
            ctx.lineTo(width / 2, 0);
            ctx.fill();
        },
        "▼": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width / 2, height);
            ctx.lineTo(width, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
        },
        "◣": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, height);
            ctx.lineTo(width, height);
            ctx.lineTo(0, 0);
            ctx.fill();
        },
        "◢": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(width, 0);
            ctx.lineTo(0, height);
            ctx.lineTo(width, height);
            ctx.lineTo(width, 0);
            ctx.fill();
        },
        "◥": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(width, height);
            ctx.lineTo(width, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
        },
        "◤": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, height);
            ctx.lineTo(width, 0);
            ctx.lineTo(0, 0);
            ctx.fill();
        },
        "◆": function (FG, BG) {
            /** @type {any} */(ctx).antialias = "gray"
            
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.beginPath();
            ctx.moveTo(width / 2, 0);
            ctx.lineTo(0, height / 2);
            ctx.lineTo(width / 2, height);
            ctx.lineTo(width, height / 2);
            ctx.lineTo(width / 2, 0);
            ctx.fill();
        },
        'default': function (FG, BG) {
            ctx.fillStyle = BG;
            ctx.fillRect(0, 0, width, height);
            
            ctx.fillStyle = FG;
            ctx.textBaseline = 'middle';
            ctx.textAlign = "center";
            
            /** @type {any} */(ctx).antialias = 'gray';
            ctx.fillText(char, width / 2, height / 2, width);
        }
    }
    
    var handle = handles[char] || handles['default'];
    
    if (leftFG === rightFG && leftBG === rightBG) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.clip();
        
        handle(leftFG, leftBG)
        
        ctx.restore()
    } else {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width / 2, 0);
        ctx.lineTo(width / 2, height);
        ctx.lineTo(0, height);
        ctx.clip();
        
        handle(leftFG, leftBG)
        
        ctx.restore()
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(width / 2, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(width / 2, height);
        ctx.clip();
        
        handle(rightFG, rightBG)
        
        ctx.restore()
    }
}


/**
 * @param {CanvasRenderingContext2D} ctx
 */
function drawSingleWidth(ctx, char, width, height, FG, BG) {
    const handle = function (FG, BG) {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = FG;
        ctx.textBaseline = 'middle';
        ctx.textAlign = "center";
        
        /** @type {any} */(ctx).antialias = 'gray';
        ctx.fillText(char, width / 2, height / 2, width);
    }
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.clip();
    
    handle(FG, BG)
    
    ctx.restore()
}