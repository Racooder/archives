import { Document as MongooseDoc, Model, Schema, model, Types, UpdateQuery, RootFilterQuery } from "mongoose";
import { moveElement } from "../Utility";
import { debug } from "../Log";
import { archivistExists } from "./Archivist";
import { documentExists, setUnsorted } from "./Document";
import { archiveExists } from "./Archive";
import { ArchiveNotFoundError } from "../errors/Archive";
import { ArchivistNotFoundError } from "../errors/Archivist";
import { DocumentIndexOutOfBoundsError, NewIndexIsSameAsOldError, NewIndexOutOfBoundsError, RecordNotFoundError } from "../errors/Record";
import { DocumentNotFoundError } from "../errors/Document";

export interface RawRecord {
    _id: Types.ObjectId;
    name: string;
    archive: string;
    documents: string[];
    tags: string[];
    creator: string;
    maintainers: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface Record extends RawRecord, MongooseDoc<Types.ObjectId> { }

interface RecordModel extends Model<Record> { }

const recordSchema = new Schema<Record, RecordModel>({
    name: { type: String, required: true },
    archive: { type: String, ref: "Archive", required: true },
    documents: { type: [String], required: true },
    tags: { type: [String], required: true },
    creator: { type: String, ref: "Archivist", required: true },
    maintainers: { type: [String], ref: "Archivist", required: true }
}, { timestamps: true });

const recordModel = model<Record, RecordModel>("Record", recordSchema);

// * Functions

function sanitizeRecord(record: Record): RawRecord {
    return {
        _id: record._id,
        name: record.name,
        archive: record.archive,
        documents: record.documents,
        tags: record.tags,
        creator: record.creator,
        maintainers: record.maintainers,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
    };
}

export async function recordExists(archive: string, id: Types.ObjectId): Promise<boolean> {
    return !!await recordModel.findOne({ archive: archive, _id: id });
}

// * Api Functions

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {ArchivistNotFoundError} If a archivist with the given username does not exist
 */
export async function createRecord(archive: string, name: string, creator: string): Promise<Record> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await archivistExists(creator))
        throw new ArchivistNotFoundError();

    debug(`Creating record ${name} in ${archive} (${creator})`);

    return recordModel.create({
        name: name,
        archive: archive,
        documents: [],
        tags: [],
        creator: creator,
        maintainers: [creator]
    });
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 */
export async function getRecord(archive: string, id: Types.ObjectId): Promise<RawRecord> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await recordExists(archive, id))
        throw new RecordNotFoundError();

    debug(`Getting record ${id} in ${archive}`);
    const recordDoc = await recordModel.findById(id) as Record; // FIXME: This could break
    return sanitizeRecord(recordDoc);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 */
export async function deleteRecord(archive: string, id: Types.ObjectId): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await recordExists(archive, id))
        throw new RecordNotFoundError();

    debug(`Deleting record ${id} in ${archive}`);
    const record = await recordModel.findById(id) as Record;

    await record.deleteOne();
}

async function updateRecord(record: Record, updateQuery: UpdateQuery<Record>, archivist: string): Promise<void> {
    debug(`Updating record ${record._id} (${archivist})`);
    if (!record.maintainers.includes(archivist)) {
        if (!updateQuery.$push) {
            updateQuery.$push = {}
        }
        updateQuery.$push.maintainers = archivist;
    }
    await record.updateOne(updateQuery);
}

export async function saveModifiedRecord(record: Record, archivist: string): Promise<void> {
    debug(`Saving modified record ${record._id} (${archivist})`);
    if (!record.maintainers.includes(archivist)) {
        record.maintainers.push(archivist);
    }
    record.save();
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 * @throws {DocumentNotFoundError} If a document with the given hash does not exist
 * @throws {ArchivistNotFoundError} If an archivist with the given name does not exist
 */
export async function addDocumentToRecord(archive: string, record: Types.ObjectId, documentHash: string, archivist: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchivistNotFoundError();
    if (!await recordExists(archive, record))
        throw new RecordNotFoundError();
    if (!await documentExists(archive, documentHash))
        throw new DocumentNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();

    debug(`Adding document ${documentHash} to record ${record} in ${archive} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    await updateRecord(recordDoc, { $push: { documents: documentHash } }, archivist);
    await setUnsorted(archive, documentHash, false);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 * @throws {ArchivistNotFoundError} If an archivist with the given name does not exist
 * @throws {DocumentIndexOutOfBoundsError} If the given document index was outside the bounds of the document array
 */
export async function removeDocumentFromRecord(archive: string, record: Types.ObjectId, documentIndex: number, archivist: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await recordExists(archive, record))
        throw new RecordNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();

    debug(`Removing document at index ${documentIndex} from record ${record} in ${archive} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    if (documentIndex < 0 || documentIndex >= recordDoc.documents.length)
        throw new DocumentIndexOutOfBoundsError();

    const hash = recordDoc.documents.splice(documentIndex, 1)[0];
    await saveModifiedRecord(recordDoc, archivist);
    const recordCount = await recordModel.countDocuments({ documents: hash });
    if (recordCount == 0) {
        await setUnsorted(archive, hash, true);
    }
}

/**
 * @throws {NewIndexIsSameAsOldError} If the given new index is the same as the given document index
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 * @throws {ArchivistNotFoundError} If an archivist with the given name does not exist
 * @throws {DocumentIndexOutOfBoundsError} If the given document index was outside the bounds of the document array
 * @throws {NewIndexOutOfBoundsError} If the given new index was outside the bounds of the document array
 */
export async function reorderDocumentsInRecord(archive: string, record: Types.ObjectId, documentIndex: number, newIndex: number, archivist: string): Promise<void> {
    if (documentIndex === newIndex)
        throw new NewIndexIsSameAsOldError();
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await recordExists(archive, record))
        throw new RecordNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();

    debug(`Reordering document at index ${documentIndex} to ${newIndex} in record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    if (documentIndex < 0 || documentIndex >= recordDoc.documents.length)
        throw new DocumentIndexOutOfBoundsError()
    if (newIndex < 0 || newIndex >= recordDoc.documents.length)
        throw new NewIndexOutOfBoundsError();

    moveElement(recordDoc.documents, documentIndex, newIndex);
    await saveModifiedRecord(recordDoc, archivist);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 * @throws {ArchivistNotFoundError} If an archivist with the given name does not exist
 */
export async function addTagToRecord(archive: string, record: Types.ObjectId, archivist: string, tag: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await recordExists(archive, record))
        throw new RecordNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();

    debug(`Adding tag ${tag} to record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    await updateRecord(recordDoc, { $push: { tags: tag } }, archivist);
}

/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 * @throws {RecordNotFoundError} If a record with the given id does not exist
 * @throws {ArchivistNotFoundError} If an archivist with the given name does not exist
 */
export async function removeTagFromRecord(archive: string, record: Types.ObjectId, archivist: string, tag: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();
    if (!await recordExists(archive, record))
        throw new RecordNotFoundError();
    if (!await archivistExists(archivist))
        throw new ArchivistNotFoundError();

    debug(`Removing tag ${tag} from record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    await updateRecord(recordDoc, { $pull: { tags: tag } }, archivist);
}

export type RecordQuery = {
    name?: string,
    includeTags?: string[],
    excludeTags?: string[],
    filterTags?: string[]
};
/**
 * @throws {ArchiveNotFoundError} If an archive with the given name does not exist
 */
export async function findRecords(archive: string, query: RecordQuery): Promise<RawRecord[]> {
    if (!await archiveExists(archive))
        throw new ArchiveNotFoundError();

    debug(`Finding records with query ${JSON.stringify(query)}`);
    const mongooseQuery: RootFilterQuery<Record> = {};
    if (query.name) {
        mongooseQuery.name = { $regex: `.*${query.name}.*`, $options: "i" };
    }
    if (query.includeTags || query.excludeTags || query.filterTags) {
        mongooseQuery.tags = {};
    }
    if (query.includeTags) {
        mongooseQuery.tags.$in = query.includeTags;
    }
    if (query.excludeTags) {
        mongooseQuery.tags.$nin = query.excludeTags;
    }
    if (query.filterTags) {
        mongooseQuery.tags.$all = query.filterTags;
    }
    const records = await recordModel.find(mongooseQuery);
    return records.map(sanitizeRecord);
}
