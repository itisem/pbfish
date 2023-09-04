A parser for Google Maps' protobuf-like formats.

Currently does not implement the bytes dataformat (since I have not found a good use for doing so as of now, may change in the near future), or URLencoding for repeated fields (since there is no standard for it, and AFAIK, Google does not use it).