import StringPBFField from "../parsers/string";
import Base64StringPBFField from "../parsers/base64-string";

describe("string pbf fields", () => {
	test("value can be set", () => {
		const tester = new StringPBFField();
		expect(tester.value).toBeUndefined();
		tester.value = "hello world";
		expect(tester.value).toEqual("hello world");
	});
	test("value is returned normally when used in jsons", ()  => {
		const tester = new StringPBFField();
		expect(tester.toArray()).toBeUndefined();
		tester.value = "hello world";
		expect(tester.toArray()).toEqual("hello world");
		const tester2 = new Base64StringPBFField();
		expect(tester2.toArray()).toBeUndefined();
		tester2.value = "hello world";
		expect(tester2.toArray()).toEqual("hello world");
	});
	test("value can be toUrld", () => {
		const tester = new StringPBFField({fieldNumber: 3});
		expect(tester.toUrl()).toEqual("");
		tester.value = "hello world";
		expect(tester.toUrl()).toEqual("!3shello%20world");
		tester.value = "hello!*world";
		expect(tester.toUrl()).toEqual("!3shello*21*2Aworld");
		const tester2 = new StringPBFField({fieldNumber: 3, delimiter: "&"});
		tester2.value = "hello world";
		expect(tester2.toUrl()).toEqual("&3shello%20world");
		const tester3 = new Base64StringPBFField({fieldNumber: 3});
		tester3.value = "hello world";
		expect(tester3.toUrl()).toEqual("!3zaGVsbG8gd29ybGQ")
	});
	test("urlencoding returns the value when field number is unset", () => {
		const tester = new StringPBFField();
		tester.value = "hi";
		expect(tester.toUrl()).toEqual("hi");
	});
	test("encoding throws when a field is required", () => {
		const tester = new StringPBFField({fieldNumber: 3, required: true});
		expect(() => tester.toUrl()).toThrow();
		expect(() => tester.toArray()).toThrow();
	});
});