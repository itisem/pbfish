import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core.js";

// a pbf field with a fixed32 type (x)
// for all intents and purposes, acts identical to uint32 [for url and json encoding, which is what we do here]
export default class Fixed32PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("x", options));
	}

	validateValue(value?: number | number[]){
		this._validateValueCore(value, (v?: number) => {
			if(v === undefined) return;
			if(!Number.isInteger(v)) throw new Error(`Invalid value for fixed32: ${v} in ${this._name}`);
			if(v < 0) throw new Error(`Invalid value for fixed32: ${v} in ${this._name}`);
			if(v > 4294967295) throw new Error(`Invalid value for fixed32: ${v} in ${this._name}`);
		});
	}
}