export interface IWorkerSettings {
	workerPath?: string;
	scope?: string;
	debug?: boolean;
	patchUnregister?: boolean;
	patchUpdate?: boolean;
	tokenSync?: boolean;
}
