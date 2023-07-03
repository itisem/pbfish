import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an int32 type (i)
export default class Int32PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("i", options));
	}

	validateValue(value?: number): void{
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Number.isInteger(realValue)) throw new Error(`Invalid value for int32: ${realValue}`);
		if(realValue < -2147483648) throw new Error(`Invalid value for int32: ${realValue}`);
		if(realValue > 2147483647) throw new Error(`Invalid value for int32: ${realValue}`);
	}
}