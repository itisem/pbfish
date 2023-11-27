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
export type PBFField = GenericPBFField<AnyEncodedValue | MessagePBFFieldObject, AnyEncodedValue | MessagePBFFieldValue, AnyEncodedValue>;

export interface SingleMessagePBFFieldObject{
	[key: string]: PBFField;
};

export type MessagePBFFieldObject = SingleMessagePBFFieldObject | SingleMessagePBFFieldObject[];

export interface MessagePBFFieldDescriptor{
	definition: IndividualProtobufDefinition;
	parent?: MessagePBFField;
	allDefinitions?: ManyProtobufDefinitions;
}

export interface MessagePBFFieldValue{
	[key: string]: AnyEncodedValue | MessagePBFFieldValue | (AnyEncodedValue | MessagePBFFieldValue)[];
};

export type NestedStringArray = string | undefined | NestedStringArray[];

// interface used temporarily while parsing values
interface SimpleValue{
	index: number;
	letter: string;
	value: string | SimpleValue[];
};

// the outer layer will always have nested, so exporting IndividualProtobufDefinition and nothing else would be incorrect
export interface ProtobufDefinition{
	nested: ManyProtobufDefinitions;
}

export interface ManyProtobufDefinitions{
	[key: string]: IndividualProtobufDefinition;
}

export interface IndividualProtobufDefinition{
	/////// message definitions
	// all fields within that message
	fields?: {
		[key: string]: FieldDefinition; 
	}
	// all oneofs. not used in the parser for now
	oneofs?: {
		[key: string]: {
			oneof: string[];
		}
	}
	nested?: ManyProtobufDefinitions
	/////// enum definitions
	values?: {
		[key: string]: number;
	}
}
export interface FieldDefinition{
	rule?: string; // required, repeated
	type: string;
	id: number;
}

export default class MessagePBFField extends GenericPBFField<SingleMessagePBFFieldObject, MessagePBFFieldValue, EncodedValueArray>{
	// store the indices of everything in here for easier access in url / array decoding
	// this should not break unless horribly misused since field numbers get locked once added inside a message
	indices: string[];
	protected allIndices: string[];
	protected definition?: IndividualProtobufDefinition;
	protected parent?: MessagePBFField;
	protected _allDefinitions?: ManyProtobufDefinitions;
	// used to get rid of the unnecessary definition field once everything has been created
	protected createCount: number;

	constructor(options: PBFFieldOptions, description: MessagePBFFieldDescriptor){
		super(extendOptions("m", options));
		this._value = {};
		this.options = options ?? {};

		// set indices for easier access
		this.indices = [];
		this.allIndices = [];
		for(let key in description.definition.fields){
			const id = description.definition.fields[key].id;
			if(this.allIndices[id - 1]) throw new Error("Duplicate field id");
			this.allIndices[id - 1] = key;
		}

		// setting parent map for accessing full definition later
		if(!description.parent){
			this._allDefinitions = description.allDefinitions;
		}
		else{
			this.parent = description.parent;
		}

		this.definition = description.definition;
	}

	// checks if a certain rule is present
	private ruleCheck(rule: string | undefined, against: string){
		return (rule ?? "").includes(against);
	}

	// returns the whole protobuf definition. used in constructing stuff
	get allDefinitions(): ManyProtobufDefinitions{
		if(this.parent) return this.parent.allDefinitions;
		return this._allDefinitions;
	}

	private create(key: string, createMin?: number){
		// load some basic definitions
		const fieldDefinition = this.definition.fields[key];
		if(!fieldDefinition) throw new Error("Attempting to create non-existent field");
		const fieldNumber = fieldDefinition.id;
		if(!fieldNumber) throw new Error("All field numbers must be specified");
		// disallow non-unique field numbers unless this is a repeated message field & we are just creating additional fields
		if(this.indices[fieldNumber] && (!createMin || this.indices[fieldNumber] !== key)) throw new Error("All field numbers must be unique");
		this.indices[fieldNumber] = key;
		const fieldOptions = {
			fieldNumber,
			// having a field be both repeated and required is illegal in v3, but i will include handling such incorrect fields for userfriendliness
			required: this.ruleCheck(fieldDefinition.rule, "required"),
			repeated: this.ruleCheck(fieldDefinition.rule, "repeated")
		};
		// create more copies of a message field if createMin is set
		if(createMin){
			if(!Array.isArray(this._value[key])){
				throw new Error("Cannot create copies of a non-repeated or non-message field");
				// this shouldn't cause an issue since createMin is only ever specified after calling create once before
			}
			// too many creations, delete some
			if(createMin <= this._value[key].length){
				this._value[key].splice(createMin);
				return;
			}
			// find the definition, the same as if it was a "normal" thing
			const nestedKeys = Object.keys(this.definition.nested ?? {});
			let newDefinition: IndividualProtobufDefinition;
			if(nestedKeys.includes(fieldDefinition.type)){
				newDefinition = this.definition.nested[fieldDefinition.type];
			}
			else{
				const allDefinitions = this.allDefinitions;
				if(Object.keys(allDefinitions).includes(fieldDefinition.type)){
					newDefinition = allDefinitions[fieldDefinition.type];
				}
				else{
					throw new Error("Non-existent field type");
				}
			}
			// a definition is a message iff it has a fields value
			// by all accounts, this should not be possible based on logic later in the field
			if(!newDefinition.fields) throw new Error("Trying to repeat a non-message field in the incorrect way -- this should never be possible");
			for(let i = this._value[key].length; i < createMin; i++){
				this._value[key].push(new MessagePBFField(fieldOptions, {
					parent: this,
					definition: newDefinition
				}));
			}
			return;
		}
		// otherwise, just create a field normally
		switch(fieldDefinition.type){
			case "bool":
				this._value[key] = new BoolPBFField(fieldOptions);
				break;
			case "bytes":
				this._value[key] = new BytesPBFField(fieldOptions);
				break;
			case "double":
				this._value[key] = new DoublePBFField(fieldOptions);
				break;
			case "fixed32":
				this._value[key] = new Fixed32PBFField(fieldOptions);
				break;
			case "fixed64":
				this._value[key] = new Fixed64PBFField(fieldOptions);
				break;
			case "float":
				this._value[key] = new FloatPBFField(fieldOptions);
				break;
			case "int32":
				this._value[key] = new Int32PBFField(fieldOptions);
				break;
			case "int64":
				this._value[key] = new Int64PBFField(fieldOptions);
				break;
			case "sfixed32":
				this._value[key] = new SFixed32PBFField(fieldOptions);
				break;
			case "sfixed64":
				this._value[key] = new SFixed64PBFField(fieldOptions);
				break;
			case "sint32":
				this._value[key] = new SInt32PBFField(fieldOptions);
				break;
			case "sint64":
				this._value[key] = new SInt64PBFField(fieldOptions);
				break;
			case "string":
				this._value[key] = new StringPBFField(fieldOptions);
				break;
			case "uint32":
				this._value[key] = new UInt32PBFField(fieldOptions);
				break;
			case "uint64":
				this._value[key] = new UInt64PBFField(fieldOptions);
				break;
			// any other values are messages or enums
			default:
				const nestedKeys = Object.keys(this.definition.nested ?? {});
				let newDefinition: IndividualProtobufDefinition;
				if(nestedKeys.includes(fieldDefinition.type)){
					newDefinition = this.definition.nested[fieldDefinition.type];
				}
				else{
					const allDefinitions = this.allDefinitions;
					if(Object.keys(allDefinitions).includes(fieldDefinition.type)){
						newDefinition = allDefinitions[fieldDefinition.type];
					}
					else{
						throw new Error("Non-existent field type");
					}
				}
				// enums have a values field
				if(newDefinition.values){
					this._value[key] = new EnumPBFField(
						fieldOptions,
						// convert from {[value]: [code]} to {code: [code], value: [value]}
						Object.entries(newDefinition.values).map(x => ({
							code: x[1],
							value: x[0]
						}))
					);
				}
				// messages have a fields field
				else{
					// repeated messages are not handled well, so instead, we just create an array of individual messages
					if(newDefinition.fields){
						if(!fieldOptions.repeated){
							this._value[key] = new MessagePBFField(fieldOptions, {
								parent: this,
								definition: newDefinition
							});
						}
						else{
							// creating a single field since .create only gets called when a value is already being set
							this._value[key] = [
								new MessagePBFField(fieldOptions, {
									parent: this,
									definition: newDefinition
								})
							];
						}
					}
					else{
						throw new Error("Incomplete definition");
					}
				}
		}
	}

	set value(value: MessagePBFFieldValue | undefined){
		// reset all values if undefined
		if(value === undefined){
			for(let [k,v] of Object.entries(this._value)){
				this._value[k].value = undefined;
			}
		}
		// otherwise, set values, or add new fields depending on what we have
		for(let [k, v] of Object.entries(value)){
			// the object doesn't exist yet, we need to create it anew
			if(!this._value[k]){
				if(Object.keys(this.definition.fields).includes(k)) this.create(k);
				else throw new Error("Attempting to set non-existent field " + k);
			}
			if(Array.isArray(this._value[k])){
				let allValues = Array.isArray(v) ? v : [v];
				this.create(k, allValues.length); // ensure that there is the right number of message objects present
				for(let i = 0; i < allValues.length; i++){
					this._value[k][i].value = allValues[i];
				}
			}
			else{
				this._value[k].value = v;
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

	validateValue(value?: MessagePBFFieldObject | MessagePBFFieldObject[]){
		if(this.options.required && this.isUndefined) throw new Error("Required field cannot be undefined");
		const realValue = value ?? this._value;
		let fieldNumbers = [];
		for(let k in realValue){
			let v = realValue[k];
			if(Array.isArray(v)){
				let allIndices = new Set();
				// if it's a repeated message field, validate everything individually
				for(let val in v){
					// this should never really happen, but added a check to make sure
					if(typeof val !== "object" || val === null || Array.isArray(val)){
						continue;
					}
					let valAsField = val as PBFField;
					valAsField.validateValue();
					// makes sure that field numbers aren't wrong
					allIndices.add(valAsField.fieldNumber);
				}
				if(allIndices.size > 1) throw new Error("Field numbers don't match up in repeated field " + k);
				if(allIndices.size === 1){
					const [realIndex] = allIndices;
					fieldNumbers.push(realIndex);
				}
			}
			else{
				v.validateValue();
				fieldNumbers.push(v.fieldNumber);
			}
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
		// if any field is repeated, this will just throw an error by itself
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
			let key = this.indices[i];
			// _value already has empty spaces for objects, so calling fromUrl on it works
			if(key == undefined){
				key = this.allIndices[i];
				if(!key) throw new Error("Invalid index " + i);
				this.create(key);
			}
			if(Array.isArray(this._value[key])) throw new Error("Repeated fields cannot be urlencoded");
			this._value[key].fromUrl(value[i] as string);
		}
	}

	toArray(): EncodedValueArray{
		this.validateValue();
		let encodedValue: AnyEncodedValue = [];
		for(let [k, v] of Object.entries(this._value)){
			// for repeated message fields, encode them separately
			if(Array.isArray(v)){
				if(v.length === 0) return undefined; // empty array = nothing to return
				// assumes that all field numbers are identical
				// which should be the case unless field numbers are manually unlocked for whatever bizarre reason
				encodedValue[v[0].fieldNumber - 1] = v.map(x => x.toArray());
			}
			// otherwise, encode the field normally
			else{
				encodedValue[v.fieldNumber - 1] = v.toArray();
			}
		}
		return encodedValue;
	}

	toJSON(): string{
		return JSON.stringify(this.toArray());
	}

	fromArray(value?: EncodedValueArray){
		if(value === undefined || value === null){
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