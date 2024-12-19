import { Request, Response } from "express";
import { createArchivist, deleteArchivist } from "../models/Archivist";

export async function apiCreateArchivist(req: Request<{}, any, {username: string}>, res: Response) {
    try {
        await createArchivist(req.body.username);
        res.status(201).send("Archivist created.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}

// Modify an archivist
// export async function apiModifyArchivist(req: Request<{username: string}, any, {username: string}>, res: Response) {
//     if (typeof req.body.username !== "string" || req.body.username.trim() === "") {
//         res.status(400).send("Invalid username.");
//         return;
//     }

//     try {
//         await updateArchivist(req.params.username, req.body, req.body.username);
//         res.status(200).send("Archivist modified.");
//     } catch (err: any) {
//         res.status(400).send(err.message);
//     }
// }

export async function apiDeleteArchivist(req: Request<{}, any, {username: string}>, res: Response) {
    try {
        await deleteArchivist(req.body.username);
        res.status(200).send("Archivist deleted.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
}
