export interface GenericPBFFieldOptions extends PBFFieldOptions{
	fieldType?: string;
};

export interface PBFFieldOptions{
	fieldNumber?: number;
	required?: boolean;
	delimiter?: string;
};

export type SingleEncodedValue = number | string | boolean | undefined;

export type EncodedValueArray = EncodedValueArray[] | SingleEncodedValue[];

export type AnyEncodedValue = SingleEncodedValue | EncodedValueArray;

export const defaultDelimiter = "!";

// what a protobuf parser class should generally behave like
export abstract class GenericPBFField<T, U = T, V = T>{
	// used to ensure that field numbers don't change once added inside a message
	protected fieldNumberIsLocked: boolean;
	protected _value?: T;
	protected options: GenericPBFFieldOptions;
	constructor(options: GenericPBFFieldOptions){
		if(options.fieldNumber){
			if(!Number.isInteger(options.fieldNumber)) throw new Error(`Invalid field number ${options.fieldNumber}`);
			if(options.fieldNumber < 1) throw new Error(`Invalid field number ${options.fieldNumber}`);
		}
		if(options.fieldType){
			if(options.fieldType.length !== 1) throw new Error(`Invalid field type ${options.fieldType}`);
		}
		this.options = options;
	}
	abstract set value(value: T | U | undefined);
	abstract get value(): U;

	lockFieldNumber(): void{
		this.fieldNumberIsLocked = true;
	}

	set fieldNumber(newFieldNumber: number){
		if(this.fieldNumberIsLocked) throw new Error("You cannot modify a field number once it has been added to a message");
		if(!Number.isInteger(newFieldNumber)) throw new Error(`Invalid field number ${newFieldNumber}`);
		if(newFieldNumber < 1) throw new Error(`Invalid field number ${newFieldNumber}`);
		this.options.fieldNumber = newFieldNumber;
	}

	get fieldNumber(): number{
		if(!this.options.fieldNumber) throw new Error("Unspecified field number");
		return this.options.fieldNumber;
	}

	set delimiter(newDelimiter: string | undefined){
		if(newDelimiter === undefined) this.options.delimiter = defaultDelimiter;
		else this.options.delimiter = newDelimiter;
	}

	get delimiter(): string{
		return this.options.delimiter ?? defaultDelimiter;
	}

	get isUndefined(): boolean{
		return this._value === undefined;
	}

	protected parseUrlCore(value?: string): string{
		if(value === undefined || value === "") return;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		if(value.startsWith(delimiter)){
			const pattern = new RegExp(`^\\${delimiter}([0-9]+)([a-z])(.*)$`);
			const matches = value.match(pattern);
			if(!matches) throw new Error(`Invalid url encoded value ${value}`);
			const fieldNumber = parseInt(matches[1], 10);
			if(fieldNumber < 1) throw new Error("Invalid field number");
			if(this.options.fieldNumber && this.options.fieldNumber !== fieldNumber) throw new Error("Field numbers don't match");
			else if(!this.options.fieldNumber) this.fieldNumber = fieldNumber;
			if(this.options.fieldType !== matches[2]) throw new Error("Field types don't match");
			return matches[3]
		}
		return value;
	}

	abstract validateValue(value?: T): void;
	abstract toUrl(): string;
	abstract fromUrl(value?: string): void;
	abstract toArray(): V | undefined;
	abstract fromArray(value?: V): void;
}

// generic classes for pbf fields. should never be used on its own, only derived classes
export abstract class SimplePBFField<T> extends GenericPBFField<T>{
	constructor(options: GenericPBFFieldOptions){
		super(options);
	}

	set value(value: T | undefined){
		this.validateValue(value);
		this._value = value;
	}

	get value(): T{
		return this._value;
	}

	// checks whether a value is valid. overwrite for derived classes
	validateValue(value?: T): void{
		const realValue = value ?? this._value;
		if(this.options?.required && realValue === undefined) throw new Error("A required field cannot have an undefined value");
	}

	// encoders and decoders for URL-encoded stuff. only really just strings
	// overwriting this method is enough, rather than overwriting the encoder itself
	// url decoding is done in the message object itself
	protected encodeValue(value?: T): string{
		// no need to handle it in encodevalue since toUrl already handles it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	// needs abstraction since how the values are handled differs from case to case
	protected abstract decodeValue(value?: string): T | undefined;

	// protobuf urls

	toUrl(): string{
		this.validateValue();
		if(!this.options.fieldType) throw new Error("Please specify a field type before url encoding");
		// for urlencoding, empty values can just be left out. DO NOT remove, or else encodeValue will have problems with undefined
		if(this._value === undefined) return "";
		if(!this.options.fieldNumber){
			return this.encodeValue();
		}
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + this.options.fieldType + this.encodeValue();
	}

	fromUrl(value?: string){
		if(!value) this._value = undefined;
		let newValue = this.decodeValue(this.parseUrlCore(value));
		this.validateValue(newValue);
		this._value = newValue;
	}

	// json protobuf formatting
	// should never just return a number unless it's an enum
	toArray(): T | undefined{
		// just prepares the value to be encoded with JSON.stringify
		// does not actually do any encoding itself
		this.validateValue();
		if(this._value === undefined) return undefined;
		return this._value;
	}

	fromArray(value?: T){
		this.validateValue(value);
		this._value = value;
	}

	// json decoding is not needed since it's identical to the setter
}

export class NumericPBFField extends SimplePBFField<number>{
	constructor(options: GenericPBFFieldOptions){
		super(options);
	}

	decodeValue(value?: string): number | undefined{
		return (value === "" || value === undefined) ? undefined : Number(value);
	}
}

export function extendOptions(fieldType: string, options: PBFFieldOptions){
	if(!options) return {fieldType};
	const {fieldNumber, required, delimiter} = options;
	return {fieldNumber, required, delimiter, fieldType};
}