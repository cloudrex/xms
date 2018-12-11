import dgram, {Socket} from "dgram";
import {AddressInfo} from "net";
import {GatewayMsg, GatewayMsgType, HelloPayload, MessagePayload, HeartbeatPayload} from "./gateway";
import {store, AppState} from "../store/store";
import Actions from "../store/actions";
import {app} from "..";
import {IDisposable} from "../core/interfaces";
import {IMessage, INotice, MessageType} from "../types/types";

export default class BroadcastGateway implements IDisposable {
    public static slowThreshold: number = 150;

    public readonly groupAdress: string;
    public readonly port: number;

    private readonly socket: Socket;
    private readonly heartbeatInterval: number;
    private readonly intervals: number[];

    private pingStart: number;
    private connectionVerified: boolean;

    public constructor(groupAddress: string, port: number, heartbeatInterval: number = 5000) {
        this.groupAdress = groupAddress;
        this.port = port;
        this.heartbeatInterval = heartbeatInterval;
        this.intervals = [];
        this.connectionVerified = false;
        this.pingStart = 0;

        // Create socket
        this.socket = dgram.createSocket({
            type: "udp4",
            reuseAddr: true
        });

        this.setupEvents();
    }

    public setInterval(action: any, time: number, call: boolean = true): this {
        if (call) {
            action.bind(this)();
        }

        this.intervals.push(setTimeout(action.bind(this), time) as any);

        return this;
    }

    public clearIntervals(): this {
        for (let i = 0; i < this.intervals.length; i++) {
            clearInterval(this.intervals[i]);
        }

        return this;
    }

    private setupEvents(): this {
        this.socket.on("listening", () => {
            this.socket.addMembership(this.groupAdress);

            console.log(`[BroadcastGateway] Listening on ${this.groupAdress}@${this.port}`);
            this.pingStart = performance.now();

            // Start heartbeat loop
            this.setInterval(this.heartbeat, this.heartbeatInterval);
        });

        this.socket.on("close", () => {
            console.log("[BroadcastGateway] Disconnected");

            Actions.addMessage<INotice>({
                // TODO
                channelId: "general",
                id: "disco",
                text: "Disconnected from the network.",
                time: Date.now(),
                type: MessageType.Notice
            });
        });

        this.socket.on("message", (data: Buffer, sender: AddressInfo) => {
            const messageString: string = data.toString();

            // TODO: Debugging
            console.log(`[BroadcastGateway.setupEvents] Received message string: ${messageString}`);

            if (messageString.startsWith("{") && messageString.endsWith("}")) {
                const message: GatewayMsg<any> = JSON.parse(messageString);

                if (message.sender === app.me.id) {
                    if (message.type === GatewayMsgType.Message) {
                        const payload: MessagePayload = message.payload;

                        Actions.markMessageSent(payload.id);
                    }
                    else if (message.type === GatewayMsgType.Heartbeat) {
                        // TODO: Also measure ping
                        if (!this.connectionVerified) {
                            this.connectionVerified = true;

                            const ping: number = Math.round(performance.now() - this.pingStart);

                            Actions.addMessage<INotice>({
                                // TODO:
                                channelId: "general",
                                id: "fefwefwe2",
                                text: `Connected to the network @ ${this.groupAdress}. ~${ping}ms`,
                                time: Date.now(),
                                type: MessageType.Notice
                            });

                            Actions.setInputLocked(false);

                            if (ping >= BroadcastGateway.slowThreshold) {
                                Actions.addMessage<INotice>({
                                    // TODO
                                    channelId: "general",
                                    id: "fk4k24t",
                                    text: "Your connection may be slow due to high latency.",
                                    time: Date.now(),
                                    type: MessageType.Notice
                                });   
                            }
                        }
                    }
                    else {
                        console.log(`[BroadcastGateway:Message] Unknown message type from self: ${message.type}`);
                    }

                    return;
                }

                // TODO: Use handlers instead
                if (message.type === GatewayMsgType.Hello) {
                    // TODO: Make use of the time difference & adjust time proxy for this user
                    const payload: HelloPayload = message.payload;

                    if (!(store.getState() as AppState).usersMap.has(message.sender)) {
                        Actions.addUser(payload.user);
                    }
                }
                else if (message.type === GatewayMsgType.Message) {
                    const payload: MessagePayload = message.payload;

                    if ((store.getState() as AppState).usersMap.has(message.sender)) {
                        // TODO
                    }
                    else {
                        // TODO: Fix
                        // TODO: Verify type and data
                        Actions.addMessage({
                            // TODO: A way to safely identify an unknown sender, or is it not required?
                            authorAvatarUrl: "",
                            authorName: "Unknown",
                            id: "unknown",
                            systemMessage: false,
                            text: payload.text,
                            sent: true,

                            // TODO: Time should be provided by sender
                            time: Date.now(),
                            channelId: "general",
                            type: payload.type
                        } as IMessage);
                    }
                }
                else {
                    console.log(`[BroadcastGateway] Received an invalid message from '${sender.address}' with type '${message.type}'`)
                }
            }
        });

        this.socket.on("error", (error: Error) => {
            console.log(`[BroadcastGateway.setupEvents] Socket threw error with message: ${error.message}`);
        });

        return this;
    }

    private heartbeat(): this {
        this.emit<HeartbeatPayload>(GatewayMsgType.Heartbeat, {
            //
        });

        return this;
    }

    public emit<T>(type: GatewayMsgType, payload: T): void {
        const data: Buffer = Buffer.from(JSON.stringify({
            type,
            time: Date.now(),
            payload,
            sender: app.me.id
        } as GatewayMsg<T>));

        this.socket.send(data, 0, data.length, this.port, this.groupAdress, (error: Error | null) => {
            if (error !== null) {
                console.log(`[BroadcastGateway.emit] Failed to emit message: ${error.message}`);
            }

            console.log(`[BroadcastGateway.emit] Sent ${data.length} bytes`);
        });
    }

    public dispose(): this {
        this.clearIntervals();

        return this;
    }

    public start(): this {
        this.socket.bind(this.port);

        return this;
    }
}