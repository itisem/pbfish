import {SimplePBFField, extendOptions, PBFFieldOptions} from "./core";

export default class Base64StringPBFField extends SimplePBFField<string>{
	constructor(options?: PBFFieldOptions){
		super(extendOptions("z", options));
	}

	protected encodeValue(value?: string): string{
		// no need to worry about undefined since it's handled in urlencode
		// time for a weird and wacky workaround for unicode, see https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
		const realValue = value ?? this._value;
		const bytes = new TextEncoder().encode(realValue);
		const asciiValue = Array.from(bytes, x => String.fromCodePoint(x)).join("");
		const base64 = btoa(asciiValue);
		// making it url safe and removing padding since base
		return base64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
	}
}