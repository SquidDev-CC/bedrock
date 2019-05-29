/** Generates CSS styles for all the terminal characters  */

import * as fs from "fs";
import { defaultPalette } from "../../computercraft/common/terminal";

const cellWidth = 6;
const cellHeight = 9;

const font = {
  scale: 2,
  margin: 2,
};

const lines: string[] = [];

for (let chr = 0 ; chr < 256; chr++) {
  const imageW = cellWidth * font.scale;
  const imageH = cellHeight * font.scale;
  const imgX = font.margin + (chr % 16) * (imageW + font.margin * 2);
  const imgY = font.margin + Math.floor(chr / 16) * (imageH + font.margin * 2);

  lines.push(`.term-text-${chr} { background-position: -${imgX}px -${imgY}px; }`);
}

for (const k in defaultPalette) {
  if (!defaultPalette.hasOwnProperty(k)) continue;
  lines.push(`.term-back-${k} { background-color: ${defaultPalette[k]}; }`);
}

for (const k in defaultPalette) {
  if (!defaultPalette.hasOwnProperty(k)) continue;
  lines.push(`.term-fore-${k} { background-image: url("images/term_font_hd_${k}.png"); }`);
}

lines.push("");

fs.writeFile(`${__dirname}/generated.css`, lines.join("\n"), err => {
  if (err !== null) throw err;
});
