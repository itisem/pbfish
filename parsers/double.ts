import {NumericPBFField, extendOptions, PBFFieldOptions} from "./core.js";

// a pbf field with a double type (d)
export default class DoublePBFField extends NumericPBFField{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("d", options));
	}
}