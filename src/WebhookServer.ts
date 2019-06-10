import crypto from "crypto";
import { IncomingMessage, Server, ServerResponse } from "http";
import { GithubEvents } from "./types/github/GithubHookEvents";
import * as githubTypes from "./types/github/PushPayload";

export class WebhookServer {
    private server: Server;
    private listener: Array<(payload: githubTypes.IPayload) => void> = [];
    private secret: string;

    constructor(port: number, secret: string) {
        this.server = new Server(this.requestListener.bind(this));
        this.secret = secret;
        this.server.listen(port);
    }

    public addListener(callback: (payload: githubTypes.IPayload) => void) {
        this.listener.push(callback);
    }

    private requestListener(request: IncomingMessage, response: ServerResponse): void {
        if (request.method !== "POST") {
            response.statusCode = 405;
            response.statusMessage = "Method Not Allowed";
            response.write("Method Not Allowed");
            response.end();
            return;
        }

        let body: string = "";
        request.on("data", (chunk: any) => { body += chunk; });

        request.on("end", () => {
            const sig = "sha1=" + crypto.createHmac("sha1", this.secret).update(body).digest("hex");

            if (sig !== request.headers["x-hub-signature"]) {
                response.statusCode = 401;
                response.statusMessage = "Unauthorized";
                response.write("Unauthorized");
                response.end();
                return;
            }

            if (typeof request.headers["x-github-event"] !== "string") {
                response.statusCode = 405;
                response.statusMessage = "Method Not Allowed";
                response.write("Method Not Allowed");
                response.end();
                return;
            }

            const event = request.headers["x-github-event"];
            if (event !== GithubEvents.PUSH) {
                response.statusCode = 405;
                response.statusMessage = "Method Not Allowed";
                response.write("Method Not Allowed");
                response.end();
                return;
            }

            const payload: githubTypes.IPayload = JSON.parse(body);

            this.listener.forEach((listener) => listener(payload));

            response.write("ok");
            response.end();
        });
    }
}
