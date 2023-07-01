import {GenericPBFField, extendOptions, PBFFieldOptions} from "./core";

interface EnumPBFFieldOptions extends PBFFieldOptions{
	codes: PBFEnum[];
};

interface PBFEnum{
	code: number;
	value: string;
};

// a pbf field with an enum type (e)
export class EnumPBFField extends GenericPBFField<number, string>{
	codes: PBFEnum[];

	constructor(options: EnumPBFFieldOptions){
		super(extendOptions("e", options));
		const {codes} = options;
		this.codes = codes;
		if(options.fieldNumber){
			if(!Number.isInteger(options.fieldNumber)) throw new Error(`Invalid field number ${options.fieldNumber}`);
			if(options.fieldNumber < 1) throw new Error(`Invalid field number ${options.fieldNumber}`);
		}
		this.options = options;
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

	get fieldNumber(): number{
		if(!this.options.fieldNumber) throw new Error("Unspecified field number");
		return this.options.fieldNumber;
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

	protected validateValue(value?: number){
		const realValue = value ?? this._value;
		if(this.options.required && realValue === undefined) throw new Error("A required field cannot have an undefined value");
		this.lookupCode(value);
	}

	protected encodeValue(value?: number): string{
		// no need to handle undefined since urlencode already does it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	protected decodeValue(value: number | null) : number | undefined{
		if(value === null) return undefined;
		this.validateValue(value);
		return value;
	}

	urlEncode(): string{
		this.validateValue();
		if(!this.options.fieldNumber) throw new Error("Please specify a field number before url encoding");
		if(this._value === undefined) return "";
		const delimiter = this.options.delimiter ?? "!";
		return delimiter + this.options.fieldNumber.toString() + "e" + this.encodeValue();
	}

	jsonEncode(): number | null{
		this.validateValue();
		if(this._value === undefined) return null;
		return this._value;
	}
}