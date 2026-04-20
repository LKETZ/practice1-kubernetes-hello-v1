// app.js - Node.js API with MongoDB integration
const http = require("http");
const url = require("url");
const { MongoClient } = require("mongodb");

// MongoDB connection settings
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://admin:password123@mongodb-service:27017/myapp?authSource=admin";
const HOSTNAME = process.env.HOSTNAME || "unknown";

let mongoClient;
let db;

// Initialize MongoDB connection
async function initializeDB() {
  try {
    console.log(
      `[${new Date().toISOString()}] Attempting to connect to MongoDB at: ${MONGO_URI.split("@")[1]}`,
    );
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    console.log(`[${new Date().toISOString()}] MongoDB connected successfully`);
    db = mongoClient.db("myapp");
    console.log(`[${new Date().toISOString()}] Connected to database: myapp`);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] MongoDB connection error:`,
      error.message,
    );
    process.exit(1);
  }
}

// Request handler
const requestHandler = async (request, response) => {
  const parsedUrl = url.parse(request.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Add CORS headers
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Access-Control-Allow-Origin", "*");

  console.log(
    `[${new Date().toISOString()}] ${request.method} ${request.url} from pod: ${HOSTNAME}`,
  );

  try {
    if (pathname === "/health") {
      response.writeHead(200);
      response.end(JSON.stringify({ status: "healthy", pod: HOSTNAME }));
    } else if (pathname === "/events" && query.year) {
      const year = parseInt(query.year);
      console.log(
        `[${new Date().toISOString()}] Querying events for year: ${year}`,
      );

      const events = await db
        .collection("events")
        .find({ year: year })
        .toArray();
      response.writeHead(200);
      response.end(
        JSON.stringify({
          year: year,
          count: events.length,
          events: events,
          pod: HOSTNAME,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (pathname === "/events") {
      console.log(`[${new Date().toISOString()}] Fetching all events`);
      const events = await db.collection("events").find({}).toArray();
      response.writeHead(200);
      response.end(
        JSON.stringify({
          count: events.length,
          events: events,
          pod: HOSTNAME,
          timestamp: new Date().toISOString(),
        }),
      );
    } else if (pathname === "/") {
      response.writeHead(200);
      response.end(
        JSON.stringify({
          message: "Node.js API with MongoDB",
          endpoints: [
            "GET /health - Health check",
            "GET /events - Get all events",
            "GET /events?year=2564 - Get events by year",
          ],
          pod: HOSTNAME,
          version: "2.0",
        }),
      );
    } else {
      response.writeHead(404);
      response.end(JSON.stringify({ error: "Endpoint not found" }));
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    response.writeHead(500);
    response.end(
      JSON.stringify({
        error: error.message,
        pod: HOSTNAME,
      }),
    );
  }
};

// Start server
const server = http.createServer(requestHandler);

// Initialize DB and start server
initializeDB()
  .then(() => {
    server.listen(3000, () => {
      console.log(
        `[${new Date().toISOString()}] Server is listening on port 3000`,
      );
      console.log(`[${new Date().toISOString()}] Pod Name: ${HOSTNAME}`);
    });
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Failed to initialize:`, error);
    process.exit(1);
  });

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log(
    `[${new Date().toISOString()}] SIGTERM signal received: closing HTTP server`,
  );
  server.close(async () => {
    console.log(`[${new Date().toISOString()}] HTTP server closed`);
    if (mongoClient) {
      await mongoClient.close();
      console.log(`[${new Date().toISOString()}] MongoDB connection closed`);
    }
    process.exit(0);
  });
});
