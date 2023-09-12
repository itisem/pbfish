import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

const bytesErrorMessage = "bytes fields are not implemented yet";

export default class BytesPBFField extends SimplePBFField<Uint8Array>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("b", options));
	}

	decodeValue(value?: string): Uint8Array{
		console.warn(bytesErrorMessage)
		return new Uint8Array();
	}

	fromUrl(){
		console.warn(bytesErrorMessage);
	}

	toUrl(){
		console.warn(bytesErrorMessage);
		return "";
	}

	fromArray(){
		console.warn(bytesErrorMessage);
	}

	toArray(){
		console.warn(bytesErrorMessage);
		return null;
	}
}