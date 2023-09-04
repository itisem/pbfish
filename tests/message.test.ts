import MessagePBFField from "../parsers/message";
import StringPBFField from "../parsers/string";
import DoublePBFField from "../parsers/double";
import EnumPBFField from "../parsers/enum";
import BoolPBFField from "../parsers/bool";
import type {PBFFieldOptions} from "../parsers/core";

class Employee extends MessagePBFField{
	constructor(options?: PBFFieldOptions){
		super(options ?? {}, {
			name: {
				factory: (opt: PBFFieldOptions) => new StringPBFField(opt),
				options: {
					fieldNumber: 1
				}
			},
			city: {
				factory: (opt: PBFFieldOptions) => new StringPBFField(opt),
				options: {
					fieldNumber: 2
				}
			},
			salary: {
				factory: (opt: PBFFieldOptions) => new DoublePBFField(opt),
				options: {
					fieldNumber: 4
				}
			},
			occupation: {
				factory: (opt: PBFFieldOptions) => new EnumPBFField(opt, [
					{code: 1, value: "web developer"},
					{code: 2, value: "dentist"},
					{code: 4, value: "waiter"}
				]),
				options: {
					fieldNumber: 5
				}
			}
		});
	}
}

class Task extends MessagePBFField{
	constructor(options?: PBFFieldOptions){
		super(options ?? {}, {
			title: {
				factory: (opt: PBFFieldOptions) => new StringPBFField(opt),
				options: {
					fieldNumber: 1
				}
			},
			employee: {
				factory: (opt: PBFFieldOptions) => new Employee(opt),
				options: {
					fieldNumber: 2
				}
			},
			difficult: {
				factory: (opt: PBFFieldOptions) => new BoolPBFField(opt),
				options: {
					fieldNumber: 3
				}
			}
		})
	}
}

describe("simple message pbf fields", () => {
	test("constructing pbf fields works", () => {
		const johnDescription = {
			name: "John",
			city: "N'Djamena",
			salary: 12345,
			occupation: "dentist"
		};
		const john = new Employee();
		john.value = johnDescription;
		expect(john.value).toEqual(johnDescription);
	})
})
