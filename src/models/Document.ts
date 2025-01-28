import { createReadStream, existsSync, mkdirSync, readFileSync, rename, unlinkSync } from "fs";
import { hashStream } from "../Utility";
import { Document as MongooseDoc, Model, Schema, model, Types, UpdateQuery } from "mongoose";
import { objectFolder, objectPath } from "../Paths";
import { addMaintainerToArchive, archiveExists } from "./Archive";
import { archivistExists } from "./Archivist";
import { ArchiveAlreadyExistsError, ArchiveNotFoundError } from "../errors/Archive";
import { debug } from "../Log";
import { ArchivistNotFoundError } from "../errors/Archivist";
import { DocumentAlreadyExists, DocumentNotFoundError, ObjectNotFoundError } from "../errors/Document";

export interface RawDocument {
    archive: string;
    hash: string;
    name: string;
    fileType: string;
    fileSize: number;
    creator: string;
    maintainers: string[];
    unsorted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Document extends RawDocument, MongooseDoc {
    _id: Types.ObjectId;
}

interface DocumentModel extends Model<Document> { }

const documentSchema = new Schema<Document, DocumentModel>({
    archive: { type: String, ref: 'Archive', required: true },
    hash: { type: String, required: true },
    name: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    creator: { type: String, ref: 'Archivist', required: true },
    maintainers: { type: [String], ref: 'Archivist', required: true },
    unsorted: { type: Boolean, required: true, default: true },
}, { timestamps: true });
documentSchema.index({ archive: 1, hash: 1 }, { unique: true });

const documentModel = model<Document, DocumentModel>("Document", documentSchema);

// * Functions

export async function documentExists(archive: string, hash: string): Promise<boolean> {
    return !!await documentModel.findOne({ archive: archive, hash: hash });
}

// * Api Functions

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 * @throws {DocumentAlreadyExists} If the document with the same hash already exists
 */
export async function createDocument(archive: string, creator: string, name: string, type: string, size: number, path: string): Promise<Document> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await archivistExists(creator))
        throw new ArchivistNotFoundError();

    debug(`Creating document ${name} in ${archive} (${creator})`);

    const hash = await hashStream(createReadStream(path));

    if (await documentModel.findOne({ archive: archive, hash: hash }))
        throw new DocumentAlreadyExists();

    const document = documentModel.create({
        archive: archive,
        hash: hash,
        name: name,
        fileType: type,
        fileSize: size,
        creator: creator,
        maintainers: [creator]
    });

    if (!existsSync(objectPath(hash))) {
        if (!existsSync(objectFolder(hash))) {
            mkdirSync(objectFolder(hash), { recursive: true });
        }
        rename(path, objectPath(hash), err => {
            if (err) throw err;
        });
    };

    addMaintainerToArchive(archive, creator);

    return document;
}

/**
 * @throws {ArchiveAlreadyExistsError} If an archive with the given name already exists
 * @throws {DocumentAlreadyExists} If a document with the given hash does not exist
 */
export async function getDocumentMeta(archive: string, hash: string): Promise<RawDocument> {
    if (!await archiveExists(archive))
        throw new ArchiveAlreadyExistsError();
    if (!await documentExists(archive, hash))
        throw new DocumentAlreadyExists();

    debug(`Getting document meta ${hash} in ${archive}`);

    const documentDoc = await documentModel.findOne({ archive: archive, hash: hash }) as Document;

    return {
        archive: documentDoc.archive,
        hash: documentDoc.hash,
        name: documentDoc.name,
        fileType: documentDoc.fileType,
        fileSize: documentDoc.fileSize,
        creator: documentDoc.creator,
        maintainers: documentDoc.maintainers,
        unsorted: documentDoc.unsorted,
        createdAt: documentDoc.createdAt,
        updatedAt: documentDoc.updatedAt
    };
}

export function objectExists(hash: string): boolean {
    return existsSync(objectPath(hash));
}

/**
 * @throws {ObjectNotFoundError} If a object with the given document hash doesn't exist
 */
export function getDocumentObject(hash: string): Buffer {
    if (!objectExists(hash))
        throw new ObjectNotFoundError();

    debug(`Getting document object ${hash}`);

    return readFileSync(objectPath(hash));
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 * @throws {DocumentNotFoundError} If the document with the given hash doesn't exists
 */
export async function deleteDocument(archive: string, hash: string, archivist: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();
    if (!await documentExists(archive, hash))
        throw new DocumentNotFoundError();

    debug(`Deleting document ${hash} from ${archive} (${archivist})`)

    const document = await documentModel.findOne({ archive: archive, hash: hash });
    await document!.deleteOne();

    if (!await documentModel.findOne({ hash: hash })) {
        unlinkSync(objectPath(hash));
    }

    addMaintainerToArchive(archive, archivist);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 * @throws {DocumentNotFoundError} If the document with the given hash doesn't exists
 */
export async function renameDocument(archive: string, hash: string, newName: string, archivist: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();
    if (!await documentExists(archive, hash))
        throw new DocumentNotFoundError();

    debug(`Renaming document ${hash} in ${archive} to ${newName} (${archivist})`);

    const document = await documentModel.findOne({ archive: archive, hash: hash }) as Document;

    let updateQuery: UpdateQuery<Document> = { name: newName };
    if (!document.maintainers.includes(archivist)) {
        updateQuery.maintainers = { $push: archivist };
    }
    await document.updateOne(updateQuery);

    addMaintainerToArchive(archive, archivist);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 */
export async function getUnsorted(archive: string): Promise<string[]> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    
    const documents = await documentModel.find({ unsorted: true }) as Document[];
    return documents.map((doc) => doc.hash);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {DocumentNotFoundError} If the document with the given hash doesn't exists
 */
export async function setUnsorted(archive: string, hash: string, unsorted: boolean) {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await documentExists(archive, hash))
        throw new DocumentNotFoundError();

    await documentModel.findOneAndUpdate({ hash }, { unsorted });
}
