import EnumPBFField from "../parsers/enum";

const codes = [
	{
		value: "Uzbekistan",
		code: 1
	},
	{
		value: "Kazakhstan",
		code: 2
	},
	{
		value: "Kyrgyzstan",
		code: 4
	},
	{
		value: "Tajikistan",
		code: 42
	}
];

describe("enum pbf fields", () => {
	test("value can be set", () => {
		const tester = new EnumPBFField({}, codes);
		tester.value = "Uzbekistan";
		expect(tester.value).toBe("Uzbekistan");
		tester.value = 4;
		expect(tester.value).toBe("Kyrgyzstan");
		const repeatedTester = new EnumPBFField({repeated: true}, codes);
		repeatedTester.value = "Uzbekistan";
		expect(repeatedTester.value).toEqual(["Uzbekistan"]);
		repeatedTester.value = ["Kyrgyzstan", "Tajikistan"];
		expect(repeatedTester.value).toEqual(["Kyrgyzstan", "Tajikistan"]);
	});
	test("value cannot be set to something wrong", () => {
		const tester = new EnumPBFField({}, codes);
		expect(() => tester.value = "Turkmenistan").toThrow();
		expect(() => tester.value = 3).toThrow();
		expect(() => tester.value = ["Turkmenistan"]).toThrow();
	});
	test("value can be returned to be prepared for json encoding", () => {
		const tester = new EnumPBFField({}, codes);
		expect(tester.toArray()).toBeUndefined();
		tester.value = "Tajikistan";
		expect(tester.toArray()).toEqual(42);
		const repeatedTester = new EnumPBFField({repeated: true}, codes);
		expect(repeatedTester.toArray()).toBeUndefined();
		repeatedTester.value = ["Tajikistan", "Uzbekistan"];
		expect(repeatedTester.toArray()).toEqual([42, 1]);
	});
	test("value can be toUrld", () => {
		const tester = new EnumPBFField({fieldNumber: 3}, codes);
		expect(tester.toUrl()).toEqual("");
		tester.value = "Kazakhstan";
		expect(tester.toUrl()).toEqual("!3e2");
		const tester2 = new EnumPBFField({fieldNumber: 3, delimiter: "&"}, codes);
		tester2.value = "Kazakhstan";
		expect(tester2.toUrl()).toEqual("&3e2");
		const repeatedTester = new EnumPBFField({repeated: true}, codes);
		repeatedTester.value = ["Tajikistan", "Uzbekistan"];
		expect(() => repeatedTester.toUrl()).toThrow();
	});
	test("urlencoding returns the value when field number is unset", () => {
		const tester = new EnumPBFField({}, codes);
		tester.value = "Uzbekistan";
		expect(tester.toUrl()).toEqual("1");
	});
	test("encoding throws when a field is required", () => {
		const tester = new EnumPBFField({fieldNumber: 3, required: true}, codes);
		expect(() => tester.toUrl()).toThrow();
		expect(() => tester.toArray()).toThrow();
		const repeatedTester = new EnumPBFField({repeated: true, fieldNumber: 3, required: true}, codes);
		expect(() => repeatedTester.toArray()).toThrow();
	});
	test("decoding works", () => {
		const tester = new EnumPBFField({fieldNumber: 3}, codes);
		tester.fromArray(2);
		expect(tester.value).toEqual("Kazakhstan");
		tester.fromUrl("4");
		expect(tester.value).toEqual("Kyrgyzstan");
		tester.fromUrl("!3e42");
		expect(tester.value).toEqual("Tajikistan");
		expect(() => tester.fromUrl("!3e3")).toThrow();
		expect(() => tester.fromUrl("!4e1")).toThrow();
		expect(() => tester.fromUrl("!3z1")).toThrow();
		expect(() => tester.fromArray([2, 4])).toThrow();
		const repeatedTester = new EnumPBFField({repeated: true}, codes);
		repeatedTester.fromArray([2, 4]);
		expect(repeatedTester.value).toEqual(["Kazakhstan", "Kyrgyzstan"]);
		expect(() => repeatedTester.fromUrl("!3e42")).toThrow();
	})
})