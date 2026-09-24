import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = { window: {} };
vm.createContext(context);
const source = await readFile(new URL("../src/resume/pdf-text-layout.js", import.meta.url), "utf8");
vm.runInContext(source, context, { filename: "src/resume/pdf-text-layout.js" });
const layout = context.window.RoleFitPdfTextLayout.create();

function item(text, x, y, width) {
  return { str: text, transform: [1, 0, 0, 1, x, y], width };
}

const dateGutterItems = [
  item("EXPERIENCE", 40, 720, 80),
  item("Parental Career Break", 40, 700, 145),
  item("2024 - Present", 510, 700, 70),
  item("Career break to care for twins.", 40, 680, 180),
  item("(GitHub", 230, 680, 45),
  item(")", 278, 680, 5),
  item("Yahoo Research", 40, 650, 90),
  item("Senior Research Engineer", 145, 650, 150),
  item("2017 - 2024", 520, 650, 60),
  item("Led recommender systems serving", 40, 630, 205),
  item("over 2 billion impressions.", 250, 630, 145),
  item("Teaching Assistant", 40, 600, 100),
  item("2013 - 2016", 520, 600, 60),
  item("Research Intern", 40, 580, 85),
  item("2015", 555, 580, 25),
  item("Student Developer", 40, 560, 100),
  item("2012 - 2013", 520, 560, 60),
  item("EDUCATION", 40, 530, 75),
  item("M.Sc. Computer Science", 40, 510, 130),
  item("2013 - 2016", 520, 510, 60),
  item("B.Sc. Computer Science", 40, 490, 125),
  item("2009 - 2013", 520, 490, 60),
  item("PUBLICATIONS", 40, 460, 90),
  item("ACM RecSys", 40, 440, 65),
  item("2024", 555, 440, 25),
  item("IEEE Big Data", 40, 420, 85),
  item("2023", 555, 420, 25)
];

const dateGutterText = layout.extractPageText(dateGutterItems, 612);
assert.match(dateGutterText, /Parental Career Break 2024 - Present/, "a right-aligned current-role date should stay with its entry");
assert.match(dateGutterText, /Career break to care for twins\. \(GitHub\)/, "punctuation-only closing parentheses should survive PDF extraction");
assert.match(dateGutterText, /Yahoo Research Senior Research Engineer 2017 - 2024/, "a right-aligned employment range should stay on the role row");
assert.match(dateGutterText, /M\.Sc\. Computer Science 2013 - 2016/, "education dates should stay with their degree");
assert.match(dateGutterText, /ACM RecSys 2024/, "publication years should stay with their publication row");
assert.doesNotMatch(dateGutterText, /PUBLICATIONS[\s\S]*2024\n2023$/, "dates must not be collected into a trailing date-only block");

const twoColumnItems = [];
for (let index = 0; index < 8; index += 1) {
  const y = 700 - index * 20;
  twoColumnItems.push(item(`Left ${index + 1}`, 40, y, 70));
  twoColumnItems.push(item(`Right ${index + 1}`, 400, y, 80));
}
const columns = layout.extractPageColumns(twoColumnItems, 612);
assert.equal(columns.length, 2, "a genuine two-column page should remain two separate reading flows");
assert.deepEqual(JSON.parse(JSON.stringify(columns[0])), Array.from({ length: 8 }, (_, index) => `Left ${index + 1}`));
assert.deepEqual(JSON.parse(JSON.stringify(columns[1])), Array.from({ length: 8 }, (_, index) => `Right ${index + 1}`));

console.log("PDF text layout tests passed");
