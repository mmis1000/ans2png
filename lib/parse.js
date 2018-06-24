/// @ts-check

const b2u = require("./b2u.js");

/**
 * @typedef {Object} ControlSegment
 * @prop {"control"} type
 * @prop {number} position
 * @prop {string[]} textConverted
 */

/**
 * @typedef {Object} TextSegment
 * @prop {"text"} type
 */

/**
 * @typedef {Object} Entity
 * @prop {(ControlSegment|TextSegment)[]} sequence
 * @prop {number[]} text
 * @prop {number} length
 * @prop {number} position
 */

/**
 * @typedef {Object} Context
 * @prop {boolean} nextIsLowPart
 * @prop {number} position
 * @prop {number[]} out
 * @prop {Entity[]} sequences
 * @prop {number} ptr
 * @prop {number} prevEnd
 * @prop {(ControlSegment|TextSegment)[]} currentSequence
 * @prop {number[]} currentSegment
 * @prop {number} length
 * @prop {Buffer|number[]|Uint8Array} buffer
 */

const ESC = 0x1b;
const LEFT_BRANKET = "[".charCodeAt(0);
const NUMBER_0 = "0".charCodeAt(0);
const NUMBER_9 = "9".charCodeAt(0);
const SEMICOLON = ";".charCodeAt(0);
const M = "m".charCodeAt(0);

/**
 * read the whole string
 * @param {Context} ctx 
 */
function read(ctx) {
    while (ctx.ptr < ctx.length) {
        if (ctx.buffer[ctx.ptr] !== ESC) {
            readChar(ctx);
        } else {
            readControlCode(ctx);
        }
    }
}

/**
 * read the text content
 * @param {Context} ctx 
 */
function readChar(ctx) {    
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

/**
 * read the content of a control code and parse it
 * @param {Context} ctx 
 */
function readControlCode(ctx) {
    let numbers = [];
    
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
        
        while (ctx.buffer[ctx.ptr] <= NUMBER_9 && ctx.buffer[ctx.ptr] >= NUMBER_0) {
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

/**
 * parse the whole string
 * @param {Buffer|number[]|Uint8Array} buffer 
 */
function parse(buffer) {
    /**
     * @type {Context}
     */
    const ctx = {
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

    return ctx
}

module.exports = parse;