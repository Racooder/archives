import { Document as MongooseDoc, Model, Schema, model, Types } from "mongoose";
import { archivistExists } from "./Archivist";
import { ArchiveAlreadyExistsError, ArchiveNotFoundError } from "../errors/Archive";
import { ArchivistNotFoundError, NotAuthorizedError } from "../errors/Archivist";
import { debug } from "../Log";

interface RawArchive {
    name: string;
    description: string;
    owner: string;
    maintainers: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Archive extends RawArchive, MongooseDoc {
    _id: Types.ObjectId;
}

interface ArchiveModel extends Model<Archive> { }

const archiveSchema = new Schema<Archive, ArchiveModel>({
    name: { type: String, required: true, unique: true },
    owner: { type: String, ref: 'Archivist', required: true },
    maintainers: { type: [String], ref: 'Archivist', required: true }
}, { timestamps: true });

const archiveModel = model<Archive, ArchiveModel>("Archive", archiveSchema);

// * Functions

export async function archiveExists(name: string): Promise<boolean> {
    return !!await archiveModel.findOne({ name });
}

// Convert a archive document to a raw archive
function normalizeArchive(document: Archive): RawArchive {
    return {
        name: document.name,
        description: document.description,
        owner: document.owner,
        maintainers: document.maintainers,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt
    };
}

// * Api Functions

export async function listArchives(): Promise<string[]> {
    debug(`Listing archives`);

    const archives = await archiveModel.find({}, { name: 1 });
    return archives.map(archive => archive.name);
}

/**
 * @throws {ArchiveAlreadyExistsError} If an archive with the same name already exists
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function createArchive(name: string, description: string, creator: string): Promise<RawArchive> {
    if (await archiveModel.findOne({ name }))
        throw new ArchiveAlreadyExistsError();
    if (!await archivistExists(creator))
        throw new ArchivistNotFoundError();

    debug(`Creating archive ${name} (${creator})`);

    const archiveDoc = await archiveModel.create({
        name,
        description,
        owner: creator,
        maintainers: [creator]
    });

    return normalizeArchive(archiveDoc);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 */
export async function getArchive(name: string): Promise<RawArchive> {
    if (!await archiveExists(name))
        throw new ArchiveNotFoundError();

    debug(`Getting archive ${name}`);

    const archiveDoc = await archiveModel.findOne({ name });
    if (!archiveDoc) throw new ArchiveNotFoundError();
    return normalizeArchive(archiveDoc);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchiveAlreadyExistsError} If an archive with the new name already exists
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function renameArchive(name: string, newName: string, archivist: string): Promise<RawArchive> {
    if (!await archiveExists(name))
        throw new ArchiveNotFoundError();
    if (await archiveExists(newName))
        throw new ArchiveAlreadyExistsError();

    debug(`Renaming archive ${name} to ${newName} (${archivist})`);

    const archiveDoc = await archiveModel.findOneAndUpdate({ name }, { name: newName });
    if (!archiveDoc) throw new ArchiveNotFoundError();
    return normalizeArchive(archiveDoc);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function changeArchiveDescription(name: string, description: string, archivist: string): Promise<RawArchive> {
    if (!await archiveExists(name))
        throw new ArchiveNotFoundError();

    debug(`Changing archive description of ${name} (${archivist})`);

    const archiveDoc = await archiveModel.findOneAndUpdate({ name }, { description });
    if (!archiveDoc) throw new ArchiveNotFoundError();
    return normalizeArchive(archiveDoc);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function addMaintainerToArchive(archive: string, maintainer: string): Promise<RawArchive> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();

    debug(`Adding maintainer ${maintainer} to ${archive}`);

    const archiveDoc = await archiveModel.findOne({ name: archive });
    if (!archiveDoc) throw new ArchiveNotFoundError();
    if (!archiveDoc.maintainers.includes(maintainer)) {
        archiveDoc.maintainers.push(maintainer);
        await archiveDoc.save();
    }
    return normalizeArchive(archiveDoc);
}

/**
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {NotAuthorizedError} If the archivist is not the owner of the archive
 */
export async function deleteArchive(name: string, archivist: string): Promise<void> {
    if (!await archiveExists(name))
        throw new ArchiveNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();

    debug(`Deleting archive ${name} (${archivist})`);

    const archive = await archiveModel.findOne({ name });

    if (!archive || archive.owner !== archivist)
        throw new NotAuthorizedError();

    await archive.deleteOne();
}
