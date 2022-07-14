import path from "node:path";
import fsp from "node:fs/promises";
import { optimize, createContentItem } from "svgo";

let HEROICONS_PATH = path.join(process.cwd(), "node_modules/heroicons");
let HEROICONS_SOLID_PATH = path.join(HEROICONS_PATH, "solid");
let HEROICONS_OUTLINE_PATH = path.join(HEROICONS_PATH, "outline");

let OUTDIR = path.join(process.cwd(), "app/icons");
let OUTDIR_SOLID = path.join(OUTDIR, "solid");
let OUTDIR_OUTLINE = path.join(OUTDIR, "outline");

async function wrapSymbol(inputPath, outputDir) {
  let ext = path.extname(inputPath);
  let base = path.basename(inputPath, ext);
  let content = await fsp.readFile(inputPath, "utf-8");
  let outputPath = path.join(outputDir, `${base}.svg`);

  let result = optimize(content, {
    path: inputPath,
    plugins: [
      {
        name: "preset-default",
      },
      {
        name: "removeViewBox",
        active: false,
      },
      {
        name: "removeDimensions",
        active: true,
      },
      {
        name: "wrapInSymbol",
        type: "perItem",
        fn(item) {
          if (item.type === "element" && item.name === "svg") {
            let { xmlns, ...attributes } = item.attributes;

            // remove all attributes from parent svg element
            for (let attribute in attributes) {
              if (Object.hasOwn(attributes, attribute)) {
                delete item.attributes[attribute];
              }
            }

            let children = item.children;

            // add parent's attributes to new symbol child
            item.children = [
              createContentItem({
                type: "element",
                name: "symbol",
                attributes: { ...attributes, id: base },
                children,
              }),
            ];
          }
        },
      },
    ],
  });

  let optimizedSvgString = result.data;

  return fsp.writeFile(outputPath, optimizedSvgString);
}

async function compile() {
  // 1. verify all output directories exist
  await Promise.all([
    fsp.mkdir(OUTDIR_SOLID, { recursive: true }),
    fsp.mkdir(OUTDIR_OUTLINE, { recursive: true }),
  ]);

  // 2. get all svg icons from heroicons
  let [solid, outline] = await Promise.all([
    fsp.readdir(HEROICONS_SOLID_PATH),
    fsp.readdir(HEROICONS_OUTLINE_PATH),
  ]);

  // 3. generate icons
  await Promise.all([
    ...solid.map((icon) =>
      wrapSymbol(path.join(HEROICONS_SOLID_PATH, icon), OUTDIR_SOLID)
    ),
    ...outline.map((icon) =>
      wrapSymbol(path.join(HEROICONS_OUTLINE_PATH, icon), OUTDIR_OUTLINE)
    ),
  ]);
}

compile();
