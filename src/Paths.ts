import { join } from "path";

export const ARCHIVES_PATH = "archives";

export function objectFolder(hash: string) {
    return join(__dirname, "..", ARCHIVES_PATH, "documents", hash.slice(0, 2));
}

export function objectPath(hash: string) {
    return join(objectFolder(hash), hash.slice(2));
}