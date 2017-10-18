export function Emits(target: any, method: string, descriptor: PropertyDescriptor): void {
	target[method].emits = true;
	target[method].emitsTo = target[method].name;
}

export function Broadcast(target: any, method: string, descriptor: PropertyDescriptor): void {
	target[method].broadcast = true;
	target[method].broadcastTo = target[method].name;
}

export function Emit(target: any, method: string, descriptor: any): void {
	return setParameters(target[method], "emit");
}

function setParameters(target: any, param: string, key?: string): void {
	if (!target.parameters) target.parameters = [];

	target.parameters.unshift({
		param, key
	});
}
