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
const shiftTemplatePath = path.join(projectRoot, "assets", "vardiya_sablonu.xlsx");
const shiftTemplateBase64 = fs.readFileSync(shiftTemplatePath).toString("base64");
html = html.replace(
  "</head>",
  `<script>window.ETILISMART_SHIFT_TEMPLATE_BASE64="${shiftTemplateBase64}";</script></head>`,
);

const scriptPattern = /<script\s+src=["']([^"']+)["']><\/script>/gi;
html = html.replace(scriptPattern, (_tag, source) => {
  if (/^https?:\/\//i.test(source)) return _tag;
  const javascript = fs
    .readFileSync(path.join(projectRoot, source), "utf8")
    .replace(/<\/script/gi, "<\\/script");
  return `<script>\n${javascript}\n</script>`;
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(outputPath);
