import {GenericPBFField, extendOptions, PBFFieldOptions} from "./core";

export interface PBFEnum{
	code: number;
	value: string;
};

// a pbf field with an enum type (e)
export default class EnumPBFField extends GenericPBFField<number, string>{
	protected _codes: PBFEnum[];

	constructor(options: PBFFieldOptions, codes: PBFEnum[]){
		super(extendOptions("e", options));
		this._codes = codes;
		// since this is its own implementation, fieldType is just left to be its own thing
	}

	protected getUnderlyingValue(value: number | string): number{
		switch(typeof value){
			case "number":
				// ensuring that the code is valid
				this.lookupCode(value);
				return value;
			case "string":
				// safe typecast
				return this.lookupValue(value);
			default:
				throw new Error(`Invalid type for value in ${this._name} -- this should never happen!!`);
		}
	}

	set value(value: number | number[] | string | string[] | undefined){
		if(value === undefined){
			this._value = undefined;
			return;
		}
		if(Array.isArray(value)){
			if(!this._options.repeated) throw new Error(`Non-repeated fields cannot have an array value in ${this._name}`);
			else{
				if(value.length === 0){
					this._value = undefined;
				}
				else{
					let tmpValue = [];
					this._value = value.map(x => this.getUnderlyingValue(x as number|string));
				}
			}
		}
		else{
			if(this._options.repeated){
				this._value = [this.getUnderlyingValue(value)];
			}
			else{
				this._value = this.getUnderlyingValue(value);
			}
		}
	}

	get value(): string | string[] | undefined{
		if(this._value === undefined) return undefined;
		// _value should always be an array if repeated, and not an array if not repeated
		if(this._options.repeated){
			// undefined is fine
			// otherwise, non-array is erroneous
			if(!Array.isArray(this._value)) throw new Error(`Something extremely unusual happened, and the value got corrupted in ${this._name}`);
			else return this._value.map(x => this.lookupCode(x));
		}
		else{
			if(Array.isArray(this._value)) throw new Error(`Something extremely unusual happened, and the value got corrupted in ${this._name}`);
			else return this.lookupCode(this._value);
		}
	}

	protected lookupCode(code?: number): string{
		if(code === null || code === undefined) return "";
		const found = this._codes.find(element => element.code === code);
		if(!found) throw new Error(`Invalid enum code ${code} in ${this._name}, valid values are ${this._codes.map(x => x.code).join(", ")}`);
		return found.value;
	}

	protected lookupValue(value?: string): number{
		if(value === null || value === undefined) return NaN;
		const found = this._codes.find(element => element.value === value);
		if(!found) throw new Error(`Invalid enum value ${value} in ${this._name}, valid values are ${this._codes.map(x => x.value).join(", ")}`);
		return found.code;
	}

	validateValue(value?: number){
		const realValue = value ?? this._value;
		if(this._options.required && realValue === undefined) throw new Error(`A required field cannot have an undefined value in ${this._name}`);
		this.lookupCode(value);
	}

	protected _encodeValue(value?: number): string{
		// no need to handle undefined since urlencode already does it
		const realValue = value ?? this._value;
		if(realValue === undefined) return "";
		return realValue.toString();
	}

	toUrl(): string{
		if(this._options.repeated) throw new Error(`Repeated values cannot be urlencoded in ${this._name}`);
		this.validateValue();
		if(this._value === undefined) return "";
		if(!this._options.fieldNumber){
			return this._encodeValue();
		}
		return this._options.delimiter + this._options.fieldNumber.toString() + "e" + this._encodeValue();
	}

	fromUrl(value?: string){
		if(this._options.repeated || Array.isArray(this._value)) throw new Error(`Repeated values cannot be urlencoded in ${this._name}`);
		if(!value){
			this._value = undefined;
			return;
		}
		let newValue = Number(this._parseUrlCore(value));
		this.validateValue(newValue);
		this._value = newValue;
	}

	toArray(): number | number[] | undefined{
		this.validateValue();
		if(this._value === undefined) return undefined;
		return this._value;
	}

	fromArray(value?: number | number[]){
		this.value = value;
	}
}