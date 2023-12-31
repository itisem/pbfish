import {SimplePBFField, extendOptions, PBFFieldOptions, defaultDelimiter} from "./core";

export default class StringPBFField extends SimplePBFField<string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("s", options));
	}

	protected _encodeValue(value?: string | string[]): string{
		const realValue = value ?? this._value;
		const delimiter = this._options.delimiter ?? defaultDelimiter;
		const encodedDelimiter = "*" + delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		if(!realValue) return undefined;
		return encodeURIComponent(realValue.toString()).replaceAll("*", "*2A").replaceAll(delimiter, encodedDelimiter);
	}

	// does NOT handle full urls, just the decoding (for strings)
	protected _decodeValue(value?: string | undefined): string | undefined{
		if(value === undefined) return undefined;
		const delimiter = this._options.delimiter ?? defaultDelimiter;
		const encodedDelimiter = delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		return decodeURIComponent(value.replaceAll(encodedDelimiter, delimiter).replaceAll("*2A", "*"));
	}
}