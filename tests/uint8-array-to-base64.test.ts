import uint8ArrayToBase64 from "../util/uint8array-to-base64";

describe("uint8ArrayToBase64", () => {
	test("converts correctly", () => {
		expect(
			uint8ArrayToBase64(new Uint8Array([72, 101, 108, 108, 111]))
		).toEqual("SGVsbG8=");
	});
})