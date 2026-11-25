/** Business-rule violation that should be shown to the user verbatim. */
export class DomainError extends Error {
  constructor(message: string, public code = "DOMAIN") { super(message); this.name = "DomainError"; }
}
export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to perform this action.") { super(message, "FORBIDDEN"); this.name = "ForbiddenError"; }
}
export class NotFoundError extends DomainError {
  constructor(what = "Record") { super(`${what} not found.`, "NOT_FOUND"); this.name = "NotFoundError"; }
}
