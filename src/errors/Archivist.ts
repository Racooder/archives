export class ArchivistNotFoundError extends Error {
    constructor() {
        super("Archivist not found");
    }
}

export class NotAuthorizedError extends Error {
    constructor() {
        super("Not authorized");
    }
}

export class ArchivistAlreadyExistsError extends Error {
    constructor() {
        super("Archivist already exists");
    }
}
