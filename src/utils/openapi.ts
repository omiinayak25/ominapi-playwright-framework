/**
 * =============================================================================
 * openapi.ts — OpenApiContract (load a spec & extract response schemas)
 * -----------------------------------------------------------------------------
 * WHY IT EXISTS:
 *   The OpenAPI document IS the contract. To validate a live response against it
 *   we must (a) navigate to the right operation/status/media-type schema and
 *   (b) resolve $ref pointers (e.g. "#/components/schemas/Product") into a
 *   self-contained JSON Schema AJV can compile. This class does both.
 * =============================================================================
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SchemaObject } from 'ajv';

/** Directory holding committed contract documents. */
const CONTRACTS_DIR = path.resolve(process.cwd(), 'src', 'contracts');

/**
 * Minimal shape of an OpenAPI document — only the parts this class reads.
 * `paths` is keyed by URL template, then by HTTP method; `components.schemas`
 * holds the reusable definitions that $ref pointers target.
 */
interface OpenApiSpec {
  openapi?: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components?: { schemas?: Record<string, unknown> };
}

/**
 * A single operation's response map: status code -> media type -> schema.
 * We only care about the response schemas for contract validation.
 */
interface OpenApiOperation {
  responses?: Record<
    string,
    { content?: Record<string, { schema?: unknown }> }
  >;
}

export class OpenApiContract {
  private constructor(private readonly spec: OpenApiSpec) {}

  /** Load a contract document from src/contracts. */
  public static fromFile(relative: string): OpenApiContract {
    const raw = fs.readFileSync(path.join(CONTRACTS_DIR, relative), 'utf-8');
    return new OpenApiContract(JSON.parse(raw) as OpenApiSpec);
  }

  /** The contract's declared version (for version-validation tests). */
  public get version(): string {
    return this.spec.info.version;
  }

  /**
   * Extract a fully-resolved JSON Schema for an operation's JSON response.
   * Throws (fail fast) if the path/method/status/media-type isn't in the spec.
   */
  public getResponseSchema(
    apiPath: string,
    method: string,
    status = '200',
  ): SchemaObject {
    const operation = this.spec.paths[apiPath]?.[method.toLowerCase()];
    const schema =
      operation?.responses?.[status]?.content?.['application/json']?.schema;
    if (schema === undefined) {
      throw new Error(
        `[OpenApiContract] No JSON schema for ${method.toUpperCase()} ${apiPath} (${status})`,
      );
    }
    return this.resolve(schema) as SchemaObject;
  }

  /** Recursively inline $ref pointers into a self-contained schema. */
  private resolve(node: unknown): unknown {
    if (Array.isArray(node)) {
      return node.map((n) => this.resolve(n));
    }
    if (node !== null && typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.$ref === 'string') {
        const name = obj.$ref.split('/').pop() ?? '';
        const target = this.spec.components?.schemas?.[name];
        if (target === undefined) {
          throw new Error(`[OpenApiContract] Unresolved $ref: ${obj.$ref}`);
        }
        return this.resolve(target);
      }
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        out[key] = this.resolve(value);
      }
      return out;
    }
    return node;
  }
}
