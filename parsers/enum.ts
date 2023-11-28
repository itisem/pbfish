import {GenericPBFField, extendOptions, PBFFieldOptions, defaultDelimiter} from "./core";

export interface PBFEnum{
	code: number;
	value: string;
};

// a pbf field with an enum type (e)
export default class EnumPBFField extends GenericPBFField<number, string>{
	codes: PBFEnum[];

	constructor(options: PBFFieldOptions, codes: PBFEnum[]){
		super(extendOptions("e", options));
		this.codes = codes;
		// since this is its own implementation, fieldType is just left to be its own thing
	}

	protected setValueCore(value: number | string){
		switch(typeof value){
			case "number":
				// ensuring that the code is valid
				this.lookupCode(value);
				return value;
			case "string":
				return this.lookupValue(value);
			default:
				throw new Error(`Invalid type for value in ${this.name}`);
		}
	}

	set value(value: number | number[] | string | string[] | undefined){
		if(value === undefined){
			this._value = undefined;
			return;
		}
		if(Array.isArray(value)){
			if(!this.options.repeated) throw new Error(`Non-repeated fields cannot have an array value in ${this.name}`);
			else{
				if(value.length === 0){
					this._value = undefined;
				}
				else{
					let tmpValue = [];
					this._value = value.map(x => this.setValueCore(x));
				}
			}
		}
		else{
			if(this.options.repeated){
				this._value = [this.setValueCore(value)];
			}
			else{
				this._value = this.setValueCore(value);
			}
		}
	}

	get value(): string | string[]{
		// _value should always be an array if repeated, and not an array if not repeated
		if(this.options.repeated){
			if(!Array.isArray(this._value)) throw new Error(`Something extremely unusual happened, and the value got corrupted in ${this.name}`);
			else return this._value.map(x => this.lookupCode(x));
		}
		else{
			if(Array.isArray(this._value)) throw new Error(`Something extremely unusual happened, and the value got corrupted in ${this.name}`);
			else return this.lookupCode(this._value);
		}
	}

	protected lookupCode(code: number): string{
		if(code === null || code === undefined) return undefined;
		const found = this.codes.find(element => element.code === code);
		if(!found) throw new Error(`Invalid enum code ${code} in ${this.name}, valid values are ${this.codes.map(x => x.code).join(", ")}`);
		return found.value;
	}

	protected lookupValue(value: string): number{
		if(value === null || value === undefined) return undefined;
		const found = this.codes.find(element => element.value === value);
		if(!found) throw new Error(`Invalid enum value ${value} in ${this.name}, valid values are ${this.codes.map(x => x.value).join(", ")}`);
		return found.code;
	}

	validateValue(value?: number){
		const realValue = value ?? this._value;
		if(this.options.required && realValue === undefined) throw new Error(`A required field cannot have an undefined value in ${this.name}`);
		this.lookupCode(value);
	}

	protected encodeValue(value?: number): string{
		// no need to handle undefined since urlencode already does it
		const realValue = value ?? this._value;
		return realValue.toString();
	}

	toUrl(): string{
		if(this.options.repeated) throw new Error(`Repeated values cannot be urlencoded in ${this.name}`);
		this.validateValue();
		if(this._value === undefined) return "";
		if(!this.options.fieldNumber){
			return this.encodeValue();
		}
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + "e" + this.encodeValue();
	}

	fromUrl(value?: string){
		if(this.options.repeated || Array.isArray(this._value)) throw new Error(`Repeated values cannot be urlencoded in ${this.name}`);
		if(!value) this._value = undefined;
		let newValue = Number(this.parseUrlCore(value));
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