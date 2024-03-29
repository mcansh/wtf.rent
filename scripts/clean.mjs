#!/usr/bin/env node

import path from "node:path";
import { promisify } from "node:util";

import { deleteAsync } from "del";
import kleur from "kleur";
import Gitignore from "gitignore-fs";
import glob from "glob";

let asyncGlob = promisify(glob);

async function clean() {
  let cwd = process.cwd();
  let gitignore = new Gitignore();

  let files = await asyncGlob("**/*", {
    absolute: true,
    ignore: ["node_modules/**/*"],
    nodir: true,
    cwd,
  });

  let filesToDelete = files.filter((file) => {
    return gitignore.ignoresSync(file);
  });

  let deleted = await deleteAsync(filesToDelete);

  if (deleted.length > 0) {
    let deletedPaths = deleted.map((file) => path.relative(cwd, file));
    console.log(`✨ Deleted the following files and directories`);
    console.log(
      kleur.red(deletedPaths.map((file) => "👉 " + file).join("\n") + "\n")
    );
  }
}

clean().then(
  () => {
    process.exit(0);
  },
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
