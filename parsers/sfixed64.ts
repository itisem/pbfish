import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a sfixed64 type (h)
// for all intents and purposes, acts identical to int64 [for url and json encoding, which is what we do here]
// WARNING: since ts / js does floats, not ints, large values will get changed!!
export default class SFixed64PBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("h", options));
	}

	protected validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for sfixed64: ${realValue}`);
		if(realValue > Number.MAX_SAFE_INTEGER) console.warn("Value is too large, may be imprecise");
	}
}