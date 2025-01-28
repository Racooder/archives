import express from "express";
import { existsSync, mkdirSync } from "fs";
import multer from "multer";
import { apiChangeArchiveDescription, apiCreateArchive, apiDeleteArchive, apiGetArchive, apiListArchives, apiRenameArchive } from "./api/Archive";
import { apiAddDocumentToRecord, apiAddTagToRecord, apiCreateRecord, apiDeleteRecord, apiFindRecords, apiGetRecord, apiReorderDocumentInRecord } from "./api/Record";
import { apiCreateArchivist, apiDeleteArchivist } from "./api/Archivist";
import { apiCreateDocuments, apiDeleteDocument, apiGetDocumentMeta, apiGetDocumentObject, apiGetUnsorted, apiRenameDocument } from "./api/Document";
import { success } from "./Log";
import cors from 'cors';

const PORT = 8080;

// * Setup

// Setup multer
const UPLOAD_DIR = "uploads/";
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
const upload = multer({ dest: UPLOAD_DIR });

// Setup express
const app = express();
app.use(express.json());
app.use(cors());

// * Routes

// Archives
app.get("/archives", apiListArchives);
app.post("/archive", function (req, res) {
    if (typeof req.body.name !== "string" || req.body.name.trim() === "") {
        res.status(400).send("Invalid name.");
        return;
    }
    if (typeof req.body.description !== "string") {
        res.status(400).send("Invalid description.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    apiCreateArchive(req, res);
});
app.get("/archive/:archive", apiGetArchive);
app.post("/archive/:archive/rename", function (req, res) {
    if (typeof req.body.newName !== "string" || req.body.newName.trim() === "") {
        res.status(400).send("Invalid new name.");
        return;
    }
    if (req.params.archive === req.body.newName) {
        res.status(400).send("New name cannot be the same as the old name.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    apiRenameArchive(req, res);
});
app.post("/archive/:archive/description", function (req, res) {
    if (typeof req.body.description !== "string") {
        res.status(400).send("Invalid description.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    apiChangeArchiveDescription(req, res);
});
app.delete("/archive/:archive", function (req, res) {
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    apiDeleteArchive(req, res);
});

// Archivists
app.post("/archivist", function (req, res) {
    if (typeof req.body.username !== "string" || req.body.username.trim() === "") {
        res.status(400).send("Invalid username.");
        return;
    }

    apiCreateArchivist(req, res);
});
app.delete("/archivist", function (req, res) {
    if (typeof req.body.username !== "string") {
        res.status(400).send("Invalid username.");
        return;
    }

    apiDeleteArchivist(req, res);
});

// Documents
app.post("/document", upload.array("files"), function (req, res) {
    if (!req.files || req.files.length === 0) {
        res.status(400).send("No file uploaded.");
        return;
    }
    if (typeof req.body.archive !== "string") {
        res.status(400).send("Invalid archive.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    if (!req.files) return;
    apiCreateDocuments(req, res, req.files as Express.Multer.File[]);
});
app.get("/document/:archive/:hash/meta", apiGetDocumentMeta);
app.get("/document/:archive/:hash/object", apiGetDocumentObject);
app.delete("/document/:archive/:hash", function (req, res) {
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }
    
    apiDeleteDocument(req, res);
});
app.post("/document/:archive/:hash/rename", function (req, res) {
    if (typeof req.body.newName !== "string" || req.body.newName.trim() === "") {
        res.status(400).send("Invalid new name.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }
    
    apiRenameDocument(req, res);
});
app.get("/unsorted/:archive", apiGetUnsorted);

// Records
app.post("/record/:archive", function (req, res) {
    if (typeof req.body.name !== "string" || req.body.name.trim() === "") {
        res.status(400).send("Invalid name.");
        return;
    }
    if (typeof req.body.creator !== "string") {
        res.status(400).send("Invalid creator.");
        return;
    }

    apiCreateRecord(req, res);
});
app.get("/record/:archive/:id", apiGetRecord);
app.delete("/record/:archive/:id", apiDeleteRecord);
app.post("/record/:archive/:id/document", function (req, res) {
    if (typeof req.body.document !== "string") {
        res.status(400).send("Invalid document.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    apiAddDocumentToRecord(req, res);
});
app.delete("/record/:archive/:id/document/:document", apiDeleteRecord);
app.post("/record/:archive/:id/reorder", function (req, res) {
    if (typeof req.body.index !== "number") {
        res.status(400).send("Invalid index.");
        return;
    }
    if (typeof req.body.newIndex !== "number") {
        res.status(400).send("Invalid new index.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    apiReorderDocumentInRecord(req, res);
});
app.post("/record/:archive/:id/tag", function (req, res) {
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }
    if (typeof req.body.tag !== "string" || req.body.tag.trim() === "") {
        res.status(400).send("Invalid tag.");
        return;
    }

    apiAddTagToRecord(req, res);
});
app.delete("/record/:archive/:id/tag/:tag", apiDeleteRecord);
app.get("/records/:archive", apiFindRecords);

// * Start server

export function start() {
    app.listen(PORT, () => {
        success(`API listening on port ${PORT}.`);
    });
}

