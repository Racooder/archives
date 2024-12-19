export class ArchiveNotFoundError extends Error {
    constructor() {
        super("Archive not found");
    }
}

export class ArchiveAlreadyExistsError extends Error {
    constructor() {
        super("Archive already exists");
    }
}
