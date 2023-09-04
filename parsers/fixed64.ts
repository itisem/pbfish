import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a fixed64 value (y)
// for all intents and purposes, acts identical to uint32 [for url and json encoding, which is what we do here]
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class Fixed64PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("y", options));
	}

	validateValue(value?: number | number[]){
		this.validateValueCore(value, (v: number) => {
			if(!Number.isInteger(v)) throw new Error(`Invalid value for fixed64: ${v}`);
			if(v < 0) throw new Error(`Invalid value for fixed64: ${v}`);
			if(v > Number.MAX_SAFE_INTEGER) console.warn("Value is too large, may be imprecise");
		});
	}
}