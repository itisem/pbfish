import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with an int32 type (i)
export default class Int32PBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("i", options));
	}

	validateValue(value?: number | number[]){
		this._validateValueCore(value, (v?: number) => {
			if(v === undefined) return;
			if(!Number.isInteger(v)) throw new Error(`Invalid value for int32: ${v} in ${this._name}`);
			if(v < -2147483648) throw new Error(`Invalid value for int32: ${v} in ${this._name}`);
			if(v > 2147483647) throw new Error(`Invalid value for int32: ${v} in ${this._name}`);
		});
	}

}