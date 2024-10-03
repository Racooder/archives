import express from "express";
import { existsSync, mkdirSync } from "fs";
import multer from "multer";

// Setup multer
const UPLOAD_DIR = "uploads/";
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR);
const upload = multer({ dest: UPLOAD_DIR });

// Setup express
const app = express();

// Setup routes
app.post("/document", upload.single("document"), (req, res, next) => {
    // Create document
});
