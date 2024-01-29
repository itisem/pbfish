export default function base64ToUint8Array(text: string, urlSafe?: boolean){
	// atob can handle no ending =, so we don't do that
	text = urlSafe ? text.replaceAll("-", "+").replaceAll("_","/") : text;
	return Uint8Array.from(atob(text), x => x.charCodeAt(0));
}