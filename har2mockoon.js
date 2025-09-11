#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { URL } = require("url");

// safely decode URI components without throwing
function safeDecode(value) {
  try {
    return typeof value === "string" ? decodeURIComponent(value) : (value ?? "");
  } catch {
    return value ?? "";
  }
}

// migrate existing environment to ensure rules target query params and rules-based selection
function migrateEnvRules(environment) {
  if (!environment || !Array.isArray(environment.routes)) return;
  for (const route of environment.routes) {
    // enforce rules-based selection
    route.responseMode = "RULES";
    if (!Array.isArray(route.responses)) continue;
    for (const resp of route.responses) {
      if (!Array.isArray(resp.rules)) continue;
      // convert legacy targets ("body" or "query") to "queryParam"
      // and convert equals with empty value to exists
      resp.rules = normalizeRules(
        resp.rules.map(rule => ({
          target: "queryParam",
          modifier: rule.modifier,
          operator: (rule.operator === "equals" && (rule.value === "" || rule.value == null)) ? "exists" : rule.operator,
          value: rule.value,
          invert: !!rule.invert
        }))
      );
      if (!resp.rulesOperator) resp.rulesOperator = "AND";
    }
  }
}

// normalize and sort rules for stable comparisons
function normalizeRules(rules) {
  if (!Array.isArray(rules)) return [];
  const normalized = rules.map(r => ({
    target: r.target,
    modifier: safeDecode(r.modifier),
    operator: r.operator,
    value: safeDecode(r.value),
    invert: !!r.invert
  }));
  normalized.sort((a, b) =>
    (a.target || "").localeCompare(b.target || "") ||
    (a.modifier || "").localeCompare(b.modifier || "") ||
    String(a.value ?? "").localeCompare(String(b.value ?? "")) ||
    (a.operator || "").localeCompare(b.operator || "") ||
    (a.invert === b.invert ? 0 : a.invert ? 1 : -1)
  );
  return normalized;
}

const INPUT_DIR = "input";
const OUTPUT_DIR = "output";
const OUTPUT_FILE = path.join(OUTPUT_DIR, "mockoon.json");

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

// migrate any legacy rules/response modes from existing env
migrateEnvRules(env);

// create routeMap from current environment
const routeMap = new Map(env.routes.map(r => [`${r.method} /${r.endpoint}`, r]));

// track known query param names per route for exclusion rules
const routeParamMap = new Map();
for (const r of env.routes) {
  const key = `${r.method} /${r.endpoint}`;
  const set = new Set();
  if (Array.isArray(r.responses)) {
    for (const resp of r.responses) {
      if (Array.isArray(resp.rules)) {
        for (const rule of resp.rules) {
          if (rule.target === "queryParam" && rule.modifier) {
            set.add(rule.modifier);
          }
        }
      }
    }
  }
  routeParamMap.set(key, set);
}

// process each HAR file in the input folder
const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".har"));

if (files.length === 0) {
  console.log("⚠️ No HAR files found in input/ (will still write migrated environment)");
}

for (const file of files) {
  const filePath = path.join(INPUT_DIR, file);
  console.log(`📂 Processing ${file}...`);

  const har = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const entries = har.log?.entries || [];

  for (const entry of entries) {
    const req = entry.request;
    const res = entry.response;

    // skip errored or missing responses
    if (!res || res.status >= 400) {
      console.log(`⚠️ Skipped errored request ${req?.url} (${res?.status})`);
      continue;
    }

    let pathName;
    try {
      pathName = new URL(req.url).pathname;
    } catch {
      pathName = req.url;
    }

    const method = (req.method || "GET").toLowerCase();
    const key = `${method} ${pathName}`;

    // parse response body
    let body = res.content?.text || "";
    if (res.content?.mimeType?.includes("json")) {
      try {
        body = JSON.stringify(JSON.parse(body), null, 2);
      } catch {
        // keep original if parsing fails
      }
    }
    if (!body) {
      console.log(`⚠️ Skipped empty body for ${req.url}`);
      continue;
    }

    // build rules from query parameters + exclusion rules for absent params
    const currentParams = new Set((req.queryString || []).map(q => q.name));

    // ensure we track all params seen for this route
    if (!routeParamMap.has(key)) routeParamMap.set(key, new Set());
    const knownParams = routeParamMap.get(key);
    currentParams.forEach(p => knownParams.add(p));

    const baseRules = (req.queryString || []).map(q => {
      const isEmpty = q.value == null || q.value === "";
      return {
        target: "queryParam",
        modifier: q.name,
        operator: isEmpty ? "exists" : "equals",
        value: isEmpty ? "" : q.value,
        invert: false
      };
    });

    // add inverted exists rule for every known param missing in current request
    const exclusionRules = [...knownParams]
      .filter(name => !currentParams.has(name))
      .map(name => ({
        target: "queryParam",
        modifier: name,
        operator: "exists",
        value: "",
        invert: true
      }));

    const rules = normalizeRules([...baseRules, ...exclusionRules]);

    const newResponse = {
      uuid: uuidv4(),
      body,
      latency: 0,
      statusCode: res.status,
      label: `${res.status} ${req.url}`,
      headers: (res.headers || []).map(h => ({ key: h.name, value: h.value })),
      bodyType: "INLINE",
      filePath: "",
      databucketID: "",
      sendFileAsBody: false,
      rules,
      rulesOperator: "AND", // must match all params
      disableTemplating: false,
      fallbackTo404: false,
      default: false,
      crudKey: "id",
      callbacks: []
    };

    if (routeMap.has(key)) {
      const route = routeMap.get(key);

      // check duplicate (status + normalized rules)
      const newRulesKey = JSON.stringify(newResponse.rules);
      const exists = route.responses.some(r =>
        r.statusCode === newResponse.statusCode &&
        JSON.stringify(normalizeRules(r.rules)) === newRulesKey
      );

      if (!exists) {
        route.responses.push(newResponse);
        console.log(`➕ Added response ${newResponse.statusCode} with rules to ${key}`);
      } else {
        console.log(`⚠️ Skipped duplicate response for ${key}`);
      }
    } else {
      // create new route
      const routeUuid = uuidv4();
      const newRoute = {
        uuid: routeUuid,
        type: "http",
        documentation: "",
        method,
        endpoint: pathName.replace(/^\/+/, ""),
        responses: [newResponse],
        responseMode: "RULES", // auto-select by rules
        streamingMode: null,
        streamingInterval: 0
      };

      env.routes.push(newRoute);
      env.rootChildren.push({ type: "route", uuid: routeUuid });
      routeMap.set(key, newRoute);
      // seed known params for this new route
      routeParamMap.set(key, new Set([...currentParams]));

      console.log(`✅ Added new route ${key}`);
    }
  }

  // delete file after processing is complete
  fs.unlinkSync(filePath);
  console.log(`🗑️ Deleted ${file}`);
}

// enforce rules-based selection, reorder responses and set default per route
for (const route of env.routes) {
  if (!route.responseMode || route.responseMode !== "RULES") {
    route.responseMode = "RULES";
  }
  if (!Array.isArray(route.responses) || route.responses.length === 0) continue;

  // sort: more specific first (more rules), then responses WITHOUT rules last
  route.responses.sort((a, b) => {
    const aCount = Array.isArray(a.rules) ? a.rules.length : 0;
    const bCount = Array.isArray(b.rules) ? b.rules.length : 0;
    if (aCount !== bCount) return bCount - aCount; // DESC by rule count
    const aHasRules = aCount > 0;
    const bHasRules = bCount > 0;
    return (aHasRules === bHasRules) ? 0 : (aHasRules ? -1 : 1);
  });

  // choose default: prefer a response WITHOUT rules (catch-all)
  let defaultIndex = route.responses.findIndex(r => !r.rules || r.rules.length === 0);
  if (defaultIndex === -1) defaultIndex = 0;

  route.responses.forEach((r, i) => (r.default = i === defaultIndex));
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(env, null, 2), "utf8");
console.log(`🎉 All HAR files converted → ${OUTPUT_FILE}`);
