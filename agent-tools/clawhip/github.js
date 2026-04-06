// Clawhip — GitHub Integration
// Listens for GitHub webhook events and routes them to the agent pipeline

const http = require("http");
const crypto = require("crypto");

const WEBHOOK_PORT = parseInt(process.env.CLAWHIP_WEBHOOK_PORT || "9876");

/**
 * Start a webhook listener for GitHub events
 * @param {object} config — Clawhip config
 * @param {EventEmitter} emitter — event bus
 */
function listen(config, emitter) {
  const server = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/webhook") {
      res.writeHead(404);
      return res.end("Not found");
    }

    let body = "";
    let oversized = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 65536) { oversized = true; req.destroy(); }
    });

    req.on("end", () => {
      if (oversized) {
        res.writeHead(413);
        return res.end("Payload too large");
      }

      // Verify signature if secret is configured
      if (config.githubSecret) {
        const sig = req.headers["x-hub-signature-256"];
        const expected = "sha256=" + crypto
          .createHmac("sha256", config.githubSecret)
          .update(body)
          .digest("hex");
        if (sig !== expected) {
          res.writeHead(401);
          return res.end("Invalid signature");
        }
      }

      let payload;
      try { payload = JSON.parse(body); } catch {
        res.writeHead(400);
        return res.end("Invalid JSON");
      }

      const event = req.headers["x-github-event"];
      routeEvent(event, payload, emitter);

      res.writeHead(200);
      res.end("OK");
    });
  });

  server.listen(WEBHOOK_PORT, () => {
    console.log(`[Clawhip/GitHub] Webhook listener on port ${WEBHOOK_PORT}`);
  });
}

/**
 * Route a GitHub event to the appropriate handler
 * @param {string} event — GitHub event type
 * @param {object} payload — event payload
 * @param {EventEmitter} emitter — event bus
 */
function routeEvent(event, payload, emitter) {
  switch (event) {
    case "issues":
      if (payload.action === "opened") {
        emitter.emit("github:issue", {
          number: payload.issue.number,
          title: payload.issue.title,
          body: payload.issue.body || "",
          labels: (payload.issue.labels || []).map(l => l.name),
          url: payload.issue.html_url,
        });
      }
      break;

    case "pull_request":
      if (payload.action === "opened" || payload.action === "synchronize") {
        emitter.emit("github:pr", {
          number: payload.pull_request.number,
          title: payload.pull_request.title,
          body: payload.pull_request.body || "",
          branch: payload.pull_request.head.ref,
          url: payload.pull_request.html_url,
        });
      }
      break;

    case "push":
      emitter.emit("github:push", {
        ref: payload.ref,
        commits: (payload.commits || []).map(c => ({
          message: c.message,
          sha: c.id.slice(0, 8),
        })),
      });
      break;

    default:
      // Unhandled event type — log but don't act
      console.log(`[Clawhip/GitHub] Unhandled event: ${event}`);
  }
}

module.exports = { listen, routeEvent };
