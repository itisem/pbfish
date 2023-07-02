import MessagePBFField from "../parsers/message";
import StringPBFField from "../parsers/string";
import DoublePBFField from "../parsers/double";
import EnumPBFField from "../parsers/enum";
import BoolPBFField from "../parsers/bool";

const name = new StringPBFField();
const city = new StringPBFField();
const salary = new DoublePBFField();
const occupation = new EnumPBFField({
	codes: [
		{
			code: 1,
			value: "web developer"
		},
		{
			code: 2,
			value: "dentist"
		},
		{
			code: 4,
			value: "waiter"
		}
	]
});
name.fieldNumber = 1;
city.fieldNumber = 2;
salary.fieldNumber = 4;
occupation.fieldNumber = 5;
const employee = new MessagePBFField({}, {name, city, salary, occupation});
const description = new StringPBFField();
description.fieldNumber = 1;
const difficult = new BoolPBFField();
difficult.fieldNumber = 2;
const task = new MessagePBFField({}, {description, difficult, employee});
const baseEmployee = {
	name: "Alice Bob Citizen",
	city: "N'Djamena",
	salary: 123456,
	occupation: "waiter"
};
const baseTask = {
	description: "become president",
	difficult: true,
	employee: baseEmployee
}

describe("message pbf fields", () => {
	test("setting values", () => {
		employee.value = baseEmployee;
		expect(employee.value).toEqual(baseEmployee);
		task.value = baseTask;
		expect(task.value).toEqual(baseTask);
	});
	test("encoding does not work when a field number is unset", () => {
		expect(() => task.arrayEncode()).toThrow();
		expect(() => task.urlEncode()).toThrow();
	});
	test("encoding works", () => {
		const employeeArray = ["Alice Bob Citizen", "N'Djamena", undefined, 123456, 4];
		const employeeString = "!1sAlice%20Bob%20Citizen!2sN'Djamena!4d123456!5e4";
		expect(employee.arrayEncode()).toEqual(employeeArray);
		expect(employee.urlEncode()).toEqual(employeeString);
		employee.fieldNumber = 3;
		expect(task.arrayEncode()).toEqual(["become president", true, employeeArray]);
		expect(task.urlEncode()).toEqual("!1sbecome%20president!2btrue!3m4" + employeeString);
	});
	test("encoding fails when a field number is duplicate", () => {
		city.fieldNumber = 1;
		expect(() => employee.arrayEncode()).toThrow();
		expect(() => employee.urlEncode()).toThrow();
		expect(() => task.arrayEncode()).toThrow();
		expect(() => task.urlEncode()).toThrow();
	});
	test("undefined values work unless required", () => {
		city.fieldNumber = 2;
		city.value = undefined;
		const employeeArray = ["Alice Bob Citizen", undefined, undefined, 123456, 4];
		const employeeString = "!1sAlice%20Bob%20Citizen!4d123456!5e4";
		expect(task.arrayEncode()).toEqual(["become president", true, employeeArray]);
		expect(task.urlEncode()).toEqual("!1sbecome%20president!2btrue!3m3" + employeeString);
	});
});