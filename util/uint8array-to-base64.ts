export default function uint8ArrayToBase64(array: Uint8Array, urlSafe?: boolean): string{
	// NOTE: using btoa isn't *great* practice since it requires converting text to strings
	// and it is only in ts as a legacy option
	// but for uint8arrays, it does not cause issues
	let letters = "";
	array.forEach(x => letters += String.fromCodePoint(x));
	const encoded = btoa(letters);
	return urlSafe ? encoded.replaceAll("+", "-").replaceAll("/","_").replace("=","") : encoded;
}