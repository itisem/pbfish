import {GenericPBFField, extendOptions, PBFFieldOptions, EncodedValueArray, AnyEncodedValue, defaultDelimiter} from "./core";

// all other parsers, to be used for .from()
import BoolPBFField from "./bool";
import BytesPBFField from "./bytes";
import DoublePBFField from "./double";
import EnumPBFField from "./enum";
import Fixed32PBFField from "./fixed32";
import Fixed64PBFField from "./fixed64";
import FloatPBFField from "./float";
import Int32PBFField from "./int32";
import Int64PBFField from "./int64";
import SFixed32PBFField from "./sfixed32";
import SFixed64PBFField from "./sfixed64";
import SInt32PBFField from "./sint32";
import SInt64PBFField from "./sint64";
import StringPBFField from "./string";
import UInt32PBFField from "./uint32";
import UInt64PBFField from "./uint64";

// full descriptions of valid pbf fields and baseValues. primarily used for manually made classes
export type PBFField = GenericPBFField<AnyEncodedValue | MessagePBFFieldObject, AnyEncodedValue | MessagePBFFieldValue , AnyEncodedValue>;

export interface MessagePBFFieldObject{
	[key: string]: PBFField;
};

export interface MessagePBFFieldDescriptor{
	[key: string]: {
		options: PBFFieldOptions;
		factory: (options: PBFFieldOptions) => PBFField;
	}
}

export interface MessagePBFFieldValue{
	[key: string]: AnyEncodedValue | MessagePBFFieldValue;
};

export type NestedStringArray = string | undefined | NestedStringArray[];

// interface used temporarily while parsing values
interface SimpleValue{
	index: number;
	letter: string;
	value: string | SimpleValue[];
};

// the key format of a protobuf definition. used in .from()
export interface DescriptionObj{
	[key: string]: CoreDefinition;
};

interface CoreDefinition{
	id: number;
	type: string;
	// only exists as "required" and "repeated"
	rule?: string;
	// used only for message fields
	fields?: DescriptionObj;
	// used only for enum fields
	values?: EnumDefinitionObj; 
}

interface EnumDefinitionObj{
	[key: string]: number;
}

export default class MessagePBFField extends GenericPBFField<MessagePBFFieldObject, MessagePBFFieldValue, EncodedValueArray>{
	// store the indices of everything in here for easier access in url / array decoding
	// this should not break unless horribly misused since field numbers get locked once added inside a message
	indices: string[];

	constructor(options: PBFFieldOptions, baseValues: MessagePBFFieldDescriptor){
		super(extendOptions("m", options));
		this._value = {};
		this.options = options ?? {};
		this.indices = [];
		let i = 0;
		for(let [k, v] of Object.entries(baseValues)){
			const fieldNumber = v.options.fieldNumber;
			if(fieldNumber === undefined) throw new Error("All field numbers must exist");
			if(!this.indices[fieldNumber - 1]) this.indices[fieldNumber - 1] = k;
			else throw new Error("All field numbers must be unique");
			this._value[k] = v.factory(v.options);
			// field numbers should never be manually messed with
			this._value[k].lockFieldNumber();
		}
	}

	private ruleCheck(rule: string | undefined, against: string){
		return (rule ?? "").includes(against);
	}

	from(definition: DescriptionObj){
		// assumes that all values have been adequately replaced already, and does no lookup here
		for(let [k, v] of Object.entries(definition)){
			const index = v.id;
			if(!this.indices[index - 1]) this.indices[index - 1] = k;
			else throw new Error("All field numbers must be unique");
			// all pbf fields have the same options here
			const fieldOptions = {
				fieldNumber: v.id,
				// using .includes since something can be both repeated and required
				required: (v.rule ?? "").includes("required"),
				repeated: (v.rule ?? "").includes("repeated")
			};
			switch(v.type){
				case "bool":
					this._value[k] = new BoolPBFField(fieldOptions);
					break;
				case "bytes":
					this._value[k] = new BytesPBFField(fieldOptions);
					break;
				case "double":
					this._value[k] = new DoublePBFField(fieldOptions);
					break;
				case "fixed32":
					this._value[k] = new Fixed32PBFField(fieldOptions);
					break;
				case "fixed64":
					this._value[k] = new Fixed64PBFField(fieldOptions);
					break;
				case "float":
					this._value[k] = new FloatPBFField(fieldOptions);
					break;
				case "int32":
					this._value[k] = new Int32PBFField(fieldOptions);
					break;
				case "int64":
					this._value[k] = new Int64PBFField(fieldOptions);
					break;
				case "sfixed32":
					this._value[k] = new SFixed32PBFField(fieldOptions);
					break;
				case "sfixed64":
					this._value[k] = new SFixed64PBFField(fieldOptions);
					break;
				case "sint32":
					this._value[k] = new SInt32PBFField(fieldOptions);
					break;
				case "sint64":
					this._value[k] = new SInt64PBFField(fieldOptions);
					break;
				case "string":
					this._value[k] = new StringPBFField(fieldOptions);
					break;
				case "uint32":
					this._value[k] = new UInt32PBFField(fieldOptions);
					break;
				case "uint64":
					this._value[k] = new UInt64PBFField(fieldOptions);
					break;
				// any other values are messages or enums
				default:
					// enums have a values field
					if(v.values){
						this._value[k] = new EnumPBFField(
							fieldOptions,
							// convert from {[value]: [code]} to {code: [code], value: [value]}
							Object.entries(v.values).map(x => ({
								code: x[1],
								value: x[0]
							}))
						);
					}
					// messages have a fields field
					else{
						if(v.fields){
							this._value[k] = new MessagePBFField(fieldOptions, {});
							// load in the upcoming fields
							this._value[k].from(v.fields);
						}
						else{
							throw new Error("Incomplete definition");
						}
					}
			}
			// field numbers should never be manually messed with
			this._value[k].lockFieldNumber();
		}
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
				const fieldNumber = v.fieldNumber;
				if(fieldNumber === undefined) throw new Error("All field numbers must exist");
				if(!this.indices[fieldNumber]) this.indices[fieldNumber - 1] = k;
				else throw new Error("All field numbers must be unique");
				v.lockFieldNumber();
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
		return fieldCountString + valuesThatExist.map(([k, v]) => v.toUrl()).join("");
	}

	toUrl(): string{
		this.validateValue();
		const encodedValue = this.encodeValue();
		if(encodedValue === "") return "";
		if(!this.options.fieldNumber) return encodedValue;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + "m" + encodedValue;
	}

	private finaliseParsedValue(value: SimpleValue[]): NestedStringArray{
		let finalValue: NestedStringArray = [];
		for(let item of value){
			if(Array.isArray(item.value)) finalValue[item.index - 1] = this.finaliseParsedValue(item.value);
			else finalValue[item.index - 1] = `${this.delimiter ?? defaultDelimiter}${item.index}${item.letter}${item.value}`;
		}
		return finalValue;
	}

	fromUrl(value?: NestedStringArray){
		if(value === undefined || value === "") this.value = undefined;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		// the url needs to be broken into chunks
		if(!Array.isArray(value)){
			let arrayValue = value.split(delimiter);
			let parsedValue: SimpleValue[] = [];
			for(let individualValue of arrayValue.reverse()){
				if(individualValue === "") continue;
				const regex = /^([0-9]+)([a-zA-Z])(.*)$/;
				const matches = individualValue.match(regex);
				// invalid url part, just ignore
				if(!matches) continue;
				// take the followup items if it's a message
				// otherwise, just add it to the list
				// only account for m since repeated values are not urlencodeable (afaik)
				if(matches[2] === "m"){
					const includedItemCount = parseInt(matches[3], 10);
					const includedItems = parsedValue.splice(-includedItemCount);
					parsedValue.push({
						index: parseInt(matches[1], 10),
						letter: "m",
						value: includedItems
					});
				}
				else{
					parsedValue.push({
						index: parseInt(matches[1], 10),
						letter: matches[2],
						value: matches[3]
					});
				}
			}
			value = this.finaliseParsedValue(parsedValue);
		}
		// sorting out post parsing
		for(let i = 0; i < value.length; i++){
			const key = this.indices[i];
			// _value already has empty spaces for objects, so calling fromUrl on it works
			if(key !== undefined){
				this._value[key].fromUrl(value[i] as string);
			}
		}
	}

	toArray(): EncodedValueArray{
		this.validateValue();
		let encodedValue: AnyEncodedValue = [];
		for(let [k, v] of Object.entries(this._value)){
			encodedValue[v.fieldNumber - 1] = v.toArray();
		}
		return encodedValue;
	}

	fromArray(value?: EncodedValueArray){
		if(value === undefined){
			this._value = undefined;
			return;
		}
		for(let [index, v] of value.entries()){
			const key = this.indices[index];
			// if no index was found, treat it as a reserved value
			if(key !== undefined){
				// typing can be dubious since it accepts any value, while the value setting does not do the same
				// this can safely be ignored since errors will occur if we try to pass it the wrong type of value anyway
				// @ts-ignore
				this._value[key].fromArray(v);
			}
		}
	}
}