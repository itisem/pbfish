import MessagePBFField from "../parsers/message";
import StringPBFField from "../parsers/string";
import DoublePBFField from "../parsers/double";
import EnumPBFField from "../parsers/enum";
import BoolPBFField from "../parsers/bool";

const occupationCodes = [
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
];
const name = new StringPBFField();
const city = new StringPBFField();
const salary = new DoublePBFField();
const occupation = new EnumPBFField({codes: occupationCodes});
name.fieldNumber = 1;
city.fieldNumber = 2;
salary.fieldNumber = 4;
occupation.fieldNumber = 5;
const employee = new MessagePBFField({}, {name, city, salary, occupation});
const description = new StringPBFField();
description.fieldNumber = 1;
const difficult = new BoolPBFField();
difficult.fieldNumber = 2;
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
};

describe("simple message pbf fields", () => {
	test("setting values", () => {
		employee.value = baseEmployee;
		expect(employee.value).toEqual(baseEmployee);
	});
	test("encoding works", () => {
		const employeeArray = ["Alice Bob Citizen", "N'Djamena", undefined, 123456, 4];
		const employeeString = "!1sAlice%20Bob%20Citizen!2sN'Djamena!4d123456!5e4";
		expect(employee.toArray()).toEqual(employeeArray);
		expect(employee.toUrl()).toEqual(employeeString);
	});
});

describe("multi-layered message pbf fields", () => {
	test("everything keeps working", () => {
		employee.fieldNumber = 3;
		const task = new MessagePBFField({}, {description, difficult, employee});
		task.value = baseTask;
		expect(task.value).toEqual(baseTask);
		city.value = undefined;
		const employeeArray = ["Alice Bob Citizen", undefined, undefined, 123456, 4];
		const employeeString = "!1sAlice%20Bob%20Citizen!4d123456!5e4";
		expect(task.toArray()).toEqual(["become president", true, employeeArray]);
		expect(task.toUrl()).toEqual("!1sbecome%20president!2btrue!3m3" + employeeString);
	});
});

describe("url decoding", () => {
	test("url decoding works", () => {
		const title = new StringPBFField();
		const author = new StringPBFField();
		const index = new DoublePBFField();
		title.fieldNumber = 1;
		author.fieldNumber = 2;
		index.fieldNumber = 3;
		const book = new MessagePBFField({}, {title, author, index});
		const lender = new StringPBFField();
		book.fieldNumber = 3;
		lender.fieldNumber = 1;
		const transaction = new MessagePBFField({}, {lender, book});
		transaction.fromUrl("!1sJohnny!3m3!1sAlice!2sRobert!3d100");
		console.log(transaction);
		expect(1).toEqual(1);
	});
});