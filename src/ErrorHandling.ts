import { Response } from "express";

export class BadRequestError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class UnauthorizedError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class ConflictError extends Error {
    constructor(message: string) {
        super(message);
    }
}

function getStatus(error: Error): number {
    if (error instanceof BadRequestError) return 400;
    if (error instanceof UnauthorizedError) return 401;
    if (error instanceof NotFoundError) return 404;
    if (error instanceof ConflictError) return 409;
    return 500;
}

export function respondError(res: Response, error: Error) {
    res.status(getStatus(error)).send(error.message);
}
