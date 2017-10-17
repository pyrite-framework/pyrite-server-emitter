import * as io from "socket.io";
import * as uuid from "uuid/v4";

export class EmitterPlugin {
  type: string;
  socket: SocketIO.Server;
  socketsSend: {[key:string]: SocketIO.Socket} = {};
  socketsGet: {[key:string]: SocketIO.Socket} = {};
  tokenToId: {[key:string]: string} = {};
  target: any;
  targetMethod: any;
  server: any;
  name: string;
  param: string;

  constructor(private params: any = {}) {
    this.type = "server";
    this.name = "emitter";
    this.param = "emit";
  } 

  run(server: any): void {
    this.server = server;
    this.socket = io(this.server.connection);

    this.socket.on("connection", (socket: SocketIO.Socket) => {
      const token = uuid();
      const id = uuid();

      this.socketsSend[token] = this.socketsGet[id] = socket;

      this.tokenToId[token] = id;

      const dataEmited: any = {
        controllers: this.server.controllersAllowed,
        id: id,
        token: token
      };

      socket.emit("controllersAllowed", dataEmited);
    });
  }

  load(target: any, method: any): Function {
    this.target = target;
    this.targetMethod = target[method.methodName];

    if (this.targetMethod.emits) {
      console.log(`Loading emit: ${target.alias}.on.${this.targetMethod.alias}`);
      this.server.controllersAllowed[target.alias][this.targetMethod.alias].emits = true;

    } else if (this.targetMethod.broadcast) {
      console.log(`Loading broadcast: ${target.alias}.on.${this.targetMethod.alias}`);
      this.server.controllersAllowed[target.alias][this.targetMethod.alias].emits = true;
    }

    return this.emitCallback.bind(this);
  }

  private emitCallback(request: any, response: any, data: any): any {
    const msg = `${this.target.alias}.on.${this.targetMethod.alias}`;

    const token = request.headers["pyrite-token"];
    const sendOne = request.headers["pyrite-id"];

    const id = this.tokenToId[token];

    if (sendOne) {
      console.log(`Emit: ${msg} to ${sendOne}`);

      const emitter = this.socketsGet[sendOne];

      if (!emitter) {
        return this.socketsGet[id].emit(msg, { 
          id: id,
          data: {
            error: 'Emit: ' + sendOne + ' not found'
          }
        });
      }

      return emitter.emit(msg, { id, data });
    }

    if (this.targetMethod.emits) {
      console.log(`Emit: ${msg}`);

      return this.socket.emit(msg, { id, data });
    }

    if (this.targetMethod.broadcast) {
      console.log(`Broadcast: ${msg}`);

      return this.socketsSend[token].broadcast.emit(msg, { id, data });
    }
  }
}

export function Emits (target: any, method: string, descriptor: PropertyDescriptor): void {
  target[method].emits = true;
  target[method].emitsTo = target[method].name;
}

export function Broadcast (target: any, method: string, descriptor: PropertyDescriptor): void {
  target[method].broadcast = true;
  target[method].broadcastTo = target[method].name;
}

export function Emit (target: any, method: string, descriptor: any): void {
  return setParameters(target[method], "emit");
}

function setParameters(target: any, param: string, key?: string): void {
  if (!target.parameters) target.parameters = [];
  
  target.parameters.unshift({
    param, key
  });
}