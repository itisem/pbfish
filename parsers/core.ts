export interface GenericPBFFieldOptions extends PBFFieldOptions{
	fieldType?: string;
};

export interface PBFFieldOptions{
	fieldNumber?: number;
	required?: boolean;
	delimiter?: string;
};

export type SingleEncodedValue = number | string | undefined;

export type AnyEncodedValue = Array<AnyEncodedValue | SingleEncodedValue>;

// what a protobuf parser class should generally behave like
export abstract class GenericPBFField<T, U = T>{
	protected _value?: T;
	protected options: GenericPBFFieldOptions;
	constructor(options: GenericPBFFieldOptions){};
	abstract set value(value: T | U | undefined);
	abstract get value(): U;
	abstract get fieldNumber(): number;
	protected abstract validateValue(value?: T): void;
	protected abstract encodeValue(value?: T): string;
	protected abstract decodeValue(value?: T | U | null): T | undefined;
	abstract urlEncode(): void;
	abstract jsonEncode(): T;
}

// generic classes for pbf fields. should never be used on its own, only derived classes
export class SimplePBFField<T> extends GenericPBFField<T>{
	constructor(options: GenericPBFFieldOptions){
		super(options);
		if(options.fieldNumber){
			if(!Number.isInteger(options.fieldNumber)) throw new Error(`Invalid field number ${options.fieldNumber}`);
			if(options.fieldNumber < 1) throw new Error(`Invalid field number ${options.fieldNumber}`);
		}
		if(options.fieldType){
			if(options.fieldType.length !== 1) throw new Error(`Invalid field type ${options.fieldType}`);
			this.options = options;
		}
	}

	set value(value: T | undefined){
		this.validateValue(value);
		this._value = this.decodeValue(value);
	}

	get value(): T{
		return this._value;
	}

	get fieldNumber(): number{
		if(!this.options.fieldNumber) throw new Error("Unspecified field number");
		return this.options.fieldNumber;
	}

	// checks whether a value is valid. overwrite for derived classes
	protected validateValue(value?: T): void{
		const realValue = value ?? this._value;
		if(this.options?.required && realValue === undefined) throw new Error("A required field cannot have an undefined value");
	}

	// encoders and decoders for URL-encoded stuff. only really just strings
	// overwriting this method is enough, rather than overwriting the encoder itself
	// url decoding is done in the message object itself
	protected encodeValue(value?: T): string{
		// no need to handle it in encodevalue since urlencode already handles it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	// does NOT handle full urls, just the decoding (for strings). only does T->T, since the only counterexample is enums
	protected decodeValue(value?: T | null): T | undefined{
		if(value === null) return undefined;
		return value;
	}

	// protobuf urls

	urlEncode(): string{
		this.validateValue();
		if(!this.options.fieldType) throw new Error("Please specify a field type before url encoding");
		// for urlencoding, empty values can just be left out. DO NOT remove, or else encodeValue will have problems with undefined
		if(this._value === undefined) return "";
		if(!this.options.fieldNumber){
			return this.encodeValue();
		}
		const delimiter = this.options.delimiter ?? "!";
		return delimiter + this.options.fieldNumber.toString() + this.options.fieldType + this.encodeValue();
	}

	// json protobuf formatting
	// should never just return a number unless it's an enum
	jsonEncode(): T | null{
		// just prepares the value to be encoded with JSON.stringify
		// does not actually do any encoding itself
		this.validateValue();
		if(this._value === undefined) return null;
		return this._value;
	}

	// json decoding is not needed since it's identical to the setter
}

export function extendOptions(fieldType: string, options: PBFFieldOptions){
	if(!options) return {fieldType};
	const {fieldNumber, required, delimiter} = options;
	return {fieldNumber, required, delimiter, fieldType};
}