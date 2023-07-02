import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a sint32 type (n)
// for all intents and purposes, acts identical to int32 [for url and json encoding, which is what we do here]
export default class SInt32PBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("n", options));
	}

	validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for sint32: ${realValue}`);
		if(realValue < -2147483648) throw new Error(`Invalid value for sint32: ${realValue}`);
		if(realValue > 2147483647) throw new Error(`Invalid value for sint32: ${realValue}`);
	}
}