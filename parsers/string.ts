import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

export default class StringPBFField extends SimplePBFField<string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("s", options));
	}

	protected _encodeValue(value?: string | string[]): string{
		const realValue = value ?? this._value;
		const encodedDelimiter = "*" + this._options.delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		if(!realValue) return undefined;
		return encodeURIComponent(realValue.toString()).replaceAll("*", "*2A").replaceAll(this._options.delimiter, encodedDelimiter);
	}

	// does NOT handle full urls, just the decoding (for strings)
	protected _decodeValue(value?: string | undefined): string | undefined{
		if(value === undefined) return undefined;
		const encodedDelimiter = this._options.delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		return decodeURIComponent(value.replaceAll(encodedDelimiter, this._options.delimiter).replaceAll("*2A", "*"));
	}
}