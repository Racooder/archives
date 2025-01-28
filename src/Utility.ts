import { createHash } from "crypto";
import { Response } from "express";

// Hashes a stream using SHA-1
export async function hashStream(stream: NodeJS.ReadableStream): Promise<string> {
    const hash = createHash('sha1');
    stream.on('data', chunk => hash.update(chunk));
    return new Promise<string>((resolve, reject) => {
        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });
        stream.on('error', reject);
    });
}

// Move an element in an array
export function moveElement<T>(array: T[], fromIndex: number, toIndex: number): void {
    const element = array.splice(fromIndex, 1)[0];
    array.splice(toIndex, 0, element);
}
