import { Request, Response } from "express";
import { changeArchiveDescription, createArchive, deleteArchive, getArchive, listArchives, renameArchive } from "../models/Archive";
import { respondError } from "../ErrorHandling";

export async function apiListArchives(req: Request<{}>, res: Response) {
    const archives = await listArchives();
    res.status(200).json(archives);
}

export async function apiCreateArchive(req: Request<{}, any, {name: string, description: string, archivist: string}>, res: Response) {
    try {
        await createArchive(req.body.name, req.body.description, req.body.archivist);
        res.status(201).send("Archive created.");
    } catch (err: any) {
        respondError(res, err);
    }
}

export async function apiGetArchive(req: Request<{archive: string}>, res: Response) {
    let archive;
    try {
        archive = await getArchive(req.params.archive);
        res.status(200).json(archive);
    } catch (err: any) {
        respondError(res, err);
    }
}

export async function apiRenameArchive(req: Request<{archive: string}, any, {newName: string, archivist: string}>, res: Response) {
    try {
        await renameArchive(req.params.archive, req.body.newName, req.body.archivist);
        res.status(200).send("Archive renamed.");
    } catch (err: any) {
        respondError(res, err);
    }
}

export async function apiChangeArchiveDescription(req: Request<{archive: string}, any, {description: string, archivist: string}>, res: Response) {
    try {
        await changeArchiveDescription(req.params.archive, req.body.description, req.body.archivist);
        res.status(200).send("Description changed.");
    } catch (err: any) {
        respondError(res, err);
    }
}

export async function apiDeleteArchive(req: Request<{archive: string}, any, {archivist: string}>, res: Response) {
    try {
        await deleteArchive(req.params.archive, req.body.archivist);
        res.status(200).send("Archive deleted.");
    } catch (err: any) {
        respondError(res, err);
    }
}
