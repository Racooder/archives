import { readFileSync } from "fs";
import { parse } from "yaml";

const CONFIG_PATH = "config.yml";

type Config = {
    debug: boolean;
    mongo_uri: string;
    keep_logs: number; // Number of logs to keep
}

const content = readFileSync(CONFIG_PATH, "utf-8");
const config = parse(content) as Config;
export default config;
