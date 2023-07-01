import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a fixed32 type (x)
// for all intents and purposes, acts identical to uint32 [for url and json encoding, which is what we do here]
export default class Fixed32PBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("x", options));
	}

	protected validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for fixed32: ${realValue}`);
		if(realValue < 0) throw new Error(`Invalid value for fixed32: ${realValue}`);
		if(realValue > 4294967295) throw new Error(`Invalid value for fixed32: ${realValue}`);
	}
}