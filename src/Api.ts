import express from "express";
import { existsSync, mkdirSync } from "fs";
import multer from "multer";
import { createDocument, deleteDocument, documentExists, getDocumentMeta, renameDocument } from "./models/Document";
import { createArchivist, deleteArchivist, renameArchivist } from "./models/Archivist";
import { createArchive, deleteArchive, getArchive, renameArchive } from "./models/Archive";
import { objectPath } from "./Paths";
import { addDocumentToRecord, addTagToRecord, createRecord, deleteRecord, findRecords, getRecord, removeDocumentFromRecord, removeTagFromRecord, reorderDocumentsInRecord } from "./models/Record";
import { Types } from "mongoose";

// Setup multer
const UPLOAD_DIR = "uploads/";
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR);
const upload = multer({ dest: UPLOAD_DIR });

// Setup express
const app = express();

// * Archivist

// Create a new archivist
app.post("/archivist", async (req, res) => {
    if (typeof req.body.username !== "string" || req.body.username.trim() === "") {
        res.status(400).send("Invalid username.");
        return;
    }

    try {
        await createArchivist(req.body.username);
        res.status(201).send("Archivist created.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Rename an archivist
app.post("/archivist/rename", async (req, res) => {
    if (typeof req.body.username !== "string") {
        res.status(400).send("Invalid username.");
        return;
    }
    if (req.body.username === req.body.newName) {
        res.status(400).send("New name cannot be the same as the old name.");
        return;
    }
    if (typeof req.body.newName !== "string" || req.body.newName.trim() === "") {
        res.status(400).send("Invalid new name.");
        return;
    }

    try {
        await renameArchivist(req.body.username, req.body.newName);
        res.status(200).send("Archivist renamed.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Delete an archivist
app.delete("/archivist", async (req, res) => {
    if (typeof req.body.username !== "string") {
        res.status(400).send("Invalid username.");
        return;
    }

    try {
        await deleteArchivist(req.body.username);
        res.status(200).send("Archivist deleted.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// * Archive

// Create a new archive
app.post("/archive", async (req, res) => {
    if (typeof req.body.name !== "string" || req.body.name.trim() === "") {
        res.status(400).send("Invalid name.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await createArchive(req.body.name, req.body.archivist);
        res.status(201).send("Archive created.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Get information about an archive
app.get("/archive/:archive", async (req, res) => {
    const archive = await getArchive(req.params.archive);

    if (!archive) {
        res.status(404).send("Archive not found.");
        return;
    }

    res.status(200).json(archive);
});

// Rename an archive
app.post("/archive/:archive/rename", async (req, res) => {
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

    try {
        await renameArchive(req.params.archive, req.body.newName, req.body.archivist);
        res.status(200).send("Archive renamed.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Delete an archive
app.delete("/archive/:archive", async (req, res) => {
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await deleteArchive(req.params.archive, req.body.archivist);
        res.status(200).send("Archive deleted.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// * Document

// Create a new document
app.post("/document", upload.single("document"), async (req, res, next) => {
    if (!req.file) {
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

    await createDocument(req.body.archive, req.body.archivist, req.file.stream, req.file.originalname, req.file.mimetype, req.file.size, req.file.path);
    res.status(201).send("Document created.");
});

// Get the meta of a document
app.get("/document/:archive/:hash/meta", async (req, res) => {
    const meta = await getDocumentMeta(req.params.archive, req.params.hash);
    if (!meta) {
        res.status(404).send("Document not found.");
        return;
    }
    res.status(200).json(meta);
});

// Get the object of a document
app.get("/document/:archive/:hash/object", async (req, res) => {
    if (!documentExists(req.params.archive, req.params.hash)) {
        res.status(404).send("Document not found.");
        return;
    }
    res.status(200).sendFile(objectPath(req.params.hash));
});

// Delete a document
app.delete("/document/:archive/:hash", async (req, res) => {
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await deleteDocument(req.params.archive, req.params.hash, req.body.archivist);
        res.status(200).send("Document deleted.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Rename a document
app.post("/document/:archive/:hash/rename", async (req, res) => {
    if (typeof req.body.newName !== "string" || req.body.newName.trim() === "") {
        res.status(400).send("Invalid new name.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await renameDocument(req.params.archive, req.params.hash, req.body.newName, req.body.archivist);
        res.status(200).send("Document renamed.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// * Record

// Create a new record
app.post("/record/:archive", async (req, res) => {
    if (typeof req.body.name !== "string" || req.body.name.trim() === "") {
        res.status(400).send("Invalid name.");
        return;
    }
    if (typeof req.body.creator !== "string") {
        res.status(400).send("Invalid creator.");
        return;
    }

    try {
        await createRecord(req.body.name, req.params.archive, req.body.creator);
        res.status(201).send("Record created.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Get information about a record
app.get("/record/:archive/:id", async (req, res) => {
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
});

// Delete a record
app.delete("/record/:archive/:id", async (req, res) => {
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
});

// Add a document to a record
app.post("/record/:archive/:id/document", async (req, res) => {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }
    if (typeof req.body.document !== "string") {
        res.status(400).send("Invalid document.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }

    try {
        await addDocumentToRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.document, req.body.archivist);
        res.status(200).send("Document added to record.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Remove a document from a record
app.delete("/record/:archive/:id/document/:document", async (req, res) => {
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
});

// Reorder documents in a record
app.post("/record/:archive/:id/reorder", async (req, res) => {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }
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

    try {
        await reorderDocumentsInRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.document, req.body.newIndex, req.body.archivist);
        res.status(200).send("Documents reordered.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Add a tag to a record
app.post("/record/:archive/:id/tag", async (req, res) => {
    if (req.params.id.length !== 24) {
        res.status(400).send("Invalid ID.");
        return;
    }
    if (typeof req.body.archivist !== "string") {
        res.status(400).send("Invalid archivist.");
        return;
    }
    if (typeof req.body.tag !== "string" || req.body.tag.trim() === "") {
        res.status(400).send("Invalid tag.");
        return;
    }

    try {
        await addTagToRecord(req.params.archive, new Types.ObjectId(req.params.id), req.body.archivist, req.body.tag);
        res.status(200).send("Tag added to record.");
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});

// Remove a tag from a record
app.delete("/record/:archive/:id/tag/:tag", async (req, res) => {
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
});

// Find records
app.get("/records/:archive", async (req, res) => {
    try {
        const records = await findRecords(req.params.archive, req.query);
        res.status(200).json(records);
    } catch (err: any) {
        res.status(400).send(err.message);
    }
});
