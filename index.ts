// re-exporting everything to have them accessible for anyone who needs the raw parsers for any reason
import MessagePBFField from "./parsers/message";

import type {DescriptionObj, CoreDefinition} from "./parsers/message";

// the outer layer will always have nested, so exporting IndividualProtobufDefinition and nothing else would be incorrect
export interface ProtobufDefinition{
	nested: ManyProtobufDefinitions;
}

interface ManyProtobufDefinitions{
	[key: string]: IndividualProtobufDefinition;
}

interface IndividualProtobufDefinition{
	/////// message definitions
	// all fields within that message
	fields?: {
		[key: string]: FieldDefinition; 
	}
	// all oneofs. not used in the parser for now
	oneofs?: {
		query: {
			oneof: string[];
		}
	}
	nested?: ManyProtobufDefinitions
	/////// enum definitions
	values?: {
		[key: string]: number;
	}
}
interface FieldDefinition{
	rule?: string; // required, repeated
	type: string;
	id: number;
}

export default class ProtobufParser{
	protected definition: ManyProtobufDefinitions;
	protected loadedDefinitions: {[key: string]: DescriptionObj};

	constructor(definition: ProtobufDefinition | string){
		// assumes that all jsons are correct. if they are not, this will cause a ruckus later
		if(typeof definition === "string") this.definition = (JSON.parse(definition) as ProtobufDefinition).nested;
		else this.definition = definition.nested;
		this.loadedDefinitions = {};
	}

	create(field: string): MessagePBFField{
		// a saved definition already exists, no need to reconstruct it from scratch
		if(this.loadedDefinitions[field]){
			const m = new MessagePBFField({}, {});
			m.from(this.loadedDefinitions[field]);
			return m;
		}
		// time to redo everything
		else{
			const fieldDefinition = this.definition[field];
			if(!fieldDefinition) throw new Error("Non-existent field referenced");
			if(!fieldDefinition.fields) throw new Error("Only message fields can be created");
			let finalField: DescriptionObj = {};
			const nested = fieldDefinition.nested;
			for(let fieldName in fieldDefinition.fields){
				finalField[fieldName] = this.expandCreate(fieldDefinition.fields[fieldName], nested);
			}
			// save definition for later use
			// don't save intermediate definitions to conserve memory
			this.loadedDefinitions[field] = finalField;
			const m = new MessagePBFField({}, {});
			m.from(finalField);
			return m;
		}
	}

	protected expandCreate(field: FieldDefinition, nested?: ManyProtobufDefinitions): CoreDefinition{
		const staticFields = [
			"bool", "bytes", "double", "fixed32", "fixed64", "float", "int32", "int64",
			"sfixed32", "sfixed64", "sint32", "sint64", "string", "uint32", "uint64"
		];
		const nestedKeys = nested ? Object.keys(nested) : [];
		if(staticFields.includes(field.type)) return field as CoreDefinition; // the FieldDefinition and CoreDefinition format are equivalent in this case
		// we have an enum or a message
		let foundDefinition: IndividualProtobufDefinition;
		// find the field in our nesting, and if not, look at the top level
		if(nestedKeys.includes(field.type)){
			foundDefinition = nested[field.type];
		}
		else{
			if(!this.definition[field.type]) throw new Error("Non-existent field type " + field.type);
			foundDefinition = this.definition[field.type];
		}

		// enum definitions will always have a values field
		if(foundDefinition.values){
			return {...field, type: "enum", values: foundDefinition.values};
		}
		// if not, it's a message definition
		else{
			let finalField: DescriptionObj = {};
			const nested = foundDefinition.nested;
			for(let fieldName in foundDefinition.fields){
				finalField[fieldName] = this.expandCreate(foundDefinition.fields[fieldName], nested);
			}
			return {...field, type: "message", fields: finalField};
		}
	}
}