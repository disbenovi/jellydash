#!/usr/bin/env node
/**
 * Apply the security pins in overrides/npm-security-overrides.json to the
 * upstream package.json before `npm install` runs in the Dockerfile.
 *
 * npm refuses an `overrides` entry that disagrees with a direct dependency
 * ("EOVERRIDE: Override for next@^16.3.0 conflicts with direct dependency"),
 * so for every pinned package that the upstream package.json declares itself
 * we rewrite the declared range instead of overriding it. Everything else is
 * forced through `overrides`, which applies at every depth of the tree.
 *
 * Usage: node apply-npm-overrides.cjs <pins.json> [package.json]
 */
const fs = require("fs");
const path = require("path");

const pinsPath = process.argv[2] || "npm-security-overrides.json";
const pkgPath = process.argv[3] || "package.json";

const pins = JSON.parse(fs.readFileSync(pinsPath, "utf8"));
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const direct = [];
const overrides = { ...(pkg.overrides || {}) };

for (const [name, version] of Object.entries(pins)) {
  let handled = false;
  for (const field of ["dependencies", "devDependencies", "optionalDependencies"]) {
    if (pkg[field] && Object.prototype.hasOwnProperty.call(pkg[field], name)) {
      pkg[field][name] = version;
      direct.push(`${field}:${name}@${version}`);
      handled = true;
    }
  }
  if (!handled) {
    overrides[name] = version;
  }
}

if (Object.keys(overrides).length > 0) {
  pkg.overrides = overrides;
} else {
  delete pkg.overrides;
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log("direct pins:", direct.join(", ") || "(none)");
console.log("tree overrides:", JSON.stringify(overrides));
