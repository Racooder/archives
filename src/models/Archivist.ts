import { Document as MongooseDoc, Model, Schema, model } from "mongoose";

export interface Archivist extends MongooseDoc {
    _id: string; // Username
    createdAt: Date;
    updatedAt: Date;
}

interface ArchivistModel extends Model<Archivist> { }

const archivistSchema = new Schema<Archivist, ArchivistModel>({
    _id: { type: String },
}, { _id: false, timestamps: true });

const archivistModel = model<Archivist, ArchivistModel>("Archivist", archivistSchema);

// * Functions

// Check if an archivist exists
export async function archivistExists(username: string): Promise<boolean> {
    return !!await archivistModel.findById(username);
}

// Create a new archivist
export async function createArchivist(username: string): Promise<Archivist> {
    // Remove whitespace and convert to lowercase
    username = username.toLowerCase().trim();

    if (await archivistModel.findById(username))
        throw new Error("Archivist already exists");
    return archivistModel.create({
        _id: username
    });
}

// Rename an archivist
export async function renameArchivist(username: string, newName: string): Promise<void> {
    const archivist = await archivistModel.findById(username);

    if (!archivist)
        throw new Error("Archivist not found");
    if (await archivistModel.findById(newName))
        throw new Error("New username already exists");

    await archivist.updateOne({ _id: newName });
}

// Delete an archivist
export async function deleteArchivist(username: string): Promise<void> {
    const archivist = await archivistModel.findById(username);

    if (!archivist)
        throw new Error("Archivist not found");

    await archivist.deleteOne();
}
