import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an int32 type (i)
export default class Int32PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("i", options));
	}

	validateValue(value?: number | number[]){
		this.validateValueCore(value, (v: number) => {
			if(!Number.isInteger(v)) throw new Error(`Invalid value for int32: ${v}`);
			if(v < -2147483648) throw new Error(`Invalid value for int32: ${v}`);
			if(v > 2147483647) throw new Error(`Invalid value for int32: ${v}`);
		});
	}

}