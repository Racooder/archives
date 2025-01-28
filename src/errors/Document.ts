import { ConflictError, NotFoundError } from "../ErrorHandling";

export class DocumentNotFoundError extends NotFoundError {
    constructor() {
        super("Document not found")
    }
}

export class DocumentAlreadyExists extends ConflictError {
    constructor() {
        super("Document already exists");
    }
}

export class ObjectNotFoundError extends NotFoundError {
    constructor() {
        super("Object not found");
    }
}
