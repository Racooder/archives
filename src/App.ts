import { connect } from "mongoose";
import config from "./Config";
import { existsSync, mkdirSync } from "fs";
import { ARCHIVES_PATH } from "./Paths";
import { info, setupLog } from "./Log";
import { start } from "./Rest";

// TODO: Just for testing, remove later
// import { Types } from "mongoose";
// import { createArchive } from "./models/Archive";
// import { createArchivist } from "./models/Archivist";
// import { createDocument } from "./models/Document";
// import { Readable } from "stream";
// import { addDocumentToRecord, createRecord } from "./models/Record";

// Folder Structure
// - archives/
//   - objects/
//     - <first 2 characters of hash>/
//       - <last 38 characters of hash>

async function setup() {
    await setupLog();
    info("Setting up folder structure...");
    if (!existsSync(ARCHIVES_PATH)) mkdirSync(ARCHIVES_PATH, { recursive: true });
    info("Connecting to MongoDB...");
    await connect(config.mongo_uri);
    info("Starting Rest API...")
    start();

    // TODO: Just for testing, remove later
    // await createArchivist("racooder");
    // await createArchive("test", "Test archive", "racooder");
    // await createDocument("test", "racooder", Readable.from("test text"), "test file", "text/plain", 0, "uploads/test.txt");
    // await createRecord("test", "test record", "racooder");
    // await addDocumentToRecord("test", new Types.ObjectId("6758b6eea6040adbe265e399"), "6afc05eae22e994f1c7dd48e58f8895dd9028223", "racooder");
}

setup();
