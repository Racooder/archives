import { Document as MongooseDoc, Model, Schema, model } from "mongoose";
import { archivistExists } from "./Archivist";

export interface Archive extends MongooseDoc {
    _id: string; // Name
    creator: string;
    maintainers: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface ArchiveModel extends Model<Archive> { }

const archiveSchema = new Schema<Archive, ArchiveModel>({
    _id: { type: String },
    creator: { type: String, ref: 'Archivist', required: true },
    maintainers: { type: [String], ref: 'Archivist', required: true }
}, { _id: false, timestamps: true });

const archiveModel = model<Archive, ArchiveModel>("Archive", archiveSchema);

// * Functions

// Check if an archive exists
export async function archiveExists(name: string): Promise<boolean> {
    return !!await archiveModel.findById(name);
}

// Create a new archive
export async function createArchive(name: string, creator: string): Promise<Archive> {
    if (await archiveModel.findById(name))
        throw new Error("Archive already exists");
    if (!await archivistExists(creator))
        throw new Error("Archivist not found");

    return archiveModel.create({
        _id: name,
        creator: creator,
        maintainers: [creator]
    });
}

// Get information about an archive
export async function getArchive(name: string): Promise<any | undefined> {
    const archiveDoc = await archiveModel.findById(name) || undefined;

    if (!archiveDoc) return undefined;
    return {
        name: archiveDoc._id,
        creator: archiveDoc.creator,
        maintainers: archiveDoc.maintainers,
        createdAt: archiveDoc.createdAt,
        updatedAt: archiveDoc.updatedAt
    };
}

// Rename an archive
export async function renameArchive(name: string, newName: string, archivist: string): Promise<void> {
    if (await archiveExists(newName))
        throw new Error("Archive already exists");
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    const archive = await archiveModel.findById(name);

    if (!archive)
        throw new Error("Archive not found");
    if (archive.creator !== archivist)
        throw new Error("Not authorized");

    await archive.updateOne({ _id: newName });
}

// Add a maintainer to an archive if they are not already a maintainer
export async function addMaintainerToArchive(archive: string, maintainer: string): Promise<void> {
    const archiveDoc = await archiveModel.findById(archive);

    if (!archiveDoc)
        throw new Error("Archive not found");
    if (archiveDoc.maintainers.includes(maintainer)) return;

    await archiveDoc.updateOne({ $push: { maintainers: maintainer } });
}

// Delete an archive
export async function deleteArchive(name: string, archivist: string): Promise<void> {
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    const archive = await archiveModel.findById(name);

    if (!archive)
        throw new Error("Archive not found");
    if (archive.creator !== archivist)
        throw new Error("Not authorized");

    await archive.deleteOne();
}
