import { Document as MongooseDoc, Model, Schema, model, Types, UpdateQuery } from "mongoose";
import { moveElement } from "../Utility";
import { debug } from "../Log";

export interface Record extends MongooseDoc {
    _id: Types.ObjectId;
    name: string;
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
    documents: { type: [Schema.Types.ObjectId], ref: "Document", required: true },
    tags: { type: [String], required: true },
    creator: { type: String, ref: "Archivist", required: true },
    maintainers: { type: [String], ref: "Archivist", required: true }
}, { timestamps: true });

const recordModel = model<Record, RecordModel>("Record", recordSchema);

// * Functions

// Create a record
export async function createRecord(name: string, creator: string): Promise<Record> {
    debug(`Creating record ${name} (${creator})`);
    return recordModel.create({
        name: name,
        documents: [],
        tags: [],
        creator: creator,
        maintainers: [creator]
    });
}

// Get a record
export async function getRecord(id: string): Promise<Record | undefined> {
    debug(`Getting record ${id}`);
    return await recordModel.findById(id) || undefined;
}

// Delete a record
export async function deleteRecord(id: string): Promise<void> {
    debug(`Deleting record ${id}`);
    const record = await recordModel.findById(id);

    if (!record) throw new Error("Record not found");

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
export async function addDocumentToRecord(record: Types.ObjectId, document: Types.ObjectId, archivist: string): Promise<void> {
    debug(`Adding document ${document} to record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record);

    if (!recordDoc) throw new Error("Record not found");

    await updateRecord(recordDoc, { documents: { $push: document } }, archivist);
}

// Remove a document from a record
export async function removeDocumentFromRecord(record: Types.ObjectId, documentIndex: number, archivist: string): Promise<void> {
    debug(`Removing document at index ${documentIndex} from record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record);

    if (!recordDoc) throw new Error("Record not found");

    recordDoc.documents.splice(documentIndex, 1);
    await saveModifiedRecord(recordDoc, archivist);
}

// Reorder documents in a record
export async function reorderDocumentsInRecord(record: Types.ObjectId, documentIndex: number, newIndex: number, archivist: string): Promise<void> {
    debug(`Reordering document at index ${documentIndex} to ${newIndex} in record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record);

    if (!recordDoc) throw new Error("Record not found");

    moveElement(recordDoc.documents, documentIndex, newIndex);
    await saveModifiedRecord(recordDoc, archivist);
}

// Add a tag to a record
export async function addTagToRecord(record: Types.ObjectId, tag: string, archivist: string): Promise<void> {
    debug(`Adding tag ${tag} to record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record);

    if (!recordDoc) throw new Error("Record not found");

    await updateRecord(recordDoc, { tags: { $push: tag } }, archivist);
}

// Remove a tag from a record
export async function removeTagFromRecord(record: Types.ObjectId, tag: string, archivist: string): Promise<void> {
    debug(`Removing tag ${tag} from record ${record} (${archivist})`);
    const recordDoc = await recordModel.findById(record);

    if (!recordDoc) throw new Error("Record not found");

    await updateRecord(recordDoc, { tags: { $pull: tag } }, archivist);
}

type RecordQuery = { name?: string, includeTags?: string[], excludeTags?: string[], filterTags?: string[] };

// Find records by tag
export async function findRecords(query: RecordQuery): Promise<Record[]> {
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
    return await recordModel.find(mongooseQuery);
}
