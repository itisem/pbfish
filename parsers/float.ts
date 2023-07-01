import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

// a pbf field with a float type (f)
// WARNING: since ts / js has no efficient way of distinguishing between doubles and floats (everything is a double), checking is ommitted
// this means that errors could occur and everything must be used with caution
export default class FloatPBFField extends SimplePBFField<number>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("f", options));
	}
}