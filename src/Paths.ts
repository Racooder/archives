import { join } from "path";

export const ARCHIVES_PATH = 'archives';

export function objectFolder(hash: string) {
    return join(ARCHIVES_PATH, hash.slice(0, 2));
}

export function objectPath(hash: string) {
    return join(objectFolder(hash), hash.slice(2));
}