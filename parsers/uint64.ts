import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an uint64 value (v)
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class UInt64PBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("v", options));
	}

	protected validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for uint64: ${realValue}`);
		if(realValue < 0) throw new Error(`Invalid value for uint64: ${realValue}`);
		if(realValue > Number.MAX_SAFE_INTEGER) console.warn("Value is too large, may be imprecise");
	}
}