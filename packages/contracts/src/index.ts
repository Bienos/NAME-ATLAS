/**
 * Shared API/data contracts package.
 *
 * Empty at TASK-001 by design. Contracts are canonical in
 * docs/canonical/16 (API and frontend data contract); this package will
 * hold the runtime schemas (Zod → JSON Schema → OpenAPI → client types)
 * once M2 introduces the first real endpoint (docs/contracts/README.md).
 *
 * CONTRACT_PACKAGE_VERSION exists only so the package has one real,
 * testable export and is not an empty module — it carries no product
 * meaning and must not be read as a schema version.
 */
export const CONTRACT_PACKAGE_VERSION = "0.0.0";
