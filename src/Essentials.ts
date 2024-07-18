import path from 'path';
import RWLockfile from 'rwlockfile';
import { readFileSync, writeFile, appendFile, unlink, readdir } from 'fs';

export type Dict<T> = { [key: string]: T };

export const PATHS = {
    uploads: path.join(__dirname, "..", "uploads"),
    archives: path.join(__dirname, "..", "archives"),
};

export function basenameAndExtension(filename: string): [string, string] {
    const nameParts = filename.split('.');
    const extension = nameParts.pop() as string;
    const basename = nameParts.join('.');
    return [basename, extension];
}

export function unlinkFolderContents(folder: string) {
    readdir(folder, (err, files) => {
        if (err) throw err;
        files.forEach(file => {
            unlink(path.join(folder, file), (err) => {
                if (err) throw err;
            });
        });
    });
}

// * Lockfile

export async function unlinkLocked(path: string) {
    const lock = new RWLockfile(path);
    await lock.add('write');
    try {
        unlink(path, (err) => {
            if (err) throw err;
        });
    } finally {
        lock.remove('write');
    }
}

export async function readTextLocked(path: string): Promise<string> {
    const lock = new RWLockfile(path);
    await lock.add('read');
    let text: string;
    try {
        text = readFileSync(path, { encoding: 'utf-8' }, );
    } finally {
        lock.remove('read');
    }
    return text;
}

export async function writeTextLocked(path: string, text: string) {
    const lock = new RWLockfile(path);
    await lock.add('write');
    try {
        writeFile(path, text, { encoding: 'utf-8' }, (err) => {
            if (err) throw err
        });
    } finally {
        lock.remove('write');
    }
}

export async function appendTextLocked(path: string, text: string) {
    const lock = new RWLockfile(path);
    await lock.add('write');
    try {
        appendFile(path, text, { encoding: 'utf-8' }, (err) => {
            if (err) throw err
        });
    } finally {
        lock.remove('write');
    }
}

export async function readJsonLocked<T>(path: string): Promise<T> {
    const lock = new RWLockfile(path);
    await lock.add('read');
    let data: T;
    try {
        const text = readFileSync(path, { encoding: 'utf-8' });
        data = JSON.parse(text);
    } finally {
        lock.remove('read');
    }
    return data;
}

export async function writeJsonLocked<T>(path: string, data: T) {
    const lock = new RWLockfile(path);
    await lock.add('write');
    try {
        writeFile(path, JSON.stringify(data), { encoding: 'utf-8' }, (err) => {
            if (err) throw err
        });
    } finally {
        lock.remove('write');
    }
}
