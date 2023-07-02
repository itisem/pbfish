import {GenericPBFField, extendOptions, PBFFieldOptions, AnyEncodedValue, defaultDelimiter} from "./core";

export interface MessagePBFFieldObject{
	[key: string]: GenericPBFField<AnyEncodedValue | MessagePBFFieldObject, AnyEncodedValue | MessagePBFFieldValue , AnyEncodedValue>
};

export interface MessagePBFFieldValue{
	[key: string]: AnyEncodedValue | MessagePBFFieldValue;
};

export default class MessagePBFField extends GenericPBFField<MessagePBFFieldObject, MessagePBFFieldValue, AnyEncodedValue>{
	constructor(options: PBFFieldOptions, baseValues: MessagePBFFieldObject){
		super(extendOptions("m", options));
		this._value = baseValues;
		this.options = options ?? {};
	}

	set value(value: MessagePBFFieldObject | MessagePBFFieldValue | undefined){
		// reset all values if undefined
		if(value === undefined){
			for(let [k,v] of Object.entries(this._value)){
				this._value[k].value = undefined;
			}
		}
		// otherwise, set values, or add new fields depending on what we have
		for(let [k, v] of Object.entries(value)){
			if(v instanceof GenericPBFField){
				// genericpbffield is never a valid value, so safe to just treat it as a drop-in replacement
				this._value[k] = v;
			}
			else{
				if(this._value[k] !== undefined){
					this._value[k].value = v;
				}
			}
		}
	}

	get value(): MessagePBFFieldValue{
		return Object.fromEntries(
			Object.entries(this._value).map(([k, v]) => [k, v.value])
		);
	}

	set delimiter(newDelimiter: string | undefined){
		const realNewDelimiter = newDelimiter ?? defaultDelimiter;
		this.options.delimiter = realNewDelimiter;
		for(let [k, v] of Object.entries(this._value)) v.delimiter = realNewDelimiter;
	}

	get isUndefined(){
		for(let [k, v] of Object.entries(this._value)){
			if(!v.isUndefined) return false;
		}
		return true;
	}

	validateValue(value?: MessagePBFFieldObject){
		if(this.options.required && this.isUndefined) throw new Error("Required field cannot be undefined");
		const realValue = value ?? this._value;
		let fieldNumbers = [];
		for(let [k, v] of Object.entries(realValue)){
			v.validateValue();
			fieldNumbers.push(v.fieldNumber);
		}
		if((new Set(fieldNumbers)).size !== fieldNumbers.length){
			throw new Error("This message has duplicate field numbers");
		}
	}

	private encodeValue(value?: MessagePBFFieldObject): string{
		const realValue = value ?? this._value;
		const valuesThatExist = Object.entries(realValue).filter(([k, v]) => !v.isUndefined);
		if(valuesThatExist.length === 0) return "";
		// the value of the field itself is how many values it contains, and then append the url encoding of those values
		// don't include total count if the field number is unset
		const fieldCountString = this.options.fieldNumber ? valuesThatExist.length.toString() : "";
		return fieldCountString + valuesThatExist.map(([k, v]) => v.urlEncode()).join("");
	}

	urlEncode(): string{
		this.validateValue();
		const encodedValue = this.encodeValue();
		if(encodedValue === "") return "";
		if(!this.options.fieldNumber) return encodedValue;
		const delimiter = this.options.delimiter ?? "!";
		return delimiter + this.options.fieldNumber.toString() + "m" + encodedValue;
	}

	arrayEncode(): AnyEncodedValue{
		this.validateValue();
		let encodedValue: AnyEncodedValue = [];
		for(let [k, v] of Object.entries(this._value)){
			encodedValue[v.fieldNumber - 1] = v.arrayEncode();
		}
		return encodedValue;
	}
}