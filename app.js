// app.js
/*
const http = require('http');
const requestHandler = (request, response) => {
 console.log(`Received request for URL: ${request.url}`);
 response.end(`Hello World V2!!!!! from Kubernetes! Pod Name:
${process.env.HOSTNAME}\n`);
};
const server = http.createServer(requestHandler);
server.listen(3000, () => {
 console.log('Server is listening on port 3000');
});
*/
// app.js (Updated)
const http = require('http');
// Access environment variables provided by Kubernetes
const MESSAGE = process.env.APP_MESSAGE || "Hello from the Automated Pipeline!";
const API_KEY = process.env.API_KEY || "UNSET_KEY";
const requestHandler = (request, response) => {
  console.log(`Request received!`);
  response.end(`
  Message: ${MESSAGE}
  API Key: ${API_KEY}
  Pod Name: ${process.env.HOSTNAME}
  \n`);
};
const server = http.createServer(requestHandler);
server.listen(3000, () => {
 console.log('Server is listening on port 3000');
});