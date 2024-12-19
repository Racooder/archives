import { Document as MongooseDoc, Model, Schema, model, Types } from "mongoose";
import { ArchivistAlreadyExistsError, ArchivistNotFoundError } from '../errors/Archivist';
import { debug } from "../Log";

interface RawArchivist {
    username: string;
    bio: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Archivist extends RawArchivist, MongooseDoc {
    _id: Types.ObjectId;
}

interface ArchivistModel extends Model<Archivist> { }

const archivistSchema = new Schema<Archivist, ArchivistModel>({
    username: { type: String, required: true, unique: true },
    bio: { type: String, default: "" }
}, { timestamps: true });

const archivistModel = model<Archivist, ArchivistModel>("Archivist", archivistSchema);

// * Functions

function normalizeUsername(username: string): string {
    return username.toLowerCase().trim();
}

export async function archivistExists(username: string): Promise<boolean> {
    return !!await archivistModel.findOne({ username});
}

// Convert a archivist document to a raw archivist
function normalizeArchivist(document: Archivist): RawArchivist {
    return {
        username: document.username,
        bio: document.bio,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
    };
}

// * Api Functions

/**
 * @throws {ArchivistAlreadyExistsError} If an archivist with the same username already exists
 */
export async function createArchivist(username: string): Promise<RawArchivist> {
    username = normalizeUsername(username);

    if (await archivistModel.findOne({ username }))
        throw new ArchivistAlreadyExistsError();

    debug(`Creating archivist ${username}`);

    const archivistDoc = await archivistModel.create({ username });
    return normalizeArchivist(archivistDoc);
}


/**
 * @throws {ArchivistAlreadyExistsError} If an archivist with the same username already exists
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function renameArchivist(username: string, newUsername: string): Promise<RawArchivist> {
    username = normalizeUsername(username);
    newUsername = normalizeUsername(newUsername);

    if (await archivistExists(newUsername))
        throw new ArchivistAlreadyExistsError();

    debug(`Renaming archivist ${username} to ${newUsername}`);

    const archivistDoc = await archivistModel.findOneAndUpdate({ username }, { username: newUsername });
    if (!archivistDoc)
        throw new ArchivistNotFoundError();
    return normalizeArchivist(archivistDoc);
}

/**
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function updateBio(username: string, bio: string): Promise<RawArchivist> {
    username = normalizeUsername(username);

    debug(`Updating bio of ${username}`);

    const archivistDoc = await archivistModel.findOneAndUpdate({ username }, { bio });
    if (!archivistDoc)
        throw new ArchivistNotFoundError();
    return normalizeArchivist(archivistDoc);
}

/**
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function deleteArchivist(username: string): Promise<void> {
    const archivist = await archivistModel.findById(username);

    if (!archivist)
        throw new ArchivistNotFoundError();

    debug(`Deleting archivist ${username}`);

    await archivist.deleteOne();
}
