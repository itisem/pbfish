import {GenericPBFField, extendOptions, PBFFieldOptions} from "./core";

export default class ReservedPBFField extends GenericPBFField<undefined>{
	constructor(options?: PBFFieldOptions){
		// doesn't matter, everything is nothing
		super(extendOptions("-", options));
		this.options = options;
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

	urlEncode(){
		return "";
	}

	arrayEncode(){
		return undefined;
	}
}