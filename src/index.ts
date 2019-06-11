import { exec } from "child_process";
import * as dotenv from "dotenv";
import * as log4js from "log4js";
import { WebhookServer } from "./WebhookServer";

dotenv.config({ path: "./.env" });

const port: number = Number(process.env.PORT);
const secret: string = process.env.SECRET ? process.env.SECRET : "";
const branch: string = process.env.BRANCH ? process.env.BRANCH : "develop";
const repoPath: string = process.env.REPO_PATH ? process.env.REPO_PATH : "./";

log4js.configure({
    appenders: { filelogger: { type: "file", filename: "log/info.log" } },
    categories: { default: { appenders: ["filelogger"], level: "info" } },
});
const logger = log4js.getLogger("filelogger");

const webhookServer = new WebhookServer(port, secret);
webhookServer.addListener((pushEvent) => {
    if (pushEvent.ref === "refs/heads/" + branch) {
        exec("cd " + repoPath + " && git pull", (error, stdout, stderr) => {
            logger.info(stdout);
            if (stderr) {
                logger.error(stderr);
            }
        });
    }
});
