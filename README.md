# pbfish 🐟

A simple, zero-dependency module for handling Google Maps' / GRPC's loosely protobuf-inspired data formats. This module can handle the following two encodings:

 * urlencoded protobuf, as seen in many Google Maps urls, i.e. [in this link](https://www.google.com/maps/@53.2115687,6.566413,3a,75y,255.84h,90t/data=!3m7!1e1!3m5!1sJ1lsIa1AUTItTwcisKl26Q!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fpanoid%3DJ1lsIa1AUTItTwcisKl26Q%26cb_client%3Dmaps_sv.tactile.gps%26w%3D203%26h%3D100%26yaw%3D247.16174%26pitch%3D0%26thumbfov%3D100!7i16384!8i8192) the entire part after `data=`
 * JSON-encoded protobuf, as seen in many internal Google GRPC endpoints (such as SingleImageSearch), usually with a `application/json+protobuf` content-type.

## Usage

You can install this package by typing `npm i @gmaps-tools/pbfish`

This tool was built around JSON representations of protobuf definitions. In case you have a `.proto` file, you must first convert it to a JSON definition using [protobufjs-cli](https://www.npmjs.com/package/protobufjs-cli).

Once you have obtained a JSON definition, you can do something like this:

```ts
import pbfish from "@gmaps-tools/pbfish";
const parser = new pbfish(yourDefinition);
const currentLocation = parser.create("Location"); // loads the protobuf definition called Location from your json
```

You can then use the following methods to parse and manipulate data:
```ts
currentLocation.value = {lat: 53.210, lng: 6.564, notes: {country: "nl", subdivision: "groningen"}} // loads in a value to the the parser
// note: if you set value again, only the affected fields will change
// i.e. currentLocation.value = {lat: 0, lng: 1} will not affect notes

currentLocation.toUrl(); // exports a value as a url-encoded protobuf format
currentLocation.toJSON(); // exports value as a json-encoded protobuf format (stringified)
currentLocation.toArray(); // exports value as an array-encoded protobuf format (i.e. JSON-encoding before stringify)
currentLocation.fromUrl("!1d53.21034178655471!2d6.564304111160638!3m2!1snl!2sgroningen"); // loads a value from a url-encoded format
currentLocation.fromJSON('[53.21034178655471,6.56430411111160638,null,["nl", "groningen"]]'); // loads a value from a json-encoded protobuf format
currentLocation.fromArray([53.21034178655471,6.56430411111160638,undefined,["nl", "groningen"]]); // loads a value from a json-encoded protobuf format (post-JSON.parse())
```

For enums, you can use either their numerical value or literal text value, i.e. if you have an enum defined as
```json
"ImageFrontendType": {
	"values": {
		"OFFICIAL": 2,
		"UNKNOWN": 3,
		"USER_UPLOADED": 10
	}
}
```
, you can set its value to be either `2` or the string `"OFFICIAL"`.

You can also access the entire data by using `.value`, i.e.
```js
currentLocation.value // returns the entire value of the data, i.e. {lat: 53.210, lng: 6.564, notes: {country: "nl", subdivision: "groningen"}}
```

Specific data points can be accessed (but not set!) with dot accessors, i.e.
```js
currentLocation.notes // returns {country: "nl", subdivision: "groningen"}
currentLocation.notes.country // returns "nl"
```

As of now, reverse engineered protobuf definitions are not currently available - I am working on releasing the definitions for Google Maps specifically, but not for other internal Google endpoints.

## Limitations

As a general rule of thumb, you should probably prefer encoding data directly as protobufs, rather than the URL-encoded and JSON-encoded formats that this library provides. In particular, directly encoding files as protobuf will result in a much smaller filesize than JSON-encoded or URL encoded protobuf, and the binary nature of those formats will also enable faster encoding/decoding (according to my tests, the [`pbf` module](https://www.npmjs.com/package/pbf) has a 3.5x higher throughput than `pbfish`).

That said, if, for some reason, you absolutely require using these alternate JSON/URL encodings, I do believe that pbfish is the fastest option. For the most part, "absolutely require" usually means that you have to interact with Google Maps or other, similar GRPC-based API endpoints, although there may be other cases too!

## Licence

`pbfish` is released under the [MIT licence](https://mit-license.org/). For more information, see the [LICENSE file](https://github.com/itisem/pbfish/blob/main/LICENSE) on Github.

## Contributing

You are more than welcome to open up an issue if you find a bug or a missing feature, or a pull request if you have a patch for something. The usual guidelines apply - don't make big changes without consulting me (@itisem) first, and treat everyone with kindness.