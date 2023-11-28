import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

export default class Base64StringPBFField extends SimplePBFField<string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("z", options));
	}

	protected _encodeValue(value?: string | string[]): string{
		// no need to worry about undefined since it's handled in urlencode
		// time for a weird and wacky workaround for unicode, see https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
		const realValue = value ?? this._value;
		const bytes = new TextEncoder().encode(realValue.toString());
		const asciiValue = Array.from(bytes, x => String.fromCodePoint(x)).join("");
		const base64 = btoa(asciiValue);
		// making it url safe and removing padding since base
		return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
	}

	// does NOT handle full urls, just the decoding (for strings)
	protected _decodeValue(value?: string | undefined): string | undefined{
		if(value === undefined) return undefined;
		const paddingCount = (-value.length + 4 * value.length) % 4;
		const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(paddingCount);
		// another unicode messing around
		const asciiValue = atob(padded);
		const bytes = Uint8Array.from(asciiValue, x => x.codePointAt(0));
		return new TextDecoder().decode(bytes);
	}
}