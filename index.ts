// re-exporting everything to have them accessible for anyone who needs the raw parsers for any reason
import MessagePBFField from "./parsers/message";

import type {ProtobufDefinition, ManyProtobufDefinitions} from "./parsers/message";

export default class ProtobufParser{
	protected definition: ManyProtobufDefinitions;

	constructor(definition: ProtobufDefinition | string){
		// assumes that all jsons are correct. if they are not, this will cause a ruckus later
		if(typeof definition === "string") this.definition = (JSON.parse(definition) as ProtobufDefinition).nested;
		else this.definition = definition.nested;
	}

	create(field: string): MessagePBFField{
		if(!Object.keys(this.definition).includes(field)){
			throw new Error("Non-existent field");
		}
		return new MessagePBFField({}, {
			parent: undefined,
			allDefinitions: this.definition,
			definition: this.definition[field]
		});
	}
}