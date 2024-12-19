import { Request, Response } from "express";
import { createDocument, deleteDocument, documentExists, getDocumentMeta, renameDocument } from "../models/Document";
import { objectPath } from "../Paths";

export async function apiCreateDocument(req: Request<{}, any, {archive: string, archivist: string}> & {file: Express.Multer.File}, res: Response) {
    await createDocument(req.body.archive, req.body.archivist, req.file.stream, req.file.originalname, req.file.mimetype, req.file.size, req.file.path);
    res.status(201).send("Document created.");
}

export async function apiGetDocumentMeta(req: Request<{archive: string, hash: string}>, res: Response) {
    const meta = await getDocumentMeta(req.params.archive, req.params.hash);
    if (!meta) {
        res.status(404).send("Document not found.");
        return;
    }
    res.status(200).json(meta);
}

export async function apiGetDocumentObject(req: Request<{archive: string, hash: string}>, res: Response) {
    if (!documentExists(req.params.archive, req.params.hash)) {
        res.status(404).send("Document not found.");
        return;
    }
    res.status(200).sendFile(objectPath(req.params.hash));
}

export async function apiDeleteDocument(req: Request<{archive: string, hash: string}, any, {archivist: string}>, res: Response) {
    try {
        await deleteDocument(req.params.archive, req.params.hash, req.body.archivist);
        res.status(200).send("Document deleted.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

export async function apiRenameDocument(req: Request<{archive: string, hash: string}, any, {newName: string, archivist: string}>, res: Response) {
    try {
        await renameDocument(req.params.archive, req.params.hash, req.body.newName, req.body.archivist);
        res.status(200).send("Document renamed.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
};
