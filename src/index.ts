import * as io from "socket.io";
import * as uuid from "uuid/v4";

export class EmitterPlugin {
  type: string;
  socket: SocketIO.Server;
  socketsSend: {[key:string]: SocketIO.Socket} = {};
  socketsGet: {[key:string]: SocketIO.Socket} = {};
  tokenToId: {[key:string]: string} = {};
  server: any;

  constructor(private params: any = {}) {
    this.type = "emitter";
  } 

  run(server: any, app: any): void {
    this.server = server;
    this.socket = io(app);

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

  loadEmit(target: any, method: string): Function {
    if (target[method].emits) {
      console.log(`Loading emit: ${target.alias}.on.${target[method].alias}`);
      this.server.controllersAllowed[target.alias][target[method].alias].emits = true;

    } else if (target[method].broadcast) {
      console.log(`Loading broadcast: ${target.alias}.on.${target[method].alias}`);
      this.server.controllersAllowed[target.alias][target[method].alias].emits = true;
    }

    const emitCallback = (token: string, sendOne: string, data: any): any => {
      const msg = `${target.alias}.on.${target[method].alias}`;
      const id = this.tokenToId[token];

      if (sendOne) {
        console.log(`Emit: ${msg} to ${sendOne}`);
        const emitter = this.socketsGet[sendOne];

        if (emitter) {
          emitter.emit(msg, { id, data });
        } else {
          this.socketsGet[id].emit(msg, { 
            id: id,
            data: {
              error: 'Emit: ' + sendOne + ' not found'
            }
          });
        }
      } else if (target[method].emits) {
        console.log(`Emit: ${msg}`);
        this.socket.emit(msg, { id, data });
      } else if (target[method].broadcast) {
        console.log(`Broadcast: ${msg}`);
        this.socketsSend[token].broadcast.emit(msg, { id, data });
      }
    };

    return emitCallback;
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