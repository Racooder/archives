import express, { Request, Response } from 'express';
import multer from 'multer';
import { addDocumentToRecord, addTagToRecord, archiveExists, archiveFile, createArchive, createRecord, deleteDocument, deleteRecord, documentExists, documentMetaPath, documentObjectPath, isExtensionAllowed, listUnclassified, recordExists, recordPath, removeDocumentFromRecord, removeTagFromRecord, updateRecord } from './Archive';
import { existsSync, mkdirSync, unlink } from 'fs';
import { PATHS, unlinkFolderContents } from './Essentials';
import cors from 'cors';

// * Server

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// * File Upload

if (!existsSync(PATHS.uploads)) {
    mkdirSync(PATHS.uploads, { recursive: true });
}
unlinkFolderContents(PATHS.uploads);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const extension = file.originalname.split(".").pop();
        if (!extension) {
            return cb(new Error("Invalid file extension"), "");
        }
        if (!isExtensionAllowed(extension)) {
            return cb(new Error("File type not accepted"), "");
        }

        cb(null, PATHS.uploads);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now().toString());
    },
});

const upload = multer({ storage });

function dropUpload(path: string) {
    unlink(path, (err) => {
        if (err) throw err;
    });
}

// * Archives

app.post("/archive/new", (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (archiveExists(archive)) return res.status(409).send("Archive already exists");

    createArchive(archive);
    return res.status(201).send("Archive created");
});

// * Documents

app.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) return res.status(400).send("No file uploaded");
    const archive = req.body.archive as string | undefined;
    if (!archive) {
        dropUpload(file.path);
        return res.status(400).send("No archive specified");
    }
    if (!archiveExists(archive)) {
        dropUpload(file.path);
        return res.status(404).send("Archive not found");
    }
    const archivist = req.body.archivist as string | undefined;
    if (!archivist) {
        dropUpload(file.path);
        return res.status(400).send("No archivist specified");
    }

    const [hash, message] = await archiveFile(file.path, file.originalname, archive, archivist);
    if (!hash) {
        dropUpload(file.path);
        return res.status(400).send({
            message: message,
            hash: hash,
        });
    }

    return res.status(201).send({
        message: message,
        hash: hash,
    });
});

app.get("/document/:archive/:hash/meta", (req: Request, res: Response) => {
    const archive = req.params.archive as string;
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const hash = req.params.hash as string;
    if (!documentExists(archive, hash)) return res.status(404).send("Document not found");

    const metaPath = documentMetaPath(archive, hash);
    if (!existsSync(metaPath)) return res.status(404).send("Document not found");
    res.sendFile(metaPath);
});

app.get("/document/:archive/:hash/object", (req: Request, res: Response) => {
    const archive = req.params.archive as string;
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const hash = req.params.hash as string;
    if (!documentExists(archive, hash)) return res.status(404).send("Document not found");

    const objectPath = documentObjectPath(archive, hash);
    if (!existsSync(objectPath)) return res.status(404).send("Document not found");
    res.sendFile(objectPath);
});

app.delete("/document", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const hash = req.body.hash as string | undefined;
    if (!hash) return res.status(400).send("No hash specified");
    if (!documentExists(archive, hash)) return res.status(404).send("Document not found");

    await deleteDocument(archive, hash);
    return res.status(200).send("Archive deleted");
});

app.get("/unclassified", async (req: Request, res: Response) => {
    const archive = req.query.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");

    const unclassified = await listUnclassified(archive);
    res.send(unclassified);
});

// * Records

app.post("/record/new", (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const title = req.body.title as string | undefined;
    if (!title) return res.status(400).send("No title specified");
    const archivist = req.body.archivist as string | undefined; // TODO: Implement users
    if (!archivist) return res.status(400).send("No archivist specified");

    const uuid = createRecord(archive, title, archivist);
    return res.status(201).send(uuid);
});

app.get("/record/:archive/:uuid", (req: Request, res: Response) => {
    const archive = req.params.archive as string;
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.params.uuid as string;
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");

    const record = recordPath(archive, uuid);
    if (!existsSync(record)) return res.status(404).send("Record not found");
    res.sendFile(record);
});

app.delete("/record", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.body.uuid as string | undefined;
    if (!uuid) return res.status(400).send("No UUID specified");
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");

    await deleteRecord(archive, uuid);
    return res.status(200).send("Record deleted");
});

app.post("/record/update", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.body.uuid as string | undefined;
    if (!uuid) return res.status(400).send("No UUID specified");
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");
    const archivist = req.body.archivist as string | undefined; // TODO: Implement users
    if (!archivist) return res.status(400).send("No archivist specified");

    await updateRecord(archive, uuid, {
        title: req.body.title,
        description: req.body.description,
        customMetadata: req.body.customMetadata
    }, archivist);

    return res.status(200).send("Record updated");
});

app.post("/record/document", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.body.uuid as string | undefined;
    if (!uuid) return res.status(400).send("No UUID specified");
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");
    const hash = req.body.hash as string | undefined;
    if (!hash) return res.status(400).send("No hash specified");
    if (!documentExists(archive, hash)) return res.status(404).send("Document not found");
    const archivist = req.body.archivist as string | undefined; // TODO: Implement users
    if (!archivist) return res.status(400).send("No archivist specified");

    const success = await addDocumentToRecord(archive, uuid, hash, archivist);
    if (!success) return res.status(400).send("Document already in record");
    return res.status(200).send("Document added to record");
});

app.delete("/record/document", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.body.uuid as string | undefined;
    if (!uuid) return res.status(400).send("No UUID specified");
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");
    const hash = req.body.hash as string | undefined;
    if (!hash) return res.status(400).send("No hash specified");
    const archivist = req.body.archivist as string | undefined; // TODO: Implement users
    if (!archivist) return res.status(400).send("No archivist specified");

    const success = await removeDocumentFromRecord(archive, uuid, hash, archivist);
    if (!success) return res.status(400).send("Document not in record");
    return res.status(200).send("Document removed from record");
});

app.post("/record/tag", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.body.uuid as string | undefined;
    if (!uuid) return res.status(400).send("No UUID specified");
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");
    const tag = req.body.tag as string | undefined;
    if (!tag) return res.status(400).send("No tag specified");
    const archivist = req.body.archivist as string | undefined; // TODO: Implement users
    if (!archivist) return res.status(400).send("No archivist specified");

    const success = await addTagToRecord(archive, uuid, tag, archivist);
    if (!success) return res.status(400).send("Tag already in record");
    return res.status(200).send("Tag added to record");
});

app.delete("/record/tag", async (req: Request, res: Response) => {
    const archive = req.body.archive as string | undefined;
    if (!archive) return res.status(400).send("No archive specified");
    if (!archiveExists(archive)) return res.status(404).send("Archive not found");
    const uuid = req.body.uuid as string | undefined;
    if (!uuid) return res.status(400).send("No UUID specified");
    if (!recordExists(archive, uuid)) return res.status(404).send("Record not found");
    const tag = req.body.tag as string | undefined;
    if (!tag) return res.status(400).send("No tag specified");
    const archivist = req.body.archivist as string | undefined; // TODO: Implement users
    if (!archivist) return res.status(400).send("No archivist specified");

    const success = await removeTagFromRecord(archive, uuid, tag, archivist);
    if (!success) return res.status(400).send("Tag not in record");
    return res.status(200).send("Tag removed from record");
});

// TODO: Search records by title and tags

// * Start server

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
