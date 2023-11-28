import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an int64 type (j)
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class Int64PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("j", options));
	}

	_validateValue(value?: number | number[]){
		this._validateValueCore(value, (v: number) => {
			if(!Number.isInteger(v)) throw new Error(`Invalid value for fixed64: ${v} in ${this._name}`);
			if(v > Number.MAX_SAFE_INTEGER) console.warn(`Value is too large in ${this._name}, may be imprecise`);
		});
	}
}