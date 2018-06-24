/// @ts-check

const style = require('./style.js')
/**
 * @param {HTMLCanvasElement} canvas
 * @param {style.Charater[][]} lines
 * @param {number} fontSize
 * @param {string?} fontName
 */
function render(canvas, lines, fontSize = 16, fontName = "MingLiU") {
    const ctx = canvas.getContext("2d");

    /** @type {{x: number, y: number}} */
    const cursor = {
        x: 0,
        y: 0
    }

    const screenWidth = lines
        .map(line =>
            line
            .map(c =>
                c.width)
            .reduce((p, c) =>
                p + c, 0))
        .reduce((p, c) =>
            c > p ? c : p, 0) *
        fontSize / 2;

    const screenHeight = lines.length * fontSize

    canvas.width = screenWidth;
    canvas.height = screenHeight;

    ctx.imageSmoothingEnabled = false;
    
    ctx.font = fontSize + "px " + fontName;

    ctx.fillRect(0, 0, screenWidth, screenHeight);

    for (let i = 0; i < lines.length; i++) {
        for (let j = 0; j < lines[i].length; j++) {

            ctx.save();

            ctx.translate(
                cursor.x * fontSize / 2,
                cursor.y * fontSize
            )

            if (lines[i][j].width === 1) {
                drawSingleWidth(
                    ctx,
                    lines[i][j].char,
                    fontSize / 2,
                    fontSize,
                    lines[i][j].styles[0].front,
                    lines[i][j].styles[0].back
                )

                cursor.x += 1;
            } else {
                drawDoubleWidth(
                    ctx,
                    lines[i][j].char,
                    fontSize,
                    fontSize,
                    lines[i][j].styles[0].front,
                    lines[i][j].styles[0].back,
                    lines[i][j].styles[1].front,
                    lines[i][j].styles[1].back
                )

                cursor.x += 2
            }

            ctx.restore();
        }

        cursor.x = 0;
        cursor.y += 1;
    }

    return canvas;
}


/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} char
 * @param {number} width
 * @param {number} height
 * @param {string} leftFG
 * @param {string} leftBG
 * @param {string} rightFG
 * @param {string} rightBG
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
            /** @type {any} */
            (ctx).antialias = "gray"

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
            /** @type {any} */
            (ctx).antialias = "gray"

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
            /** @type {any} */
            (ctx).antialias = "gray"

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
            /** @type {any} */
            (ctx).antialias = "gray"

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
            /** @type {any} */
            (ctx).antialias = "gray"

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
            /** @type {any} */
            (ctx).antialias = "gray"

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
            /** @type {any} */
            (ctx).antialias = "gray"

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

            /** @type {any} */
            (ctx).antialias = 'gray';
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
 * @param {string} char
 * @param {number} width
 * @param {number} height
 * @param {string} FG
 * @param {string} BG
 */
function drawSingleWidth(ctx, char, width, height, FG, BG) {
    const handle = function (FG, BG) {
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = FG;
        ctx.textBaseline = 'middle';
        ctx.textAlign = "center";

        /** @type {any} */
        (ctx).antialias = 'gray';
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

module.exports = render;