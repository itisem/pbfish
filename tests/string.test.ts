import StringPBFField from "../parsers/string";

describe("string pbf fields", () => {
	test("value can be set", () => {
		const tester = new StringPBFField();
		expect(tester.value).toBeUndefined();
		tester.value = "hello world";
		expect(tester.value).toEqual("hello world");
	});
	test("value is returned normally when used in jsons", ()  => {
		const tester = new StringPBFField();
		expect(tester.jsonEncode()).toEqual(null);
		tester.value = "hello world";
		expect(tester.jsonEncode()).toEqual("hello world");
	});
	test("value can be urlencoded", () => {
		const tester = new StringPBFField({fieldNumber: 3});
		expect(tester.urlEncode()).toEqual("");
		tester.value = "hello world";
		expect(tester.urlEncode()).toEqual("!3shello%20world");
		tester.value = "hello!*world";
		expect(tester.urlEncode()).toEqual("!3shello*21*2Aworld");
		const tester2 = new StringPBFField({fieldNumber: 3, delimiter: "&"});
		tester2.value = "hello world";
		expect(tester2.urlEncode()).toEqual("&3shello%20world");
	});
	test("urlencoding throws when field number is unset", () => {
		const tester = new StringPBFField();
		expect(() => tester.urlEncode()).toThrow();
	});
	test("encoding throws when a field is required", () => {
		const tester = new StringPBFField({fieldNumber: 3, required: true});
		expect(() => tester.urlEncode()).toThrow();
	});
});