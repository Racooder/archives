import { Document as MongooseDoc, Model, Schema, model, Types, UpdateQuery } from "mongoose";
import { moveElement } from "../Utility";
import { debug } from "../Log";
import { archivistExists } from "./Archivist";
import { documentExists } from "./Document";
import { archiveExists } from "./Archive";

export interface Record extends MongooseDoc {
    _id: Types.ObjectId;
    name: string;
    archive: string;
    documents: Types.ObjectId[];
    tags: string[];
    creator: string;
    maintainers: string[];
    createdAt: Date;
    updatedAt: Date;
}

interface RecordModel extends Model<Record> { }

const recordSchema = new Schema<Record, RecordModel>({
    name: { type: String, required: true },
    archive: { type: String, ref: "Archive", required: true },
    documents: { type: [Schema.Types.ObjectId], ref: "Document", required: true },
    tags: { type: [String], required: true },
    creator: { type: String, ref: "Archivist", required: true },
    maintainers: { type: [String], ref: "Archivist", required: true }
}, { timestamps: true });

const recordModel = model<Record, RecordModel>("Record", recordSchema);

// * Functions

function sanitizeRecord(record: Record): any {
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

// Check if a record exists
export async function recordExists(archive: string, id: Types.ObjectId): Promise<boolean> {
    return !!await recordModel.findOne({ archive: archive, _id: id });
}

// Create a record
export async function createRecord(archive: string, name: string, creator: string): Promise<Record> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await archivistExists(creator))
        throw new Error("Archivist not found");

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

// Get a record
export async function getRecord(archive: string, id: Types.ObjectId): Promise<any> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, id))
        throw new Error("Record not found");

    debug(`Getting record ${id} in ${archive}`);
    const recordDoc = await recordModel.findById(id) as Record;
    return sanitizeRecord(recordDoc);
}

// Delete a record
export async function deleteRecord(archive: string, id: Types.ObjectId): Promise<void> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, id))
        throw new Error("Record not found");

    debug(`Deleting record ${id} in ${archive}`);
    const record = await recordModel.findById(id) as Record;

    await record.deleteOne();
}

// Update a record
export async function updateRecord(record: Record, updateQuery: UpdateQuery<Record>, archivist: string): Promise<void> {
    debug(`Updating record ${record._id} (${archivist})`);
    if (!record.maintainers.includes(archivist)) {
        updateQuery.maintainers = { $push: archivist };
    }
    await record.updateOne(updateQuery);
}

// Save a modified record
export async function saveModifiedRecord(record: Record, archivist: string): Promise<void> {
    debug(`Saving modified record ${record._id} (${archivist})`);
    if (!record.maintainers.includes(archivist)) {
        record.maintainers.push(archivist);
    }
    record.save();
}

// Add a document to a record
export async function addDocumentToRecord(archive: string, record: Types.ObjectId, document: string, archivist: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, record))
        throw new Error("Record not found");
    if (!await documentExists(archive, document))
        throw new Error("Document not found");
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    debug(`Adding document ${document} to record ${record} in ${archive} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    await updateRecord(recordDoc, { documents: { $push: document } }, archivist);
}

// Remove a document from a record
export async function removeDocumentFromRecord(archive: string, record: Types.ObjectId, documentIndex: number, archivist: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, record))
        throw new Error("Record not found");
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    debug(`Removing document at index ${documentIndex} from record ${record} in ${archive} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    if (documentIndex < 0 || documentIndex >= recordDoc.documents.length)
        throw new Error("Document index out of bounds");

    recordDoc.documents.splice(documentIndex, 1);
    await saveModifiedRecord(recordDoc, archivist);
}

// Reorder documents in a record
export async function reorderDocumentsInRecord(archive: string, record: Types.ObjectId, documentIndex: number, newIndex: number, archivist: string): Promise<void> {
    if (documentIndex === newIndex)
        throw new Error("New index is the same as the old index");
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, record))
        throw new Error("Record not found");
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    debug(`Reordering document at index ${documentIndex} to ${newIndex} in record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    if (documentIndex < 0 || documentIndex >= recordDoc.documents.length)
        throw new Error("Document index out of bounds");
    if (newIndex < 0 || newIndex >= recordDoc.documents.length)
        throw new Error("New index out of bounds");

    moveElement(recordDoc.documents, documentIndex, newIndex);
    await saveModifiedRecord(recordDoc, archivist);
}

// Add a tag to a record
export async function addTagToRecord(archive: string, record: Types.ObjectId, archivist: string, tag: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, record))
        throw new Error("Record not found");
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    debug(`Adding tag ${tag} to record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    await updateRecord(recordDoc, { tags: { $push: tag } }, archivist);
}

// Remove a tag from a record
export async function removeTagFromRecord(archive: string, record: Types.ObjectId, archivist: string, tag: string): Promise<void> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");
    if (!await recordExists(archive, record))
        throw new Error("Record not found");
    if (!await archivistExists(archivist))
        throw new Error("Archivist not found");

    debug(`Removing tag ${tag} from record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record) as Record;

    await updateRecord(recordDoc, { tags: { $pull: tag } }, archivist);
}

type RecordQuery = { name?: string, includeTags?: string[], excludeTags?: string[], filterTags?: string[] };

// Find records by tag
export async function findRecords(archive: string, query: RecordQuery): Promise<Record[]> {
    if (!await archiveExists(archive))
        throw new Error("Archive not found");

    debug(`Finding records with query ${JSON.stringify(query)}`);
    const mongooseQuery: any = {};
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
