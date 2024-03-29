export interface GenericPBFFieldOptions extends DelimiterRequiredPBFFieldsOptions{
	fieldType: string;
};

export interface PBFFieldOptions extends BasePBFFieldOptions{
	fieldNumber?: number;
	required?: boolean;
	repeated?: boolean;
	delimiter?: string;
	name?: string;
};

interface DelimiterRequiredPBFFieldsOptions extends BasePBFFieldOptions{
	delimiter: string;
}

interface BasePBFFieldOptions{
	fieldNumber?: number;
	required?: boolean;
	repeated?: boolean;
	name?: string;
};


export interface URLEncodedValue{
	value: string;
	fieldCount: number;
}

export type SingleEncodedValue = number | string | boolean | Uint8Array | undefined;

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
		if(options.fieldNumber !== undefined){
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
	abstract get value(): U | U[] | undefined;

	// including an option to modify field numbers on the go
	// by all accounts, this should never be used unless you are doing something extraordinarily weird (why?)
	lockFieldNumber(): void{
		this._fieldNumberIsLocked = true;
	}
	unlockFieldNumber(): void{
		this._fieldNumberIsLocked = false;
	}
	set fieldNumber(newFieldNumber: number){
		if(this._fieldNumberIsLocked) throw new Error(`You cannot modify a field number once it has been added to a message in ${this._name}`);
		if(!Number.isInteger(newFieldNumber)) throw new Error(`Invalid field number ${newFieldNumber} in ${this._name}`);
		if(newFieldNumber < 1) throw new Error(`Invalid field number ${newFieldNumber} in ${this._name}`);
		this._options.fieldNumber = newFieldNumber;
	}
	get fieldNumber(): number{
		if(!this._options.fieldNumber) throw new Error(`Unspecified field number in ${this._name}`);
		return this._options.fieldNumber;
	}

	get fieldType(): string{
		return this._options.fieldType;
	}

	// an option to change delimiter on the fly
	// once again, not the most useful, but could be nice in rare situations
	set delimiter(newDelimiter: string | undefined){
		if(!newDelimiter) this._options.delimiter = defaultDelimiter;
		else{
			if(newDelimiter.length === 1) this._options.delimiter = newDelimiter;
			else throw new Error(`Invalid delimiter ${newDelimiter} in ${this._name}`)
		}
	}
	get delimiter(): string{
		return this._options.delimiter;
	}

	// not protected since parent classes may need it, but should not be publicly needed
	get isUndefined(): boolean{
		return this._value === undefined;
	}

	protected _parseUrlCore(value?: string): string{
		if(value === undefined || value === "") return "";
		if(value.startsWith(this._options.delimiter)){
			const pattern = new RegExp(`^\\${this._options.delimiter}([0-9]+)([a-z])(.*)$`);
			const matches = value.match(pattern);
			if(!matches) throw new Error(`Invalid url encoded value ${value} in ${this._name}`);
			const fieldNumber = parseInt(matches[1], 10);
			if(fieldNumber < 1) throw new Error(`Invalid field number ${fieldNumber} in ${this._name}`);
			// this should never occur, unless things were constructed in an unfathomably weird manner
			if(this._options.fieldNumber && this._options.fieldNumber !== fieldNumber) throw new Error(`Field numbers don't match in ${this._name}`);
			// this should also not happen, since almost all parsing should come from inside a message
			else if(!this._options.fieldNumber) this._options.fieldNumber = fieldNumber;
			if(this._options.fieldType !== matches[2]) throw new Error(`Field types don't match in ${this._name}`);
			return matches[3]
		}
		return value;
	}
	abstract validateValue(value?: T | T[]): void;
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
		this.validateValue(value);
		// T is never valid when an array simple pbf fields, so checking whether it is or isn't an array is more than enough for conversion
		this._value = value;
	}

	get value(): T | T[] | undefined{
		return this._value;
	}

	// checks whether a value is valid. overwrite for derived classes
	validateValue(value?: T | T[]): void{
		const realValue = value ?? this._value;
		// T is an array type iff it is a repeated field, so this check should eliminate a lot of the problems
		if(!!this._options.repeated !== Array.isArray(realValue)) throw new Error(`Only repeated fields can/must have an array value in ${this._name}`);
		if(this._options.required && realValue === undefined) throw new Error(`A required field cannot have an undefined value in ${this._name}`);
	}

	// encoders and decoders for URL-encoded stuff. only really just strings
	// overwriting this method is enough, rather than overwriting the encoder itself
	// url decoding is done in the message object itself
	protected _encodeValue(value?: T | T[]): string{
		const realValue = value ?? this._value ?? "null";
		if(Array.isArray(realValue)) return JSON.stringify(realValue);
		// no need to handle it in _encodeValue since toUrl already handles it
		return realValue.toString();
	}

	// needs abstraction since how the values are handled differs from case to case
	protected abstract _decodeValue(value?: string): T | undefined;

	// protobuf urls

	toUrl(): string{
		if(this._options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
		this.validateValue();
		// for urlencoding, empty values can just be left out. DO NOT remove, or else _encodeValue will have problems with undefined
		if(this._value === undefined) return "";
		if(!this._options.fieldNumber){
			return this._encodeValue();
		}
		return this._options.delimiter + this._options.fieldNumber.toString() + this._options.fieldType + this._encodeValue();
	}

	fromUrl(value?: string){
		if(this._options.repeated) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
		if(value === undefined || value === ""){
			this._value = undefined;
			return;
		}
		let newValue = this._decodeValue(this._parseUrlCore(value));
		// setting using this.value instead of this._value since it immediately does validateValue
		this.value = newValue;
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
		// setting using this.value instead of this._value since it immediately does validateValue
		this.value = value;
	}

	// json decoding is not needed since it's identical to the setter
}

export class NumericPBFField extends SimplePBFField<number>{
	constructor(options: GenericPBFFieldOptions){
		super(options);
	}

	protected _decodeValue(value?: string): number | undefined{
		return (value === "" || value === undefined) ? undefined : Number(value);
	}

	protected _validateValueCore(value: number | number[] | undefined, additionalValidations: (value?: number) => void){
		const realValue = value ?? this._value;
		super.validateValue(realValue);
		if(realValue === undefined) return;
		if(!Array.isArray(realValue)){
			if(isNaN(realValue as number)) throw new Error(`NaN value in ${this._name}`);
		}
		else{
			if(realValue.some(x => isNaN(x))) throw new Error(`NaN value in ${this._name}`);
		}
		// super already checks whether the array is a valid value
		if(Array.isArray(realValue)) realValue.forEach(item => additionalValidations(item));
		else additionalValidations(realValue);
	}

	validateValue(value?: number | number[]): void{
		this._validateValueCore(value, (v?: number | number[]) => null);
	}
}

export function extendOptions(fieldType: string, options?: PBFFieldOptions): GenericPBFFieldOptions{
	if(!options) return {fieldType, delimiter: "?"};
	const {fieldNumber, required, delimiter, repeated, name} = options;
	return {fieldNumber, required, delimiter: delimiter ?? defaultDelimiter, repeated, fieldType, name};
}