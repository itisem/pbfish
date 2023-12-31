import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an uint32 type (u)
export default class UInt32PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("u", options));
	}

	_validateValue(value?: number | number[]){
		this._validateValueCore(value, (v: number) => {
			if(!Number.isInteger(v)) throw new Error(`Invalid value for fixed32: ${v} in ${this._name}`);
			if(v < 0) throw new Error(`Invalid value for fixed32: ${v} in ${this._name}`);
			if(v > 4294967295) throw new Error(`Invalid value for fixed32: ${v} in ${this._name}`);
		});
	}
}