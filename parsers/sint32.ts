import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core.js";

// a pbf field with a sint32 type (n)
// for all intents and purposes, acts identical to int32 [for url and json encoding, which is what we do here]
export default class SInt32PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("n", options));
	}

	validateValue(value?: number | number[]){
		this._validateValueCore(value, (v?: number) => {
			if(v === undefined) return;
			if(!Number.isInteger(v)) throw new Error(`Invalid value for int32: ${v} in ${this._name}`);
			if(v < -2147483648) throw new Error(`Invalid value for int32: ${v} in ${this._name}`);
			if(v > 2147483647) throw new Error(`Invalid value for int32: ${v} in ${this._name}`);
		});
	}
}