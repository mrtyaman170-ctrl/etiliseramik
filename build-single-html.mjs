import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const indexPath = path.join(projectRoot, "index.html");
const defaultOutput = path.join(projectRoot, "dist", "ETILISMART.html");
const outputIndex = process.argv.indexOf("--output");
const outputPath =
  outputIndex >= 0 && process.argv[outputIndex + 1]
    ? path.resolve(process.argv[outputIndex + 1])
    : defaultOutput;

let html = fs.readFileSync(indexPath, "utf8");
const stylesheetPattern =
  /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/i;
const stylesheet = html.match(stylesheetPattern);

if (!stylesheet) throw new Error("Stil dosyası bağlantısı bulunamadı.");

const css = fs.readFileSync(path.join(projectRoot, stylesheet[1]), "utf8");
html = html.replace(stylesheet[0], `<style>\n${css}\n</style>`);

const scriptPattern = /<script\s+src=["']([^"']+)["']><\/script>/gi;
html = html.replace(scriptPattern, (_tag, source) => {
  const javascript = fs
    .readFileSync(path.join(projectRoot, source), "utf8")
    .replace(/<\/script/gi, "<\\/script");
  return `<script>\n${javascript}\n</script>`;
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(outputPath);
