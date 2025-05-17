export const queryColors = {
  primary: [225, 29, 72, 180] as [number, number, number, number], // primary
  faded: [170, 170, 170, 60] as [number, number, number, number], // greyish
};

export const palette: [number, number, number, number][] = [
  [177, 89, 40, 200],
  [31, 120, 180, 200],
  [178, 223, 138, 200],
  [51, 160, 44, 200],
  [251, 154, 153, 200],
  [227, 26, 28, 200],
  [253, 191, 111, 200],
  [255, 127, 0, 200],
  [202, 178, 214, 200],
  [106, 61, 154, 200],
  [255, 255, 153, 200],
  [166, 206, 227, 200],
];

export const DECILE_COLORS: [number, number, number, number][] = [
  [0, 0, 4, 200],
  [24, 15, 61, 200],
  [68, 15, 118, 200],
  [114, 31, 129, 200],
  [158, 47, 127, 200],
  [205, 64, 113, 200],
  [241, 96, 93, 200],
  [253, 150, 104, 200],
  [254, 202, 141, 200],
  [252, 253, 191, 200],
];

//can be used to create more pallettes
// import { scaleQuantize } from "d3-scale";
// import { interpolateMagma } from "d3-scale-chromatic";
// import { rgb } from "d3-color";

// // 1) build your 10-step quantized scale
// const color = scaleQuantize<string>()
//   .domain([0, 100])
//   .range(Array.from({ length: 10 }, (_, i) => interpolateMagma(i / 9)));

// // 2) get the underlying hex strings:
// const hexRange: string[] = color.range();
// //    e.g. [ "#f7fbff", "#e1eff6", … , "#08306b" ]

// // 3) convert to [r,g,b] arrays:
// export const DECILE_COLORS: [number, number, number][] = hexRange.map((h) => {
//   const c = rgb(h);
//   return [c.r, c.g, c.b];
// });

// console.log(DECILE_COLORS);
