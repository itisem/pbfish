import type {SimplePBFField} from "../parsers/core";

import DoublePBFField from "../parsers/double";
import Fixed32PBFField from "../parsers/fixed32";
import Fixed64PBFField from "../parsers/fixed64";
import FloatPBFField from "../parsers/float";
import Int32PBFField from "../parsers/int32";
import Int64PBFField from "../parsers/int64";
import SFixed32PBFField from "../parsers/sfixed32";
import SFixed64PBFField from "../parsers/sfixed64";
import SInt32PBFField from "../parsers/sint32";
import SInt64PBFField from "../parsers/sint64";
import UInt32PBFField from "../parsers/uint32";
import UInt64PBFField from "../parsers/uint64";

function encodingTestValid(instance: SimplePBFField<number>){
	instance.value = 100;
	return instance.toUrl();
}

describe("numeric fields", () => {
	test("can set the value", () => {
		const tester = new DoublePBFField();
		tester.value = 2;
		expect(tester.value).toEqual(2);
	});
	test("value is returned normally in jsons", () => {
		const tester = new UInt64PBFField();
		tester.value = 10;
		expect(tester.toArray()).toEqual(10);
	});
	test("value can be toUrld", () => {
		const options = {fieldNumber: 9};
		const tester = new DoublePBFField(options);
		expect(tester.toUrl()).toEqual("");
		expect(encodingTestValid(new DoublePBFField(options))).toEqual("!9d100");
		expect(encodingTestValid(new Fixed32PBFField(options))).toEqual("!9x100");
		expect(encodingTestValid(new Fixed64PBFField(options))).toEqual("!9y100");
		expect(encodingTestValid(new FloatPBFField(options))).toEqual("!9f100");
		expect(encodingTestValid(new Int32PBFField(options))).toEqual("!9i100");
		expect(encodingTestValid(new Int64PBFField(options))).toEqual("!9j100");
		expect(encodingTestValid(new SFixed32PBFField(options))).toEqual("!9g100");
		expect(encodingTestValid(new SFixed64PBFField(options))).toEqual("!9h100");
		expect(encodingTestValid(new SInt32PBFField(options))).toEqual("!9n100");
		expect(encodingTestValid(new SInt64PBFField(options))).toEqual("!9o100");
		expect(encodingTestValid(new UInt32PBFField(options))).toEqual("!9u100");
		expect(encodingTestValid(new UInt64PBFField(options))).toEqual("!9v100");
	});
	test("urlencoding returns the value", () => {
		expect(new DoublePBFField().toUrl()).toEqual("");
		expect(new Fixed32PBFField().toUrl()).toEqual("");
		expect(new Fixed64PBFField().toUrl()).toEqual("");
		expect(new FloatPBFField().toUrl()).toEqual("");
		expect(new Int32PBFField().toUrl()).toEqual("");
		expect(new Int64PBFField().toUrl()).toEqual("");
		expect(new SFixed32PBFField().toUrl()).toEqual("");
		expect(new SFixed64PBFField().toUrl()).toEqual("");
		expect(new SInt32PBFField().toUrl()).toEqual("");
		expect(new SInt64PBFField().toUrl()).toEqual("");
		expect(new UInt32PBFField().toUrl()).toEqual("");
		expect(new UInt64PBFField().toUrl()).toEqual("");
	});
	test("encoding throws when a field is required", () => {
		const tester = new DoublePBFField({fieldNumber: 9, required: true});
		expect(() => tester.toUrl()).toThrow();
		expect(() => tester.toArray()).toThrow();
	});
	test("decoding works", () => {
		const tester = new DoublePBFField({fieldNumber: 9});
		tester.fromArray(10);
		expect(tester.value).toEqual(10);
		tester.fromUrl("11");
		expect(tester.value).toEqual(11);
		tester.fromUrl("!9d12");
		expect(tester.value).toEqual(12);
		expect(() => tester.fromUrl("!8d13")).toThrow();
		expect(() => tester.fromUrl("!9c14")).toThrow();
	});
});