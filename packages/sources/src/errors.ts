/**
 * Thrown by any fail-closed check in this package. Carries enough detail
 * (line number where relevant, and a reason code) for a caller to log or
 * report exactly what deviated from the confirmed PESEL resource shape —
 * without ever silently accepting the deviation.
 */
export class PeselSchemaError extends Error {
  readonly reasonCode: string;
  readonly line: number | undefined;

  constructor(reasonCode: string, message: string, line?: number) {
    super(line === undefined ? message : `line ${line}: ${message}`);
    this.name = "PeselSchemaError";
    this.reasonCode = reasonCode;
    this.line = line;
  }
}
