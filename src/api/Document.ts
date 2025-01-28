import { Request, Response } from "express";
import { createDocument, deleteDocument, documentExists, getDocumentMeta, getUnsorted, renameDocument } from "../models/Document";
import { objectPath } from "../Paths";
import { respondError } from "../ErrorHandling";
import { DocumentAlreadyExists, DocumentNotFoundError } from "../errors/Document";

export async function apiCreateDocuments(req: Request<{}, any, {archive: string, archivist: string}>, res: Response, files: Express.Multer.File[]) {
    let hashes: string[] = [];
    for (const file of files) {
        try {
            const document = await createDocument(req.body.archive, req.body.archivist, file.originalname, file.mimetype, file.size,file.path);
            hashes.push(document.hash);
        } catch (err: any) {
            if (err instanceof DocumentAlreadyExists) continue;
            respondError(res, err);
        }
    }
    res.status(201).send(hashes);
}

export async function apiGetDocumentMeta(req: Request<{archive: string, hash: string}>, res: Response) {
    try {
        const meta = await getDocumentMeta(req.params.archive, req.params.hash);
        res.status(200).json(meta);
    } catch (err: any) {
        respondError(res, err);
    }
}

export async function apiGetDocumentObject(req: Request<{archive: string, hash: string}>, res: Response) {
    if (!documentExists(req.params.archive, req.params.hash)) {
        respondError(res, new DocumentNotFoundError());
        return;
    }
    res.status(200).sendFile(objectPath(req.params.hash));
}

export async function apiDeleteDocument(req: Request<{archive: string, hash: string}, any, {archivist: string}>, res: Response) {
    try {
        await deleteDocument(req.params.archive, req.params.hash, req.body.archivist);
        res.status(200).send("Document deleted.");
    } catch (err: any) {
        respondError(res, err);
    }
}

export async function apiRenameDocument(req: Request<{archive: string, hash: string}, any, {newName: string, archivist: string}>, res: Response) {
    try {
        await renameDocument(req.params.archive, req.params.hash, req.body.newName, req.body.archivist);
        res.status(200).send("Document renamed.");
    } catch (err: any) {
        respondError(res, err);
    }
};

export async function apiGetUnsorted(req: Request<{archive: string}>, res: Response) {
    try {
        const unsorted = await getUnsorted(req.params.archive);
        res.status(200).send(unsorted);
    } catch (err: any) {
        respondError(res, err);
    }
}
