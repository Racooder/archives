import { BadRequestError, NotFoundError } from "../ErrorHandling";

export class RecordNotFoundError extends NotFoundError {
    constructor() {
        super("Record not found");
    }
}

export class DocumentIndexOutOfBoundsError extends BadRequestError {
    constructor() {
        super("Document index out of bounds");
    }
}

export class NewIndexIsSameAsOldError extends BadRequestError {
    constructor() {
        super("New index is the same as the old index");
    }
}

export class NewIndexOutOfBoundsError extends BadRequestError {
    constructor() {
        super("New index out of bounds");
    }
}

export class InvalidIdError extends BadRequestError {
    constructor() {
        super("Invalid ID");
    }
}

export class InvalidArchivist extends BadRequestError {
    constructor() {
        super("Invalid archivist");
    }
}
