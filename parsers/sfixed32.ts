import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a sfixed32 type (g)
// for all intents and purposes, acts identical to int32 [for url and json encoding, which is what we do here]
export default class SFixed32PBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("g", options));
	}

	protected validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for sfixed32: ${realValue}`);
		if(realValue < -2147483648) throw new Error(`Invalid value for sfixed32: ${realValue}`);
		if(realValue > 2147483647) throw new Error(`Invalid value for sfixed32: ${realValue}`);
	}
}