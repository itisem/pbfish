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

// a single object
export interface SingleMessagePBFFieldObject{
	[key: string]: PBFField;
};

// specifically a message pbf field object
export type MessagePBFFieldObject = SingleMessagePBFFieldObject | SingleMessagePBFFieldObject[];

// additional options for message pbf fields
export interface MessagePBFFieldDescriptor{
	definition: IndividualProtobufDefinition;
	parent?: MessagePBFField;
	allDefinitions?: ManyProtobufDefinitions;
}

// the values what are being loaded in while doing a .value
export interface MessagePBFFieldValue{
	[key: string]: AnyEncodedValue | MessagePBFFieldValue | (AnyEncodedValue | MessagePBFFieldValue)[];
};

// every individual property's type
export type MessagePBFFieldProperty = PBFField | MessagePBFFieldValue;

// any layers of strings
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

// a list of indexed protobuf definitions
export interface ManyProtobufDefinitions{
	[key: string]: IndividualProtobufDefinition;
}

// a single definition of any type
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

// a single field within a definition
export interface FieldDefinition{
	rule?: string; // required, repeated
	type: string;
	id: number;
}

export default class MessagePBFField extends GenericPBFField<SingleMessagePBFFieldObject, MessagePBFFieldValue, EncodedValueArray>{
	// dynamically assigned values
	[index: string]: any;
	// store the indices of everything in here for easier access in url / array decoding
	// this should not break unless horribly misused since field numbers get locked once added inside a message
	protected _indices: string[];
	protected _allIndices: string[];
	// protobuf definitions
	protected _definition?: IndividualProtobufDefinition;
	protected _parent?: MessagePBFField;
	protected _everyDefinition?: ManyProtobufDefinitions;
	// checks for oneofs
	protected _oneofs?: string[][];
	protected _activeOneofsByKey: {
		[key: string]: number[];
	}
	// check for required fields
	protected _requiredFields: string[];

	constructor(options: PBFFieldOptions, description: MessagePBFFieldDescriptor){
		super(extendOptions("m", options));
		this._value = {};
		this.options = options ?? {};

		// set indices for easier access
		this._indices = [];
		this._allIndices = [];
		this._requiredFields = [];
		this._oneofs = [];
		// setting indices and required fields
		for(let key in description.definition.fields){
			let field = description.definition.fields[key]
			const id = field.id;
			if(this._allIndices[id - 1]) throw new Error(`Duplicate field id ${id} in ${this._name}`);
			this._allIndices[id - 1] = key;
			if(this._ruleCheck(field.rule, "required")) this._requiredFields.push(key);
		}

		// setting parent map for accessing full definition later
		if(!description.parent){
			this._everyDefinition = description.allDefinitions;
		}
		else{
			this._parent = description.parent;
		}

		this._definition = description.definition;
		this._activeOneofsByKey = {};

		// setting oneofs
		let oneofIndex = 0;
		if(this._definition.oneofs){
			this._oneofs = [];
			for(let key in this._definition.oneofs){
				const oneof = this._definition.oneofs[key].oneof;
				this._oneofs.push(oneof);
				for(let oneofKey of oneof){
					if(!this._activeOneofsByKey[oneofKey]) this._activeOneofsByKey[oneofKey] = [];
					this._activeOneofsByKey[oneofKey].push(oneofIndex);
				}
				oneofIndex += 1;
			}
		}
	}

	// check if all oneofs are met
	protected _testOneofs(key: string){
		if(!this._activeOneofsByKey[key]) return;
		for(let oneofIndex of this._activeOneofsByKey[key]){
			const oneof = this._oneofs[oneofIndex];
			for(let oneofKey of oneof){
				if(this._value[oneofKey] && oneofKey !== key) throw new Error(`Oneof constraint violation in ${this._name}: ${oneof}`);
			}
		}
	}

	// check if required fields are all set
	protected _checkRequired(){
		for(let key of this._requiredFields){
			if(!this._value[key]) throw new Error(`Required field ${key} unset  in ${this._name}`);
		}
	}

	// check if required fields are all set, and oneofs have exactly one value set
	// not to be confused with _validateValue which does further validation
	protected _checkValidity(){
		this._checkRequired();
		for(let oneof of this._oneofs){
			let oneofCount = 0;
			for(let key of oneof){
				if(this._value[key]) oneofCount += 1;
			}
			if(oneofCount !== 1) throw new Error(`Invalid number of values set in ${this._name} for oneof ${oneof}`);
		}
	}

	_validateValue(value?: MessagePBFFieldObject | MessagePBFFieldObject[]){
		if(value === undefined) this._checkValidity();
		if(this.options.required && this._isUndefined) throw new Error(`Required field cannot be undefined in ${this._name}`);
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
					valAsField._validateValue();
					// makes sure that field numbers aren't wrong
					allIndices.add(valAsField._fieldNumber);
				}
				if(allIndices.size > 1) throw new Error(`Field numbers don't match up in repeated field ${this._name}.${k}`);
				if(allIndices.size === 1){
					const [realIndex] = allIndices;
					fieldNumbers.push(realIndex);
				}
			}
			else{
				v._validateValue();
				fieldNumbers.push(v._fieldNumber);
			}
		}
		if((new Set(fieldNumbers)).size !== fieldNumbers.length){
			throw new Error(`${this._name} has duplicate field numbers`);
		}
	}

	// checks if a certain rule is present
	private _ruleCheck(rule: string | undefined, against: string){
		return (rule ?? "").includes(against);
	}

	// returns the whole protobuf definition. used in constructing stuff
	get _allDefinitions(): ManyProtobufDefinitions{
		if(this._parent) return this._parent._allDefinitions;
		return this._everyDefinition;
	}

	// add a new field before a value is loaded into it
	private _create(key: string, createMin?: number){
		// load some basic definitions
		const fieldDefinition = this._definition.fields[key];
		if(!fieldDefinition) throw new Error(`Attempting to create non-existent field ${this._name}.${key}`);
		const fieldNumber = fieldDefinition.id;
		if(!fieldNumber) throw new Error(`Unspecified field number ${this._name}.${key}`);
		// disallow non-unique field numbers unless this is a repeated message field & we are just creating additional fields
		if(this._indices[fieldNumber - 1] && (!createMin || this._indices[fieldNumber - 1] !== key)) throw new Error(`All field numbers must be unique in ${this._name}`);
		this._indices[fieldNumber - 1] = key;
		const fieldOptions = {
			fieldNumber,
			// having a field be both repeated and required is illegal in v3, but i will include handling such incorrect fields for userfriendliness
			required: this._ruleCheck(fieldDefinition.rule, "required"),
			repeated: this._ruleCheck(fieldDefinition.rule, "repeated"),
			name: this._name ? this._name + "." + key : key
		};
		// create more copies of a message field if createMin is set
		if(createMin){
			if(!Array.isArray(this._value[key])){
				throw new Error(`Cannot create copies of a non-repeated or non-message field ${this._name}.${key}`);
				// this shouldn't cause an issue since createMin is only ever specified after calling create once before
			}
			// too many creations, delete some
			if(createMin <= this._value[key].length){
				this._value[key].splice(createMin);
				return;
			}
			// find the definition, the same as if it was a "normal" thing
			const nestedKeys = Object.keys(this._definition.nested ?? {});
			let newDefinition: IndividualProtobufDefinition;
			if(nestedKeys.includes(fieldDefinition.type)){
				newDefinition = this._definition.nested[fieldDefinition.type];
			}
			else{
				const _allDefinitions = this._allDefinitions;
				if(Object.keys(_allDefinitions).includes(fieldDefinition.type)){
					newDefinition = _allDefinitions[fieldDefinition.type];
				}
				else{
					throw new Error(`Non-existent field type ${fieldDefinition.type} in ${this._name}`);
				}
			}
			// a definition is a message iff it has a fields value
			// by all accounts, this should not be possible based on logic later in the field
			if(!newDefinition.fields) throw new Error(`Trying to repeat a non-message field in the incorrect way -- this should never be possible (${this._name}.${key})`);
			for(let i = this._value[key].length; i < createMin; i++){
				this._value[key].push(new MessagePBFField(fieldOptions, {
					parent: this,
					definition: newDefinition
				}));
			}
		}
		else{
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
					const nestedKeys = Object.keys(this._definition.nested ?? {});
					let newDefinition: IndividualProtobufDefinition;
					if(nestedKeys.includes(fieldDefinition.type)){
						newDefinition = this._definition.nested[fieldDefinition.type];
					}
					else{
						const _allDefinitions = this._allDefinitions;
						if(Object.keys(_allDefinitions).includes(fieldDefinition.type)){
							newDefinition = _allDefinitions[fieldDefinition.type];
						}
						else{
							throw new Error(`Non-existent field type ${fieldDefinition.type} in ${this._name}.${key}`);
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
							throw new Error(`Incomplete definition of ${this._name}.${key}`);
						}
					}
			}
		}
		// dynamically add property to object
	}

	// checks whether or not the value corresponds to a message pbf field
	// this is based on the fact that all normal fields have a "normal" value (i.e. ints, strings, arrays of ints / strings)
	// while message fields have an object value
	protected _checkIfMessageField(value?: any){
		if(typeof value === "object"){
			if(value === null) return false;
			// array values are *never* message pbf fields since repetition is handled differently for those
			if(Array.isArray(value)) return false;
			else return true;
		}
		else{
			return false;
		}
	}

	protected _setProperty(key){
		const setKey = typeof this[key] === "function" || key === "value" ? "__" + key : key;
		let assign: {[k: string]: MessagePBFFieldProperty | MessagePBFFieldProperty[]} = {};
		const value = this._value[key];
		// array values in _value only exist for message fields, so we just pass along the references
		if(Array.isArray(value)) assign[setKey] = this._value[key];
		else this._checkIfMessageField(value.value) ? assign[key] = this._value[setKey] : assign[key] = this._value[setKey].value;
		Object.assign(this, assign);
	}

	set value(value: MessagePBFFieldValue | undefined){
		// reset all values if undefined
		if(value === undefined){
			for(let [k,v] of Object.entries(this._value)){
				this._value[k].value = undefined;
				// change property value
				this._setProperty(k);
			}
		}
		// otherwise, set values, or add new fields depending on what we have
		for(let [k, v] of Object.entries(value)){
			// the object doesn't exist yet, we need to create it anew
			if(!this._value[k]){
				if(Object.keys(this._definition.fields).includes(k)) this._create(k);
				else throw new Error(`Attempting to set non-existent field ${this._name}.${k}`);
			}
			// checking for oneofs in case there is an error
			this._testOneofs(k);
			if(Array.isArray(this._value[k])){
				let allValues = Array.isArray(v) ? v : [v];
				this._create(k, allValues.length); // ensure that there is the right number of message objects present
				for(let i = 0; i < allValues.length; i++){
					this._value[k][i].value = allValues[i];
				}
			}
			else{
				this._value[k].value = v;
			}
			// change property value for easier access
			this._setProperty(k);
		}
	}

	get value(): MessagePBFFieldValue{
		this._checkValidity();
		if(this._value === undefined) return undefined;
		return Object.fromEntries(
			Object.entries(this._value).map(([k, v]) => {
				if(!Array.isArray(v)) return [k, v.value];
				else return [k, v.map(x => x.value)];
			})
		);
	}

	set _delimiter(newDelimiter: string | undefined){
		const realNewDelimiter = newDelimiter ?? defaultDelimiter;
		this.options.delimiter = realNewDelimiter;
		for(let [k, v] of Object.entries(this._value)){
			if(!Array.isArray(v)){
				v._delimiter = realNewDelimiter;
			}
			else{
				for(let val of v){
					val._delimiter = realNewDelimiter;
				}
			}
		}
	}

	get _isUndefined(){
		for(let [k, v] of Object.entries(this._value)){
			if(Array.isArray(v)){
				for(let val of v){
					if(!val._isUndefined) return false;
				}
			}
			else{
				if(!v._isUndefined) return false;
			}
		}
		return true;
	}

	private _encodeValue(value?: MessagePBFFieldObject): string{
		const realValue = value ?? this._value;
		const valuesThatExist = Object.entries(realValue).filter(([k, v]) => !v._isUndefined);
		if(valuesThatExist.length === 0) return "";
		// the value of the field itself is how many values it contains, and then append the url encoding of those values
		// don't include total count if the field number is unset
		const fieldCountString = this.options.fieldNumber ? valuesThatExist.length.toString() : "";
		// if any field is repeated, this will just throw an error by itself
		return fieldCountString + valuesThatExist.map(([k, v]) => v.toUrl()).join("");
	}

	toUrl(): string{
		this._validateValue();
		const encodedValue = this._encodeValue();
		if(encodedValue === "") return "";
		if(!this.options.fieldNumber) return encodedValue;
		const delimiter = this.options.delimiter ?? defaultDelimiter;
		return delimiter + this.options.fieldNumber.toString() + "m" + encodedValue;
	}

	private _finaliseParsedValue(value: SimpleValue[]): NestedStringArray{
		let finalValue: NestedStringArray = [];
		for(let item of value){
			if(Array.isArray(item.value)) finalValue[item.index - 1] = this._finaliseParsedValue(item.value);
			else finalValue[item.index - 1] = `${this.delimiter ?? defaultDelimiter}${item.index}${item.letter}${item.value}`;
		}
		return finalValue;
	}

	fromUrl(value?: NestedStringArray){
		if(value === undefined || value === "") return;
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
			value = this._finaliseParsedValue(parsedValue);
		}
		// sorting out post parsing
		for(let i = 0; i < value.length; i++){
			if(value[i] === undefined) continue;
			let key = this._indices[i];
			// _value already has empty spaces for objects, so calling fromUrl on it works
			if(key === undefined){
				key = this._allIndices[i];
				if(!key) throw new Error(`Invalid index ${i+1} of ${this._name}`);
				this._create(key);
			}
			// handle oneofs
			this._testOneofs(key);
			if(Array.isArray(this._value[key])) throw new Error(`Repeated fields cannot be urlencoded in ${this._name}`);
			this._value[key].fromUrl(value[i] as string);
			// finally, update property value
			this._setProperty(key);
		}
	}

	toArray(): EncodedValueArray{
		this._validateValue();
		let encodedValue: AnyEncodedValue = [];
		for(let [k, v] of Object.entries(this._value)){
			// for repeated message fields, encode them separately
			if(Array.isArray(v)){
				if(v.length === 0) return undefined; // empty array = nothing to return
				// assumes that all field numbers are identical
				// which should be the case unless field numbers are manually unlocked for whatever bizarre reason
				encodedValue[v[0]._fieldNumber - 1] = v.map(x => x.toArray());
			}
			// otherwise, encode the field normally
			else{
				encodedValue[v._fieldNumber - 1] = v.toArray();
			}
		}
		return encodedValue;
	}

	fromArray(value?: EncodedValueArray){
		if(value === undefined || value === null){
			this._value = {};
			return;
		}
		for(let [index, v] of value.entries()){
			const key = this._allIndices[index];
			// if no index was found, treat it as a reserved value
			if(key !== undefined){
				if(!this._value[key]){
					this._create(key);
				}
				// test oneofs before setting value
				this._testOneofs(key);
				// handle repeated message field properly
				if(Array.isArray(this._value[key])){
					if(!Array.isArray(v)) v = [v];
					this._create(key, v.length);
					for(let i = 0; i < v.length; i++){
						// as below, typing dubiousness can be ignored safely since errors will happen when passing incorrect type
						// @ts-ignore
						this._value[key][i].fromArray(v[i]);
					}
				}
				else{
					// typing can be dubious since it accepts any value, while the value setting does not do the same
					// this can safely be ignored since errors will occur if we try to pass it the wrong type of value anyway
					// @ts-ignore
					this._value[key].fromArray(v);
				}
				// finally, update property value
				this._setProperty(key);
			}
			// not erroring when the key is undefined
			// since it is possible to have incomplete / partial definitions
		}
	}

	toJSON(): string{
		return JSON.stringify(this.toArray());
	}

	fromJSON(value: string){
		this.fromArray(JSON.parse(value));
	}
}