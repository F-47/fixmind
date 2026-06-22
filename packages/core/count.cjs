const fs = require("fs");
const mcpCode = fs.readFileSync("./src/mcp.ts", "utf8");
const setupCode = fs.readFileSync("./src/setup.ts", "utf8");

const mcpMatch = mcpCode.match(/export const MCP_INSTRUCTIONS = `([\s\S]*?)`\.trim\(\);/);
const mcpInst = mcpMatch ? mcpMatch[1] : "";

const setupMatch = setupCode.match(/const INSTRUCTION_BODY = `\\?\n([\s\S]*?)`;/);
const setupInst = setupMatch ? setupMatch[1] : "";

const schemaMatch = mcpCode.match(/export const lessonInputSchema = z\.object\(\{([\s\S]*?)\}\);/);
const schemaDef = schemaMatch ? schemaMatch[1] : "";

console.log("MCP_INSTRUCTIONS chars:", mcpInst.length, "Tokens:", Math.round(mcpInst.length/4));
console.log("INSTRUCTION_BODY chars:", setupInst.length, "Tokens:", Math.round(setupInst.length/4));
console.log("Schema chars:", schemaDef.length, "Tokens:", Math.round(schemaDef.length/4));

const totalTokens = Math.round((mcpInst.length + setupInst.length + schemaDef.length) / 4);
console.log("Total Tokens (approx):", totalTokens);

