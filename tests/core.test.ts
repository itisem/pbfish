import StringPBFField from "../parsers/string";

const parser = new StringPBFField();

describe("core functionality", () => {
	test("field numbers", () => {
		expect(parser["_fieldNumberIsLocked"]).toBe(true);
		parser.unlockFieldNumber();
		expect(parser["_fieldNumberIsLocked"]).toBe(false);
		parser.fieldNumber = 4;
		expect(parser.fieldNumber).toEqual(4);
		parser.lockFieldNumber();
		expect(() => parser.fieldNumber = 5).toThrow();
		expect(parser.fieldNumber).toEqual(4);
		expect(() => new StringPBFField({fieldNumber: 2.5})).toThrow();
		expect(() => new StringPBFField({fieldNumber: 0})).toThrow();
	});
	test("delimiters", () => {
		parser.delimiter = undefined;
		expect(parser.delimiter).toEqual("!");
		parser.delimiter = "A";
		expect(parser.delimiter).toEqual("A");
		expect(() => parser.delimiter = "abcd").toThrow();
		parser.delimiter = "";
		expect(parser.delimiter).toEqual("!");
	});
	test("validation", () => {
		expect(() => new StringPBFField({repeated: true}).validateValue("a")).toThrow();
		expect(() => new StringPBFField({repeated: false}).validateValue(["a"])).toThrow();
		expect(() => new StringPBFField({required: true}).validateValue(undefined)).toThrow();
		expect(() => new StringPBFField({required: true}).validateValue("")).not.toThrow();
	});
});