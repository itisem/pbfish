# pbfish 🐟

A simple, zero-dependency module for handling Google Maps' loosely protobuf-inspired data formats. This module can handle the following two encodings:

 * urlencoded protobuf, as seen in many Google Maps urls, i.e. [in this link](https://www.google.com/maps/@53.2115687,6.566413,3a,75y,255.84h,90t/data=!3m7!1e1!3m5!1sJ1lsIa1AUTItTwcisKl26Q!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fpanoid%3DJ1lsIa1AUTItTwcisKl26Q%26cb_client%3Dmaps_sv.tactile.gps%26w%3D203%26h%3D100%26yaw%3D247.16174%26pitch%3D0%26thumbfov%3D100!7i16384!8i8192) the entire part after `data=`
 * JSON-encoded protobuf, as seen in many internal Google Maps endpoints (such as SingleImageSearch), aka pretty much anything with a `application/json+protobuf` content-type.

## Usage

This tool was built around JSON representations of protobuf definitions. In case you have a `.proto` file, you must first convert it to a JSON definition using [protobufjs-cli](https://www.npmjs.com/package/protobufjs-cli).

Once you have a JSON definition, you can do something like this:

```js
import pbfish from "@gmaps-re/pbfish";
const parser = new pbfish(yourJSONDefinition);
const currentLocation = parser.create("Location"); // loads the protobuf definition called Location from your json
```

You can then use the following methods to parse and manipulate data:
```js
currentLocation.value = {lat: 53.21034178655471, lng: 6.564304111160638, notes: {country: "nl", subdivision: "groningen"}} // loads in a value to the the parser
currentLocation.toUrl(); // exports a value as a url-encoded protobuf format
currentLocation.toArray(); // exports value as a json-encoded protobuf format
currentLocation.fromUrl("!1d53.21034178655471!2d6.564304111160638!3m2!1snl!2sgroningen"); // loads a value from a url-encoded format
currentLocation.fromArray(parsedJSON); // loads a value from a json-encoded protobuf format (decoded into an array)
```

## Limitations

For any project that does not involve Google Maps, you will usually get better results if you use a standard protobuf format, rather than these alternative encodings. If you wish to do so, I recommend the [pbf](https://www.npmjs.com/package/pbf) module.

This parser also does not implement the full scope of protobuf as it only includes features which are useful in my usecases. Currently missing features:

 * `oneof` keywords
 * `bytes` datatype
 * urlencoding `repeated` fields (not sure if this is even allowed by Google Maps)