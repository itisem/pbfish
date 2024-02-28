import {GenericPBFField, extendOptions, PBFFieldOptions, EncodedValueArray, AnyEncodedValue, URLEncodedValue, defaultDelimiter} from "./core.js";

// all other parsers, to be used for .from()
import BoolPBFField from "./bool.js";
import BytesPBFField from "./bytes.js";
import DoublePBFField from "./double.js";
import EnumPBFField from "./enum.js";
import Fixed32PBFField from "./fixed32.js";
import Fixed64PBFField from "./fixed64.js";
import FloatPBFField from "./float.js";
import Int32PBFField from "./int32.js";
import Int64PBFField from "./int64.js";
import SFixed32PBFField from "./sfixed32.js";
import SFixed64PBFField from "./sfixed64.js";
import SInt32PBFField from "./sint32.js";
import SInt64PBFField from "./sint64.js";
import StringPBFField from "./string.js";
import UInt32PBFField from "./uint32.js";
import UInt64PBFField from "./uint64.js";

// full descriptions of valid pbf fields and baseValues. primarily used for manually made classes
export type PBFField = GenericPBFField<AnyEncodedValue | MessagePBFFieldObject, AnyEncodedValue | MessagePBFFieldValue, AnyEncodedValue>;

// a single object
export interface SingleMessagePBFFieldObject{
	[key: string]: PBFField | PBFField[];
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
	protected _definition: IndividualProtobufDefinition;
	protected _parent?: MessagePBFField;
	protected _everyDefinition: ManyProtobufDefinitions;
	// checks for oneofs
	protected _oneofs: string[][];
	protected _activeOneofsByKey: {
		[key: string]: number[];
	}
	// check for required fields
	protected _requiredFields: string[];
	// forbidden names for quick access
	protected _forbiddenNames: string[];
	// overwriting value type since this one cannot be undefined
	protected _value: SingleMessagePBFFieldObject;

	constructor(options: PBFFieldOptions, description: MessagePBFFieldDescriptor){
		super(extendOptions("m", options));
		this._value = {};

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
			if(!description.allDefinitions) throw new Error(`Message field ${this._name} must have either a parent or a complete definition list`);
			this._everyDefinition = description.allDefinitions;
		}
		else{
			this._parent = description.parent;
			this._everyDefinition = this._parent.allDefinitions;
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

		// generate forbidden names that would be dangerous to overwrite
		this._forbiddenNames = Object.keys(this);
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
		// this is the equivalent of an undefined value
		if(Object.keys(this._value).length === 0) return;
		for(let key of this._requiredFields){
			if(!this._value[key]) throw new Error(`Required field ${key} unset  in ${this._name}`);
		}
	}

	// check if required fields are all set, and oneofs have exactly one value set
	// not to be confused with .validateValue which does further validation
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

	validateValue(value?: SingleMessagePBFFieldObject){
		if(value === undefined) this._checkValidity();
		const realValue = value ?? this._value;
		if(this._options.required && this.isUndefined) throw new Error(`Required field cannot be undefined in ${this._name}`);
		if(realValue === undefined) return;
		let fieldNumbers = [];
		for(let k in realValue){
			let v: PBFField | PBFField[] = realValue[k];
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
				if(allIndices.size > 1) throw new Error(`Field numbers don't match up in repeated field ${this._name}.${k}`);
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
			throw new Error(`${this._name} has duplicate field numbers`);
		}
	}

	// checks if a certain rule is present
	private _ruleCheck(rule: string | undefined, against: string){
		return (rule ?? "").includes(against);
	}

	// returns the whole protobuf definition. used in constructing stuff
	get allDefinitions(): ManyProtobufDefinitions{
		if(this._parent) return this._parent.allDefinitions;
		return this._everyDefinition;
	}

	// add a new field before a value is loaded into it
	private _create(key: string, createMin?: number){
		// additional safety checks in case a message field definition lacks fields, somehow
		// it *should* never happen but better safe than sorry
		const fields = this._definition?.fields;
		if(!fields) throw new Error(`Attempting to create non-existent field ${this._name}.${key}`);
		// load some basic definitions
		const fieldDefinition = fields[key];
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
			// singling out value for type safety
			const keyValue = this._value[key] as PBFField[];
			// too many creations, delete some
			if(createMin <= keyValue.length){
				keyValue.splice(createMin);
				return;
			}
			// find the definition, the same as if it was a "normal" thing
			const nestedKeys = Object.keys(this._definition.nested ?? {});
			let newDefinition: IndividualProtobufDefinition;
			// adding an unnecessary nestedness check here because typescript is not smart enough to detect that it cannot be undefined
			if(nestedKeys.includes(fieldDefinition.type) && this._definition.nested){
				newDefinition = this._definition.nested[fieldDefinition.type];
			}
			else{
				const allDefinitions = this.allDefinitions;
				if(Object.keys(allDefinitions).includes(fieldDefinition.type)){
					newDefinition = allDefinitions[fieldDefinition.type];
				}
				else{
					throw new Error(`Non-existent field type ${fieldDefinition.type} in ${this._name}`);
				}
			}
			// a definition is a message iff it has a fields value
			// by all accounts, this should not be possible based on logic later in the field
			if(!newDefinition.fields) throw new Error(`Trying to repeat a non-message field in the incorrect way -- this should never be possible (${this._name}.${key})`);
			for(let i = keyValue.length; i < createMin; i++){
				keyValue.push(new MessagePBFField(fieldOptions, {
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
					if(nestedKeys.includes(fieldDefinition.type) && this._definition.nested){
						newDefinition = this._definition.nested[fieldDefinition.type];
					}
					else{
						const allDefinitions = this.allDefinitions;
						if(Object.keys(allDefinitions).includes(fieldDefinition.type)){
							newDefinition = allDefinitions[fieldDefinition.type];
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

	protected _setProperty(key: string){
		// no quick accessor for forbidden names that would be dangerous to overwrite
		const setKey = this._forbiddenNames.includes(key) ? "__" + key : key;
		let assign: {[k: string]: any} = {};
		const value = this._value[key];
		// for undefined, just reset value
		if(value === undefined) return Object.assign(this, {key: undefined});
		// array values in _value only exist for message fields, so we just pass along the references
		if(Array.isArray(value)) assign[setKey] = this._value[key];
		else this._checkIfMessageField(value.value) ? assign[key] = this._value[setKey] : assign[key] = (this._value[setKey] as PBFField).value;
		Object.assign(this, assign);
	}

	set value(value: MessagePBFFieldValue | undefined){
		// reset all values if undefined
		if(value === undefined){
			for(let [k,v] of Object.entries(this._value)){
				delete this._value[k];
				// change property value
				this._setProperty(k);
			}
			return;
		}
		// otherwise, set values, or add new fields depending on what we have
		for(let [k, v] of Object.entries(value)){
			// the object doesn't exist yet, we need to create it anew
			if(!this._value[k]){
				if(Object.keys(this._definition.fields ?? {}).includes(k)) this._create(k);
				else throw new Error(`Attempting to set non-existent field ${this._name}.${k}`);
			}
			// checking for oneofs in case there is an error
			this._testOneofs(k);
			if(Array.isArray(this._value[k])){
				let allValues = Array.isArray(v) ? v : [v];
				this._create(k, allValues.length); // ensure that there is the right number of message objects present
				for(let i = 0; i < allValues.length; i++){
					(this._value[k] as PBFField[])[i].value = allValues[i];
				}
			}
			else{
				(this._value[k] as PBFField).value = v;
			}
			// change property value for easier access
			this._setProperty(k);
		}
	}

	get value(): MessagePBFFieldValue{
		this._checkValidity();
		return Object.fromEntries(
			Object.entries(this._value).map(([k, v]) => {
				if(!Array.isArray(v)) return [k, v.value];
				else return [k, v.map(x => x.value)];
			})
		);
	}

	get delimiter(): string{
		return this._options.delimiter;
	}

	set delimiter(newDelimiter: string | undefined){
		const realNewDelimiter = newDelimiter ?? defaultDelimiter;
		if(realNewDelimiter.length !== 1) throw new Error(`Invalid delimiter ${realNewDelimiter} in ${this._name}`);
		this._options.delimiter = realNewDelimiter;
		for(let [k, v] of Object.entries(this._value)){
			if(v === undefined) continue;
			if(!Array.isArray(v)){
				v.delimiter = realNewDelimiter;
			}
			else{
				for(let val of v){
					val.delimiter = realNewDelimiter;
				}
			}
		}
	}

	get isUndefined(){
		for(let [k, v] of Object.entries(this._value)){
			if(v === undefined) continue;
			if(Array.isArray(v)){
				for(let val of v){
					if(!val.isUndefined) return false;
				}
			}
			else{
				if(!v.isUndefined) return false;
			}
		}
		return true;
	}

	private _encodeValue(value?: MessagePBFFieldObject): {value: string, fieldCount: number}{
		const realValue = value ?? this._value;
		const valuesThatExist = Object.entries(realValue).filter(([k, v]) => !v.isUndefined);
		if(valuesThatExist.length === 0) return {value: "", fieldCount: 0};
		// the value of the field itself is how many values it contains, and then append the url encoding of those values
		const encoded = valuesThatExist.map(([k, v]) => v.toUrl());
		// NOTE: the way google maps parses, all sub-fields are also included in the count
		const fieldCount = encoded.reduce(
			// for every encoded value, add its count of delimiters to the total count
			// if the encoded value is a string, it must have come from a simple field (i.e. int64), and thus is already in .length
			// since messages will return URLEncodedValue if they have a field number
			(acc, val) => typeof val === "string" ? acc : acc + val.fieldCount,
			// also add the newly encoded values to the count
			valuesThatExist.length
		);
		// if this is the main thing, no need for field counts, otherwise, add it to the string
		const fieldCountString = this._options.fieldNumber ? fieldCount.toString() : "";
		// finalise everything, handle URLEncodedValue types
		const finalValue = fieldCountString + encoded.map(x => typeof x === "string" ? x : x.value).join("");
		// if any field is repeated, this will just throw an error by itself. no need to add the delimiter since it will append that here itself
		return {
			value: finalValue,
			fieldCount
		};
	}

	toUrl(): string | URLEncodedValue{
		this.validateValue();
		const encodedValue = this._encodeValue();
		if(encodedValue.value === "") return "";
		// if this doesn't have a field number, then the encoded value is the url format in itself
		if(!this._options.fieldNumber) return encodedValue.value;
		// otherwise, append the delimiter and return information about the field count
		return {
			value: this._options.delimiter + this._options.fieldNumber.toString() + "m" + encodedValue.value,
			fieldCount: encodedValue.fieldCount
		};
	}

	fromUrl(value?: string){
		// empty value = no value change needed
		if(value === undefined || value === "") return;
		// the url needs to be broken into chunks
		let arrayValue = value.split(this._options.delimiter).filter(x => !!x);
		// finalised parsed values to add things to
		let parsedValue: ({letter: string, value: string, index: number})[] = [];
		// ignore values that have already been parsed inside a message
		let ignoreCount = 0;
		// simple for loop makes splicing easier than for of
		for(let i = 0; i < arrayValue.length; i++){
			const individualValue = arrayValue[i];
			// this is inside a message, just ignore
			if(ignoreCount > 0){
				ignoreCount -= 1;
				continue;
			}
			// get parts of each value
			const regex = /^([0-9]+)([a-zA-Z])(.*)$/;
			const matches = individualValue.match(regex);
			// invalid url part, just ignore
			if(!matches) continue;
			// messages need special care
			if(matches[2] === "m"){
				// the value of the message field is how many of the upcoming fields it contains
				ignoreCount = parseInt(matches[3], 10);
				if(isNaN(ignoreCount)) throw new Error(`Invalid url-encoded protobuf message ${value} in ${this._name}`);
				// the message is incomplete
				if(ignoreCount > arrayValue.length - i - 1) throw new Error(`Invalid url-encoded protobuf message ${value} in ${this._name}`);
				// add the upcoming values to ignoreCount
				parsedValue.push({
					index: parseInt(matches[1], 10),
					letter: matches[2],
					value: arrayValue.slice(i + 1, i + 1 + ignoreCount).join(this._options.delimiter)
				});
			}
			// if it's not a message, add parsed value properly
			else{
				parsedValue.push({
					index: parseInt(matches[1], 10),
					letter: matches[2],
					value: matches[3]
				});
			}
		}

		for(let value of parsedValue){
			const key = this._allIndices[value.index - 1]
			// skip invalid indices
			if(!key && value !== undefined && value !== null)
				console.warn(`Invalid index ${value.index} in ${this._name} - skipping`);
			else{
				this._create(key);
				// test oneofs before setting value
				this._testOneofs(key);
				// repeated fields are not valid
				if(Array.isArray(this._value[key])) throw new Error(`Cannot urldecode repeated field ${key} in ${this.name}`);
				// check for letter equivalence
				if((this._value[key] as PBFField).fieldType !== value.letter)
					throw new Error(`Invalid field type ${value.letter} for ${(this._value[key] as PBFField).fieldType}`);
				// parse the value as a urlencoded thing
				(this._value[key] as PBFField).fromUrl(value.value);
			}
		}
	}

	toArray(): EncodedValueArray | undefined{
		this.validateValue();
		// this is the equivalent of an undefined value
		if(Object.keys(this._value).length === 0) return undefined;
		let encodedValue: AnyEncodedValue = [];
		for(let [k, v] of Object.entries(this._value)){
			// for repeated message fields, encode them separately
			if(Array.isArray(v)){
				if(v.length === 0) return; // empty array = nothing to return
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
			else{
				if(v !== undefined && v!== null) console.warn(`Invalid index ${index} in ${this._name} - skipping`);
			}
		}
	}

	toJSON(): string{
		return JSON.stringify(this.toArray());
	}

	fromJSON(value: string){
		this.fromArray(JSON.parse(value));
	}
}