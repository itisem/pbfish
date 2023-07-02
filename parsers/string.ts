import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

export default class StringPBFField extends SimplePBFField<string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("s", options));
	}

	protected encodeValue(value?: string): string{
		const realValue = value ?? this._value;
		const delimiter = this.options.delimiter ?? "!";
		const encodedDelimiter = "*" + delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		if(!realValue) return undefined;
		return encodeURIComponent(realValue).replaceAll("*", "*2A").replaceAll(delimiter, encodedDelimiter);
	}

	// does NOT handle full urls, just the decoding (for strings)
	protected decodeValue(value?: string | undefined): string | undefined{
		if(value === undefined) return undefined;
		const delimiter = this.options.delimiter ?? "!";
		const encodedDelimiter = delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		return value.replaceAll(encodedDelimiter, delimiter).replaceAll("*2A", "*");
	}
}