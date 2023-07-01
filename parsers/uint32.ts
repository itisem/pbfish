import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an uint32 type (u)
export default class UInt32PBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("u", options));
	}

	protected validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for uint32: ${realValue}`);
		if(realValue < 0) throw new Error(`Invalid value for uint32: ${realValue}`);
		if(realValue > 4294967295) throw new Error(`Invalid value for uint32: ${realValue}`);
	}
}