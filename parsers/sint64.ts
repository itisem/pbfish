import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a sint64 type (o)
// for all intents and purposes, acts identical to int64 [for url and json encoding, which is what we do here]
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class SInt64PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("o", options));
	}

	_validateValue(value?: number | number[]){
		this._validateValueCore(value, (v: number) => {
			if(!Number.isInteger(v)) throw new Error(`Invalid value for fixed64: ${v} in ${this._name}`);
			if(v > Number.MAX_SAFE_INTEGER) console.warn(`Value is too large in ${this._name}, may be imprecise`);
		});
	}
}