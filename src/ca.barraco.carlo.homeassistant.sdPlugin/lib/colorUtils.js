function miredToHex(mired) {
    var temperature = miredToKelvin(mired) * 1.5;
    temperature = temperature / 100;

    var red = 255;
    if (temperature > 66) {
        red = temperature - 60;
        red = 329.698727446 * (Math.pow(red, -0.1332047592));
        if (red < 0) red = 0;
        if (red > 255) red = 255;
    }

    var green = 255;
    if (temperature <= 66) {
        green = temperature;
        green = 99.4708025861 * Math.log(green) - 161.1195681661;
        if (green < 0) green = 0;
        if (green > 255) green = 255;
    } else {
        green = temperature - 60;
        green = 288.1221695283 * (Math.pow(green, -0.0755148492));
        if (green < 0) green = 0;
        if (green > 255) green = 255;
    }

    var blue = 255;
    if (temperature >= 66) {
        blue = 255;
    } else {
        if (temperature <= 19) {
            blue = 0;
        } else {
            blue = temperature - 10;
            blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
            if (blue < 0) blue = 0;
            if (blue > 255) blue = 255;
        }
    }
    return rgbToHex(Math.round(red), Math.round(green), Math.round(blue));
}

function miredToKelvin(mired) {
    return Math.round(1000000.0 / mired);
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
          }
        : null;
}
