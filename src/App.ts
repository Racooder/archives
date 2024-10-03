import { connect } from "mongoose";
import config from "./Config";
import { existsSync, mkdirSync } from "fs";
import { ARCHIVES_PATH } from "./Paths";
import { info, setupLog, success } from "./Log";

// Folder Structure
// - archives/
//   - objects/
//     - <first 2 characters of hash>/
//       - <last 38 characters of hash>

async function setup(): Promise<void> {
    await setupLog();
    info("Setting up folder structure...");
    if (!existsSync(ARCHIVES_PATH)) mkdirSync(ARCHIVES_PATH);
    info("Connecting to MongoDB...");
    await connect(config.mongo_uri);
    success("Ready!");
}

setup();
