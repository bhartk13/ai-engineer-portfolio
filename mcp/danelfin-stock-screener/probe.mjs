import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const API_KEY = process.env.DANELFIN_API_KEY;
if (!API_KEY) {
  console.error("Set DANELFIN_API_KEY env var first");
  process.exit(1);
}

const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.danelfin.com/mcp"),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    },
  }
);

const client = new Client({ name: "probe", version: "1.0.0" });

try {
  await client.connect(transport);
  console.log("Connected OK");
  const tools = await client.listTools();
  console.log(JSON.stringify(tools, null, 2));
} catch (err) {
  console.error("ERROR:", err.message);
  if (err.cause) console.error("CAUSE:", err.cause);
} finally {
  process.exit(0);
}
