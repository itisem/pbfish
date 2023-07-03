import {GenericPBFField, extendOptions, PBFFieldOptions, defaultDelimiter} from "./core";

export interface EnumPBFFieldOptions extends PBFFieldOptions{
	codes: PBFEnum[];
};

export interface PBFEnum{
	code: number;
	value: string;
};

// a pbf field with an enum type (e)
export default class EnumPBFField extends GenericPBFField<number, string>{
	codes: PBFEnum[];

	constructor(options: EnumPBFFieldOptions){
		const {codes, ...miscOptions} = options;
		super(extendOptions("e", miscOptions));
		this.codes = codes;
		// since this is its own implementation, fieldType is just left to be its own thing
	}

	set value(value: number | string | undefined){
		switch(typeof value){
			case "undefined":
				this._value = undefined;
				break;
			case "number":
				// ensuring that the code is valid
				this.lookupCode(value);
				this._value = value;
				break;
			case "string":
				this._value = this.lookupValue(value);
				break;
		}
	}

	get value(): string{
		return this.lookupCode(this._value);
	}

	protected lookupCode(code: number): string{
		if(code === null || code === undefined) return undefined;
		const found = this.codes.find(element => element.code === code);
		if(!found) throw new Error(`Invalid enum code ${code}, valid values are ${this.codes.map(x => x.code).join(", ")}`);
		return found.value;
	}

	protected lookupValue(value: string): number{
		if(value === null || value === undefined) return undefined;
		const found = this.codes.find(element => element.value === value);
		if(!found) throw new Error(`Invalid enum value ${value}, valid values are ${this.codes.map(x => x.value).join(", ")}`);
		return found.code;
	}

	validateValue(value?: number){
		const realValue = value ?? this._value;
		if(this.options.required && realValue === undefined) throw new Error("A required field cannot have an undefined value");
		this.lookupCode(value);
	}

	protected encodeValue(value?: number): string{
		// no need to handle undefined since urlencode already does it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	toUrl(): string{
		this.validateValue();
		if(this._value === undefined) return "";
		if(!this.options.fieldNumber){
			return this.encodeValue();
		}
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + "e" + this.encodeValue();
	}

	fromUrl(value?: string){
		if(!value) this._value = undefined;
		let newValue = Number(this.parseUrlCore(value));
		this.validateValue(newValue);
		this._value = newValue;
	}

	toArray(): number | undefined{
		this.validateValue();
		if(this._value === undefined) return undefined;
		return this._value;
	}

	fromArray(value?: number){
		this.validateValue(value);
		this._value = value;
	}
}