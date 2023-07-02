import {GenericPBFField, extendOptions, PBFFieldOptions} from "./core";

export default class ReservedPBFField extends GenericPBFField<null, any>{
	constructor(options?: PBFFieldOptions){
		// doesn't matter, everything is nothing
		super(extendOptions("-", options));
		this.options = options;
		this._value = null;
	}

	set value(value: any){
		this._value = null;
	}

	get value(){
		return null;
	}

	validateValue(value?: null){
		return;
	}

	urlEncode(){
		return "";
	}

	jsonEncode(){
		return null;
	}
}