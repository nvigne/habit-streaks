import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const assets = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/styles.css", ["styles.css", "text/css"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/habit-core.js", ["habit-core.js", "text/javascript"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
]);

const server = createServer(async (request, response) => {
  const asset = assets.get(new URL(request.url, "http://localhost").pathname);
  if (!asset || !["GET", "HEAD"].includes(request.method)) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }
  try {
    const content = await readFile(new URL(`../${asset[0]}`, import.meta.url));
    response.writeHead(200, { "Content-Type": `${asset[1]}; charset=utf-8`, "Cache-Control": "no-store" });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch (error) {
    console.error(`Unable to serve ${asset[0]}:`, error);
    response.writeHead(500, { "Content-Type": "text/plain" });
    response.end("Unable to read site asset. See server output.");
  }
});

server.on("error", (error) => {
  console.error("Unable to start the local server:", error.message);
  process.exitCode = 1;
});
server.listen(4173, "127.0.0.1", () => console.log("Habit streaks: http://127.0.0.1:4173"));
