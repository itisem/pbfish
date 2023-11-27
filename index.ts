// re-exporting everything to have them accessible for anyone who needs the raw parsers for any reason
import MessagePBFField from "./parsers/message";

import _ from "lodash";

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
	protected underConstructionDefinition: DescriptionObj;

	constructor(definition: ProtobufDefinition | string){
		// assumes that all jsons are correct. if they are not, this will cause a ruckus later
		if(typeof definition === "string") this.definition = (JSON.parse(definition) as ProtobufDefinition).nested;
		else this.definition = definition.nested;
		this.loadedDefinitions = {};
		this.underConstructionDefinition = {};
	}

	create(field: string): MessagePBFField{
		// list of static field types that don't require expanding
		const staticFields = [
			"bool", "bytes", "double", "fixed32", "fixed64", "float", "int32", "int64",
			"sfixed32", "sfixed64", "sint32", "sint64", "string", "uint32", "uint64"
		];
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
			// should always be empty, but clearing just in case something incomprehensibly weird happens
			let newDefintion: DescriptionObj = {};
			const baseNested = fieldDefinition.nested;
			// for large definitions, using an elegant(ish) recursive solution makes the call stack exceed
			// so instead, we expand layer by layer in the same function (even though it's a lot less nice)
			let expansions: string[] = [];
			let expansionDefinitions: IndividualProtobufDefinition[] = [];
			// initialise the expansion first
			for(let key in fieldDefinition.fields){
				// get a list of nested definitions for type lookup
				const nestedKeys = baseNested ? Object.keys(baseNested) : [];
				const field = fieldDefinition.fields[key];
				if(staticFields.includes(field.type)){
					// for any static field, we are safe to just use the definition itself
					newDefintion[key] = field as CoreDefinition;
				}
				else{
					expansions.push(key); // the definition needs expanding
					// include the correct definition
					if(nestedKeys.includes(field.type)){
						expansionDefinitions.push(baseNested[field.type]);
					}
					else{
						if(!this.definition[field.type]) throw new Error("Non-existent field type " + field.type);
						expansionDefinitions.push(this.definition[field.type]);
					}
					newDefintion[key] = {
						type: "??",
						id: field.id,
						rule: field.rule
					}
				}
			}
			// we do much of the same as we did for initialising, just through a little bit of extra nonsense
			while(expansions.length > 0){
				let newExpansions: string[] = [];
				let newExpansionDefinitions: IndividualProtobufDefinition[] = [];
				for(let i = 0; i < expansions.length; i++){
					const expansion = expansions[i];
					const definition = expansionDefinitions[i];
					// handle enums first
					if(definition.values){
						_.set(newDefintion, expansion + ".type", "enum");
						_.set(newDefintion, expansion + ".values", definition.values);
					}
					else{
						// this must be a message type now
						_.set(newDefintion, expansion + ".type", "message");
						const fieldDescription: DescriptionObj = {};
						const nested = definition.nested;
						const nestedKeys = nested ? Object.keys(nested) : [];
						// since this is a message, fields must exist
						// what happens here is practically identical to what happened for the initial expansion
						for(let key in definition.fields){
							let field = definition.fields[key];
							if(staticFields.includes(field.type)){
								fieldDescription[key] = field as CoreDefinition;
							}
							else{
								newExpansions.push(expansion + ".fields." + key);
								if(nestedKeys.includes(field.type)){
									newExpansionDefinitions.push(nested[field.type]);
								}
								else{
									if(!this.definition[field.type]) throw new Error("Non-existent field type " + field.type);
									newExpansionDefinitions.push(this.definition[field.type]);
								}
								fieldDescription[key] = {
									type: "??",
									id: field.id,
									rule: field.rule
								};
							}
						}
						_.set(newDefintion, expansion + ".fields", fieldDescription);
					}
				}
				expansions = newExpansions;
				expansionDefinitions = newExpansionDefinitions;
			}
			// save definition for later use
			// don't save intermediate definitions to conserve memory
			this.loadedDefinitions[field] = newDefintion;
			const m = new MessagePBFField({}, {});
			m.from(newDefintion);
			return m;
		}
	}
}