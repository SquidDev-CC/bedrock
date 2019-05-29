import { promises as fs } from "fs";
import * as JsZip from "jszip";
import { join } from "path";

const Zip: typeof JsZip = (JsZip as any).default;

const add = async (zip: JsZip, path: string) => {
  const files = await fs.readdir(path, { withFileTypes: true });
  await Promise.all(files.map(async file => {
    const full = join(path, file.name);
    if (file.isDirectory()) {
      await add(zip.folder(file.name), full);
    } else {
      await zip.file(file.name, fs.readFile(full));
    }
  }));

  return zip;
};

(async () => {
  const zip = new Zip();
  await Promise.all([
    zip.file(
      "CCTweaked - Resources.mcpack",
      (await add(new Zip(), `src/resources`)).generateAsync({ type: "nodebuffer" }),
    ),
    zip.file(
      "CCTweaked - Behaviors.mcpack",
      (await add(new Zip(), `src/behaviours`)).generateAsync({ type: "nodebuffer" }),
    ),
  ]);

  await fs.writeFile("CCTweaked.mcaddon", await zip.generateAsync({ type: "nodebuffer" }));
})();
