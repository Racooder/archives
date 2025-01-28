import { ConflictError, NotFoundError } from "../ErrorHandling";

export class ArchiveNotFoundError extends NotFoundError {
    constructor() {
        super("Archive not found");
    }
}

export class ArchiveAlreadyExistsError extends ConflictError {
    constructor() {
        super("Archive already exists");
    }
}
