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

export interface URLEncodedValue{
	value: string;
	fieldCount: number;
}

export type SingleEncodedValue = number | string | boolean | undefined;

export type EncodedValueArray = (EncodedValueArray | SingleEncodedValue)[];

export type AnyEncodedValue = SingleEncodedValue | EncodedValueArray;

export const defaultDelimiter = "!";

// what a protobuf parser class should generally behave like
export abstract class GenericPBFField<T, U = T, V = T>{
	// used to ensure that field numbers don't change once added inside a message
	protected _fieldNumberIsLocked: boolean;
	protected _value?: T | T[];
	protected _options: GenericPBFFieldOptions;
	protected _name: string;
	constructor(options: GenericPBFFieldOptions){
		if(options.fieldNumber){
			if(!Number.isInteger(options.fieldNumber)) throw new Error(`Invalid field number ${options.fieldNumber} in ${options.name}`);
			if(options.fieldNumber < 1) throw new Error(`Invalid field number ${options.fieldNumber} in ${options.name}`);
		}
		if(options.fieldType){
			if(options.fieldType.length !== 1) throw new Error(`Invalid field type ${options.fieldType} in ${options.name}`);
		}
		if(options.repeated === undefined) options.repeated = false;
		this._options = options;
		this._fieldNumberIsLocked = true;
		this._name = options.name ?? "";
	}
	abstract set value(value: T | U | T[] | U[] | undefined);
	abstract get value(): U | U[];

	// including an option to modify field numbers on the go
	// by all accounts, this should never be used unless you are doing something extraordinarily weird (why?)
	_lockFieldNumber(): void{
		this._fieldNumberIsLocked = true;
	}
	_unlockFieldNumber(): void{
		this._fieldNumberIsLocked = false;
	}
	set _fieldNumber(newFieldNumber: number){
		if(this._fieldNumberIsLocked) throw new Error(`You cannot modify a field number once it has been added to a message in ${this._name}`);
		if(!Number.isInteger(newFieldNumber)) throw new Error(`Invalid field number ${newFieldNumber} in ${this._name}`);
		if(newFieldNumber < 1) throw new Error(`Invalid field number ${newFieldNumber} in ${this._name}`);
		this._options.fieldNumber = newFieldNumber;
	}
	get _fieldNumber(): number{
		if(!this._options.fieldNumber) throw new Error(`Unspecified field number in ${this._name}`);
		return this._options.fieldNumber;
	}

	// an option to change delimiter on the fly
	// once again, not the most useful, but could be nice in rare situations
	set _delimiter(newDelimiter: string | undefined){
		if(newDelimiter === undefined) this._options.delimiter = defaultDelimiter;
		else this._options.delimiter = newDelimiter;
	}
	get _delimiter(): string{
		return this._options.delimiter ?? defaultDelimiter;
	}

	// not protected since parent classes may need it, but should not be publicly needed
	get _isUndefined(): boolean{
		return this._value === undefined;
	}

	protected _parseUrlCore(value?: string): string{
		if(value === undefined || value === "") return;
		const delimiter = this._options.delimiter ?? defaultDelimiter;
		if(value.startsWith(delimiter)){
			const pattern = new RegExp(`^\\${delimiter}([0-9]+)([a-z])(.*)$`);
			const matches = value.match(pattern);
			if(!matches) throw new Error(`Invalid url encoded value ${value} in ${this._name}`);
			const fieldNumber = parseInt(matches[1], 10);
			if(fieldNumber < 1) throw new Error(`Invalid field number ${fieldNumber} in ${this._name}`);
			// this should never occur, unless things were constructed in an unfathomably weird manner
			if(this._options.fieldNumber && this._options.fieldNumber !== fieldNumber) throw new Error(`Field numbers don't match in ${this._name}`);
			// this should also not happen, since almost all parsing should come from inside a message
			else if(!this._options.fieldNumber) this._fieldNumber = fieldNumber;
			if(this._options.fieldType !== matches[2]) throw new Error(`Field types don't match in ${this._name}`);
			return matches[3]
		}
		return value;
	}
	abstract _validateValue(value?: T | T[]): void;
	abstract toUrl(): string | URLEncodedValue;
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
		this._validateValue(value);
		// T is never valid when an array simple pbf fields, so checking whether it is or isn't an array is more than enough for conversion
		if(this._options.repeated && !Array.isArray(value)) this._value = [value];
		else this._value = value;
	}

	get value(): T | T[]{
		return this._value;
	}

	// checks whether a value is valid. overwrite for derived classes
	_validateValue(value?: T | T[]): void{
		// T is never an array type for simple pbf fields, so this check should eliminate a lot of the problems
		if(!this._options.repeated && Array.isArray(value)) throw new Error(`Non-repeated fields cannot have an array value in ${this._name}`);
		const realValue = value ?? this._value;
		if(this._options?.required && realValue === undefined) throw new Error(`A required field cannot have an undefined value in ${this._name}`);
	}

	// encoders and decoders for URL-encoded stuff. only really just strings
	// overwriting this method is enough, rather than overwriting the encoder itself
	// url decoding is done in the message object itself
	protected _encodeValue(value?: T | T[]): string{
		// no need to handle it in _encodeValue since toUrl already handles it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	// needs abstraction since how the values are handled differs from case to case
	protected abstract _decodeValue(value?: string): T | undefined;

	// protobuf urls

	toUrl(): string{
		if(this._options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
		this._validateValue();
		if(!this._options.fieldType) throw new Error(`Please specify a field type before url encoding in ${this._name}`);
		// for urlencoding, empty values can just be left out. DO NOT remove, or else _encodeValue will have problems with undefined
		if(this._value === undefined) return "";
		if(!this._options.fieldNumber){
			return this._encodeValue();
		}
		const delimiter = this._options.delimiter ?? defaultDelimiter;
		return delimiter + this._options.fieldNumber.toString() + this._options.fieldType + this._encodeValue();
	}

	fromUrl(value?: string){
		if(this._options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
		if(!value) this._value = undefined;
		let newValue = this._decodeValue(this._parseUrlCore(value));
		this._validateValue(newValue);
		this._value = newValue;
	}

	// json protobuf formatting
	// should never just return a number unless it's an enum
	toArray(): T | T[] | undefined{
		// just prepares the value to be encoded with JSON.stringify
		// does not actually do any encoding itself
		this._validateValue();
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

	_decodeValue(value?: string): number | undefined{
		return (value === "" || value === undefined) ? undefined : Number(value);
	}

	protected _validateValueCore(value: number | number[] | undefined, additionalValidations: (value?: number) => void){
		const realValue = value ?? this._value;
		super._validateValue(realValue);
		if(realValue === undefined) return;
		// super already checks whether the array is a valid value
		if(Array.isArray(realValue)) realValue.forEach(item => additionalValidations(item));
		else additionalValidations(realValue);
	}

	_validateValue(value?: number | number[]): void{
		this._validateValueCore(value, (v: number) => null);
	}
}

export function extendOptions(fieldType: string, options: PBFFieldOptions){
	if(!options) return {fieldType};
	const {fieldNumber, required, delimiter, repeated, name} = options;
	return {fieldNumber, required, delimiter, repeated, fieldType, name};
}