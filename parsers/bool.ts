import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a bool type (b)
export default class BoolPBFField extends SimplePBFField<boolean>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("b", options));
	}

	_decodeValue(value?: string): boolean | undefined{
		if(value === "" || value === undefined) return undefined;
		return value === "true";
	}
}