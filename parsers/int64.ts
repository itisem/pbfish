import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an int64 type (j)
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class Int64PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("j", options));
	}

	validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for int64: ${realValue}`);
		if(realValue > Number.MAX_SAFE_INTEGER) console.warn("Value is too large, may be imprecise");
	}
}