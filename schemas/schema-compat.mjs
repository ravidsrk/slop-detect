// Breaking-change check for schemas/scan-result.vN.json.
// A change that drops a documented field, narrows a type or enum, newly
// requires a property, or tightens additionalProperties must bump the major
// version in $id (scan-result.v2.json). Adding an optional property does not.

export function schemaMajor(schema) {
  const id = String(schema && schema.$id ? schema.$id : '');
  const match = id.match(/scan-result\.v(\d+)\.json$/);
  if (!match) {
    throw new Error(`schema $id must end with scan-result.vMAJOR.json (got ${id || 'none'})`);
  }
  return Number(match[1]);
}

function typesOf(schema) {
  if (!schema || schema.type == null) return null;
  return Array.isArray(schema.type) ? schema.type.slice() : [schema.type];
}

function compareSchemaList(previous, next, path, label) {
  if (previous == null && next == null) return [];
  if (previous == null && Array.isArray(next)) return [`${path}: ${label} added`];
  if (!Array.isArray(previous)) return [];
  if (!Array.isArray(next)) return [`${path}: ${label} removed`];
  const breaks = [];
  if (next.length < previous.length) breaks.push(`${path}: ${label} shrank`);
  const count = Math.min(previous.length, next.length);
  for (let i = 0; i < count; i++) {
    breaks.push(...breakingSchemaChanges(previous[i], next[i], `${path}.${label}[${i}]`));
  }
  return breaks;
}

export function breakingSchemaChanges(previous, next, path = '$') {
  const breaks = [];
  if (!previous || !next || typeof previous !== 'object' || typeof next !== 'object') {
    return breaks;
  }

  const prevReq = new Set(previous.required || []);
  const nextReq = new Set(next.required || []);
  for (const key of prevReq) {
    if (!nextReq.has(key) && !(next.properties && next.properties[key])) {
      breaks.push(`${path}: dropped required property ${key}`);
    }
  }
  for (const key of nextReq) {
    if (!prevReq.has(key)) breaks.push(`${path}: newly required property ${key}`);
  }

  if (Array.isArray(previous.enum)) {
    if (!Array.isArray(next.enum)) {
      breaks.push(`${path}: enum removed`);
    } else {
      for (const value of previous.enum) {
        if (!next.enum.includes(value)) {
          breaks.push(`${path}: enum lost ${JSON.stringify(value)}`);
        }
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(previous, 'const') && previous.const !== next.const) {
    breaks.push(
      `${path}: const changed from ${JSON.stringify(previous.const)} to ${JSON.stringify(next.const)}`
    );
  }

  const prevTypes = typesOf(previous);
  const nextTypes = typesOf(next);
  if (prevTypes && nextTypes) {
    for (const type of prevTypes) {
      if (!nextTypes.includes(type)) breaks.push(`${path}: type lost ${type}`);
    }
  } else if (!prevTypes && nextTypes) {
    breaks.push(`${path}: type constraint added`);
  }

  const prevOpen = previous.additionalProperties !== false;
  const nextOpen = next.additionalProperties !== false;
  if (prevOpen && !nextOpen) breaks.push(`${path}: additionalProperties tightened`);

  if (previous.properties && next.properties) {
    for (const key of Object.keys(previous.properties)) {
      if (!next.properties[key]) {
        breaks.push(`${path}: removed property ${key}`);
      } else {
        breaks.push(
          ...breakingSchemaChanges(previous.properties[key], next.properties[key], `${path}.${key}`)
        );
      }
    }
  } else if (previous.properties && !next.properties) {
    breaks.push(`${path}: properties removed`);
  }

  breaks.push(...compareSchemaList(previous.oneOf, next.oneOf, path, 'oneOf'));
  breaks.push(...compareSchemaList(previous.anyOf, next.anyOf, path, 'anyOf'));
  if (previous.items) {
    if (!next.items) {
      breaks.push(`${path}: items removed`);
    } else if (Array.isArray(previous.items) || Array.isArray(next.items)) {
      breaks.push(
        ...compareSchemaList(
          Array.isArray(previous.items) ? previous.items : [previous.items],
          Array.isArray(next.items) ? next.items : [next.items],
          path,
          'items'
        )
      );
    } else {
      breaks.push(...breakingSchemaChanges(previous.items, next.items, `${path}.items`));
    }
  }

  const prevDefs = previous.$defs || {};
  const nextDefs = next.$defs || {};
  for (const key of Object.keys(prevDefs)) {
    if (!nextDefs[key]) breaks.push(`$defs: removed ${key}`);
    else breaks.push(...breakingSchemaChanges(prevDefs[key], nextDefs[key], `$defs.${key}`));
  }

  return breaks;
}

export function assertCompatibleSchemaChange(previous, next) {
  if (!previous) return [];
  const breaks = breakingSchemaChanges(previous, next);
  if (breaks.length === 0) return breaks;
  if (schemaMajor(next) <= schemaMajor(previous)) {
    const error = new Error(
      'Breaking scan-result schema change without a major-version bump:\n' + breaks.join('\n')
    );
    error.breaks = breaks;
    throw error;
  }
  return breaks;
}
