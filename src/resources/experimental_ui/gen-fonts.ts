import * as jimp from "jimp";

import { defaultPalette } from "../../computercraft/common/terminal";

const colourFunction = async (name: string) => {
  const image = await jimp.read(`${__dirname}/images/${name}.png`);

  const tasks: Array<Promise<jimp>> = [];
  for (const key in defaultPalette) {
    if (!defaultPalette.hasOwnProperty(key)) continue;

    const [, rs, gs, bs ] = defaultPalette[key].match(/rgb\((\d+),(\d+),(\d+)\)/)!;
    const r = parseInt(rs, 10);
    const g = parseInt(gs, 10);
    const b = parseInt(bs, 10);

    const modified = image.cloneQuiet();
    modified.scanQuiet(0, 0, image.getWidth(), image.getHeight(), (_x: number, _y: number, idx: number) => {
      modified.bitmap.data[idx] = r;
      modified.bitmap.data[idx + 1] = g;
      modified.bitmap.data[idx + 2] = b;
    });
    tasks.push(modified.writeAsync(`${__dirname}/images/${name}_${key}.png`));
  }

  await Promise.all(tasks);
};

Promise.all([ "term_font", "term_font_hd"].map(colourFunction));
