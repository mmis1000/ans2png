/// @ts-check

const b2uTable = /** @type {{[key: string]:string}} */(require("./b2u_table.js"));

/**
 * @param {number[]|Buffer|Uint8Array} buffer
 */
function b2u(buffer) {
    let res = "";
    
    let highPart = null;
    let nextLowPart = false;

    for (let i = 0; i < buffer.length; i++) {
        if (nextLowPart) {
            let code = highPart.toString(16).toUpperCase() + buffer[i].toString(16).toUpperCase();

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

module.exports = b2u;