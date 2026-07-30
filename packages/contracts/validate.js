const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const fs = require("fs");
const path = require("path");

const ajv = new Ajv();
addFormats(ajv);

const schemas = [
  "session.schema.json",
  "prompt.schema.json",
  "message.schema.json",
  "plugin.schema.json"
];

const samples = {
  "session.schema.json": "session.sample.json",
  "message.schema.json": "message.sample.json"
};

let allValid = true;

schemas.forEach(schemaFile => {
  const schemaPath = path.join(__dirname, "src/schemas", schemaFile);
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
  const validate = ajv.compile(schema);

  const sampleFile = samples[schemaFile];
  if (sampleFile) {
    const samplePath = path.join(__dirname, "samples", sampleFile);
    const sample = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
    const valid = validate(sample);

    if (!valid) {
      console.error(`Validation failed for ${sampleFile} against ${schemaFile}`);
      console.error(validate.errors);
      allValid = false;
    } else {
      console.log(`Successfully validated ${sampleFile} against ${schemaFile}`);
    }
  }
});

if (!allValid) {
  process.exit(1);
}
