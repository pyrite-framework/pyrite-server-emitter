import * as io from "socket.io";
import * as uuid from "uuid/v4";

export class EmitterPlugin {
	socket: SocketIO.Server;
	socketsSend: { [key: string]: SocketIO.Socket } = {};
	socketsGet: { [key: string]: SocketIO.Socket } = {};
	tokenToId: { [key: string]: string } = {};
	connectionData: any;
	target: any;
	targetMethod: any;
	server: any;
	type: string;
	param: string;

	constructor(private params: any = {}) {
		this.type = "server";
		this.param = "emit";

		this.connectionData = {};
	}

	public run(server: any): void {
		this.server = server;
		this.socket = io(this.server.connection);

		this.socket.on("connection", (socket: SocketIO.Socket) => {
			const token = uuid();
			const id = uuid();

			this.socketsSend[token] = this.socketsGet[id] = socket;

			this.tokenToId[token] = id;

			const dataEmited: any = {
				controllers: this.connectionData,
				id: id,
				token: token
			};

			socket.emit("controllersAllowed", dataEmited);
		});
	}

	public load(target: any, method: any): Function {
		const targetMethod = target[method.methodName];

		if (!targetMethod.emits && !targetMethod.broadcast) return () => { };

		console.log(`Loading emitter: ${target.alias}.on.${targetMethod.alias}`);

		if (!this.connectionData[target.alias]) this.connectionData[target.alias] = [];

		this.connectionData[target.alias].push(targetMethod.alias);

		return this.emitCallback.bind(this, target, targetMethod);
	}

	private emitCallback(target: any, targetMethod: any, request: any, response: any, data: any): any {
		const msg = `${target.alias}.on.${targetMethod.alias}`;

		const token = request.headers["pyrite-token"];
		const sendOne = request.headers["pyrite-id"];

		const id = this.tokenToId[token];

		if (sendOne) return this.emitOne(id, sendOne, msg, data);
		if (targetMethod.emits) return this.emitAll(id, msg, data);
		if (targetMethod.broadcast) return this.emitRest(id, token, msg, data);
	}

	private emitOne(id: string, sendId: string, msg: string, data: any) {
		console.log(`Emit: ${msg} to ${sendId}`);

		const emitter = this.socketsGet[sendId];

		if (!emitter) {
			return this.socketsGet[id].emit(msg, {
				id: id,
				data: {
					error: 'Emit: ' + sendId + ' not found'
				}
			});
		}

		return emitter.emit(msg, { id, data });
	}

	private emitAll(id: string, msg: string, data: any) {
		console.log(`Emit: ${msg}`);

		return this.socket.emit(msg, { id, data });
	}

	private emitRest(id: string, token: string, msg: string, data: any) {
		console.log(`Broadcast: ${msg}`);

		return this.socketsSend[token].broadcast.emit(msg, { id, data });
	}
}
