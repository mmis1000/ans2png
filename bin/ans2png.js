#!/usr/bin/env node

/// @ts-check
const fs = require("fs");
const path = require("path");

const parse = require('../lib/parse.js')
const style = require('../lib/style.js')
const render = require('../lib/render.js')

if (process.argv.length < 3) {
    console.error(`
Ansi Art to PNG converter

Generate png from ans file
  usage: ans2png <ans file location> [output file name]`)
    process.exit(1);
}

const fileName = process.argv[2];
const fullPath = path.resolve(process.cwd(), fileName);
const { createCanvas } = require('canvas')
const output = process.argv.length >= 4 ? process.argv[3]: path.basename(fileName).replace(/\.[^\.]+$/, '.png')
const outputPath = path.resolve(process.cwd(), output)

fs.readFile(fullPath, function onload(err, buffer) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    const ctx = parse(buffer);
    const lines = style(ctx);

    const canvas = createCanvas(1, 1);

    render(canvas, lines, 24)

    console.log('PNG file outputed at ' + outputPath);
    canvas.createPNGStream().pipe(fs.createWriteStream(outputPath))
})