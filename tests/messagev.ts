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

const employeeBaseDescription = {
	name: "John",
	city: "N'Djamena",
	salary: 12345,
	occupation: "dentist"
};
const employeeDescription = {...employeeBaseDescription, occupation: "dentist"};
const employeeEnumDescription = {...employeeBaseDescription, occupation: 2};
const employeeInvalidDescription = {...employeeBaseDescription, occupation: 3};
const employeeArray = ["John", "N'Djamena", undefined, 12345, 2];
const employeeUrl = "!1sJohn!2sN'Djamena!4d12345!5e2";

const taskBaseDescription = {
	title: "Become president",
	difficult: true
}
const taskDescription = {...taskBaseDescription, employee: employeeDescription};
const taskInvalidDescription = {...taskBaseDescription, employee: employeeInvalidDescription};
const taskArray = ["Become president", employeeArray, true];
const taskUrl = "!1sBecome%20president!2m4!1sJohn!2sN'Djamena!4d12345!5e2!3btrue";

describe("simple message pbf fields", () => {
	test("pbf fields works", () => {	
		const john = new Employee();
		john.value = employeeDescription;
		expect(john.value).toEqual(employeeDescription);
		const johnTheSecond = new Employee();
		johnTheSecond.value = employeeEnumDescription;
		expect(johnTheSecond.value).toEqual(employeeDescription);
		expect(() => john.value = employeeInvalidDescription).toThrow();
		const presidency = new Task();
		presidency.value = taskDescription;
		expect(presidency.value).toEqual(taskDescription);
		expect(() => presidency.value = taskInvalidDescription).toThrow();
	});

	test("loading from arrays works", () => {
		const john = new Employee();
		john.fromArray(employeeArray);
		expect(john.value).toEqual(employeeDescription);
		const presidency = new Task();
		presidency.fromArray(taskArray);
		expect(presidency.value).toEqual(taskDescription);
	});

	test("loading from urls works", () => {
		const john = new Employee();
		john.fromUrl(employeeUrl);
		expect(john.value).toEqual(employeeDescription);
		const presidency = new Task();
		presidency.fromUrl(taskUrl);
		expect(presidency.value).toEqual(taskDescription);
	});

	test("saving to arrays works", () => {
		const john = new Employee();
		john.value = employeeDescription;
		expect(john.toArray()).toEqual(employeeArray);
		const presidency = new Task();
		presidency.value = taskDescription;
		expect(presidency.toArray()).toEqual(taskArray);
	});

	test("saving to urls works", () => {
		const john = new Employee();
		john.value = employeeDescription;
		expect(john.toUrl()).toEqual(employeeUrl);
		const presidency = new Task();
		presidency.value = taskDescription;
		expect(presidency.toUrl()).toEqual(taskUrl);
	});
});

describe("loading from definitions", () => {
	test("loading from a definition works", () => {
		const presidency = new MessagePBFField({}, {});
		presidency.from({
			title: {
				type: "string",
				id: 1
			},
			employee: {
				type: "Employee",
				id: 2,
				fields: {
					name: {
						type: "string",
						id: 1
					},
					city: {
						type: "string",
						id: 2
					},
					salary: {
						type: "double",
						id: 4
					},
					occupation: {
						type: "Occupation",
						id: 5,
						values: {
							"web developer": 1,
							"dentist": 2,
							"waiter": 4
						}
					}
				}
			},
			difficult: {
				type: "bool",
				id: 3
			}
		});
		presidency.value = taskDescription;
		expect(presidency.toUrl()).toEqual(taskUrl);
	})
})