const fs = require("node:fs");
const ts = require("typescript");
const assert = require("node:assert/strict");
const compiled = ts.transpileModule(
  fs.readFileSync("lib/scheduling.ts", "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  },
).outputText;
const helpers = {};
new Function("exports", "require", compiled)(helpers, require);
const { scheduleInstant, snapshotTasks, zoneFor } = helpers;
for (const [date, time, zone, expected] of [
  ["2030-07-14", "14:30", "America/Los_Angeles", "2030-07-14T21:30:00.000Z"],
  ["2030-01-14", "14:30", "America/Los_Angeles", "2030-01-14T22:30:00.000Z"],
  ["2030-07-14", "14:30", "Asia/Tokyo", "2030-07-14T05:30:00.000Z"],
  ["2030-07-14", "14:30", "Europe/London", "2030-07-14T13:30:00.000Z"],
  ["2030-07-14", "14:30", "Asia/Kathmandu", "2030-07-14T08:45:00.000Z"],
])
  assert.equal(scheduleInstant(date, time, zone).iso, expected);
assert.match(
  scheduleInstant("2030-03-10", "02:30", "America/Los_Angeles").error,
  /does not exist/,
);
assert.match(
  scheduleInstant("2030-11-03", "01:30", "America/Los_Angeles").error,
  /occurs twice/,
);
assert(scheduleInstant("2030-02-30", "14:30", "UTC").error);
assert(scheduleInstant("2030-02-01", "24:00", "UTC").error);
assert(scheduleInstant("", "14:30", "UTC").error);
assert.equal(zoneFor({ timeZone: "Invalid/Zone" }).invalid, true);
assert.equal(zoneFor({}).source, "device");
const property = {
  id: "p",
  name: "Property",
  address: "Address",
  tasks: [
    {
      id: "required",
      label: "Inspect entry",
      done: true,
      requiresPhoto: true,
      photo: "old-photo",
    },
  ],
};
const source = [
  { id: "custom", label: "Patio", done: true, photo: "old-photo" },
];
const before = JSON.stringify({ property, source });
const copy = snapshotTasks(source, property, false);
assert.equal(copy.length, 2);
assert(copy.every((t) => !t.done && !t.photo));
assert(copy.some((t) => t.label === "Inspect entry" && t.requiresPhoto));
assert(snapshotTasks(source, property, true).every((t) => t.requiresPhoto));
assert.notEqual(copy[0].id, source[0].id);
assert.equal(JSON.stringify({ property, source }), before);
assert.equal(
  snapshotTasks(
    [{ id: "same", label: "inspect ENTRY", done: false, requiresPhoto: false }],
    property,
    false,
  )[0].requiresPhoto,
  true,
);
console.log(
  "Passed: property/device time-zone selection; UTC conversions in five zones, DST gap/fold and invalid date/time rejection; immutable snapshots and mandatory-photo merging.",
);
