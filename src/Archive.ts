// TODO: Check more thoroughly for errors and edge cases (e.g. file not found, etc.)
// TODO: Changelog

import { appendTextLocked, basenameAndExtension, Dict, PATHS, readJsonLocked, readTextLocked, unlinkLocked, writeJsonLocked, writeTextLocked } from "./Essentials";
import path from 'path';
import { createReadStream, existsSync, mkdirSync, rename } from 'fs';
import RWLockfile from "rwlockfile";
import { createHash } from "crypto";
import { v1 as uuidv1 } from 'uuid';

// * Types

type DocumentMeta = {
    hash: string;
    filename: string;
    filetype: string;
    records: string[];
    createdBy: string;
    createdAt: string;
};

type Record = {
    uuid: string;
    title: string;
    description: string;
    createdAt: string;
    createdBy: string;
    maintainers: string[];
    tags: string[];
    documents: string[];
    customMetadata: { [key: string]: any };
};

type RecordUpdate = {
    title?: string;
    description?: string;
    customMetadata?: { [key: string]: any };
};

// * Allowed file extensions

const allowedFileExtensions = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "mp4": "video/mp4",
    "webm": "video/webm",
    "txt": "text/plain",
    "md": "text/plain",
    "mp3": "audio/mpeg",
    "wav": "audio/wav",
    "flac": "audio/flac",
    "ogg": "audio/ogg",
} as Dict<string>;

export function isExtensionAllowed(extension: string): boolean {
    return allowedFileExtensions.hasOwnProperty(extension);
}

// * Paths

function archivePath(archive: string): string {
    return path.join(PATHS.archives, archive);
}

function documentPath(archive: string, hash: string): string {
    return path.join(archivePath(archive), "documents", hash.slice(0, 2), hash.slice(2));
}

export function documentObjectPath(archive: string, hash: string): string {
    return path.join(documentPath(archive, hash), "object");
}

export function documentMetaPath(archive: string, hash: string): string {
    return path.join(documentPath(archive, hash), "meta.json");
}

export function recordPath(archive: string, uuid: string): string {
    return path.join(archivePath(archive), "records", uuid + ".json");
}

function unclassifiedPath(archive: string): string {
    return path.join(archivePath(archive), "unclassified.txt");
}

function tagPath(archive: string, tag: string): string {
    return path.join(archivePath(archive), "tags", tag + ".txt");
}

// * Unclassified

export async function listUnclassified(archive: string): Promise<string[]> {
    const unclassifiedText = await readTextLocked(unclassifiedPath(archive));
    return unclassifiedText.trim().split("\n");
}

function appendUnclassified(archive: string, hash: string) {
    appendTextLocked(unclassifiedPath(archive), hash + "\n");
}

async function removeUnclassified(archive: string, hash: string) {
    const unclassified = await listUnclassified(archive);

    const index = unclassified.indexOf(hash);
    if (index === -1) {
        return;
    }
    unclassified.splice(index, 1);
    let unclassifiedStr = unclassified.join("\n");
    if (unclassifiedStr.length > 0) {
        unclassifiedStr += "\n";
    }
    writeTextLocked(unclassifiedPath(archive), unclassifiedStr);
}

// * Existence Checks

export function archiveExists(archive: string): boolean {
    return existsSync(archivePath(archive));
}

export function documentExists(archive: string, hash: string): boolean {
    return existsSync(documentObjectPath(archive, hash));
}

export function recordExists(archive: string, uuid: string): boolean {
    return existsSync(recordPath(archive, uuid));
}

// * Helpers

async function getFileHash(file: string): Promise<string> {
    const hash = createHash('sha1');
    hash.setEncoding('hex');
    const lock = new RWLockfile(file);
    await lock.add('read');

    return new Promise((resolve, reject) => {
        const readStream = createReadStream(file);
        readStream.on('end', () => {
            hash.end();
            resolve(hash.read());
        });
        readStream.pipe(hash);
    }).finally(() => {
        lock.remove('read');
    }) as Promise<string>;
}

async function addMaintainerToRecord(record: Record, archive: string, uuid: string, maintainer: string): Promise<Record> {
    if (record.maintainers.includes(maintainer)) return record;
    record.maintainers.push(maintainer);
    return record;
}

// * Archives

export function createArchive(archive: string) {
    mkdirSync(archivePath(archive), { recursive: true });
    mkdirSync(path.join(archivePath(archive), "documents"));
    mkdirSync(path.join(archivePath(archive), "records"));
    mkdirSync(path.join(archivePath(archive), "tags"));
    writeTextLocked(unclassifiedPath(archive), "");
}

// * Documents

export async function archiveFile(filepath: string, filename: string, archive: string, archivist: string): Promise<[string, string]> {
   const [basename, extension] = basenameAndExtension(filename);
    if (!extension) {
        return ["", "Invalid file extension"];
    }
    const mimeType = allowedFileExtensions[extension];
    if (!mimeType) {
        return ["", "File type not accepted"];
    }

    const hash = await getFileHash(filepath);
    if (documentExists(archive, hash)) {
        return [hash, "File already exists"];
    }
    mkdirSync(documentPath(archive, hash), { recursive: true });
    rename(filepath, documentObjectPath(archive, hash), (err) => {
        if (err) throw err;
    });

    const metadata = {
        hash: hash,
        filename: basename,
        filetype: mimeType,
        records: [],
        createdBy: archivist, // TODO: Implement users
        createdAt: new Date().toISOString(),
    };
    writeJsonLocked<DocumentMeta>(documentMetaPath(archive, hash), metadata);

    appendUnclassified(archive, hash);

    return [hash, "File uploaded"];
}

export async function deleteDocument(archive: string, hash: string) {
    const document = await readJsonLocked<DocumentMeta>(documentMetaPath(archive, hash));

    if (document.records.length > 0) {
        document.records.forEach(uuid => {
            removeDocumentFromRecord(archive, uuid, hash);
        });
    } else {
        removeUnclassified(archive, hash);
    }

    unlinkLocked(documentObjectPath(archive, hash));
    unlinkLocked(documentMetaPath(archive, hash));
}

// * Records

export function createRecord(archive: string, title: string, archivist: string): string {
    const uuid = uuidv1();
    mkdirSync(path.dirname(recordPath(archive, uuid)), { recursive: true });
    const record = {
        uuid: uuid,
        title: title,
        description: "",
        createdAt: new Date().toISOString(),
        createdBy: archivist,
        maintainers: [archivist],
        tags: [],
        documents: [],
        customMetadata: {},
    };
    writeJsonLocked<Record>(recordPath(archive, uuid), record);
    return uuid;
}

export async function deleteRecord(archive: string, uuid: string) {
    const record = await readJsonLocked<Record>(recordPath(archive, uuid));
    record.documents.forEach(hash => {
        removeDocumentFromRecord(archive, uuid, hash);
    });
    record.tags.forEach(tag => {
        removeTagFromRecord(archive, uuid, tag);
    });
    unlinkLocked(recordPath(archive, uuid));
}

export async function updateRecord(archive: string, uuid: string, update: RecordUpdate, updatedBy?: string) {
    let record = await readJsonLocked<Record>(recordPath(archive, uuid));
    record = { ...record, ...update };
    if (updatedBy) {
        record = await addMaintainerToRecord(record, archive, uuid, updatedBy);
    }
    writeJsonLocked<Record>(recordPath(archive, uuid), record);
}

export async function addDocumentToRecord(archive: string, uuid: string, hash: string, updatedBy?: string): Promise<boolean> {
    let record = await readJsonLocked<Record>(recordPath(archive, uuid));
    if (record.documents.includes(hash)) {
        return false;
    }
    record.documents.push(hash);
    if (updatedBy) {
        record = await addMaintainerToRecord(record, archive, uuid, updatedBy);
    }
    writeJsonLocked<Record>(recordPath(archive, uuid), record);

    const document = await readJsonLocked<DocumentMeta>(documentMetaPath(archive, hash));
    if (document.records.length === 0) {
        removeUnclassified(archive, hash);
    }
    document.records.push(uuid);
    writeJsonLocked<DocumentMeta>(documentMetaPath(archive, hash), document);

    return true;
}

export async function removeDocumentFromRecord(archive: string, uuid: string, hash: string, updatedBy?: string): Promise<boolean> {
    let record = await readJsonLocked<Record>(recordPath(archive, uuid));
    const index = record.documents.indexOf(hash);
    if (index === -1) {
        return false;
    }
    record.documents.splice(index, 1);
    if (updatedBy) {
        record = await addMaintainerToRecord(record, archive, uuid, updatedBy);
    }
    writeJsonLocked<Record>(recordPath(archive, uuid), record);

    const document = await readJsonLocked<DocumentMeta>(documentMetaPath(archive, hash));
    document.records.splice(document.records.indexOf(uuid), 1);
    if (document.records.length === 0) {
        appendUnclassified(archive, hash);
    }
    writeJsonLocked<DocumentMeta>(documentMetaPath(archive, hash), document);

    return true;
}

export async function listRecordsWithTag(archive: string, tag: string): Promise<string[]> {
    if (!existsSync(tagPath(archive, tag))) return [];

    const tagText = await readTextLocked(tagPath(archive, tag));
    const uuids = tagText.trim().split("\n");
    return uuids;
}

export async function addTagToRecord(archive: string, uuid: string, tag: string, updatedBy?: string): Promise<boolean> {
    let record = await readJsonLocked<Record>(recordPath(archive, uuid));
    if (record.tags.includes(tag)) {
        return false;
    }
    record.tags.push(tag);
    if (updatedBy) {
        record = await addMaintainerToRecord(record, archive, uuid, updatedBy);
    }
    writeJsonLocked<Record>(recordPath(archive, uuid), record);

    if (!existsSync(tagPath(archive, tag))) {
        writeTextLocked(tagPath(archive, tag), uuid + "\n");
    } else {
        appendTextLocked(tagPath(archive, tag), uuid + "\n");
    }

    return true;
}

export async function removeTagFromRecord(archive: string, uuid: string, tag: string, updatedBy?: string): Promise<boolean> {
    const record = await readJsonLocked<Record>(recordPath(archive, uuid));
    const index = record.tags.indexOf(tag);
    if (index === -1) {
        return false;
    }
    record.tags.splice(index, 1);
    if (updatedBy) {
        await addMaintainerToRecord(record, archive, uuid, updatedBy);
    }
    writeJsonLocked<Record>(recordPath(archive, uuid), record);

    const uuids = await listRecordsWithTag(archive, tag);
    const tagIndex = uuids.indexOf(uuid);
    uuids.splice(tagIndex, 1);
    if (uuids.length === 0) {
        unlinkLocked(tagPath(archive, tag));
        return true;
    }
    writeTextLocked(tagPath(archive, tag), uuids.join("\n") + "\n");

    return true;
}
