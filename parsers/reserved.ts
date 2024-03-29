import {GenericPBFField, extendOptions, PBFFieldOptions} from "./core.js";

export default class ReservedPBFField extends GenericPBFField<undefined>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("-", options));
		// doesn't matter, everything is nothing
		if(options?.repeated) throw new Error(`Reserved fields cannot be repeated in ${this._name}`);
		if(options?.required) throw new Error(`Reserved fields cannot be required in ${this._name}`);
		this._value = undefined;
	}

	set value(value: any){
		this._value = undefined;
	}

	get value(){
		return undefined;
	}

	validateValue(value: undefined){
		return;
	}

	toUrl(){
		return "";
	}
	
	fromUrl(){
		return;
	}

	toArray(){
		return undefined;
	}

	fromArray(){
		return;
	}
}