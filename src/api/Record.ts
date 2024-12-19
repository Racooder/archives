// * Record

import { Request, Response } from "express";
import { addDocumentToRecord, addTagToRecord, createRecord, deleteRecord, findRecords, getRecord, RecordQuery, removeDocumentFromRecord, removeTagFromRecord, reorderDocumentsInRecord } from "../models/Record";
import { Types } from "mongoose";

export async function apiCreateRecord(req: Request<{archive: string}, any, {name: string, creator: string}>, res: Response) {
    try {
        await createRecord(req.body.name, req.params.archive, req.body.creator);
        res.status(201).send("Record created.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiGetRecord(req: Request<{archive: string, id: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }

    try {
        const record = await getRecord(req.params.archive, new Types.ObjectId(req.params.id));
        res.status(200).json(record);
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiDeleteRecord(req: Request<{archive: string, id: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }

    try {
        await deleteRecord(req.params.archive, new Types.ObjectId(req.params.id));
        res.status(200).send("Record deleted.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiAddDocumentToRecord(req: Request<{archive: string, id: string}, any, {document: string, archivist: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }

    try {
        await addDocumentToRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.document, req.body.archivist);
        res.status(200).send("Document added to record.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiRemoveDocumentFromRecord(req: Request<{archive: string, id: string, document: string}, any, {archivist: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await removeDocumentFromRecord(req.params.archive, new Types.ObjectId(req.params.id), parseInt(req.params.document), req.body.archivist);
        res.status(200).send("Document removed from record.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiReorderDocumentInRecord(req: Request<{archive: string, id: string}, any, {index: number, newIndex: number, archivist: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }

    try {
        await reorderDocumentsInRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.index, req.body.newIndex, req.body.archivist);
        res.status(200).send("Documents reordered.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiAddTagToRecord(req: Request<{archive: string, id: string}, any, {archivist: string, tag: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }

    try {
        await addTagToRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.archivist, req.body.tag);
        res.status(200).send("Tag added to record.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiRemoveTagFromRecord(req: Request<{archive: string, id: string, tag: string}, any, {archivist: string}>, res: Response) {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await removeTagFromRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.archivist, req.params.tag);
        res.status(200).send("Tag removed from record.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiFindRecords(req: Request<{archive: string}, any, any, {name?: string, includeTags?: string, excludeTags?: string, filterTags?: string}>, res: Response) {
    const queryObject: RecordQuery = {
        name: req.query.name,
        includeTags: req.query.includeTags?.split(","),
        excludeTags: req.query.excludeTags?.split(","),
        filterTags: req.query.filterTags?.split(",")
    };

    try {
        const records = await findRecords(req.params.archive, queryObject);
        res.status(200).json(records);
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}
