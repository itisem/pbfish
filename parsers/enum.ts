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

	protected setValueCore(value: number | string){
		switch(typeof value){
			case "number":
				// ensuring that the code is valid
				this.lookupCode(value);
				return value;
			case "string":
				return this.lookupValue(value);
			default:
				throw new Error("Invalid type for value");
		}
	}

	set value(value: number | number[] | string | string[] | undefined){
		if(value === undefined){
			this._value = undefined;
			return;
		}
		if(Array.isArray(value)){
			if(!this.options.repeated) throw new Error("Non-repeated fields cannot have an array value");
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
			if(!Array.isArray(this._value)) throw new Error("Something extremely unusual happened, and the value got corrupted");
			else return this._value.map(x => this.lookupCode(x));
		}
		else{
			if(Array.isArray(this._value)) throw new Error("Something extremely unusual happened, and the value got corrupted");
			else return this.lookupCode(this._value);
		}
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
		if(this.options.repeated) throw new Error("Repeated values cannot be urlencoded");
		this.validateValue();
		if(this._value === undefined) return "";
		if(!this.options.fieldNumber){
			return this.encodeValue();
		}
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + "e" + this.encodeValue();
	}

	fromUrl(value?: string){
		if(this.options.repeated || Array.isArray(this._value)) throw new Error("Repeated values cannot be urlencoded");
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