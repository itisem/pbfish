import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a double type (d)
export default class DoublePBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("d", options));
	}
}