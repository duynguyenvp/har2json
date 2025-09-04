#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { URL } = require("url");

const INPUT_DIR = "input";
const OUTPUT_DIR = "output";
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mockoon.json");

// ensure input directory exists
if (!fs.existsSync(INPUT_DIR)) {
  fs.mkdirSync(INPUT_DIR, { recursive: true });
}

// ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// initialize mockoon environment if it doesn't exist
let env;
if (fs.existsSync(OUTPUT_FILE)) {
  env = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
} else {
  env = {
    uuid: uuidv4(),
    lastMigration: 33,
    name: "Converted HAR",
    endpointPrefix: "",
    latency: 0,
    port: 3000,
    hostname: "",
    folders: [],
    routes: [],
    rootChildren: [],
    proxyMode: false,
    proxyHost: "",
    proxyRemovePrefix: false,
    tlsOptions: {
      enabled: false,
      type: "CERT",
      pfxPath: "",
      certPath: "",
      keyPath: "",
      caPath: "",
      passphrase: ""
    },
    cors: true,
    headers: [{ key: "Content-Type", value: "application/json" }],
    proxyReqHeaders: [],
    proxyResHeaders: [],
    data: [],
    callbacks: []
  };
}

// create routeMap from current environment
const routeMap = new Map(
  env.routes.map(r => [`${r.method} /${r.endpoint}`, r])
);

// process each HAR file in the input folder
const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".har"));

if (files.length === 0) {
  console.log("⚠️ No HAR files found in input/");
  process.exit(0);
}

for (const file of files) {
  const filePath = path.join(INPUT_DIR, file);
  console.log(`📂 Processing ${file}...`);

  const har = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const entries = har.log?.entries || [];

  for (const entry of entries) {
    const req = entry.request;
    const res = entry.response;

    let pathName;
    try { pathName = new URL(req.url).pathname; }
    catch { pathName = req.url; }

    const method = req.method.toLowerCase();
    const key = `${method} ${pathName}`;

    // parse response body
    let body = res.content?.text || "";
    if (res.content?.mimeType?.includes("json")) {
      try { body = JSON.stringify(JSON.parse(body), null, 2); }
      catch { /* keep original if parsing fails */ }
    }

    const newResponse = {
      uuid: uuidv4(),
      body,
      latency: 0,
      statusCode: res.status,
      label: "",
      headers: res.headers?.map(h => ({ key: h.name, value: h.value })) || [],
      bodyType: "INLINE",
      filePath: "",
      databucketID: "",
      sendFileAsBody: false,
      rules: [],
      rulesOperator: "OR",
      disableTemplating: false,
      fallbackTo404: false,
      default: false,
      crudKey: "id",
      callbacks: []
    };

    if (routeMap.has(key)) {
      // route already exists → only add response if status is new
      const route = routeMap.get(key);
      const existingStatus = new Set(route.responses.map(r => r.statusCode));
      if (!existingStatus.has(newResponse.statusCode)) {
        route.responses.push(newResponse);
        console.log(`➕ Added response ${newResponse.statusCode} to ${key}`);
      } else {
        console.log(`⚠️ Skipped duplicate ${key} ${newResponse.statusCode}`);
      }
    } else {
      // create new route
      const routeUuid = uuidv4();
      const newRoute = {
        uuid: routeUuid,
        type: "http",
        documentation: "",
        method,
        endpoint: pathName.replace(/^\//, ""),
        responses: [newResponse],
        responseMode: null,
        streamingMode: null,
        streamingInterval: 0
      };

      env.routes.push(newRoute);
      env.rootChildren.push({ type: "route", uuid: routeUuid });
      routeMap.set(key, newRoute);

      console.log(`✅ Added new route ${key}`);
    }
  }

  // delete file after processing is complete
  fs.unlinkSync(filePath);
  console.log(`🗑️ Deleted ${file}`);
}

// set default response for each route
for (const route of env.routes) {
  if (route.responses.length > 0) {
    route.responses.forEach(r => r.default = false);
    route.responses[0].default = true;
  }
}

// write output file
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(env, null, 2), "utf8");
console.log(`🎉 All HAR files converted → ${OUTPUT_FILE}`);
