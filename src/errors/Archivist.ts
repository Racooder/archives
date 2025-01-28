import { ConflictError, NotFoundError, UnauthorizedError } from "../ErrorHandling";

export class ArchivistNotFoundError extends NotFoundError {
    constructor() {
        super("Archivist not found");
    }
}

export class ArchivistAlreadyExistsError extends ConflictError {
    constructor() {
        super("Archivist already exists");
    }
}

export class NotAuthorizedError extends UnauthorizedError {
    constructor() {
        super("Not authorized");
    }
}
