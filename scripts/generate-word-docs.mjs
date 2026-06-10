/**
 * 将 Markdown 源文件转换为 Word (.docx)
 * 运行: npm run docs:word
 */
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const sourceDir = join(root, "docs", "source");
const outDir = join(root, "docs", "download");

const files = [
  { in: "产品手册.md", out: "GEO-Commerce-产品手册.docx" },
  { in: "使用文档.md", out: "GEO-Commerce-使用文档.docx" },
];

function parseInline(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push(new TextRun({ text: part.slice(1, -1), font: "Consolas", size: 20 }));
    } else {
      runs.push(new TextRun({ text: part }));
    }
  }
  return runs.length ? runs : [new TextRun({ text })];
}

function parseTableRow(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim());
}

function isTableSeparator(line) {
  return /^\|[-| :]+\|$/.test(line.trim());
}

function mdToDocx(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const children = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          shading: { fill: "F3F4F6" },
          children: [
            new TextRun({
              text: codeLines.join("\n"),
              font: "Consolas",
              size: 18,
            }),
          ],
        })
      );
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        if (!isTableSeparator(lines[i])) tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length > 0) {
        const rows = tableLines.map(parseTableRow);
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: rows.map(
              (cells, rowIdx) =>
                new TableRow({
                  children: cells.map(
                    (cell) =>
                      new TableCell({
                        children: [
                          new Paragraph({
                            children: parseInline(cell),
                          }),
                        ],
                        shading: rowIdx === 0 ? { fill: "E5E7EB" } : undefined,
                      })
                  ),
                })
            ),
          })
        );
        children.push(new Paragraph({ text: "" }));
      }
      continue;
    }

    const h1 = trimmed.match(/^# (.+)$/);
    const h2 = trimmed.match(/^## (.+)$/);
    const h3 = trimmed.match(/^### (.+)$/);
    const h4 = trimmed.match(/^#### (.+)$/);

    if (h1) {
      children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: parseInline(h1[1]) }));
    } else if (h2) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: parseInline(h2[1]) }));
    } else if (h3) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: parseInline(h3[1]) }));
    } else if (h4) {
      children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: parseInline(h4[1]) }));
    } else if (trimmed.startsWith("- [ ]")) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInline(trimmed.replace(/^- \[ \]\s*/, "☐ ")),
        })
      );
    } else if (trimmed.startsWith("- ")) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: parseInline(trimmed.slice(2)),
        })
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      children.push(
        new Paragraph({
          numbering: { reference: "default-numbering", level: 0 },
          children: parseInline(trimmed.replace(/^\d+\.\s/, "")),
        })
      );
    } else if (trimmed === "---") {
      children.push(new Paragraph({ text: "" }));
    } else {
      children.push(new Paragraph({ children: parseInline(trimmed) }));
    }
    i++;
  }

  return new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "start",
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

async function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (const { in: inFile, out: outFile } of files) {
    const md = readFileSync(join(sourceDir, inFile), "utf-8");
    const doc = mdToDocx(md);
    const buffer = await Packer.toBuffer(doc);
    const outPath = join(outDir, outFile);
    writeFileSync(outPath, buffer);
    console.log("Generated:", outPath);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
