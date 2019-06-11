import crypto from "crypto";
import { Push } from "github-webhook-event-types";
import { IncomingMessage, Server, ServerResponse } from "http";

export enum GithubEvents {
    PUSH = "push",
}

export class WebhookServer {
    private server: Server;
    private secret: string;

    private listener: Array<(pushEvent: Push) => void> = [];

    constructor(port: number, secret: string) {
        this.server = new Server(this.requestListener.bind(this));
        this.secret = secret;
        this.server.listen(port);
    }

    public addListener(callback: (event: Push) => void) {
        this.listener = [...this.listener, callback];
    }

    private requestListener(request: IncomingMessage, response: ServerResponse): void {
        let body: string = "";
        request.on("data", (chunk: any) => body += chunk);

        request.on("end", () => {
            if ( !this.isRequestValidGihubHook(body, request) ) {
                this.writeErrorResponse(response, 405, "Method Not Allowed");
                return;
            }

            if ( !this.isRequestSignatureValid(request, body) ) {
                this.writeErrorResponse(response, 401, "Unauthorized");
                return;
            }

            const pushEvent: Push = JSON.parse(body);
            this.listener.forEach((listener) => listener(pushEvent));

            response.write("ok");
            response.end();
        });
    }

    private isRequestValidGihubHook(body: string, request: IncomingMessage): boolean {
        if (request.method !== "POST") {
            return false;
        }

        if (typeof request.headers["x-github-event"] !== "string") {
            return false;
        }

        if (request.headers["x-github-event"] !== GithubEvents.PUSH) {
            return false;
        }

        return true;
    }

    private isRequestSignatureValid(request: IncomingMessage, body: string): boolean {
        const signature = "sha1=" + crypto.createHmac("sha1", this.secret).update(body).digest("hex");

        if (request.headers["x-hub-signature"] !== signature) {
            return false;
        }

        return true;
    }

    private writeErrorResponse(response: ServerResponse, statusCode: number, message: string): ServerResponse {
        response.statusCode = statusCode;
        response.statusMessage = message;
        response.write(message);
        response.end();
        return response;
    }
}
