import StringPBFField from "../parsers/string";

describe("string pbf fields", () => {
	test("value can be set", () => {
		const tester = new StringPBFField();
		expect(tester.value).toBeUndefined();
		tester.value = "hello world";
		expect(tester.value).toEqual("hello world");
		const repeatedTester = new StringPBFField({repeated: true});
		expect(repeatedTester.value).toBeUndefined();
		expect(() => repeatedTester.value = "hello world").toThrow();
		repeatedTester.value = ["hello", "world"];
		expect(repeatedTester.value).toEqual(["hello", "world"]);
	});
	test("value is returned normally when used in jsons", ()  => {
		const tester = new StringPBFField();
		expect(tester.toArray()).toBeUndefined();
		tester.value = "hello world";
		expect(tester.toArray()).toEqual("hello world");
		const repeatedTester = new StringPBFField({repeated: true});
		repeatedTester.value = ["hello world"];
		expect(repeatedTester.toArray()).toEqual(["hello world"]);
	});
	test("value can be toUrld", () => {
		const tester = new StringPBFField({fieldNumber: 3});
		expect(tester.toUrl()).toEqual("");
		tester.value = "hello world";
		expect(tester.toUrl()).toEqual("!3shello%20world");
		expect(tester["_encodeValue"]()).toEqual("hello%20world");
		expect(tester["_encodeValue"]("ok world")).toEqual("ok%20world");
		tester.value = "hello!*world";
		expect(tester.toUrl()).toEqual("!3shello*21*2Aworld");
		const tester2 = new StringPBFField({fieldNumber: 3, delimiter: "&"});
		tester2.value = "hello world";
		expect(tester2.toUrl()).toEqual("&3shello%20world");
		const repeatedTester = new StringPBFField({repeated: true});
		repeatedTester.value = ["hello world"];
		expect(() => repeatedTester.toUrl()).toThrow();
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
	test("decoding works", () => {
		const tester = new StringPBFField({fieldNumber: 3});
		tester.fromArray("hello world");
		expect(tester.value).toEqual("hello world");
		tester.fromUrl("TajikistA*2An");
		expect(tester.value).toEqual("TajikistA*n");
		tester.fromUrl("!3sNICE");
		expect(tester.value).toEqual("NICE");
		tester.fromUrl("");
		expect(tester.isUndefined).toEqual(true);
		expect(() => tester.fromUrl("!4sBad")).toThrow();
		expect(() => tester.fromUrl("!3zuhoh")).toThrow();
		const repeatedTester = new StringPBFField({fieldNumber: 3, repeated: true});
		repeatedTester.fromArray(["hello world"]);
		expect(repeatedTester.value).toEqual(["hello world"]);
		repeatedTester.fromArray(["hello", "world"])
		expect(repeatedTester.value).toEqual(["hello", "world"]);
		expect(() => repeatedTester.fromUrl("!3sNICE")).toThrow()
	});
	test("helper functions that have not been tested yet", () => {
		const tester = new StringPBFField({fieldNumber: 3});
		expect(tester["_encodeValue"]()).toEqual("");
		expect(tester["_encodeValue"]("a")).toEqual("a");
		expect(tester["_decodeValue"]()).toEqual(undefined);
		expect(() => new StringPBFField({required: true}).validateValue()).toThrow();
		expect(() => new StringPBFField({required: true}).validateValue("a")).not.toThrow();
	})
});