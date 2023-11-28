import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an uint64 value (v)
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class UInt64PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("v", options));
	}

	validateValue(value?: number | number[]){
		this.validateValueCore(value, (v: number) => {
			if(!Number.isInteger(v)) throw new Error(`Invalid value for fixed64: ${v} in ${this.name}`);
			if(v < 0) throw new Error(`Invalid value for fixed64: ${v} in ${this.name}`);
			if(v > Number.MAX_SAFE_INTEGER) console.warn(`Value is too large in ${this.name}, may be imprecise`);
		});
	}
}