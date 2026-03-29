/**
 * Inlines lib/data/orb-template-parameters.json into supabase/schema.sql
 * between `  $orb$` + JSON + `$orb$::jsonb`.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const schemaPath = path.join(root, "supabase/schema.sql");
const jsonPath = path.join(root, "lib/data/orb-template-parameters.json");

let schema = fs.readFileSync(schemaPath, "utf8");
const json = fs.readFileSync(jsonPath, "utf8").trim();

const start = schema.indexOf("  $orb$");
if (start === -1) throw new Error("orb start not found");

let end = schema.indexOf("\n$orb$::jsonb", start);
let endMarkerLen = "\n$orb$::jsonb".length;
if (end === -1) {
  end = schema.indexOf("\r\n$orb$::jsonb", start);
  endMarkerLen = "\r\n$orb$::jsonb".length;
}
if (end === -1) throw new Error("orb end not found");
const endAfter = end + endMarkerLen;
const replacement = `  $orb$\n${json}\n$orb$::jsonb`;
schema = schema.slice(0, start) + replacement + schema.slice(endAfter);
fs.writeFileSync(schemaPath, schema);
console.log("Updated supabase/schema.sql ORB parameters_json block.");
