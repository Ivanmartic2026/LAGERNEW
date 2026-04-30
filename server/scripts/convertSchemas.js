#!/usr/bin/env node
/**
 * Convert Base44 entity JSONC schemas to Prisma schema
 *
 * Usage:
 *   node scripts/convertSchemas.js
 *
 * Reads:  ../../base44/entities/*.jsonc
 * Writes: ../prisma/schema.prisma
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTITIES_DIR = join(__dirname, '../../base44/entities');
const OUTPUT_PATH = join(__dirname, '../prisma/schema.prisma');

// ── Type mapping: JSON Schema → Prisma ──
function mapType(propName, prop) {
  const type = prop.type;

  if (type === 'string') {
    if (prop.format === 'date-time') return 'DateTime';
    if (prop.format === 'date') return 'DateTime';
    // IDs and foreign keys
    if (propName === 'id' || propName.endsWith('_id')) return 'String';
    return 'String';
  }

  if (type === 'number') return 'Float';
  if (type === 'boolean') return 'Boolean';

  if (type === 'array') {
    const itemType = prop.items?.type;
    if (itemType === 'string') return 'String[]'; // Prisma: arrays are implicitly nullable, no ?
    // Complex arrays → Json (for PostgreSQL) or String (for SQLite)
    return 'Json';
  }

  if (type === 'object') {
    return 'Json';
  }

  return 'String';
}

// ── Build enum name from entity + field ──
function enumName(entityName, fieldName) {
  return `${entityName}${capitalize(fieldName)}`;
}

function capitalize(str) {
  return str.replace(/_/g, '_').replace(/^\w/, c => c.toUpperCase());
}

// ── Convert a single entity JSONC to Prisma model ──
function convertEntity(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  // Try parsing as plain JSON first (most files have no comments)
  let schema;
  try {
    schema = JSON.parse(raw);
  } catch {
    // If that fails, strip JSONC comments carefully
    // Simple approach: remove // only when not inside a string
    let inString = false;
    let escaped = false;
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        result += ch;
        continue;
      }
      if (!inString && ch === '/' && raw[i + 1] === '/') {
        // Skip to end of line
        while (i < raw.length && raw[i] !== '\n') i++;
        continue;
      }
      if (!inString && ch === '/' && raw[i + 1] === '*') {
        // Skip to end of block comment
        i += 2;
        while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
        i++;
        continue;
      }
      result += ch;
    }
    schema = JSON.parse(result);
  }

  const entityName = schema.name;
  const properties = schema.properties || {};
  const required = new Set(schema.required || []);

  const enums = [];
  const fields = [];

  for (const [propName, prop] of Object.entries(properties)) {
    // Skip the auto-generated `id` — we'll add our own
    if (propName === 'id') continue;

    let prismaType = mapType(propName, prop);
    let attrs = [];

    // Enum handling
    if (prop.enum && prop.type === 'string') {
      const ename = enumName(entityName, propName);
      enums.push({ name: ename, values: prop.enum });
      prismaType = ename;
    }

    // Required / optional
    // Note: Prisma arrays (String[]) are implicitly nullable — don't add ?
    if (!required.has(propName) && prop.default === undefined && !prismaType.endsWith('[]')) {
      prismaType += '?';
    }

    // Default values
    if (prop.default !== undefined) {
      if (typeof prop.default === 'string') {
        // For enum defaults, use bare identifier (no quotes)
        // Must match sanitized enum value
        if (prop.enum) {
          const safeDefault = prop.default
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '_')
            .replace(/^[0-9]/, '_$&');
          attrs.push(`@default(${safeDefault})`);
        } else {
          attrs.push(`@default("${prop.default}")`);
        }
      } else if (typeof prop.default === 'boolean') {
        attrs.push(`@default(${prop.default})`);
      } else if (typeof prop.default === 'number') {
        attrs.push(`@default(${prop.default})`);
      }
    }

    // Map annotation
    if (prop.description) {
      attrs.push(`// ${prop.description.replace(/\n/g, ' ')}`);
    }

    // Foreign key detection: field ends with _id and is a String type
    if (propName.endsWith('_id') && prop.type === 'string') {
      // Try to infer relation name from the field
      const relatedEntity = inferRelatedEntity(propName, entityName);
      if (relatedEntity) {
        attrs.push(`@map("${propName}")`);
        // Note: proper @relation will be added in a second pass
      }
    }

    const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
    fields.push(`  ${propName} ${prismaType}${attrStr}`);
  }

  return { entityName, fields, enums };
}

// ── Try to infer which entity a _id field points to ──
function inferRelatedEntity(fieldName, currentEntity) {
  // e.g., "order_id" → "Order", "supplier_id" → "Supplier"
  const base = fieldName.replace(/_id$/, '');
  const candidates = [
    capitalize(base),
    capitalize(base) + 's',
    base.split('_').map(capitalize).join(''),
  ];
  return candidates[0]; // Best guess
}

// ── Main ──
function main() {
  const files = readdirSync(ENTITIES_DIR)
    .filter(f => f.endsWith('.jsonc'))
    .sort();

  console.log(`Found ${files.length} entity schemas`);

  const allModels = [];
  const allEnums = [];

  for (const file of files) {
    const path = join(ENTITIES_DIR, file);
    try {
      const { entityName, fields, enums } = convertEntity(path);
      allModels.push({ entityName, fields });
      allEnums.push(...enums);
    } catch (err) {
      console.error(`Failed to convert ${file}:`, err.message);
    }
  }

  // ── Build schema.prisma ──
  let schema = `// This Prisma schema was auto-generated from Base44 entity JSONC schemas
// ⚠️  Review and adjust before using in production
//     - Verify enum values match actual data
//     - Add @relation fields for foreign keys
//     - Adjust types (Float → Int where appropriate)
//     - Add indexes for frequently queried fields

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

  // Enums
  for (const en of allEnums) {
    schema += `enum ${en.name} {\n`;
    for (const val of en.values) {
      // Prisma enum values must be valid identifiers (start with letter)
      let safeVal = val
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '_');
      // Must start with a letter, not a digit or underscore+digit
      if (/^[0-9]/.test(safeVal)) {
        safeVal = 'v' + safeVal;
      } else if (/^_[0-9]/.test(safeVal)) {
        safeVal = 'v' + safeVal;
      }
      schema += `  ${safeVal}\n`;
    }
    schema += `}\n\n`;
  }

  // Models
  for (const model of allModels) {
    schema += `model ${model.entityName} {\n`;
    schema += `  id        String   @id @default(uuid())\n`;
    schema += `  createdAt DateTime @default(now()) @map("created_date")\n`;
    schema += `  updatedAt DateTime @updatedAt @map("updated_date")\n`;
    for (const field of model.fields) {
      schema += field + '\n';
    }
    schema += `}\n\n`;
  }

  writeFileSync(OUTPUT_PATH, schema);
  console.log(`\n✅ Wrote Prisma schema to ${OUTPUT_PATH}`);
  console.log(`   Models: ${allModels.length}`);
  console.log(`   Enums:  ${allEnums.length}`);
  console.log(`\n⚠️  NEXT STEPS:`);
  console.log(`   1. Review the generated schema — fix any incorrect type mappings`);
  console.log(`   2. Add @relation fields for foreign keys (e.g., order WorkOrder[] on Order)`);
  console.log(`   3. Adjust Float → Int where you know the field is always an integer`);
  console.log(`   4. Add @@index() directives for frequently queried fields`);
  console.log(`   5. Run: npx prisma generate`);
}

main();
