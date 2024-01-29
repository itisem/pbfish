import {GenericPBFField, extendOptions, PBFFieldOptions} from "./core";
import uint8ArrayToBase64 from "../util/uint8array-to-base64";
import base64ToUint8Array from "../util/base64-to-uint8array";

export default class BytesPBFField extends GenericPBFField<Uint8Array, Uint8Array, string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("b", options));
	}

	set value(value: Uint8Array | Uint8Array[] | undefined){
		this.validateValue(value);
		// T is never valid when an array simple pbf fields, so checking whether it is or isn't an array is more than enough for conversion
		this._value = value;
	}

	get value(): Uint8Array | Uint8Array[] | undefined{
		return this._value;
	}

	// urlencoding and decoding
	toUrl(): string{
		if(this._options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
		this.validateValue();
		// for urlencoding, empty values can just be left out. DO NOT remove, or else _encodeValue will have problems with undefined
		if(this._value === undefined) return "";
		// setting urlsafe = true since this is, well, toUrl
		// safe to typecast since arrayness was checked as a combination of this._options.repeated and this.validateValue
		if(!this._options.fieldNumber) return uint8ArrayToBase64(this._value as Uint8Array, true);
		else return 
			this._options.delimiter + 
			this._options.fieldNumber.toString() + 
			this._options.fieldType + 
			uint8ArrayToBase64(this._value as Uint8Array, true);
	}

	fromUrl(value?: string){
		if(this._options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
		if(value === undefined || value === "") this._value = undefined;
		let newValue = base64ToUint8Array(this._parseUrlCore(value), true);
		// setting using this.value instead of this._value since it immediately does validateValue
		this.value = newValue;
	}

	// array encoding
	fromArray(value?: string | string[]){
		if(value === undefined) return;
		let newValue: Uint8Array | Uint8Array[] = Array.isArray(value) ?
			value.map(x => base64ToUint8Array(x)):
			base64ToUint8Array(value);
		// setting using this.value instead of this._value since it immediately does validateValue
		this.value = newValue;
	}

	toArray(): string | string[] | undefined{
		if(!this._value) return;
		this.validateValue();
		// no need to set urlsafe since this is regular json encoding
		// safe to typecast since validateValue ensures that repeated === Array.isArray()
		if(this._options.repeated) return (this._value as Uint8Array[]).map(x => uint8ArrayToBase64(x));
		else return uint8ArrayToBase64(this._value as Uint8Array);
	}

	// validation only needs to check repeatedness since all uint8arrays are valid
	validateValue(value?: Uint8Array | Uint8Array[]): void{
		const realValue = value ?? this._value;
		// T is an array type iff it is a repeated field, so this check should eliminate a lot of the problems
		if(!!this._options.repeated !== Array.isArray(realValue)) throw new Error(`Only repeated fields can/must have an array value in ${this._name}`);
		if(this._options.required && realValue === undefined) throw new Error(`A required field cannot have an undefined value in ${this._name}`);
	}
}