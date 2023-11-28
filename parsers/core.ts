export interface GenericPBFFieldOptions extends PBFFieldOptions{
	fieldType?: string;
};

export interface PBFFieldOptions{
	fieldNumber?: number;
	required?: boolean;
	repeated?: boolean;
	delimiter?: string;
	name?: string;
};

export type SingleEncodedValue = number | string | boolean | undefined;

export type EncodedValueArray = (EncodedValueArray | SingleEncodedValue)[];

export type AnyEncodedValue = SingleEncodedValue | EncodedValueArray;

export const defaultDelimiter = "!";

// what a protobuf parser class should generally behave like
export abstract class GenericPBFField<T, U = T, V = T>{
	// used to ensure that field numbers don't change once added inside a message
	protected fieldNumberIsLocked: boolean;
	protected _value?: T | T[];
	protected options: GenericPBFFieldOptions;
	name: string;
	constructor(options: GenericPBFFieldOptions){
		if(options.fieldNumber){
			if(!Number.isInteger(options.fieldNumber)) throw new Error(`Invalid field number ${options.fieldNumber} in ${options.name}`);
			if(options.fieldNumber < 1) throw new Error(`Invalid field number ${options.fieldNumber} in ${options.name}`);
		}
		if(options.fieldType){
			if(options.fieldType.length !== 1) throw new Error(`Invalid field type ${options.fieldType} in ${options.name}`);
		}
		if(options.repeated === undefined) options.repeated = false;
		this.options = options;
		this.fieldNumberIsLocked = true;
		this.name = options.name ?? "";
	}
	abstract set value(value: T | U | T[] | U[] | undefined);
	abstract get value(): U | U[];

	lockFieldNumber(): void{
		this.fieldNumberIsLocked = true;
	}

	unlockFieldNumber(): void{
		this.fieldNumberIsLocked = false;
	}

	set fieldNumber(newFieldNumber: number){
		if(this.fieldNumberIsLocked) throw new Error(`You cannot modify a field number once it has been added to a message in ${this.name}`);
		if(!Number.isInteger(newFieldNumber)) throw new Error(`Invalid field number ${newFieldNumber} in ${this.name}`);
		if(newFieldNumber < 1) throw new Error(`Invalid field number ${newFieldNumber} in ${this.name}`);
		this.options.fieldNumber = newFieldNumber;
	}

	get fieldNumber(): number{
		if(!this.options.fieldNumber) throw new Error(`Unspecified field number in ${this.name}`);
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
			if(!matches) throw new Error(`Invalid url encoded value ${value} in ${this.name}`);
			const fieldNumber = parseInt(matches[1], 10);
			if(fieldNumber < 1) throw new Error(`Invalid field number ${fieldNumber} in ${this.name}`);
			// this should never occur, unless things were constructed in an unfathomably weird manner
			if(this.options.fieldNumber && this.options.fieldNumber !== fieldNumber) throw new Error(`Field numbers don't match in ${this.name}`);
			// this should also not happen, since almost all parsing should come from inside a message
			else if(!this.options.fieldNumber) this.fieldNumber = fieldNumber;
			if(this.options.fieldType !== matches[2]) throw new Error(`Field types don't match in ${this.name}`);
			return matches[3]
		}
		return value;
	}
	abstract validateValue(value?: T | T[]): void;
	abstract toUrl(): string;
	abstract fromUrl(value?: string): void;
	abstract toArray(): V | V[] | undefined;
	abstract fromArray(value?: V | V[]): void;
}

// generic classes for pbf fields. should never be used on its own, only derived classes
export abstract class SimplePBFField<T> extends GenericPBFField<T>{
	constructor(options: GenericPBFFieldOptions){
		super(options);
	}

	set value(value: T | T[] | undefined){
		this.validateValue(value);
		// T is never valid when an array simple pbf fields, so checking whether it is or isn't an array is more than enough for conversion
		if(this.options.repeated && !Array.isArray(value)) this._value = [value];
		else this._value = value;
	}

	get value(): T | T[]{
		return this._value;
	}

	// checks whether a value is valid. overwrite for derived classes
	validateValue(value?: T | T[]): void{
		// T is never an array type for simple pbf fields, so this check should eliminate a lot of the problems
		if(!this.options.repeated && Array.isArray(value)) throw new Error(`Non-repeated fields cannot have an array value in ${this.name}`);
		const realValue = value ?? this._value;
		if(this.options?.required && realValue === undefined) throw new Error(`A required field cannot have an undefined value in ${this.name}`);
	}

	// encoders and decoders for URL-encoded stuff. only really just strings
	// overwriting this method is enough, rather than overwriting the encoder itself
	// url decoding is done in the message object itself
	protected encodeValue(value?: T | T[]): string{
		// no need to handle it in encodevalue since toUrl already handles it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	// needs abstraction since how the values are handled differs from case to case
	protected abstract decodeValue(value?: string): T | undefined;

	// protobuf urls

	toUrl(): string{
		if(this.options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this.name}`);
		this.validateValue();
		if(!this.options.fieldType) throw new Error(`Please specify a field type before url encoding in ${this.name}`);
		// for urlencoding, empty values can just be left out. DO NOT remove, or else encodeValue will have problems with undefined
		if(this._value === undefined) return "";
		if(!this.options.fieldNumber){
			return this.encodeValue();
		}
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + this.options.fieldType + this.encodeValue();
	}

	fromUrl(value?: string){
		if(this.options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this.name}`);
		if(!value) this._value = undefined;
		let newValue = this.decodeValue(this.parseUrlCore(value));
		this.validateValue(newValue);
		this._value = newValue;
	}

	// json protobuf formatting
	// should never just return a number unless it's an enum
	toArray(): T | T[] | undefined{
		// just prepares the value to be encoded with JSON.stringify
		// does not actually do any encoding itself
		this.validateValue();
		if(this._value === undefined) return undefined;
		return this._value;
	}

	fromArray(value?: T | T[]){
		this.value = value;
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

	protected validateValueCore(value: number | number[] | undefined, additionalValidations: (value?: number) => void){
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		// super already checks whether the array is a valid value
		if(Array.isArray(realValue)) realValue.forEach(item => additionalValidations(item));
		else additionalValidations(realValue);
	}

	validateValue(value?: number | number[]): void{
		this.validateValueCore(value, (v: number) => null);
	}
}

export function extendOptions(fieldType: string, options: PBFFieldOptions){
	if(!options) return {fieldType};
	const {fieldNumber, required, delimiter, repeated, name} = options;
	return {fieldNumber, required, delimiter, repeated, fieldType, name};
}