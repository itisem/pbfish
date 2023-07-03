import {SimplePBFField, extendOptions, PBFFieldOptions, defaultDelimiter} from "./core";

export default class StringPBFField extends SimplePBFField<string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("s", options));
	}

	protected encodeValue(value?: string): string{
		const realValue = value ?? this._value;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		const encodedDelimiter = "*" + delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		if(!realValue) return undefined;
		return encodeURIComponent(realValue).replaceAll("*", "*2A").replaceAll(delimiter, encodedDelimiter);
	}

	// does NOT handle full urls, just the decoding (for strings)
	protected decodeValue(value?: string | undefined): string | undefined{
		if(value === undefined) return undefined;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		const encodedDelimiter = delimiter.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0");
		return value.replaceAll(encodedDelimiter, delimiter).replaceAll("*2A", "*");
	}

	fromUrl(value?: string): void{
		if(!value) this._value = undefined;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		if(value.startsWith(delimiter)){
			const regex = new RegExp(`^\\${delimiter}([0-9]+)([a-z])(.*)$`);
			const matches = value.match(regex);
			if(!matches) throw new Error(`Invalid url encoded value ${value}`);
			const fieldNumber = parseInt(matches[1], 10);
			if(fieldNumber < 1) throw new Error("Field number must be positive");
			if(this.options.fieldNumber && this.options.fieldNumber !== fieldNumber) throw new Error("Field numbers do not match");
			this.options.fieldNumber = fieldNumber;
			// checking if field is string
			if(matches[2] !== "s") throw new Error("Not a string field");
			this._value = this.decodeValue(matches[3]);
		}
		else{
			this._value = this.decodeValue(value);
		}
	}
}