import { existsSync, mkdirSync, readFileSync, rename, unlinkSync } from "fs";
import { hashStream } from "../Utility";
import { Document as MongooseDoc, Model, Schema, model, Types } from "mongoose";
import { objectFolder, objectPath } from "../Paths";
import { addMaintainerToArchive } from "./Archive";

export interface Document extends MongooseDoc {
    _id: Types.ObjectId;
    archive: string;
    hash: string;
    name: string;
    fileType: string;
    fileSize: number;
    creator: string;
    maintainers: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface DocumentModel extends Model<Document> { }

const documentSchema = new Schema<Document, DocumentModel>({
    archive: { type: String, ref: 'Archive', required: true },
    hash: { type: String, required: true },
    name: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    creator: { type: String, ref: 'Archivist', required: true },
    maintainers: { type: [String], ref: 'Archivist', required: true }
}, { timestamps: true });
documentSchema.index({ archive: 1, hash: 1 }, { unique: true });

const documentModel = model<Document, DocumentModel>("Document", documentSchema);

// * Functions

// Creates a document from a file
export async function createDocument(archive: string, creator: string, stream: NodeJS.ReadableStream, name: string, type: string, size: number, path: string): Promise<Document> {
    // Hash the file
    const hash = await hashStream(stream)

    // Check if the document already exists
    if (await documentModel.findOne({ archive: archive, hash: hash })) throw new Error("Document already exists");

    // Create the document metadata in the database
    const document = documentModel.create({
        archive: archive,
        hash: hash,
        name: name,
        fileType: type,
        fileSize: size,
        creator: creator,
        maintainers: [creator]
    });

    // Move the file to the object store if it doesn't already exist
    if (!existsSync(objectPath(hash))) {
        if (!existsSync(objectFolder(hash))) {
            mkdirSync(objectFolder(hash));
        }
        rename(path, objectPath(hash), err => {
            if (err) throw err;
        });
    };

    // Add maintainer to the archive
    addMaintainerToArchive(archive, creator);

    return document;
}

// Get the meta of a document
export async function getDocumentMeta(archive: string, hash: string): Promise<Document | undefined> {
    return await documentModel.findOne({ archive: archive, hash: hash }) || undefined;
}

// Get the object of a document
export function getDocumentObject(hash: string): Buffer | undefined {
    if (!existsSync(objectPath(hash))) return undefined;
    return readFileSync(objectPath(hash));
}

// Delete a document
export async function deleteDocument(archive: string, hash: string): Promise<void> {
    const document = await documentModel.findOne({ archive: archive, hash: hash });

    if (!document) throw new Error("Document not found");

    await document.deleteOne();

    // Delete the object if no other documents reference it
    if (!await documentModel.findOne({ hash: hash })) {
        unlinkSync(objectPath(hash));
    }
}

// Rename a document
export async function renameDocument(archive: string, hash: string, newName: string, archivist: string): Promise<void> {
    const document = await documentModel.findOne({ archive: archive, hash: hash });

    if (!document) throw new Error("Document not found");

    let updateQuery: any = { name: newName };
    if (!document.maintainers.includes(archivist)) {
        updateQuery.maintainers = { $push: archivist };
    }
    await document.updateOne(updateQuery);
}
