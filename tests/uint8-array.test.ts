import uint8ArrayToBase64 from "../util/uint8array-to-base64";
import base64ToUint8Array from "../util/base64-to-uint8array";

describe("uint8ArrayToBase64", () => {
	test("converts correctly", () => {
		expect(
			uint8ArrayToBase64(new Uint8Array([72, 101, 108, 108, 111]))
		).toEqual("SGVsbG8=");
	});
});

describe("base64ToUint8Array", () => {
	test("converts correctly", () => {
		expect(
			base64ToUint8Array("SGVsbG8=")
		).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
	});
});