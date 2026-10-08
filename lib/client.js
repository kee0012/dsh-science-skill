window.__ModuleLoader__.load({ id: "dsh-science-skill", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");

//#region src/client/icon-paths.ts
/**
* Inline Lucide path data (24×24 grid) for every category icon this build can
* draw. Inlined rather than depended on: client packages take no third-party
* icon dependency, so the rail stays offline and self-contained.
*/
const CATEGORY_ICON_PATHS = {
	"book-open": "<path d=\"M12 7v14\"/><path d=\"M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z\"/>",
	"library": "<path d=\"m16 6 4 14\"/><path d=\"M12 6v14\"/><path d=\"M8 8v12\"/><path d=\"M4 4v16\"/>",
	"file-text": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 9H8\"/><path d=\"M16 13H8\"/><path d=\"M16 17H8\"/>",
	"files": "<path d=\"M20 7h-3a2 2 0 0 1-2-2V2\"/><path d=\"M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z\"/><path d=\"M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8\"/>",
	"notebook-pen": "<path d=\"M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4\"/><path d=\"M2 6h4\"/><path d=\"M2 10h4\"/><path d=\"M2 14h4\"/><path d=\"M2 18h4\"/><path d=\"M21.4 2.6a2 2 0 0 0-2.8 0l-7 7L11 13l3.4-.6 7-7a2 2 0 0 0 0-2.8z\"/>",
	"pen-line": "<path d=\"M12 20h9\"/><path d=\"M16.4 3.6a2 2 0 0 1 2.8 2.8L7.5 18.1a2 2 0 0 1-.9.5l-3.2.8.8-3.2a2 2 0 0 1 .5-.9z\"/>",
	"pencil-ruler": "<path d=\"M13 7 8.7 2.7a2.4 2.4 0 0 0-3.4 0L2.7 5.3a2.4 2.4 0 0 0 0 3.4L7 13\"/><path d=\"m8 6 2-2\"/><path d=\"m18 16 2-2\"/><path d=\"m17 11 4.3 4.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L11 17\"/><path d=\"M21.2 7.8 7.8 21.2a1 1 0 0 1-1.4 0l-3.6-3.6a1 1 0 0 1 0-1.4L16.2 2.8a1 1 0 0 1 1.4 0l3.6 3.6a1 1 0 0 1 0 1.4z\"/>",
	"highlighter": "<path d=\"m9 11-6 6v3h9l3-3\"/><path d=\"m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4\"/>",
	"quote": "<path d=\"M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3\"/><path d=\"M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3\"/>",
	"languages": "<path d=\"m5 8 6 6\"/><path d=\"m4 14 6-6 2-3\"/><path d=\"M2 5h12\"/><path d=\"M7 2h1\"/><path d=\"m22 22-5-10-5 10\"/><path d=\"M14 18h6\"/>",
	"type": "<path d=\"M4 7V4h16v3\"/><path d=\"M9 20h6\"/><path d=\"M12 4v16\"/>",
	"lightbulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>",
	"flask-conical": "<path d=\"M14 2v6a2 2 0 0 0 .2.9l4.6 9.3A2 2 0 0 1 17 21H7a2 2 0 0 1-1.8-2.8l4.6-9.3A2 2 0 0 0 10 8V2\"/><path d=\"M6.5 15h11\"/><path d=\"M8.5 2h7\"/>",
	"flask-round": "<path d=\"M10 2v6.3a1 1 0 0 1-.2.6L5 17a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-4.8-8.1a1 1 0 0 1-.2-.6V2\"/><path d=\"M8.5 2h7\"/><path d=\"M7 16h10\"/>",
	"test-tube": "<path d=\"M14.5 2v17.5a2.5 2.5 0 0 1-5 0V2\"/><path d=\"M14.5 16h-5\"/><path d=\"M8.5 2h6\"/>",
	"test-tubes": "<path d=\"M9 2v17.5A2.5 2.5 0 0 1 6.5 22 2.5 2.5 0 0 1 4 19.5V2\"/><path d=\"M16 2v17.5a2.5 2.5 0 0 1-5 0\"/><path d=\"M14 2v12h4V2\"/><path d=\"M3 2h7\"/><path d=\"M14 2h6\"/>",
	"microscope": "<path d=\"M6 18h8\"/><path d=\"M3 22h18\"/><path d=\"M14 22a7 7 0 1 0 0-14h-1\"/><path d=\"M9 14h2\"/><path d=\"M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z\"/><path d=\"M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3\"/>",
	"dna": "<path d=\"m10 16 1.5 1.5\"/><path d=\"m14 8-1.5-1.5\"/><path d=\"M15 2c-1.8 1.8-2.5 3.5-2.5 5.5 0 4.5 4 6.5 4 11 0 2-.7 3.7-2.5 5.5\"/><path d=\"M9 22c1.8-1.8 2.5-3.5 2.5-5.5 0-4.5-4-6.5-4-11C7.5 3.5 8.2 1.8 10 0\"/>",
	"atom": "<circle cx=\"12\" cy=\"12\" r=\"1\"/><path d=\"M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z\"/><path d=\"M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z\"/>",
	"pill": "<path d=\"m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z\"/><path d=\"m8.5 8.5 7 7\"/>",
	"heart-pulse": "<path d=\"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z\"/><path d=\"M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27\"/>",
	"brain": "<path d=\"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z\"/><path d=\"M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z\"/><path d=\"M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4\"/><path d=\"M17.599 6.5a3 3 0 0 0 .399-1.375\"/><path d=\"M6.003 5.125A3 3 0 0 0 6.401 6.5\"/><path d=\"M3.477 10.896a4 4 0 0 1 .585-.396\"/><path d=\"M19.938 10.5a4 4 0 0 1 .585.396\"/><path d=\"M6 18a4 4 0 0 1-1.967-.516\"/><path d=\"M19.967 17.484A4 4 0 0 1 18 18\"/>",
	"activity": "<path d=\"M22 12h-4l-3 9L9 3l-3 9H2\"/>",
	"chart-column": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>",
	"chart-line": "<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"m19 9-5 5-4-4-3 3\"/>",
	"chart-scatter": "<circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"18.5\" cy=\"5.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"11.5\" cy=\"11.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"7.5\" cy=\"16.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"14.5\" r=\".5\" fill=\"currentColor\"/><path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/>",
	"pie-chart": "<path d=\"M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z\"/><path d=\"M21.21 15.89A10 10 0 1 1 8 2.83\"/>",
	"table": "<path d=\"M12 3v18\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M3 9h18\"/><path d=\"M3 15h18\"/>",
	"database": "<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/>",
	"sigma": "<path d=\"M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2\"/>",
	"square-function": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><path d=\"M9 17c2 0 2.8-1 2.8-2.8V10c0-2 1-3.3 3.2-3\"/><path d=\"M9 11.2h5.7\"/>",
	"image": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/><circle cx=\"9\" cy=\"9\" r=\"2\"/><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"/>",
	"shapes": "<path d=\"M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><circle cx=\"17.5\" cy=\"17.5\" r=\"3.5\"/>",
	"layout-grid": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\"/><rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\"/>",
	"palette": "<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\"/><circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\"/><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>",
	"monitor": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"/><line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"/><line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"/>",
	"presentation": "<path d=\"M2 3h20\"/><path d=\"M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3\"/><path d=\"m7 21 5-5 5 5\"/>",
	"mic": "<path d=\"M12 19v3\"/><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"/><rect x=\"9\" y=\"2\" width=\"6\" height=\"13\" rx=\"3\"/>",
	"star": "<path d=\"M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z\"/>",
	"tag": "<path d=\"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>",
	"folder": "<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"/>",
	"folder-tree": "<path d=\"M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z\"/><path d=\"M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 14h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z\"/><path d=\"M3 5a1 1 0 0 0 1 1h2\"/><path d=\"M3 5v14a1 1 0 0 0 1 1h5\"/><path d=\"M6 5v14\"/>",
	"archive": "<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8\"/><path d=\"M10 12h4\"/>",
	"package": "<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><polyline points=\"3.29 7 12 12 20.71 7\"/><path d=\"m7.5 4.27 9 5.15\"/>",
	"package-open": "<path d=\"M12 22v-9\"/><path d=\"M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z\"/><path d=\"M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13\"/><path d=\"M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z\"/>",
	"globe": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>",
	"leaf": "<path d=\"M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z\"/><path d=\"M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12\"/>",
	"rocket": "<path d=\"M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z\"/><path d=\"m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z\"/><path d=\"M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0\"/><path d=\"M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5\"/>",
	"target": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"12\" r=\"6\"/><circle cx=\"12\" cy=\"12\" r=\"2\"/>",
	"scale": "<path d=\"m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"/><path d=\"m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z\"/><path d=\"M7 21h10\"/><path d=\"M12 3v18\"/><path d=\"M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2\"/>",
	"medal": "<path d=\"M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15\"/><path d=\"M11 12 5.12 2.2\"/><path d=\"m13 12 5.88-9.8\"/><path d=\"M8 7h8\"/><circle cx=\"12\" cy=\"17\" r=\"5\"/><path d=\"M12 18v-2h-.5\"/>",
	"award": "<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\"/><circle cx=\"12\" cy=\"8\" r=\"6\"/>",
	"badge-check": "<path d=\"M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z\"/><path d=\"m9 12 2 2 4-4\"/>",
	"clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/><path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/><path d=\"M12 11h4\"/><path d=\"M12 16h4\"/><path d=\"M8 11h.01\"/><path d=\"M8 16h.01\"/>",
	"receipt": "<path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z\"/><path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\"/><path d=\"M12 17.5v-11\"/>",
	"code": "<path d=\"m16 18 6-6-6-6\"/><path d=\"m8 6-6 6 6 6\"/>",
	"terminal": "<polyline points=\"4 17 10 11 4 5\"/><line x1=\"12\" x2=\"20\" y1=\"19\" y2=\"19\"/>",
	"wrench": "<path d=\"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z\"/>",
	"wand-sparkles": "<path d=\"m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72\"/><path d=\"m14 7 3 3\"/><path d=\"M5 6v4\"/><path d=\"M19 14v4\"/><path d=\"M10 2v2\"/><path d=\"M7 8H3\"/><path d=\"M21 16h-4\"/><path d=\"M11 3H9\"/>",
	"search": "<circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"m21 21-4.3-4.3\"/>",
	"pin": "<path d=\"M12 17v5\"/><path d=\"M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z\"/>",
	"puzzle": "<path d=\"M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z\"/>",
	"folder-open": "<path d=\"m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2\"/>",
	"coins": "<circle cx=\"8\" cy=\"8\" r=\"6\"/><path d=\"M18.09 10.37A6 6 0 1 1 10.34 18\"/><path d=\"M7 6h1v4\"/><path d=\"m16.71 13.88.7.71-2.82 2.82\"/>",
	"file-spreadsheet": "<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M8 13h2\"/><path d=\"M14 13h2\"/><path d=\"M8 17h2\"/><path d=\"M14 17h2\"/>",
	"chart-no-axes-column": "<line x1=\"18\" x2=\"18\" y1=\"20\" y2=\"10\"/><line x1=\"12\" x2=\"12\" y1=\"20\" y2=\"4\"/><line x1=\"6\" x2=\"6\" y1=\"20\" y2=\"14\"/>"
};
/** Icon names offered in the category icon picker, in display order. */
const PICKER_ICON_NAMES = [
	"book-open",
	"library",
	"file-text",
	"files",
	"notebook-pen",
	"file-spreadsheet",
	"pen-line",
	"highlighter",
	"quote",
	"languages",
	"type",
	"lightbulb",
	"target",
	"brain",
	"puzzle",
	"flask-conical",
	"flask-round",
	"test-tube",
	"test-tubes",
	"microscope",
	"dna",
	"atom",
	"pill",
	"heart-pulse",
	"chart-column",
	"chart-line",
	"chart-scatter",
	"chart-no-axes-column",
	"pie-chart",
	"table",
	"database",
	"sigma",
	"square-function",
	"image",
	"palette",
	"shapes",
	"layout-grid",
	"monitor",
	"presentation",
	"mic",
	"star",
	"medal",
	"award",
	"badge-check",
	"clipboard-list",
	"receipt",
	"tag",
	"folder",
	"folder-tree",
	"folder-open",
	"archive",
	"package",
	"package-open",
	"globe",
	"leaf",
	"rocket",
	"scale",
	"code",
	"terminal",
	"wrench",
	"wand-sparkles",
	"search",
	"pin"
];
/** Icon drawn when a stored name is missing or unknown. */
const DEFAULT_CATEGORY_ICON = "folder";

//#endregion
//#region src/client/ScienceCategoryIcon.tsx
/**
* Legacy category keys → icon names. The categories API reports an icon name,
* so this only serves callers that still hand in a raw category key.
*/
const LEGACY_CATEGORY_ICONS = {
	literature: "book-open",
	writing: "pen-line",
	"data-analysis": "chart-column",
	figure: "chart-line",
	review: "star",
	presentation: "monitor",
	lab: "flask-conical",
	topic: "lightbulb",
	outcome: "medal",
	document: "file-text",
	misc: "package"
};
/** Render one category glyph; an unknown name falls back to the folder. */
function ScienceCategoryIcon({ name, className, size = 16 }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		className,
		width: size,
		height: size,
		viewBox: "0 0 24 24",
		fill: "none",
		"aria-hidden": "true",
		stroke: "currentColor",
		strokeWidth: 1.8,
		strokeLinecap: "round",
		strokeLinejoin: "round",
		dangerouslySetInnerHTML: { __html: CATEGORY_ICON_PATHS[LEGACY_CATEGORY_ICONS[name] ?? name] ?? CATEGORY_ICON_PATHS["folder"] ?? "" }
	});
}

//#endregion
//#region src/client/skill-gate.ts
/**
* Browser-side skill activation state for the health rail.
*
* The rail always lists every skill; this module tracks which ones the user
* activated *in this page*, so the Host can narrow what it advertises to the
* model. The set lives here rather than on the Host on purpose: a page reload
* starts from nothing, which is the agreed behavior (刷新即清空). The Host keeps
* a mirror it reads per session; we push the whole set on every change, so a
* reloaded page converges that mirror back to empty on its first interaction.
*
* A skill activated here is a *catalog* fact — the model may discover and call
* it. It never restricts the user's own `/name` gesture, which the Host gates
* separately through `userInvocable`.
*
* Every call goes through {@link API_BASE}, the one place the plug-in's Host
* routes are named. The prefix is the package name, so it is derived from the
* plugin's own row rather than from any deployment-specific mount point; a
* host that mounts the web server under a sub-path would need {@link API_BASE}
* to grow a prefix, and this constant is the only line to change.
*/
/** Base path of this plugin's Host routes (see the host half's `installRoutes`). */
const API_BASE = "/api/dsh-science-skill";
/** Session id → activated skill names (model-facing commands, no leading `/`). */
const activation = /* @__PURE__ */ new Map();
/** Read the activation set for one session; absent means "nothing activated". */
function activatedSkills(sessionId) {
	return activation.get(sessionId) ?? /* @__PURE__ */ new Set();
}
/**
* Publish one session's whole activation set to the Host.
*
* Push-what-we-have, not add/remove: the Host stores exactly this list, so a
* reloaded page (which starts empty) corrects a stale mirror by its next push.
* @param sessionId - Session whose set is published.
*/
async function publishSession(sessionId) {
	try {
		await fetch(`${API_BASE}/skill-gate/session`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({
				sessionId,
				names: [...activatedSkills(sessionId)]
			})
		});
	} catch {}
}
/**
* Activate one skill for a session and publish the new set.
* @param sessionId - Session the rail inserted into.
* @param name - Model-facing skill command (the catalog `invoke` without `/`).
*/
function activateSkill(sessionId, name) {
	const current = activation.get(sessionId);
	if (current === void 0) activation.set(sessionId, /* @__PURE__ */ new Set([name]));
	else current.add(name);
	publishSession(sessionId);
}
/** Read the global toggle set (设置 → Skill) from the Host. */
async function readPinnedSkills() {
	try {
		const data = await (await fetch(`${API_BASE}/skill-gate/state`, { cache: "no-store" })).json();
		return new Set(Array.isArray(data?.pinned) ? data.pinned.filter((n) => typeof n === "string") : []);
	} catch {
		return /* @__PURE__ */ new Set();
	}
}
/**
* Write one global toggle; the Host persists it in the data root.
* @param name - Model-facing skill command.
* @param enabled - Whether the skill stays activated in every session.
* @returns whether the Host confirmed the new value.
*/
async function setPinnedSkill(name, enabled) {
	try {
		const data = await (await fetch(`${API_BASE}/skill-gate/pin`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			cache: "no-store",
			body: JSON.stringify({
				name,
				enabled
			})
		})).json();
		return data?.ok === true && data.enabled === enabled;
	} catch {
		return false;
	}
}

//#endregion
//#region src/client/skill-search.ts
/**
* Whether one skill matches a query.
*
* @param query - Raw search text; blank matches everything.
* @param skill - The skill record as either catalog view carries it.
* @returns True when every whitespace-separated term appears in a searchable
*   field, compared case-insensitively.
*/
function matchesSkillQuery(query, skill) {
	const terms = query.toLowerCase().split(/\s+/).filter((term) => term !== "");
	if (terms.length === 0) return true;
	const haystack = [
		skill.displayName,
		skill.name,
		skill.displaySummary,
		skill.summary,
		skill.id,
		skill.invoke
	].filter((field) => typeof field === "string" && field !== "").join(" ").toLowerCase();
	return terms.every((term) => haystack.includes(term));
}

//#endregion
//#region src/client/styles/class-names.ts
/** Authored class name → emitted class name (shared names are prefixed). */
const SkillSettingsSection$1 = {
	"root": "ss-settings-root",
	"head": "ss-settings-head",
	"title": "ss-settings-title",
	"subtitle": "subtitle",
	"toolbar": "toolbar",
	"count": "count",
	"searchInput": "ss-settings-searchInput",
	"btn": "btn",
	"primary": "primary",
	"danger": "danger",
	"manualRow": "manualRow",
	"manualInput": "manualInput",
	"importDir": "importDir",
	"importDirHead": "importDirHead",
	"importDirTitle": "importDirTitle",
	"importDirHint": "importDirHint",
	"importDirRow": "importDirRow",
	"importDirPath": "importDirPath",
	"status": "ss-settings-status",
	"ok": "ok",
	"err": "err",
	"pending": "pending",
	"warn": "warn",
	"filters": "filters",
	"filter": "filter",
	"active": "active",
	"chipIcon": "chipIcon",
	"catOptionLabel": "ss-settings-catOptionLabel",
	"addFilter": "addFilter",
	"chipWrap": "chipWrap",
	"chipEmpty": "chipEmpty",
	"chipManage": "chipManage",
	"chipMenu": "chipMenu",
	"menuItem": "menuItem",
	"menuDanger": "menuDanger",
	"menuInput": "menuInput",
	"iconPick": "iconPick",
	"iconPickBtn": "iconPickBtn",
	"iconPickCaret": "iconPickCaret",
	"iconGrid": "iconGrid",
	"iconCell": "iconCell",
	"iconCellActive": "iconCellActive",
	"iconCellSvg": "iconCellSvg",
	"addRow": "addRow",
	"list": "list",
	"card": "ss-settings-card",
	"cardGlyph": "cardGlyph",
	"cardTop": "cardTop",
	"cardName": "cardName",
	"cardNameInput": "cardNameInput",
	"cardActions": "cardActions",
	"miniBtn": "miniBtn",
	"dangerMini": "dangerMini",
	"cardManage": "cardManage",
	"catPicker": "ss-settings-catPicker",
	"catPill": "ss-settings-catPill",
	"catPillText": "ss-settings-catPillText",
	"catCaret": "ss-settings-catCaret",
	"catDropdown": "ss-settings-catDropdown",
	"catOption": "ss-settings-catOption",
	"catOptionActive": "ss-settings-catOptionActive",
	"catCheck": "ss-settings-catCheck",
	"deleteConfirm": "deleteConfirm",
	"cardCat": "cardCat",
	"cardDesc": "cardDesc",
	"cardDescInput": "cardDescInput",
	"cardFoot": "ss-settings-cardFoot",
	"invoke": "ss-settings-invoke",
	"badge": "badge",
	"s": "ss-settings-s",
	"b": "ss-settings-b",
	"d": "ss-settings-d",
	"gateToggle": "gateToggle",
	"gateTrack": "gateTrack",
	"gateThumb": "gateThumb",
	"gateOn": "gateOn",
	"empty": "empty"
};
/** Authored class name → emitted class name (shared names are prefixed). */
const SkillStrip = {
	"root": "ss-tree-root",
	"searchRow": "searchRow",
	"searchInput": "ss-tree-searchInput",
	"searchCount": "searchCount",
	"tabs": "tabs",
	"tab": "tab",
	"tabActive": "tabActive",
	"tabCount": "tabCount",
	"tabIcon": "tabIcon",
	"tabLabel": "tabLabel",
	"grid": "grid",
	"card": "ss-tree-card",
	"cardAvatar": "cardAvatar",
	"summon": "summon",
	"cardTitle": "cardTitle",
	"cardInvoke": "cardInvoke",
	"cardSummary": "cardSummary",
	"cardFoot": "ss-tree-cardFoot",
	"catPicker": "ss-tree-catPicker",
	"catPill": "ss-tree-catPill",
	"catPillText": "ss-tree-catPillText",
	"catCaret": "ss-tree-catCaret",
	"catDropdown": "ss-tree-catDropdown",
	"catOption": "ss-tree-catOption",
	"catOptionLabel": "ss-tree-catOptionLabel",
	"catOptionActive": "ss-tree-catOptionActive",
	"catCheck": "ss-tree-catCheck",
	"note": "note",
	"noteOk": "noteOk",
	"noteErr": "noteErr",
	"status": "ss-tree-status",
	"s": "ss-tree-s",
	"b": "ss-tree-b",
	"d": "ss-tree-d",
	"state": "state",
	"stateTitle": "stateTitle",
	"stateHint": "stateHint"
};
/** Authored class name → emitted class name (shared names are prefixed). */
const SkillDetail$1 = {
	"overlay": "overlay",
	"dialog": "dialog",
	"head": "ss-detail-head",
	"headGlyph": "headGlyph",
	"headText": "headText",
	"title": "ss-detail-title",
	"headMeta": "headMeta",
	"invoke": "ss-detail-invoke",
	"catTag": "catTag",
	"statusTag": "statusTag",
	"headActions": "headActions",
	"try": "try",
	"close": "close",
	"example": "example",
	"summary": "summary",
	"section": "section",
	"sectionTitle": "sectionTitle",
	"hint": "hint",
	"exampleList": "exampleList",
	"exampleText": "exampleText",
	"exampleIcon": "exampleIcon",
	"markdownScroll": "markdownScroll",
	"markdown": "markdown"
};

//#endregion
//#region src/client/SkillSettingsSection.tsx
/**
* SkillSettingsSection: the "设置 → Skill" management page. Shows installed
* research skills (from the data-root catalog) as cards with
* name/description/category/status plus management actions:
*  - "+ 添加目录": import a folder (native picker, manual-path fallback);
*    re-importing an existing id overwrites it without asking (the user forgot,
*    or downloaded a newer copy — either way the newer folder is what they want).
*  - category pill: open a dropdown of every category (fixed + custom) and
*    move the skill into the chosen one.
*  - edit (pencil): rename the skill's display name (catalog only).
*  - delete: second-confirm removal of the whole skill folder.
*  - "+" at the end of the filter chips: create a custom category (name may
*    carry an emoji; id is generated server-side). Custom chips expose a
*    small manage menu (rename / re-icon / delete category).
*  - search box: filters by Chinese name, summary, English id, or invoke
*    command across every category, overriding the category chips until the
*    box is cleared (the user remembers what a skill does, not where it sits).
*/
const STATUS_TEXT$2 = {
	stable: "Stable",
	beta: "Beta",
	draft: "Draft"
};
/** Mirrors `.catDropdown`'s max-height in the module CSS: the room a flipped
*  menu needs above the pill before the caller prefers opening it upwards. */
const CATEGORY_MENU_MAX_PX$1 = 260;
/**
* The name the kernel's skill registry answers to for one catalog row.
*
* The catalog stores the command with its leading `/`, and a row that names no
* `invoke` falls back to its directory id — exactly the rule the rail uses when
* it inserts a chip, so both halves of the activation gate agree on one key.
* @param skill - Catalog row as the skills API returns it.
* @returns the skill name as the model-facing catalog would publish it.
*/
function gateNameOf(skill) {
	return (skill.invoke || skill.id).replace(/^\//, "");
}
async function json(url, init) {
	return await (await fetch(url, {
		cache: "no-store",
		...init
	})).json();
}
async function loadSkills() {
	try {
		const data = await json(`${API_BASE}/skills`);
		return Array.isArray(data?.skills) ? data.skills : [];
	} catch {
		return [];
	}
}
async function loadCategories$1() {
	try {
		const data = await json(`${API_BASE}/categories`);
		return Array.isArray(data?.categories) ? data.categories : [];
	} catch {
		return [];
	}
}
/**
* The default import directory, or `''` when the user has never set one — in
* which case the host installs into `<root>/skills` and the panel says so
* rather than showing a path it invented.
*
* `providerRegistered` rides along because it is read on the same request and
* describes the same feature: a directory the harness never accepted as a skill
* source lists skills the model cannot load. It is `undefined` — not `false` —
* when the host does not report it, so an older host is never shown as broken.
* @returns the directory and, when the host reports it, whether the provider
*   registration succeeded.
*/
async function loadImportSettings() {
	try {
		const data = await json(`${API_BASE}/import-settings`);
		return {
			defaultSkillDir: typeof data?.defaultSkillDir === "string" ? data.defaultSkillDir : "",
			providerRegistered: typeof data?.providerRegistered === "boolean" ? data.providerRegistered : void 0
		};
	} catch {
		return {
			defaultSkillDir: "",
			providerRegistered: void 0
		};
	}
}
/** Ask the server which icon a category name would get (keyword → fallback). */
async function suggestIcon(label) {
	const q = encodeURIComponent(label);
	try {
		return (await json(`${"/api/dsh-science-skill"}/categories/suggest?label=${q}`)).icon ?? null;
	} catch {
		return null;
	}
}
/** Icon seat shared with the sidebar tree: one line glyph per category. */
function CategoryGlyph({ name, className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, {
		name,
		className
	});
}
/**
* Icon seat for the category forms. The field starts as the single icon the
* form will store — the suggestion derived from the category name — and only
* unfolds the full grid when the user asks for a different one, so the form
* stays one line tall instead of opening on a wall of glyphs.
*/
function IconPicker({ value, onPick }) {
	const [open, setOpen] = (0, react.useState)(false);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		className: SkillSettingsSection$1.iconPick,
		"data-popup-open": open || void 0,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
			type: "button",
			className: SkillSettingsSection$1.iconPickBtn,
			"aria-expanded": open,
			"aria-label": "选择分类图标",
			title: "选择分类图标",
			onClick: () => setOpen((wasOpen) => !wasOpen),
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CategoryGlyph, {
				name: value,
				className: SkillSettingsSection$1.iconCellSvg
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SkillSettingsSection$1.iconPickCaret,
				"aria-hidden": "true",
				children: open ? "▴" : "▾"
			})]
		}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: SkillSettingsSection$1.iconGrid,
			role: "radiogroup",
			"aria-label": "分类图标",
			children: PICKER_ICON_NAMES.map((name) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "radio",
				"aria-checked": name === value,
				"aria-label": name,
				title: name,
				className: SkillSettingsSection$1.iconCell + (name === value ? " " + SkillSettingsSection$1.iconCellActive : ""),
				onClick: () => {
					onPick(name);
					setOpen(false);
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CategoryGlyph, {
					name,
					className: SkillSettingsSection$1.iconCellSvg
				})
			}, name))
		}) : null]
	});
}
/** Render the Skill settings page. */
function SkillSettingsSection({ pickDirectory }) {
	const [skills, setSkills] = (0, react.useState)([]);
	const [categories, setCategories] = (0, react.useState)([]);
	const [category, setCategory] = (0, react.useState)("all");
	const [query, setQuery] = (0, react.useState)("");
	const [busy, setBusy] = (0, react.useState)(false);
	const [showManual, setShowManual] = (0, react.useState)(false);
	const [manualPath, setManualPath] = (0, react.useState)("");
	const [msg, setMsg] = (0, react.useState)(null);
	/**
	* Where "+ 添加目录" installs the skill it copies. `''` means the host default
	* (`<root>/skills`), which is what an install that never touched this setting
	* uses — so the empty value is the feature's own "restore default".
	*/
	const [defaultSkillDir, setDefaultSkillDir] = (0, react.useState)("");
	const [savingDir, setSavingDir] = (0, react.useState)(false);
	/**
	* Whether the harness accepted this plugin as a skill provider. `undefined`
	* means the host did not say (an older host), which must render as nothing —
	* a warning is only honest when the host has actually reported a refusal.
	*/
	const [providerRegistered, setProviderRegistered] = (0, react.useState)(void 0);
	/** A rescan of every skill root is in flight (the 刷新 button). */
	const [rescanning, setRescanning] = (0, react.useState)(false);
	const [pendingDelete, setPendingDelete] = (0, react.useState)(null);
	const [editingName, setEditingName] = (0, react.useState)(null);
	const [nameDraft, setNameDraft] = (0, react.useState)("");
	const [summaryDraft, setSummaryDraft] = (0, react.useState)("");
	const [openCategoryFor, setOpenCategoryFor] = (0, react.useState)(null);
	const [categoryMenuUp, setCategoryMenuUp] = (0, react.useState)(false);
	const [manageCategory, setManageCategory] = (0, react.useState)(null);
	const [addingCategory, setAddingCategory] = (0, react.useState)(false);
	const [categoryDraft, setCategoryDraft] = (0, react.useState)("");
	const [suggestedIcon, setSuggestedIcon] = (0, react.useState)(DEFAULT_CATEGORY_ICON);
	const [renamingCategory, setRenamingCategory] = (0, react.useState)(null);
	const [renameDraft, setRenameDraft] = (0, react.useState)("");
	const [renameIcon, setRenameIcon] = (0, react.useState)(DEFAULT_CATEGORY_ICON);
	const [confirmDeleteCat, setConfirmDeleteCat] = (0, react.useState)(null);
	/**
	* Skills toggled on in this page: the Host persists them, and an enabled
	* skill stays activated in every session regardless of the rail selection.
	*/
	const [pinned, setPinned] = (0, react.useState)(() => /* @__PURE__ */ new Set());
	(0, react.useEffect)(() => {
		readPinnedSkills().then(setPinned);
	}, []);
	/**
	* Flip one skill's global toggle. The Host owns the persisted value, so the
	* local set follows the confirmed answer rather than the click.
	*/
	const togglePinned = (0, react.useCallback)(async (skill, enabled) => {
		const name = gateNameOf(skill);
		if (!await setPinnedSkill(name, enabled)) {
			setMsg({
				kind: "err",
				text: `「${skill.displayName ?? skill.name}」开关未能保存`
			});
			return;
		}
		setPinned((previous) => {
			const next = new Set(previous);
			if (enabled) next.add(name);
			else next.delete(name);
			return next;
		});
	}, []);
	/** Icon name for a category key, read from the loaded category list. */
	const iconOf = (0, react.useCallback)((key) => categories.find((c) => c.key === key)?.icon ?? "folder", [categories]);
	const rootRef = (0, react.useRef)(null);
	/** Re-read the catalog, the category list and the import settings. Announces
	* nothing, so it is safe to call from the change listener below. */
	const reload = (0, react.useCallback)(async () => {
		const [list, cats, importSettings] = await Promise.all([
			loadSkills(),
			loadCategories$1(),
			loadImportSettings()
		]);
		setSkills(list);
		setCategories(cats);
		setDefaultSkillDir(importSettings.defaultSkillDir);
		setProviderRegistered(importSettings.providerRegistered);
	}, []);
	const refresh = (0, react.useCallback)(async () => {
		await reload();
		window.dispatchEvent(new CustomEvent("dsh-science-skill:catalog-changed"));
	}, [reload]);
	(0, react.useEffect)(() => {
		refresh();
	}, [refresh]);
	(0, react.useEffect)(() => {
		const onChanged = () => {
			reload();
		};
		window.addEventListener("dsh-science-skill:catalog-changed", onChanged);
		return () => window.removeEventListener("dsh-science-skill:catalog-changed", onChanged);
	}, [reload]);
	(0, react.useEffect)(() => {
		const onDown = (e) => {
			if (rootRef.current === null) return;
			if (!rootRef.current.contains(e.target)) {
				setOpenCategoryFor(null);
				setManageCategory(null);
				setAddingCategory(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, []);
	/**
	* Show a transient message.
	* @param kind - message tone.
	* @param text - message body.
	* @param holdMs - how long it stays before hiding. An import result names the
	*   category the skill landed in, which takes longer to read than the
	*   confirmations around it, so callers may extend the default.
	*/
	const flash = (0, react.useCallback)((kind, text, holdMs = 4e3) => {
		setMsg({
			kind,
			text
		});
		window.setTimeout(() => setMsg((m) => m?.text === text ? null : m), holdMs);
	}, []);
	const run = (0, react.useCallback)(async (action, okText) => {
		setBusy(true);
		const result = await action();
		setBusy(false);
		if (result.ok) {
			flash("ok", result.note ?? okText);
			await refresh();
		} else flash("err", result.error ?? "操作失败");
	}, [flash, refresh]);
	/**
	* Import one skill folder into the configured default directory.
	*
	* The import always overwrites: the folder the user picks is the folder they
	* want, so a re-import of a skill they already have means they forgot or they
	* downloaded a newer version, and stopping to ask only costs a click. The host
	* keeps the previous copy as a `.<id>.old-<timestamp>` folder and keeps the
	* Chinese name, category and examples of the record it replaces.
	* @param path - skill folder the user picked or typed.
	*/
	const doImportPath = (0, react.useCallback)(async (path) => {
		const p = path.trim();
		if (!p) return;
		setBusy(true);
		try {
			const data = await (await fetch(`${API_BASE}/skills/import`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					path: p,
					overwrite: true
				})
			})).json();
			setBusy(false);
			if (data.ok) {
				flash("ok", data.note ?? "导入完成。", 2e4);
				await refresh();
				setShowManual(false);
				setManualPath("");
			} else flash("err", data.error ?? "导入失败");
		} catch (error) {
			setBusy(false);
			flash("err", String(error));
		}
	}, [flash, refresh]);
	const addDirectory = async () => {
		setBusy(true);
		setMsg(null);
		try {
			const picked = await pickDirectory();
			if (picked) {
				setBusy(false);
				await doImportPath(picked);
				return;
			}
			setShowManual(true);
			setMsg({
				kind: "ok",
				text: "未选择目录。可手动输入文件夹路径。"
			});
			setBusy(false);
		} catch {
			setShowManual(true);
			setBusy(false);
		}
	};
	const handleManualImport = async () => {
		await doImportPath(manualPath);
	};
	/**
	* Re-scan every skill root on demand.
	*
	* Skills a user drops into their chosen directory by hand have no import to
	* announce them, so without this the only way to pick them up would be a page
	* reload. The host adopts what is new, rebuilds the catalog, and starts
	* Chinese naming for anything it has never named — so a folder that was filled
	* in advance ends up looking exactly like one built through the panel.
	*/
	const rescan = async () => {
		setRescanning(true);
		setMsg(null);
		try {
			let adopted;
			let skipped = 0;
			let firstSkip = "";
			let naming = 0;
			let namingDisabled = false;
			try {
				const res = await fetch(`${API_BASE}/skills/refresh`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({}),
					cache: "no-store"
				});
				if (res.ok) {
					const data = await res.json();
					if (data?.ok === true) {
						adopted = data.adopted?.length ?? 0;
						skipped = data.skipped?.length ?? 0;
						const reason = data.skipped?.[0]?.error;
						firstSkip = typeof reason === "string" ? reason : "";
						naming = data.naming ?? 0;
						namingDisabled = data.namingDisabled === true;
					}
				}
			} catch {}
			await refresh();
			const parts = [adopted === void 0 ? "已重新读取技能列表" : adopted > 0 ? `自动收录 ${adopted} 个新技能（文件夹保持原样）` : "没有发现新技能"];
			if (skipped > 0) parts.push(`跳过 ${skipped} 个${firstSkip === "" ? "" : `（例：${firstSkip}）`}`);
			if (adopted !== void 0 && !namingDisabled && naming > 0) parts.push(`正在用默认模型生成 ${naming} 个技能的中文名`);
			flash("ok", `${parts.join("；")}。`);
			if (naming > 0) window.setTimeout(() => {
				refresh();
			}, 4e3);
		} catch (error) {
			flash("err", String(error));
		} finally {
			setRescanning(false);
		}
	};
	/**
	* Store the default import directory. An empty value clears the setting, so
	* imports go back to the host default (`<root>/skills`); the Host owns the
	* persisted value, so the panel follows the confirmed answer, not the click.
	*/
	const saveDefaultDir = (0, react.useCallback)(async (value) => {
		setSavingDir(true);
		setMsg(null);
		try {
			const data = await json(`${API_BASE}/import-settings`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ defaultSkillDir: value })
			});
			if (data.ok) {
				const saved = typeof data.defaultSkillDir === "string" ? data.defaultSkillDir : value;
				setDefaultSkillDir(saved);
				flash("ok", saved === "" ? "已恢复默认：导入的技能装到数据根下的 skills。" : `已设为默认安装目录：${saved}`);
				await refresh();
			} else flash("err", data.error ?? "默认目录保存失败");
		} catch (error) {
			flash("err", String(error));
		} finally {
			setSavingDir(false);
		}
	}, [flash, refresh]);
	/**
	* Pick the default import directory with the host's own chooser. A cancelled
	* dialog answers `null` too, so nothing is written and the current setting
	* stands — "cancel" must not read as "clear".
	*/
	const pickDefaultDir = async () => {
		setMsg(null);
		let picked = null;
		try {
			picked = await pickDirectory();
		} catch {
			picked = null;
		}
		if (!picked) {
			flash("ok", "未选择目录，默认安装目录保持不变。");
			return;
		}
		await saveDefaultDir(picked);
	};
	const moveCategory = (0, react.useCallback)(async (skillId, target) => {
		setOpenCategoryFor(null);
		await run(async () => {
			return await json(`${API_BASE}/skills/update`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					id: skillId,
					category: target
				})
			});
		}, "已移动分类。");
	}, [run]);
	const saveName = (0, react.useCallback)(async (skillId) => {
		const nextName = nameDraft.trim();
		const nextSummary = summaryDraft.trim();
		setEditingName(null);
		if (!nextName) return;
		await run(async () => {
			return await json(`${API_BASE}/skills/update`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					id: skillId,
					displayName: nextName,
					displaySummary: nextSummary
				})
			});
		}, "已更新中文名与简介。");
	}, [
		nameDraft,
		summaryDraft,
		run
	]);
	const deleteSkill = (0, react.useCallback)(async (skillId) => {
		setPendingDelete(null);
		await run(async () => {
			return await json(`${API_BASE}/skills/delete`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id: skillId })
			});
		}, "已删除。");
	}, [run]);
	const createCategory = (0, react.useCallback)(async () => {
		const label = categoryDraft.trim();
		if (!label) return;
		setAddingCategory(false);
		setCategoryDraft("");
		const icon = suggestedIcon;
		setSuggestedIcon(DEFAULT_CATEGORY_ICON);
		await run(async () => {
			return await json(`${API_BASE}/categories/create`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					label,
					icon
				})
			});
		}, "已添加分类。");
	}, [
		categoryDraft,
		run,
		suggestedIcon
	]);
	const renameCategory = (0, react.useCallback)(async (key) => {
		const label = renameDraft.trim();
		setRenamingCategory(null);
		setManageCategory(null);
		if (!label) return;
		await run(async () => {
			return await json(`${API_BASE}/categories/rename`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					key,
					label,
					icon: renameIcon
				})
			});
		}, "已更新分类。");
	}, [
		renameDraft,
		renameIcon,
		run
	]);
	const restoreCategories = (0, react.useCallback)(async () => {
		setManageCategory(null);
		await run(async () => {
			return await json(`${API_BASE}/categories/restore`, { method: "POST" });
		}, "已恢复默认分类（自定义分类保留）。");
		setCategory("all");
	}, [run]);
	const deleteCategory = (0, react.useCallback)(async (key) => {
		setManageCategory(null);
		await run(async () => {
			return await json(`${API_BASE}/categories/delete`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ key })
			});
		}, "已删除分类（其下技能回到文献）。");
		if (category === key) setCategory("all");
	}, [category, run]);
	const updateIconPreview = (0, react.useCallback)(async (value, setIcon) => {
		const suggested = await suggestIcon(value.trim());
		if (suggested !== null) setIcon(suggested);
	}, []);
	const trimmed = query.trim();
	const filtered = (0, react.useMemo)(() => trimmed !== "" ? skills.filter((s) => matchesSkillQuery(trimmed, s)) : category === "all" ? skills : skills.filter((s) => s.category === category), [
		skills,
		category,
		trimmed
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: SkillSettingsSection$1.root,
		ref: rootRef,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillSettingsSection$1.head,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SkillSettingsSection$1.title,
					children: "Science Skill"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SkillSettingsSection$1.subtitle,
					children: "从本地文件夹添加科研技能（含 SKILL.md）。导入后自动出现在技能树里，可直接用于科研任务。"
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillSettingsSection$1.importDir,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillSettingsSection$1.importDirHead,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SkillSettingsSection$1.importDirTitle,
							children: "技能默认目录"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SkillSettingsSection$1.importDirHint,
							children: "导入的技能会安装到该目录下（以 <技能标识> 作为子文件夹名）。未设置时使用数据根目录下的 skills。"
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillSettingsSection$1.importDirRow,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillSettingsSection$1.importDirPath,
								title: defaultSkillDir || "默认（数据根下的 skills）",
								children: defaultSkillDir || "默认（数据根下的 skills）"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SkillSettingsSection$1.btn,
								disabled: busy || savingDir,
								onClick: () => void pickDefaultDir(),
								children: savingDir ? "保存中…" : "选择目录"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SkillSettingsSection$1.btn,
								disabled: busy || savingDir || defaultSkillDir === "",
								title: "清除后，导入的技能装回数据根下的 skills",
								onClick: () => void saveDefaultDir(""),
								children: "清除"
							})
						]
					}),
					providerRegistered === false && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SkillSettingsSection$1.importDirRow,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SkillSettingsSection$1.status + " " + SkillSettingsSection$1.warn,
							children: "当前 DSH 未接受技能注册，这些技能只在面板可见，模型无法加载。请确认 DSH 版本，或重启后重试。"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillSettingsSection$1.toolbar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						type: "text",
						className: SkillSettingsSection$1.searchInput,
						value: query,
						onChange: (e) => {
							setQuery(e.target.value);
						},
						placeholder: "搜索技能：中文名 / 简介 / 英文 id / 命令",
						"aria-label": "搜索技能",
						spellCheck: false
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillSettingsSection$1.count,
						children: trimmed === "" ? `共 ${skills.length} 个技能` : `找到 ${filtered.length} 个 / 共 ${skills.length}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.btn,
						disabled: busy || rescanning,
						onClick: () => void rescan(),
						title: "重新扫描默认技能目录：手动粘贴进去的新技能会被自动收录",
						children: rescanning ? "扫描中…" : "刷新"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.btn + " " + SkillSettingsSection$1.primary,
						disabled: busy,
						onClick: () => void addDirectory(),
						title: "添加技能文件夹；若该技能已存在，直接覆盖更新（旧文件保留为备份）",
						children: busy ? "处理中…" : "+ 添加目录"
					})
				]
			}),
			showManual && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillSettingsSection$1.manualRow,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: SkillSettingsSection$1.manualInput,
						value: manualPath,
						onChange: (e) => setManualPath(e.target.value),
						placeholder: "技能文件夹路径，如 ~/my-skills/nature-xxx",
						spellCheck: false
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.btn + " " + SkillSettingsSection$1.primary,
						disabled: busy || !manualPath.trim(),
						onClick: () => void handleManualImport(),
						children: "导入"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.btn,
						onClick: () => setShowManual(false),
						children: "取消"
					})
				]
			}),
			msg && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: SkillSettingsSection$1.status + " " + SkillSettingsSection$1[msg.kind],
				children: msg.text
			}),
			categories.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillSettingsSection$1.filters,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.filter + (category === "all" ? " " + SkillSettingsSection$1.active : ""),
						onClick: () => setCategory("all"),
						children: "全部"
					}),
					categories.map((c) => {
						const present = skills.some((s) => s.category === c.key);
						const active = category === c.key;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SkillSettingsSection$1.chipWrap,
							"data-active": active || void 0,
							"data-popup-open": manageCategory === c.key || renamingCategory === c.key || void 0,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: SkillSettingsSection$1.filter + (active ? " " + SkillSettingsSection$1.active : ""),
									onClick: () => setCategory(active ? "all" : c.key),
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CategoryGlyph, {
											name: c.icon,
											className: SkillSettingsSection$1.chipIcon
										}),
										c.label,
										!present && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SkillSettingsSection$1.chipEmpty,
											title: "该分类下暂无技能",
											children: "·0"
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillSettingsSection$1.chipManage,
									title: "管理分类（改名/换图标/删除）",
									"aria-label": `管理分类 ${c.label}`,
									onClick: () => setManageCategory(manageCategory === c.key ? null : c.key),
									children: "▾"
								}),
								manageCategory === c.key && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SkillSettingsSection$1.chipMenu,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.menuItem,
										onClick: () => {
											setRenamingCategory(c.key);
											setRenameDraft(c.label);
											setRenameIcon(c.icon);
										},
										children: "改名 / 换图标"
									}), confirmDeleteCat === c.key ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SkillSettingsSection$1.status + " " + SkillSettingsSection$1.err,
											children: "其下技能将回到「文献」"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SkillSettingsSection$1.menuItem + " " + SkillSettingsSection$1.menuDanger,
											onClick: () => void deleteCategory(c.key),
											children: "确认删除"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SkillSettingsSection$1.menuItem,
											onClick: () => setConfirmDeleteCat(null),
											children: "取消"
										})
									] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.menuItem + " " + SkillSettingsSection$1.menuDanger,
										onClick: () => setConfirmDeleteCat(c.key),
										children: "删除分类"
									})]
								}),
								renamingCategory === c.key && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SkillSettingsSection$1.chipMenu,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: SkillSettingsSection$1.manualInput + " " + SkillSettingsSection$1.menuInput,
											value: renameDraft,
											onChange: (e) => {
												setRenameDraft(e.target.value);
												updateIconPreview(e.target.value, setRenameIcon);
											},
											placeholder: "新名称",
											spellCheck: false,
											autoFocus: true
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPicker, {
											value: renameIcon,
											onPick: setRenameIcon
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SkillSettingsSection$1.menuItem,
											disabled: !renameDraft.trim(),
											onClick: () => void renameCategory(c.key),
											children: "保存"
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: SkillSettingsSection$1.menuItem,
											onClick: () => setRenamingCategory(null),
											children: "取消"
										})
									]
								})
							]
						}, c.key);
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.filter + " " + SkillSettingsSection$1.addFilter,
						title: "新增自定义分类",
						onClick: () => setAddingCategory((v) => !v),
						children: "+"
					}),
					addingCategory && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillSettingsSection$1.chipWrap,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SkillSettingsSection$1.addRow,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: SkillSettingsSection$1.manualInput + " " + SkillSettingsSection$1.menuInput,
									value: categoryDraft,
									onChange: (e) => {
										setCategoryDraft(e.target.value);
										updateIconPreview(e.target.value, setSuggestedIcon);
									},
									placeholder: "分类名称，如 基金申请",
									spellCheck: false,
									autoFocus: true
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconPicker, {
									value: suggestedIcon,
									onPick: setSuggestedIcon
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillSettingsSection$1.btn + " " + SkillSettingsSection$1.primary,
									disabled: !categoryDraft.trim() || busy,
									onClick: () => void createCategory(),
									children: "添加"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillSettingsSection$1.btn,
									onClick: () => {
										setAddingCategory(false);
										setCategoryDraft("");
										setSuggestedIcon("folder");
									},
									children: "取消"
								})
							]
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: SkillSettingsSection$1.filter + " " + SkillSettingsSection$1.addFilter,
						title: "恢复默认分类（自定义分类保留）",
						onClick: () => void restoreCategories(),
						disabled: busy,
						children: "恢复默认"
					})
				]
			}),
			filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SkillSettingsSection$1.empty,
				children: trimmed === "" ? "暂无技能。点击「添加目录」导入第一个科研技能。" : `没有匹配「${trimmed}」的技能。`
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SkillSettingsSection$1.list,
				children: filtered.map((s) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
					className: SkillSettingsSection$1.card,
					"data-off": pinned.has(gateNameOf(s)) ? void 0 : "true",
					"data-popup-open": openCategoryFor === s.id || void 0,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SkillSettingsSection$1.cardTop,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillSettingsSection$1.cardGlyph,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, { name: iconOf(s.category) })
								}),
								editingName === s.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: SkillSettingsSection$1.cardNameInput,
									value: nameDraft,
									onChange: (e) => setNameDraft(e.target.value),
									placeholder: "中文显示名",
									spellCheck: false,
									autoFocus: true
								}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillSettingsSection$1.cardName,
									children: s.displayName ?? s.name
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SkillSettingsSection$1.cardActions,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: pinned.has(gateNameOf(s)) ? `${SkillSettingsSection$1.gateToggle} ${SkillSettingsSection$1.gateOn}` : SkillSettingsSection$1.gateToggle,
										title: "开启后：无论是否在侧栏选择，这个技能在所有会话里都始终激活（模型可以发现并调用它）",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											role: "switch",
											checked: pinned.has(gateNameOf(s)),
											"aria-label": `开启「${s.displayName ?? s.name}」`,
											onChange: (e) => {
												togglePinned(s, e.target.checked);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SkillSettingsSection$1.gateTrack,
											"aria-hidden": "true",
											children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: SkillSettingsSection$1.gateThumb })
										})]
									}), editingName === s.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.miniBtn,
										onClick: () => void saveName(s.id),
										children: "保存"
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.miniBtn,
										onClick: () => setEditingName(null),
										children: "✕"
									})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.miniBtn,
										title: "修改中文名与简介（只改显示，不动 SKILL.md）",
										"aria-label": `修改 ${s.displayName ?? s.name} 的中文名与简介`,
										onClick: () => {
											setEditingName(s.id);
											setNameDraft(s.displayName ?? s.name ?? "");
											setSummaryDraft(s.displaySummary ?? s.summary ?? "");
										},
										children: "✎"
									})]
								})
							]
						}),
						editingName === s.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							className: SkillSettingsSection$1.cardDescInput,
							value: summaryDraft,
							onChange: (e) => setSummaryDraft(e.target.value),
							placeholder: "一句话中文简介：这个技能能做什么",
							spellCheck: false
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: SkillSettingsSection$1.cardDesc,
							children: s.displaySummary ?? s.summary
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SkillSettingsSection$1.cardFoot,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillSettingsSection$1.invoke,
								children: s.invoke
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillSettingsSection$1.badge + " " + SkillSettingsSection$1[s.status],
								children: STATUS_TEXT$2[s.status] ?? s.status
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: SkillSettingsSection$1.cardManage,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SkillSettingsSection$1.catPicker,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: SkillSettingsSection$1.catPill,
									title: "移动到其它分类",
									onClick: (event) => {
										const opening = openCategoryFor !== s.id;
										setOpenCategoryFor(opening ? s.id : null);
										if (!opening) return;
										const pill = event.currentTarget.getBoundingClientRect();
										const below = window.innerHeight - pill.bottom;
										setCategoryMenuUp(below < CATEGORY_MENU_MAX_PX$1 && pill.top > below);
									},
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillSettingsSection$1.catPillText,
										children: s.categoryLabel || s.category
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillSettingsSection$1.catCaret,
										"aria-hidden": "true",
										children: "▾"
									})]
								}), openCategoryFor === s.id && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillSettingsSection$1.catDropdown,
									"data-drop": categoryMenuUp ? "up" : void 0,
									children: categories.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
										type: "button",
										className: SkillSettingsSection$1.catOption + (s.category === c.key ? " " + SkillSettingsSection$1.catOptionActive : ""),
										onClick: () => void moveCategory(s.id, c.key),
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: SkillSettingsSection$1.catOptionLabel,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CategoryGlyph, {
												name: c.icon,
												className: SkillSettingsSection$1.chipIcon
											}), c.label]
										}), s.category === c.key && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SkillSettingsSection$1.catCheck,
											children: "✓"
										})]
									}, c.key))
								})]
							}), pendingDelete === s.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SkillSettingsSection$1.deleteConfirm,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillSettingsSection$1.status + " " + SkillSettingsSection$1.err,
										children: "将删除整个文件夹"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.miniBtn + " " + SkillSettingsSection$1.dangerMini,
										onClick: () => void deleteSkill(s.id),
										children: "确认删除"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: SkillSettingsSection$1.miniBtn,
										onClick: () => setPendingDelete(null),
										children: "取消"
									})
								]
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SkillSettingsSection$1.miniBtn + " " + SkillSettingsSection$1.dangerMini,
								title: "删除技能（含整个文件夹）",
								onClick: () => setPendingDelete(s.id),
								children: "删除"
							})]
						})
					]
				}, s.id))
			})
		]
	});
}

//#endregion
//#region src/client/SkillDetail.tsx
/**
* dsh-science-skill — the skill detail dialog.
*
* Opening a card is a read: the user wants to know what a skill does, what to
* type at it, and what is actually in its `SKILL.md`, before committing it to
* the composer. The dialog answers those three questions in that order, and the
* only write it performs is the one the user explicitly asks for — 「去试试」
* summons the skill, and clicking an example line puts that example into the
* composer.
*
* The board already carries everything the header needs, so the dialog opens
* with real content and *then* enriches itself from `GET /skills/detail`. That
* ordering is the whole degradation story: examples and the markdown body come
* from a route the host may not serve yet (an older build, or a half-upgraded
* one), and a missing route must cost the user two blocks of the dialog, never
* the dialog itself.
*/
/** Status label shown next to the title, matching the board's card foot. */
const STATUS_TEXT$1 = {
	stable: "Stable",
	beta: "Beta",
	draft: "Draft"
};
/**
* Read one skill's detail payload.
*
* Never throws: a route the host does not serve (404), a malformed body, or a
* network failure all collapse to `undefined`, which the caller renders as two
* explanatory blocks rather than as an error state.
* @param id - skill id.
* @returns the payload, or `undefined` when the route could not answer.
*/
async function loadDetail(id) {
	try {
		const res = await fetch(`${API_BASE}/skills/detail?id=${encodeURIComponent(id)}`, { cache: "no-store" });
		if (!res.ok) return void 0;
		const data = await res.json();
		return data?.ok === true ? data : void 0;
	} catch {
		return;
	}
}
/**
* Render the detail dialog for one skill.
* @param props - the skill, the close handler, and the two composer actions.
* @returns the modal, or nothing once closed (the caller unmounts it).
*/
function SkillDetail({ skill, icon, onClose, addSkill, insertExample }) {
	const [detail, setDetail] = (0, react.useState)(void 0);
	const [load, setLoad] = (0, react.useState)("loading");
	const dialogRef = (0, react.useRef)(null);
	(0, react.useEffect)(() => {
		let alive = true;
		setLoad("loading");
		setDetail(void 0);
		loadDetail(skill.id).then((payload) => {
			if (!alive) return;
			setDetail(payload);
			setLoad(payload === void 0 ? "unavailable" : "ok");
		});
		return () => {
			alive = false;
		};
	}, [skill.id]);
	(0, react.useEffect)(() => {
		const onKeyDown = (event) => {
			if (event.key === "Escape") onClose();
		};
		const previousOverflow = document.body.style.overflow;
		const restoreTo = document.activeElement;
		document.body.style.overflow = "hidden";
		document.addEventListener("keydown", onKeyDown);
		dialogRef.current?.focus();
		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", onKeyDown);
			restoreTo?.focus?.();
		};
	}, [onClose]);
	/** Close only when the overlay itself was hit, not a click that bubbled from the dialog. */
	const onOverlayClick = (0, react.useCallback)((event) => {
		if (event.target === event.currentTarget) onClose();
	}, [onClose]);
	const title = detail?.displayName ?? skill.displayName ?? skill.name ?? skill.id;
	const invoke = detail?.invoke ?? skill.invoke ?? `/${skill.id}`;
	const summary = detail?.displaySummary ?? skill.displaySummary ?? skill.summary ?? "";
	const categoryLabel = detail?.categoryLabel ?? skill.categoryLabel ?? "";
	const status = detail?.status ?? skill.status ?? "beta";
	const examples = Array.isArray(detail?.examples) ? detail.examples : [];
	const markdown = typeof detail?.markdown === "string" ? detail.markdown : "";
	/**
	* Summon the skill and dismiss the dialog. The dialog is a modal over the
	* board, so leaving it open would cover the composer the user just filled.
	*/
	const summon = () => {
		addSkill(skill);
		onClose();
	};
	/**
	* Put one example into the composer and dismiss, for the same reason.
	* @param text - the example line the user clicked.
	*/
	const useExample = (text) => {
		insertExample(text);
		onClose();
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: SkillDetail$1.overlay,
		onClick: onOverlayClick,
		"data-skill-detail": skill.id,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: SkillDetail$1.dialog,
			role: "dialog",
			"aria-modal": "true",
			"aria-label": `技能详情：${title}`,
			tabIndex: -1,
			ref: dialogRef,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SkillDetail$1.head,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: SkillDetail$1.headGlyph,
							"aria-hidden": "true",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, {
								name: icon,
								size: 22
							})
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SkillDetail$1.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillDetail$1.title,
								children: title
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: SkillDetail$1.headMeta,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillDetail$1.invoke,
										children: invoke
									}),
									categoryLabel !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillDetail$1.catTag,
										children: categoryLabel
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillDetail$1.statusTag,
										children: STATUS_TEXT$1[status] ?? status
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: SkillDetail$1.headActions,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SkillDetail$1.try,
								onClick: summon,
								children: "去试试"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: SkillDetail$1.close,
								onClick: onClose,
								"aria-label": "关闭",
								children: "×"
							})]
						})
					]
				}),
				summary !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					className: SkillDetail$1.summary,
					children: summary
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: SkillDetail$1.section,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: SkillDetail$1.sectionTitle,
						children: "试试这样用"
					}), load === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillDetail$1.hint,
						children: "暂时读不到示例（宿主还没提供详情接口）。点「去试试」先把技能召唤进输入框。"
					}) : load === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillDetail$1.hint,
						children: "正在读取示例…"
					}) : examples.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillDetail$1.hint,
						children: "该技能还没有示例，点设置里的「刷新」后由默认模型生成。"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: SkillDetail$1.exampleList,
						children: examples.map((example, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: SkillDetail$1.example,
							onClick: () => {
								useExample(example);
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillDetail$1.exampleText,
								children: example
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillDetail$1.exampleIcon,
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
									width: "15",
									height: "15",
									viewBox: "0 0 24 24",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "1.8",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m22 2-7 20-4-9-9-4Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M22 2 11 13" })]
								})
							})]
						}, `${index}-${example}`))
					})]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					className: SkillDetail$1.section,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: SkillDetail$1.sectionTitle,
						children: "技能详情"
					}), load === "unavailable" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillDetail$1.hint,
						children: "暂时读不到 SKILL.md 原文（宿主还没提供详情接口）。"
					}) : load === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillDetail$1.hint,
						children: "正在读取 SKILL.md…"
					}) : markdown === "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: SkillDetail$1.hint,
						children: "这个技能没有可展示的 SKILL.md 原文。"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: SkillDetail$1.markdownScroll,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: SkillDetail$1.markdown,
							children: markdown
						}), detail?.truncated === true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: SkillDetail$1.hint,
							children: "内容过长，已截断显示。"
						})]
					})]
				})
			]
		})
	});
}

//#endregion
//#region src/client/SkillStrip.tsx
/**
* dsh-science-skill — the skill board.
*
* The catalog as a browsing surface: a wrapping bar of category tabs over a
* four-column grid of cards. It replaced an accordion of category rows. The
* catalog is browsed far more often than it is searched, and an accordion shows
* one category at a time — as the catalog grew, the user spent their time
* opening and closing rows instead of reading skills, and the drag-to-reorder
* gesture that came with it was a management action living in a browsing view.
*
* The board owns only what the user is looking at: the selected tab and the
* query. The catalog and the category list are read from the data root on mount,
* and re-read on every signal that they may have moved underneath us — window
* focus, the panel becoming visible again, and the `catalog-changed` event that
* any view announces after it writes.
*
* One write lives here: filing a skill under another category, which each card's
* category pill offers. It is the same write the settings page performs and it
* announces itself on the same event, so whichever view made the change, both
* end up agreeing. Creating, renaming and reordering categories stay the settings
* page's job — those change the catalog's shape rather than one skill's filing.
*
* A card carries two different intentions, so it carries two different targets.
* Clicking the body opens the detail dialog — the user is asking what a skill
* does. The 「召唤」 pill in the corner performs the write — the user has decided.
* Keeping them apart matters because the destructive-looking one used to be the
* whole card: a stray click while reading inserted a reference into their draft.
*
* Both actions are reported upward. The board deliberately knows nothing about
* sessions or the composer: `addSkill` inserts the skill's `/command` reference
* into the session already on screen, and `insertExample` puts one example line
* of prose **behind that skill's reference**, so the line arrives with the skill
* it belongs to. The seat above decides what each means.
*/
/**
* The tab standing for "every category". Not a real category key — it is
* `__all__` rather than a plausible key like `all` so a user-created category
* could never collide with it.
*/
const ALL_CATEGORIES = "__all__";
/** Icon for a skill whose category is missing from the categories API. */
const DEFAULT_ICON = "folder";
/**
* Room a category menu needs before it is worth opening downwards. Measured
* against the window, not the card: the menu is positioned inside the card but
* the limit on where it can be drawn is the viewport edge. Same threshold the
* settings page uses, so both pickers flip at the same point.
*/
const CATEGORY_MENU_MAX_PX = 280;
const STATUS_TEXT = {
	stable: "Stable",
	beta: "Beta",
	draft: "Draft"
};
/** Which status skin a value gets; anything unrecognised wears the beta one. */
function statusKeyOf(status) {
	if (status === "stable") return "s";
	if (status === "draft") return "d";
	return "b";
}
/** Load the live skill catalog from the server data root. */
async function loadCatalog() {
	try {
		const res = await fetch(`${API_BASE}/catalog`, { cache: "no-store" });
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data?.skills) ? data.skills : [];
	} catch {
		return [];
	}
}
/** Load the live category list (shipped defaults + custom categories). */
async function loadCategories() {
	try {
		const res = await fetch(`${API_BASE}/categories`, { cache: "no-store" });
		if (!res.ok) return [];
		const data = await res.json();
		return Array.isArray(data?.categories) ? data.categories : [];
	} catch {
		return [];
	}
}
/**
* Render the board.
* @param props - the two composer actions injected by the panel seat.
* @returns the tab bar and the card grid, plus the detail dialog when open.
*/
function ScienceSkillBoard({ addSkill, insertExample }) {
	const [skills, setSkills] = (0, react.useState)([]);
	const [categories, setCategories] = (0, react.useState)([]);
	const [query, setQuery] = (0, react.useState)("");
	const [active, setActive] = (0, react.useState)(ALL_CATEGORIES);
	const [openSkill, setOpenSkill] = (0, react.useState)(void 0);
	const [loading, setLoading] = (0, react.useState)(true);
	const panelId = `skill-board-${(0, react.useId)().replace(/:/g, "")}`;
	const [catMenuFor, setCatMenuFor] = (0, react.useState)(null);
	const [catMenuUp, setCatMenuUp] = (0, react.useState)(false);
	const [savingId, setSavingId] = (0, react.useState)(null);
	const [note, setNote] = (0, react.useState)(null);
	const alive = (0, react.useRef)(true);
	const reload = (0, react.useCallback)(() => {
		Promise.all([loadCatalog(), loadCategories()]).then(([list, cats]) => {
			if (!alive.current) return;
			setSkills(list);
			setCategories(cats);
			setLoading(false);
		});
	}, []);
	(0, react.useEffect)(() => {
		alive.current = true;
		reload();
		const onFocus = () => {
			reload();
		};
		window.addEventListener("focus", onFocus);
		const onVisible = () => {
			if (document.visibilityState === "visible") reload();
		};
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("dsh-science-skill:catalog-changed", onFocus);
		return () => {
			alive.current = false;
			window.removeEventListener("focus", onFocus);
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("dsh-science-skill:catalog-changed", onFocus);
		};
	}, [reload]);
	(0, react.useEffect)(() => {
		if (catMenuFor === null) return;
		const onDown = (event) => {
			const target = event.target;
			if (target instanceof Element && target.closest("[data-cat-picker]") !== null) return;
			setCatMenuFor(null);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [catMenuFor]);
	const listed = skills.filter((skill) => skill.category !== "internal");
	const tabs = categories.filter((category) => category.key !== "internal");
	const trimmed = query.trim();
	const searching = trimmed !== "";
	/** How many skills a tab stands for; the count is what makes a tab worth clicking. */
	const countOf = (key) => key === ALL_CATEGORIES ? listed.length : listed.filter((skill) => skill.category === key).length;
	/** Display label for a category key, falling back to the raw key. */
	const labelOf = (key) => categories.find((category) => category.key === key)?.label ?? key ?? "";
	/** Icon name for a category key, falling back to the neutral folder. */
	const iconOf = (key) => categories.find((category) => category.key === key)?.icon ?? DEFAULT_ICON;
	const order = new Map(categories.map((category, index) => [category.key, index]));
	const orderOf = (skill) => order.get(skill.category ?? "") ?? order.size;
	/** Show the outcome of a write for a moment, then clear it. */
	const flash = (0, react.useCallback)((kind, text) => {
		setNote({
			kind,
			text
		});
		window.setTimeout(() => setNote((current) => current?.text === text ? null : current), 4e3);
	}, []);
	/**
	* File one skill under another category.
	*
	* The Host owns the record, so this posts and then re-reads instead of moving
	* the card locally: the settings page may have renamed or deleted the same
	* skill in the meantime, and a local edit would paint a catalog that no longer
	* exists. The re-read is triggered by the announcement below, which this board
	* also listens to, so there is exactly one path back to fresh data.
	*
	* @param skill - the skill whose card was used.
	* @param key - the category key chosen from the menu.
	*/
	const moveCategory = (0, react.useCallback)(async (skill, key) => {
		setCatMenuFor(null);
		if (skill.category === key) return;
		setSavingId(skill.id);
		try {
			const data = await (await fetch(`${API_BASE}/skills/update`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					id: skill.id,
					category: key
				})
			})).json();
			if (data.ok === true) {
				flash("ok", data.note ?? "已移动分类。");
				window.dispatchEvent(new CustomEvent("dsh-science-skill:catalog-changed"));
			} else flash("err", data.error ?? "分类未能保存");
		} catch (error) {
			flash("err", String(error));
		} finally {
			setSavingId(null);
		}
	}, [flash]);
	const visible = searching ? listed.filter((skill) => matchesSkillQuery(trimmed, skill)).sort((a, b) => orderOf(a) - orderOf(b)) : active === ALL_CATEGORIES ? listed : listed.filter((skill) => skill.category === active);
	/**
	* Choose a tab. A query and a tab answer different questions — "find this
	* skill" against "show me this category" — so choosing a tab drops the query
	* instead of leaving the grid showing something the selected tab does not
	* describe.
	* @param key - category key, or {@link ALL_CATEGORIES}.
	*/
	const selectTab = (key) => {
		setActive(key);
		setQuery("");
	};
	/** The one message the grid shows instead of cards, when it has none to show. */
	const emptyState = (() => {
		if (loading) return {
			title: "正在载入技能…",
			hint: "正在读取数据根里的技能目录。"
		};
		if (listed.length === 0) return {
			title: "暂无技能",
			hint: "在「设置 → Science Skill」里添加技能目录后，技能会出现在这里。"
		};
		if (visible.length > 0) return void 0;
		if (searching) return {
			title: `没有匹配「${trimmed}」的技能`,
			hint: "换个关键词，或清空搜索框回到分类浏览。"
		};
		return {
			title: `「${labelOf(active)}」下暂无技能`,
			hint: "换一个分类，或在设置里把技能移到这个分类。"
		};
	})();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: SkillStrip.root,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillStrip.searchRow,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "text",
					className: SkillStrip.searchInput,
					value: query,
					onChange: (event) => {
						setQuery(event.target.value);
					},
					placeholder: "搜索技能：中文名 / 简介 / 英文 id / 命令",
					"aria-label": "搜索技能",
					spellCheck: false
				}), searching && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: SkillStrip.searchCount,
					children: [visible.length, " 个结果"]
				})]
			}),
			note !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: SkillStrip.note + " " + (note.kind === "ok" ? SkillStrip.noteOk : SkillStrip.noteErr),
				role: "status",
				children: note.text
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: SkillStrip.tabs,
				role: "tablist",
				"aria-label": "技能分类",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					role: "tab",
					id: `${panelId}-tab-all`,
					"aria-selected": active === ALL_CATEGORIES,
					"aria-controls": panelId,
					className: SkillStrip.tab + (active === ALL_CATEGORIES ? " " + SkillStrip.tabActive : ""),
					onClick: () => {
						selectTab(ALL_CATEGORIES);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillStrip.tabLabel,
						children: "全部"
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillStrip.tabCount,
						children: countOf(ALL_CATEGORIES)
					})]
				}), tabs.map((category) => {
					const selected = active === category.key;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						role: "tab",
						id: `${panelId}-tab-${category.key}`,
						"aria-selected": selected,
						"aria-controls": panelId,
						className: SkillStrip.tab + (selected ? " " + SkillStrip.tabActive : ""),
						onClick: () => {
							selectTab(category.key);
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillStrip.tabIcon,
								"aria-hidden": "true",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, {
									name: category.icon,
									size: 14
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillStrip.tabLabel,
								children: category.label
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: SkillStrip.tabCount,
								children: countOf(category.key)
							})
						]
					}, category.key);
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				id: panelId,
				role: "tabpanel",
				"aria-label": searching ? "搜索结果" : labelOf(active) || "全部技能",
				children: emptyState !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: SkillStrip.state,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillStrip.stateTitle,
						children: emptyState.title
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SkillStrip.stateHint,
						children: emptyState.hint
					})]
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: SkillStrip.grid,
					children: visible.map((skill) => {
						const title = skill.displayName ?? skill.name ?? skill.id;
						const invoke = skill.invoke ?? `/${skill.id}`;
						const summary = skill.displaySummary ?? skill.summary ?? "";
						const status = skill.status ?? "beta";
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("article", {
							className: SkillStrip.card,
							"data-skill": skill.id,
							"data-popup-open": catMenuFor === skill.id ? "true" : void 0,
							role: "button",
							tabIndex: 0,
							"aria-label": `查看技能详情：${title}`,
							onClick: () => {
								setOpenSkill(skill);
							},
							onKeyDown: (event) => {
								if (event.key !== "Enter" && event.key !== " ") return;
								event.preventDefault();
								setOpenSkill(skill);
							},
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillStrip.cardAvatar,
									"aria-hidden": "true",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, {
										name: iconOf(skill.category),
										size: 18
									})
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: SkillStrip.summon,
									"aria-label": `召唤技能「${title}」`,
									onClick: (event) => {
										event.stopPropagation();
										addSkill(skill);
									},
									children: "召唤"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillStrip.cardTitle,
									children: title
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillStrip.cardInvoke,
									children: invoke
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: SkillStrip.cardSummary,
									children: summary
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: SkillStrip.cardFoot,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: SkillStrip.catPicker,
										"data-cat-picker": skill.id,
										onClick: (event) => {
											event.stopPropagation();
										},
										onKeyDown: (event) => {
											if (event.key === "Escape") setCatMenuFor(null);
											event.stopPropagation();
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: SkillStrip.catPill,
											title: "点击修改分类",
											"aria-haspopup": "menu",
											"aria-expanded": catMenuFor === skill.id,
											"aria-label": `修改「${title}」的分类，当前为 ${skill.categoryLabel ?? labelOf(skill.category)}`,
											onClick: (event) => {
												const opening = catMenuFor !== skill.id;
												setCatMenuFor(opening ? skill.id : null);
												if (!opening) return;
												const pill = event.currentTarget.getBoundingClientRect();
												const below = window.innerHeight - pill.bottom;
												setCatMenuUp(below < CATEGORY_MENU_MAX_PX && pill.top > below);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: SkillStrip.catPillText,
												children: savingId === skill.id ? "保存中…" : skill.categoryLabel ?? labelOf(skill.category)
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: SkillStrip.catCaret,
												"aria-hidden": "true",
												children: "▾"
											})]
										}), catMenuFor === skill.id && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: SkillStrip.catDropdown,
											"data-drop": catMenuUp ? "up" : void 0,
											role: "menu",
											children: tabs.map((category) => {
												const current = skill.category === category.key;
												return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
													type: "button",
													role: "menuitemradio",
													"aria-checked": current,
													className: SkillStrip.catOption + (current ? " " + SkillStrip.catOptionActive : ""),
													onClick: () => {
														moveCategory(skill, category.key);
													},
													children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
														className: SkillStrip.catOptionLabel,
														children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, {
															name: category.icon,
															size: 12
														}), category.label]
													}), current && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
														className: SkillStrip.catCheck,
														children: "✓"
													})]
												}, category.key);
											})
										})]
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: SkillStrip.status + " " + SkillStrip[statusKeyOf(status)],
										children: STATUS_TEXT[status] ?? status
									})]
								})
							]
						}, skill.id);
					})
				})
			}),
			openSkill !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillDetail, {
				skill: openSkill,
				icon: iconOf(openSkill.category),
				onClose: () => {
					setOpenSkill(void 0);
				},
				addSkill,
				insertExample: (text) => {
					insertExample(openSkill, text);
				}
			})
		]
	});
}

//#endregion
//#region src/client/styles/SkillSettingsSection.ts
/** The stylesheet, injected once by installPanelStyles(). */
const CSS$2 = "/* Science palette the panels were authored against, scoped to this\n   plugin's own roots. Declared here rather than on :root: a custom property is\n   resolved on the element that uses it, so the host's body-level aliases are\n   already inherited by the time these are read, and nothing escapes into the\n   rest of the window. */\n:where(.ss-settings-root, .ss-tree-root) {\n  --dsw-sci-paper: rgb(247, 244, 238);\n  --dsw-sci-paper-2: rgb(255, 253, 248);\n  --dsw-sci-paper-3: rgb(239, 234, 224);\n  --dsw-sci-ink: rgb(34, 41, 46);\n  --dsw-sci-ink-2: rgb(91, 100, 107);\n  --dsw-sci-teal: rgb(14, 107, 92);\n  --dsw-sci-teal-ink: rgb(10, 81, 70);\n  --dsw-sci-teal-soft: rgb(227, 239, 233);\n  --dsw-sci-terra: rgb(179, 84, 30);\n}\n\nbody[data-ds-dark-theme] :where(.ss-settings-root, .ss-tree-root) {\n  --dsw-sci-paper: rgb(24, 26, 29);\n  --dsw-sci-paper-2: rgb(30, 33, 36);\n  --dsw-sci-paper-3: rgb(40, 44, 48);\n  --dsw-sci-ink: rgb(226, 228, 224);\n  --dsw-sci-ink-2: rgb(160, 166, 170);\n  --dsw-sci-teal: rgb(64, 178, 156);\n  --dsw-sci-teal-ink: rgb(120, 210, 190);\n  --dsw-sci-teal-soft: rgb(28, 52, 47);\n}\n\n.ss-settings-root {\n  display: flex;\n  flex-direction: column;\n  gap: 18px;\n  padding: 4px 2px 20px;\n}\n\n.ss-settings-head {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n\n.ss-settings-title {\n  font-family: Georgia, 'Songti SC', 'Times New Roman', serif;\n  font-size: 17px;\n  font-weight: 700;\n  color: var(--dsw-alias-label-primary, #22292e);\n}\n\n.subtitle {\n  font-size: 12px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  line-height: 1.6;\n}\n\n.toolbar {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n}\n\n.count {\n  font-size: 12px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n}\n\n\n.ss-settings-searchInput {\n  flex: 1;\n  min-width: 160px;\n  font-family: inherit;\n  font-size: 12.5px;\n  padding: 6px 10px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 7px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-primary, #22292e);\n  outline: none;\n}\n\n.ss-settings-searchInput:focus { border-color: var(--dsw-sci-teal, #0e6b5c); }\n\n.btn {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-primary, #22292e);\n  border-radius: 7px;\n  padding: 6px 14px;\n  font-size: 12.5px;\n  cursor: pointer;\n  font-family: inherit;\n  transition: background 0.12s ease, border-color 0.12s ease;\n}\n\n.btn:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); }\n\n.btn.primary {\n  background: var(--dsw-sci-teal, #0e6b5c);\n  border-color: var(--dsw-sci-teal, #0e6b5c);\n  \n  color: var(--dsw-sci-paper-2, #fffdf8);\n}\n\n.btn.primary:hover { background: var(--dsw-sci-teal-ink, #0a5146); }\n\n.btn.danger {\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  border-color: var(--dsw-alias-state-error-primary);\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.btn.danger:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }\n\n.btn:disabled { opacity: 0.5; cursor: default; }\n\n\n.manualRow {\n  display: flex;\n  gap: 8px;\n}\n\n.manualInput {\n  flex: 1;\n  font-family: var(--ds-font-family-code, ui-monospace, monospace);\n  font-size: 12px;\n  padding: 6px 9px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 6px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-primary, #22292e);\n  outline: none;\n}\n\n.manualInput:focus { border-color: var(--dsw-sci-teal, #0e6b5c); }\n\n\n.importDir {\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  padding: 10px 12px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 10px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n}\n\n.importDirHead {\n  display: flex;\n  flex-direction: column;\n  gap: 3px;\n}\n\n.importDirTitle {\n  font-size: 12.5px;\n  font-weight: 650;\n  color: var(--dsw-alias-label-primary, #22292e);\n}\n\n.importDirHint {\n  font-size: 11.5px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  line-height: 1.6;\n}\n\n.importDirRow {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n\n.importDirPath {\n  flex: 1;\n  min-width: 0;\n  font-family: var(--ds-font-family-code, ui-monospace, monospace);\n  font-size: 11.5px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  padding: 4px 8px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(60, 50, 30, 0.06));\n  border-radius: 6px;\n  background: var(--dsw-sci-paper, #f7f4ee);\n  word-break: break-all;\n}\n\n.ss-settings-status { font-size: 12px; line-height: 1.5; }\n.ss-settings-status.ok { color: var(--dsw-alias-state-success-primary); }\n.ss-settings-status.err { color: var(--dsw-alias-state-error-primary); }\n.ss-settings-status.pending { color: var(--dsw-alias-state-warn-label); }\n.ss-settings-status.warn { color: var(--dsw-alias-state-warn-label); }\n\n\n.filters {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  position: relative;\n}\n\n.filter {\n  font-size: 11.5px;\n  padding: 3px 11px;\n  border-radius: 999px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  cursor: pointer;\n  font-family: inherit;\n  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;\n}\n\n.filter:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); }\n\n\n.filter.active {\n  font-weight: 600;\n  background: color-mix(in srgb, var(--dsw-sci-teal) 12%, transparent);\n  border-color: color-mix(in srgb, var(--dsw-sci-teal) 34%, transparent);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n\n.chipIcon {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 14px;\n  height: 14px;\n  vertical-align: -2px;\n  margin-right: 4px;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n}\n\n.ss-settings-catOptionLabel {\n  display: inline-flex;\n  align-items: center;\n  min-width: 0;\n}\n\n.addFilter {\n  font-size: 15px;\n  line-height: 1;\n  padding: 2px 10px;\n  font-weight: 700;\n  color: var(--dsw-sci-teal, #0e6b5c);\n  border-style: dashed;\n}\n\n.chipWrap {\n  position: relative;\n  display: inline-flex;\n  align-items: center;\n  gap: 2px;\n}\n\n.chipEmpty {\n  font-size: 9.5px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  margin-left: 3px;\n}\n\n.chipManage {\n  font-size: 9px;\n  padding: 1px 4px;\n  border: none;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  cursor: pointer;\n  font-family: inherit;\n  border-radius: 6px;\n}\n\n.chipManage:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.08)); color: var(--dsw-sci-teal-ink, #0a5146); }\n\n.chipMenu {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  z-index: 20;\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  min-width: 150px;\n  padding: 5px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 8px;\n  box-shadow: 0 6px 18px rgba(60, 50, 30, 0.12);\n}\n\n.menuItem {\n  font-size: 12px;\n  text-align: left;\n  padding: 5px 8px;\n  border: none;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #22292e);\n  cursor: pointer;\n  font-family: inherit;\n  white-space: nowrap;\n}\n\n.menuItem:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); }\n.menuItem:disabled { opacity: 0.5; cursor: default; }\n\n.menuDanger { color: var(--dsw-alias-state-error-primary); }\n.menuDanger:hover { background: var(--dsw-alias-interactive-bg-hover-danger); }\n\n.menuInput {\n  flex: none;\n  width: 170px;\n  margin-bottom: 2px;\n}\n\n\n.iconPick {\n  position: relative;\n  display: inline-flex;\n  flex: none;\n}\n\n.iconPickBtn {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  padding: 3px 7px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.12));\n  border-radius: 8px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-secondary, #5a6470);\n  cursor: pointer;\n  font-family: inherit;\n  transition: border-color 0.12s ease, color 0.12s ease;\n}\n\n.iconPickBtn:hover {\n  border-color: color-mix(in srgb, var(--dsw-sci-teal) 55%, var(--dsw-alias-border-l3));\n  color: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n.iconPickCaret {\n  font-size: 8px;\n  line-height: 1;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n}\n\n\n.iconGrid {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  z-index: 25;\n  display: grid;\n  grid-template-columns: repeat(8, 22px);\n  gap: 2px;\n  max-height: 132px;\n  overflow-y: auto;\n  padding: 4px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.12));\n  border-radius: 8px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  box-shadow: 0 6px 18px color-mix(in srgb, var(--dsw-sci-ink) 14%, transparent);\n}\n\n.iconCell {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  width: 22px;\n  height: 22px;\n  padding: 0;\n  border: none;\n  border-radius: 5px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #5a6470);\n  cursor: pointer;\n}\n\n.iconCell:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); }\n\n.iconCellActive {\n  background: color-mix(in srgb, var(--dsw-sci-teal) 14%, transparent);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n.iconCellSvg { display: block; }\n\n.addRow {\n  display: inline-flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 6px;\n  padding: 4px 0;\n}\n\n\n.list {\n  display: grid;\n  \n  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));\n  gap: 10px;\n}\n\n.ss-settings-card {\n  position: relative;\n  \n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  padding: 11px 13px 10px 16px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 12px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  transition: border-color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease, background 0.14s ease;\n}\n\n\n.ss-settings-card::before {\n  content: '';\n  position: absolute;\n  inset: 0 auto 0 0;\n  width: 3px;\n  \n  border-radius: 12px 0 0 12px;\n  background: var(--dsw-sci-teal, #0e6b5c);\n  transition: opacity 0.14s ease;\n}\n\n.ss-settings-card:hover {\n  transform: translateY(-1px);\n  border-color: color-mix(in srgb, var(--dsw-sci-teal) 55%, var(--dsw-alias-border-l2));\n  box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-sci-ink) 7%, transparent),\n              0 8px 22px color-mix(in srgb, var(--dsw-sci-ink) 9%, transparent);\n}\n\n\n.ss-settings-card[data-off='true'] {\n  background: var(--dsw-sci-paper, #f7f4ee);\n  border-color: var(--dsw-alias-border-l1, rgba(60, 50, 30, 0.06));\n}\n\n.ss-settings-card[data-off='true']::before {\n  opacity: 0;\n}\n\n\n.cardGlyph {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 22px;\n  height: 22px;\n  border-radius: 7px;\n  flex: none;\n  margin-top: 1px;\n  background: color-mix(in srgb, var(--dsw-sci-teal) 13%, transparent);\n  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-sci-teal) 24%, transparent);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n.ss-settings-card[data-off='true'] .cardGlyph {\n  opacity: 0.55;\n}\n\n.ss-settings-card:hover {\n  border-color: var(--dsw-sci-teal, #0e6b5c);\n  box-shadow: 0 2px 8px rgba(60, 50, 30, 0.06);\n}\n\n.cardTop {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.cardName {\n  font-size: 13.5px;\n  font-weight: 650;\n  color: var(--dsw-alias-label-primary, #22292e);\n  line-height: 1.4;\n  word-break: break-word;\n  flex: 1;\n  min-width: 0;\n}\n\n\n.ss-settings-card[data-off='true'] .cardName {\n  font-weight: 560;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n}\n\n\n.cardNameInput {\n  flex: 1;\n  min-width: 0;\n  font-family: inherit;\n  font-size: 13.5px;\n  font-weight: 650;\n  color: var(--dsw-alias-label-primary, #22292e);\n  line-height: 1.4;\n  padding: 1px 5px;\n  border: 1px solid color-mix(in srgb, var(--dsw-sci-teal) 45%, transparent);\n  border-radius: 6px;\n  background: var(--dsw-sci-paper, #f7f4ee);\n  outline: none;\n}\n\n.cardActions {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  flex: none;\n}\n\n.miniBtn {\n  font-size: 10.5px;\n  line-height: 1;\n  padding: 3px 7px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  cursor: pointer;\n  font-family: inherit;\n  transition: background 0.12s ease, color 0.12s ease;\n}\n\n.miniBtn:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); color: var(--dsw-alias-label-primary, #22292e); }\n\n\n.dangerMini {\n  border-color: transparent;\n  background: transparent;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  opacity: 0;\n  transition: opacity 0.14s ease, color 0.14s ease, background 0.14s ease;\n}\n\n.ss-settings-card:hover .dangerMini,\n.ss-settings-card:focus-within .dangerMini {\n  opacity: 1;\n}\n\n.dangerMini:hover,\n.dangerMini:focus-visible {\n  color: var(--dsw-alias-state-error-primary);\n  background: var(--dsw-alias-interactive-bg-hover-danger);\n}\n\n\n.cardManage {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  padding-top: 2px;\n}\n\n.ss-settings-catPicker {\n  position: relative;\n  display: inline-flex;\n}\n\n.ss-settings-catPill {\n  display: inline-flex;\n  align-items: center;\n  gap: 5px;\n  font-size: 10.5px;\n  padding: 2px 9px;\n  border-radius: 10px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06));\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  cursor: pointer;\n  font-family: inherit;\n  white-space: nowrap;\n  transition: border-color 0.12s ease;\n}\n\n.ss-settings-catPill:hover { border-color: var(--dsw-sci-teal, #0e6b5c); }\n\n.ss-settings-catPillText {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  max-width: 130px;\n}\n\n.ss-settings-catCaret {\n  font-size: 8px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n}\n\n\n.ss-settings-card[data-popup-open],\n.chipWrap[data-popup-open],\n.iconPick[data-popup-open] {\n  z-index: 30;\n}\n\n.ss-settings-catDropdown {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  z-index: 25;\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n  min-width: 172px;\n  max-height: 260px;\n  overflow-y: auto;\n  padding: 5px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 8px;\n  box-shadow: 0 6px 18px rgba(60, 50, 30, 0.14);\n}\n\n.ss-settings-catOption {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  font-size: 12px;\n  text-align: left;\n  padding: 5px 9px;\n  border: none;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #22292e);\n  cursor: pointer;\n  font-family: inherit;\n  white-space: nowrap;\n}\n\n.ss-settings-catOption:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); }\n\n\n.ss-settings-catDropdown[data-drop='up'] {\n  top: auto;\n  bottom: calc(100% + 4px);\n}\n\n.ss-settings-catOptionActive {\n  background: color-mix(in srgb, var(--dsw-sci-teal) 12%, transparent);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n  font-weight: 600;\n}\n\n.ss-settings-catCheck {\n  font-size: 10px;\n  flex: none;\n}\n\n.deleteConfirm {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.cardCat {\n  flex: none;\n  font-size: 10.5px;\n  padding: 2px 8px;\n  border-radius: 10px;\n  background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06));\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  white-space: nowrap;\n}\n\n\n.cardDesc {\n  font-size: 12px;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  line-height: 1.6;\n}\n\n\n.cardDescInput {\n  width: 100%;\n  box-sizing: border-box;\n  font-family: inherit;\n  font-size: 12px;\n  color: var(--dsw-alias-label-primary, #22292e);\n  line-height: 1.6;\n  padding: 4px 6px;\n  border: 1px solid color-mix(in srgb, var(--dsw-sci-teal) 45%, transparent);\n  border-radius: 7px;\n  background: var(--dsw-sci-paper, #f7f4ee);\n  outline: none;\n  resize: vertical;\n}\n\n.ss-settings-cardFoot {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n}\n\n.ss-settings-invoke {\n  font-family: var(--ds-font-family-code, ui-monospace, monospace);\n  font-size: 10.5px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.badge {\n  font-size: 9.5px;\n  padding: 1.5px 6px;\n  border-radius: 5px;\n  font-weight: 600;\n  letter-spacing: 0.2px;\n  flex: none;\n}\n.badge.ss-settings-s { background: var(--dsw-alias-state-success-tertiary); color: var(--dsw-alias-state-success-primary); }\n\n.badge.ss-settings-b {\n  background: color-mix(in srgb, var(--dsw-sci-terra) 13%, transparent);\n  color: var(--dsw-sci-terra);\n}\n.badge.ss-settings-d { background: var(--dsw-alias-interactive-bg-hover-danger); color: var(--dsw-alias-state-error-primary); }\n\n\n.gateToggle {\n  display: inline-flex;\n  align-items: center;\n  cursor: pointer;\n  flex: none;\n  user-select: none;\n}\n\n\n.gateToggle input {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  margin: 0;\n  opacity: 0;\n  pointer-events: none;\n}\n\n.gateTrack {\n  display: flex;\n  align-items: center;\n  width: 30px;\n  height: 17px;\n  padding: 2px;\n  border-radius: 9px;\n  background: var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.18));\n  transition: background 160ms ease;\n}\n\n.gateThumb {\n  width: 13px;\n  height: 13px;\n  border-radius: 50%;\n  background: var(--dsw-static-neutral-bluish-00, #ffffff);\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);\n  transition: transform 160ms ease;\n}\n\n\n.gateOn .gateTrack { background: var(--dsw-sci-teal, #12b5a5); }\n.gateOn .gateThumb { transform: translateX(13px); }\n\n.gateToggle input:focus-visible + .gateTrack {\n  outline: 2px solid var(--dsw-sci-teal, #12b5a5);\n  outline-offset: 2px;\n}\n\n.empty {\n  padding: 40px 0;\n  text-align: center;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  font-size: 13px;\n}\n";

//#endregion
//#region src/client/styles/SkillStrip.ts
/** The stylesheet, injected once by installPanelStyles(). */
const CSS$1 = "/* Science palette the panels were authored against, scoped to this\n   plugin's own roots. Declared here rather than on :root: a custom property is\n   resolved on the element that uses it, so the host's body-level aliases are\n   already inherited by the time these are read, and nothing escapes into the\n   rest of the window. */\n:where(.ss-settings-root, .ss-tree-root) {\n  --dsw-sci-paper: rgb(247, 244, 238);\n  --dsw-sci-paper-2: rgb(255, 253, 248);\n  --dsw-sci-paper-3: rgb(239, 234, 224);\n  --dsw-sci-ink: rgb(34, 41, 46);\n  --dsw-sci-ink-2: rgb(91, 100, 107);\n  --dsw-sci-teal: rgb(14, 107, 92);\n  --dsw-sci-teal-ink: rgb(10, 81, 70);\n  --dsw-sci-teal-soft: rgb(227, 239, 233);\n  --dsw-sci-terra: rgb(179, 84, 30);\n}\n\nbody[data-ds-dark-theme] :where(.ss-settings-root, .ss-tree-root) {\n  --dsw-sci-paper: rgb(24, 26, 29);\n  --dsw-sci-paper-2: rgb(30, 33, 36);\n  --dsw-sci-paper-3: rgb(40, 44, 48);\n  --dsw-sci-ink: rgb(226, 228, 224);\n  --dsw-sci-ink-2: rgb(160, 166, 170);\n  --dsw-sci-teal: rgb(64, 178, 156);\n  --dsw-sci-teal-ink: rgb(120, 210, 190);\n  --dsw-sci-teal-soft: rgb(28, 52, 47);\n}\n\n.ss-tree-root {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  width: 100%;\n}\n\n\n\n.searchRow {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n\n.ss-tree-searchInput {\n  flex: 1;\n  min-width: 0;\n  font-family: inherit;\n  font-size: 12.5px;\n  padding: 7px 10px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 9px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-primary, #22292e);\n  outline: none;\n}\n\n.ss-tree-searchInput:focus {\n  border-color: var(--dsw-sci-teal, #0e6b5c);\n}\n\n.searchCount {\n  flex: none;\n  font-size: 11px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n}\n\n\n\n.tabs {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n.tab {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  padding: 6px 12px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 999px;\n  background: transparent;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  font-family: inherit;\n  font-size: 12.5px;\n  line-height: 1.2;\n  cursor: pointer;\n  transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;\n}\n\n.tab:hover {\n  background: var(--dsw-sci-paper, #f7f4ee);\n}\n\n\n.tabActive,\n.tabActive:hover {\n  background: var(--dsw-sci-teal, #0e6b5c);\n  border-color: var(--dsw-sci-teal, #0e6b5c);\n  \n  color: var(--dsw-sci-paper-2, #fffdf8);\n  font-weight: 600;\n}\n\n.tabActive .tabCount {\n  background: rgba(0, 0, 0, 0.16);\n  color: inherit;\n}\n\n.tabIcon {\n  display: inline-flex;\n  align-items: center;\n  flex: none;\n}\n\n.tabLabel {\n  white-space: nowrap;\n}\n\n.tabCount {\n  flex: none;\n  font-size: 10.5px;\n  line-height: 1.6;\n  padding: 0 6px;\n  border-radius: 999px;\n  background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06));\n  color: inherit;\n}\n\n\n\n\n.grid {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0, 1fr));\n  gap: 14px;\n}\n\n@media (max-width: 1100px) {\n  .grid {\n    grid-template-columns: repeat(3, minmax(0, 1fr));\n  }\n}\n\n@media (max-width: 820px) {\n  .grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));\n  }\n}\n\n@media (max-width: 520px) {\n  .grid {\n    grid-template-columns: minmax(0, 1fr);\n  }\n}\n\n\n\n\n.ss-tree-card {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  gap: 6px;\n  padding: 14px;\n  border: 1px solid var(--dsw-alias-border-l1, rgba(60, 50, 30, 0.06));\n  border-radius: 12px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-primary, #22292e);\n  font-family: inherit;\n  text-align: left;\n  cursor: pointer;\n  transition: border-color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;\n}\n\n.ss-tree-card:hover,\n.ss-tree-card:focus-visible {\n  border-color: var(--dsw-sci-teal, #0e6b5c);\n  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);\n  transform: translateY(-1px);\n}\n\n.cardAvatar {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 34px;\n  height: 34px;\n  border-radius: 50%;\n  background: var(--dsw-sci-teal-soft, #e3efe9);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n  flex: none;\n}\n\n\n.summon {\n  position: absolute;\n  top: 10px;\n  right: 10px;\n  padding: 3px 10px;\n  border: none;\n  border-radius: 999px;\n  background: var(--dsw-sci-ink, #22292e);\n  \n  color: var(--dsw-sci-paper-2, #fffdf8);\n  font-family: inherit;\n  font-size: 10.5px;\n  font-weight: 600;\n  letter-spacing: 0.4px;\n  cursor: pointer;\n  opacity: 0;\n  transform: translateY(-2px);\n  transition: opacity 0.12s ease, transform 0.12s ease;\n}\n\n.ss-tree-card:hover .summon,\n.ss-tree-card:focus-visible .summon,\n.summon:focus-visible {\n  opacity: 1;\n  transform: translateY(0);\n}\n\n.summon:focus-visible {\n  outline: 2px solid var(--dsw-sci-teal, #0e6b5c);\n  outline-offset: 2px;\n}\n\n.cardTitle {\n  width: 100%;\n  font-size: 13.5px;\n  font-weight: 650;\n  line-height: 1.35;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n.cardInvoke {\n  width: 100%;\n  font-family: var(--ds-font-family-code, ui-monospace, monospace);\n  font-size: 10.5px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n\n\n.cardSummary {\n  width: 100%;\n  min-height: 52px;\n  font-size: 11.5px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  display: -webkit-box;\n  -webkit-line-clamp: 3;\n  line-clamp: 3;\n  -webkit-box-orient: vertical;\n  overflow: hidden;\n}\n\n\n.ss-tree-cardFoot {\n  display: flex;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 6px;\n  width: 100%;\n  margin-top: auto;\n  padding-top: 2px;\n}\n\n\n.ss-tree-catPicker {\n  position: relative;\n  display: inline-flex;\n}\n\n.ss-tree-catPill {\n  display: inline-flex;\n  align-items: center;\n  gap: 4px;\n  font-size: 10px;\n  line-height: 1.7;\n  padding: 0 7px;\n  border-radius: 999px;\n  border: 1px solid transparent;\n  background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06));\n  color: var(--dsw-alias-label-secondary, #5b646b);\n  font-family: inherit;\n  cursor: pointer;\n  white-space: nowrap;\n  transition: border-color 0.12s ease;\n}\n\n.ss-tree-catPill:hover { border-color: var(--dsw-sci-teal, #0e6b5c); }\n\n.ss-tree-catPillText {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  max-width: 120px;\n}\n\n.ss-tree-catCaret {\n  font-size: 7px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n}\n\n\n.ss-tree-card[data-popup-open] {\n  z-index: 30;\n}\n\n.ss-tree-catDropdown {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  z-index: 25;\n  display: flex;\n  flex-direction: column;\n  gap: 1px;\n  min-width: 172px;\n  max-height: 260px;\n  overflow-y: auto;\n  padding: 5px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 8px;\n  box-shadow: 0 6px 18px rgba(60, 50, 30, 0.14);\n}\n\n\n.ss-tree-catDropdown[data-drop='up'] {\n  top: auto;\n  bottom: calc(100% + 4px);\n}\n\n.ss-tree-catOption {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  font-size: 12px;\n  text-align: left;\n  padding: 5px 9px;\n  border: none;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--dsw-alias-label-primary, #22292e);\n  cursor: pointer;\n  font-family: inherit;\n  white-space: nowrap;\n}\n\n.ss-tree-catOption:hover { background: var(--dsw-sci-paper-3, rgba(0, 0, 0, 0.06)); }\n\n.ss-tree-catOptionLabel {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n}\n\n.ss-tree-catOptionActive {\n  background: color-mix(in srgb, var(--dsw-sci-teal) 12%, transparent);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n  font-weight: 600;\n}\n\n.ss-tree-catCheck {\n  font-size: 10px;\n  flex: none;\n}\n\n\n.note {\n  font-size: 11.5px;\n  padding: 6px 10px;\n  border-radius: 8px;\n  border: 1px solid transparent;\n}\n\n.noteOk {\n  background: var(--dsw-alias-state-success-tertiary, rgba(14, 107, 92, 0.12));\n  border-color: var(--dsw-alias-state-success-primary, rgba(14, 107, 92, 0.3));\n  color: var(--dsw-alias-state-success-primary, #0e6b5c);\n}\n\n.noteErr {\n  background: var(--dsw-alias-interactive-bg-hover-danger, rgba(192, 57, 43, 0.12));\n  border-color: var(--dsw-alias-state-error-primary, rgba(192, 57, 43, 0.3));\n  color: var(--dsw-alias-state-error-primary, #c0392b);\n}\n\n.ss-tree-status {\n  font-size: 9.5px;\n  line-height: 1.7;\n  padding: 0 6px;\n  border-radius: 999px;\n  font-weight: 600;\n  letter-spacing: 0.3px;\n}\n\n.ss-tree-status.ss-tree-s {\n  background: var(--dsw-alias-state-success-tertiary, rgba(14, 107, 92, 0.12));\n  color: var(--dsw-alias-state-success-primary, #0e6b5c);\n}\n\n.ss-tree-status.ss-tree-b {\n  background: var(--dsw-alias-state-warn-tertiary, rgba(179, 84, 30, 0.12));\n  color: var(--dsw-alias-state-warn-label, #b3541e);\n}\n\n.ss-tree-status.ss-tree-d {\n  background: var(--dsw-alias-interactive-bg-hover-danger, rgba(192, 57, 43, 0.12));\n  color: var(--dsw-alias-state-error-primary, #c0392b);\n}\n\n\n\n.state {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 6px;\n  padding: 36px 16px;\n  border: 1px dashed var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 12px;\n  text-align: center;\n}\n\n.stateTitle {\n  font-size: 13px;\n  font-weight: 600;\n  color: var(--dsw-alias-label-secondary, #5b646b);\n}\n\n.stateHint {\n  font-size: 11.5px;\n  color: var(--dsw-alias-label-tertiary, #8b9298);\n}\n\n\n@media (hover: none) {\n  .summon {\n    opacity: 1;\n    transform: none;\n  }\n}\n\n\n@media (prefers-reduced-motion: reduce) {\n  .ss-tree-card,\n  .summon,\n  .tab {\n    transition: none;\n  }\n\n  .ss-tree-card:hover,\n  .ss-tree-card:focus-visible {\n    transform: none;\n  }\n\n  .summon {\n    transform: none;\n  }\n}\n";

//#endregion
//#region src/client/styles/SkillDetail.ts
/** The stylesheet, injected once by installPanelStyles(). */
const CSS = "/* Science palette the panels were authored against, scoped to this\n   plugin's own roots. Declared here rather than on :root: a custom property is\n   resolved on the element that uses it, so the host's body-level aliases are\n   already inherited by the time these are read, and nothing escapes into the\n   rest of the window. */\n:where(.ss-settings-root, .ss-tree-root) {\n  --dsw-sci-paper: rgb(247, 244, 238);\n  --dsw-sci-paper-2: rgb(255, 253, 248);\n  --dsw-sci-paper-3: rgb(239, 234, 224);\n  --dsw-sci-ink: rgb(34, 41, 46);\n  --dsw-sci-ink-2: rgb(91, 100, 107);\n  --dsw-sci-teal: rgb(14, 107, 92);\n  --dsw-sci-teal-ink: rgb(10, 81, 70);\n  --dsw-sci-teal-soft: rgb(227, 239, 233);\n  --dsw-sci-terra: rgb(179, 84, 30);\n}\n\nbody[data-ds-dark-theme] :where(.ss-settings-root, .ss-tree-root) {\n  --dsw-sci-paper: rgb(24, 26, 29);\n  --dsw-sci-paper-2: rgb(30, 33, 36);\n  --dsw-sci-paper-3: rgb(40, 44, 48);\n  --dsw-sci-ink: rgb(226, 228, 224);\n  --dsw-sci-ink-2: rgb(160, 166, 170);\n  --dsw-sci-teal: rgb(64, 178, 156);\n  --dsw-sci-teal-ink: rgb(120, 210, 190);\n  --dsw-sci-teal-soft: rgb(28, 52, 47);\n}\n\n.overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 60;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 24px;\n  background: rgba(20, 24, 27, 0.42);\n}\n\n.dialog {\n  display: flex;\n  flex-direction: column;\n  gap: 14px;\n  width: min(720px, 100%);\n  max-height: min(80vh, 760px);\n  overflow-y: auto;\n  padding: 18px 20px 20px;\n  border: 1px solid var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.1));\n  border-radius: 14px;\n  background: var(--dsw-sci-paper-2, #fffdf8);\n  color: var(--dsw-alias-label-primary, #22292e);\n  box-shadow: 0 18px 48px rgba(16, 20, 23, 0.28);\n  outline: none;\n}\n\n\n\n.ss-detail-head {\n  display: flex;\n  align-items: flex-start;\n  gap: 12px;\n}\n\n\n.headGlyph {\n  flex: none;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 42px;\n  height: 42px;\n  border-radius: 50%;\n  background: var(--dsw-sci-teal-soft, #e3efe9);\n  color: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n.headText {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  min-width: 0;\n  flex: 1;\n}\n\n.ss-detail-title {\n  font-size: 16px;\n  font-weight: 650;\n  line-height: 1.3;\n  overflow-wrap: anywhere;\n}\n\n.headMeta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n}\n\n.ss-detail-invoke {\n  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  font-size: 11.5px;\n  padding: 1px 7px;\n  border-radius: 6px;\n  background: var(--dsw-sci-paper-3, #efeae0);\n  color: var(--dsw-sci-ink-2, #5b646b);\n}\n\n.catTag,\n.statusTag {\n  font-size: 11px;\n  padding: 1px 7px;\n  border-radius: 6px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  color: var(--dsw-sci-ink-2, #5b646b);\n}\n\n.headActions {\n  flex: none;\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n}\n\n\n.try {\n  font: inherit;\n  font-size: 12.5px;\n  font-weight: 600;\n  padding: 6px 14px;\n  border: 1px solid transparent;\n  border-radius: 999px;\n  background: var(--dsw-sci-teal, #0e6b5c);\n  \n  color: var(--dsw-sci-paper-2, #fffdf8);\n  cursor: pointer;\n}\n\n.try:hover {\n  background: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n.try:focus-visible,\n.close:focus-visible,\n.example:focus-visible {\n  outline: 2px solid var(--dsw-sci-teal, #0e6b5c);\n  outline-offset: 2px;\n}\n\n.close {\n  font: inherit;\n  font-size: 18px;\n  line-height: 1;\n  width: 30px;\n  height: 30px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.14));\n  border-radius: 50%;\n  background: transparent;\n  color: var(--dsw-sci-ink-2, #5b646b);\n  cursor: pointer;\n}\n\n.close:hover {\n  background: var(--dsw-sci-paper-3, #efeae0);\n}\n\n\n\n.summary {\n  margin: 0;\n  font-size: 13px;\n  line-height: 1.6;\n  color: var(--dsw-sci-ink-2, #5b646b);\n}\n\n.section {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding-top: 12px;\n  border-top: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.08));\n}\n\n.sectionTitle {\n  margin: 0;\n  font-size: 12.5px;\n  font-weight: 650;\n  color: var(--dsw-sci-ink, #22292e);\n}\n\n\n.hint {\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.6;\n  color: var(--dsw-sci-ink-2, #5b646b);\n  opacity: 0.85;\n}\n\n.exampleList {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n}\n\n\n.example {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  width: 100%;\n  text-align: left;\n  font: inherit;\n  font-size: 12.5px;\n  line-height: 1.5;\n  padding: 9px 12px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.1));\n  border-radius: 10px;\n  background: var(--dsw-sci-paper, #f7f4ee);\n  color: var(--dsw-alias-label-primary, #22292e);\n  cursor: pointer;\n}\n\n.example:hover {\n  border-color: var(--dsw-sci-teal, #0e6b5c);\n  background: var(--dsw-sci-teal-soft, #e3efe9);\n}\n\n.exampleText {\n  flex: 1;\n  min-width: 0;\n}\n\n.exampleIcon {\n  flex: none;\n  display: inline-flex;\n  color: var(--dsw-sci-teal-ink, #0a5146);\n}\n\n\n.markdownScroll {\n  max-height: 320px;\n  overflow: auto;\n  padding: 12px 14px;\n  border: 1px solid var(--dsw-alias-border-l3, rgba(0, 0, 0, 0.1));\n  border-radius: 10px;\n  background: var(--dsw-sci-paper, #f7f4ee);\n}\n\n.markdown {\n  margin: 0;\n  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;\n  font-size: 11.5px;\n  line-height: 1.65;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n  color: var(--dsw-sci-ink, #22292e);\n}\n";

//#endregion
//#region src/client/ui/inject.ts
/**
* Install the given sheets once, keyed by {@link PanelStyle.key}.
*
* Idempotent: a sheet whose key is already in the document is skipped, so a
* remount of the declaring owner cannot stack duplicates.
* @param styles - Sheets to install, in order.
* @returns disposer removing the sheets this call actually added.
*/
function installPanelStyles(styles) {
	const added = [];
	for (const sheet of styles) {
		if (document.head.querySelector(`style[data-plugin-css="${sheet.key}"]`) !== null) continue;
		const tag = document.createElement("style");
		tag.dataset.plugin = "dsh-science-skill";
		tag.dataset.pluginCss = sheet.key;
		tag.textContent = sheet.css;
		document.head.appendChild(tag);
		added.push(tag);
	}
	return () => {
		for (const tag of added) tag.remove();
	};
}
/**
* Ask the runtime for a folder, trying every picking surface it may offer.
*
* Three exist, most specific first:
*  1. `globalThis.__DSH_DIRECTORY_PICKER__` — the desktop shell's preload
*     bridge, and what the official native picker itself calls in the local
*     Electron app (`lib/preload-app.cjs` exposes it);
*  2. `ctx.uiWorkspace.pickDirectory()` — the workspace UI service the official
*     picker falls back to in ordinary Web;
*  3. `remote.directoryPicker` — the generated namespace the Science Agent fork
*     addressed, kept last because this runtime does not serve it.
*
* A cancelled dialog answers `null` and **ends** the cascade: falling through
* would open a second chooser over the one the user just dismissed. Only a
* surface that is *missing*, or that throws, moves on to the next.
*
* The wire shape is not pinned: a generated remote may answer the bare
* `string | null` or an `{ ok, value }` envelope, and both are read.
* @param remote - the client context's `remote` service (optional).
* @param uiWorkspace - the client context's `uiWorkspace` service (optional).
* @returns the chosen absolute path, or `null` when nothing was picked.
*/
async function pickDirectoryFrom(remote, uiWorkspace) {
	const bridge = globalThis.__DSH_DIRECTORY_PICKER__;
	if (typeof bridge?.pick === "function") try {
		const picked = await bridge.pick();
		if (typeof picked === "string") return picked;
		if (picked === null) return null;
	} catch (error) {
		console.warn("[dsh-science-skill] desktop directory bridge failed:", error);
	}
	const workspace = uiWorkspace;
	if (typeof workspace?.pickDirectory === "function") try {
		const picked = await workspace.pickDirectory();
		if (typeof picked === "string") return picked;
		if (picked === null || picked === void 0) return null;
	} catch (error) {
		console.warn("[dsh-science-skill] uiWorkspace.pickDirectory failed:", error);
	}
	const picker = remote?.directoryPicker;
	if (typeof picker?.pick !== "function") {
		console.warn("[dsh-science-skill] no directory picker is available in this runtime");
		return null;
	}
	try {
		const result = await picker.pick();
		if (result === null || typeof result === "string") return result;
		return result.ok ? result.value ?? null : null;
	} catch (error) {
		console.warn("[dsh-science-skill] remote.directoryPicker failed:", error);
		return null;
	}
}

//#endregion
//#region src/client/index.tsx
/** The plugin id; the shared `apply` contract keeps the factory from inlining it. */
const name = "dsh-science-skill";
/**
* The reference source name shared by the chip and the codec. Both sides must
* agree on this string: the chip records it, the codec is looked up by it.
*/
const SKILL_REFERENCE_SOURCE = "science-skill";
/** The panel id, which is also the settings namespace and the plugin name. */
const SECTION_ID = "science-skill";
const SECTION_LABEL = "Science Skill";
/**
* One id shared by the sidebar row and the main-area panel it selects: the
* sidebar's panel list resolves a row to the `main` entry carrying the same key
* (`ctx.layout.selectPanel(id)`), so the two registrations cannot drift.
*/
const SKILLS_PANEL_ID = "science-skills";
const SKILLS_PANEL_LABEL = "技能";
/**
* Root services this half needs; the runtime seats them before `apply` runs.
*
* `conversation` belongs here even though the controller is addressed per
* session (`conversation.input.for(actx)`): the fork's own science panel
* declares the same seat and activates, and without the declaration
* `ctx.get('conversation')` answers `undefined` — the composer insert then died
* with `Cannot read properties of undefined (reading 'input')`. Declared seats
* are also the only ones cordis waits for; a seat that is merely read is a race.
*
* `layout` is what swaps the main panel back to `conversation` after a row
* inserts its reference; it is the same seat `ui-plugin-manager` declares to
* open its own panel from the sidebar.
*/
const inject = [
	"slots",
	"sessions",
	"conversation",
	"remote",
	"locale",
	"inputTriggers",
	"layout"
];
const SKILL_CHIP_APPEARANCE = "skill";
/**
* Insert a skill's `/command` reference into the composer of the session the
* main view is showing, then mark it activated for that session.
* @param sessions - the client session service.
* @param conversation - the conversation service owning the composer.
* @param skill - the skill to reference; `invoke` wins over `id`.
* @returns whether the reference actually landed. The example path needs this:
*   a sentence inserted without its skill is exactly the defect this reports,
*   so it inserts nothing rather than leave an orphan line behind.
*/
function addSkillToComposer(sessions, conversation, skill) {
	try {
		const current = sessions.list.getSnapshot().ids.find((id) => (sessions.retainInfo(id).getSnapshot().retainedBy.mainView ?? 0) > 0);
		if (current === void 0) {
			console.warn("[dsh-science-skill] no session is shown in the main view");
			return false;
		}
		const actx = sessions.binding(current)?.ctx;
		if (actx === void 0) {
			console.warn("[dsh-science-skill] session has no agent context");
			return false;
		}
		const input = conversation.input.for(actx);
		if (input === void 0) return false;
		const command = (skill.invoke ?? skill.id).replace(/^\//, "");
		const actions = input.actions;
		if (actions === void 0) {
			console.warn("[dsh-science-skill] composer exposes no insertion actions");
			return false;
		}
		input.insertReference({
			source: SKILL_REFERENCE_SOURCE,
			ref: command,
			label: command,
			appearance: SKILL_CHIP_APPEARANCE,
			clipboardText: `/${command}`
		}, actions.captureInsertion());
		activateSkill(current, command);
		return true;
	} catch (error) {
		console.warn("[dsh-science-skill] could not reference the skill:", error);
		return false;
	}
}
/**
* Insert one line of plain text into the composer of the session on screen.
*
* This is the detail dialog's example path, and it is deliberately not the same
* operation as {@link addSkillToComposer}: an example is prose the user is
* expected to edit, whereas a skill is an atomic reference chip. The host's own
* public input face carries exactly that distinction — `InputActions.insertText`
* is documented as "insert asynchronous text without replacing subsequent edits
* or reference chips", while the chip goes through `SessionInput.insertReference`
* — so this uses the former and rides the same captured-span protocol as the
* latter.
*
* Verified against the runtime, not guessed: `dsh-client-ui-conversation`'s
* `lib/types/client/contract/input.d.ts` declares
* `captureInsertion(): TokenSpan` and `insertText(text, span): boolean` on the
* `InputActions` face, and the shipped `lib/client.js` implements the latter as
* `draftEditor.insertAsyncText(span, text)`.
* @param sessions - the client session service.
* @param conversation - the conversation service owning the composer.
* @param text - the plain text to place at the caret.
* @returns whether the host accepted the insert.
*/
function insertTextIntoComposer(sessions, conversation, text) {
	try {
		const current = sessions.list.getSnapshot().ids.find((id) => (sessions.retainInfo(id).getSnapshot().retainedBy.mainView ?? 0) > 0);
		if (current === void 0) {
			console.warn("[dsh-science-skill] no session is shown in the main view");
			return false;
		}
		const actx = sessions.binding(current)?.ctx;
		if (actx === void 0) {
			console.warn("[dsh-science-skill] session has no agent context");
			return false;
		}
		const input = conversation.input.for(actx);
		if (input === void 0) return false;
		const actions = input.actions;
		if (actions === void 0) {
			console.warn("[dsh-science-skill] composer exposes no insertion actions");
			return false;
		}
		return actions.insertText(text, actions.captureInsertion());
	} catch (error) {
		console.warn("[dsh-science-skill] could not insert the example text:", error);
		return false;
	}
}
/**
* The main-area skill board. The sidebar's `技能` row selects this panel, and the
* panel is the full-width home of the board. `ScienceSkillBoard` loads its own
* catalog and categories from the data-root APIs, so the only thing it needs
* handed in is the add action.
*
* The wrapper carries inline geometry on purpose: the panel is a guest in the
* center column, and the board's grid is authored to want the whole width rather
* than the narrow rail it used to live in.
* @param props - the injected add-skill and example-text actions.
*/
function SkillsPanel({ addSkill, insertExample }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		style: {
			height: "100%",
			overflowY: "auto",
			padding: "20px 24px"
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			style: {
				maxWidth: 880,
				margin: "0 auto"
			},
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
					style: {
						margin: "0 0 4px",
						fontSize: 17,
						fontWeight: 600
					},
					children: "科研技能"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
					style: {
						margin: "0 0 14px",
						fontSize: 12.5,
						opacity: .62
					},
					children: "点击卡片查看技能详情，或直接点右上角「召唤」把它加入当前会话的输入框。"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceSkillBoard, {
					addSkill,
					insertExample
				})
			]
		})
	});
}
/**
* Mount the browser half: styles first, then the four seats.
* @param ctx - the client plugin context.
*/
function apply(ctx) {
	const slots = ctx.slots;
	const effect = ctx.effect;
	const install = () => installPanelStyles([
		{
			key: "dsh-science-skill/skills-settings.css",
			css: CSS$2
		},
		{
			key: "dsh-science-skill/skills-strip.css",
			css: CSS$1
		},
		{
			key: "dsh-science-skill/skills-detail.css",
			css: CSS
		}
	]);
	if (typeof effect === "function") effect(install, "dsh-science-skill: panel styles");
	else install();
	const sessions = ctx.get("sessions");
	const conversation = ctx.conversation;
	const layout = ctx.layout;
	const remote = ctx.get("remote");
	const pickDirectory = () => pickDirectoryFrom(remote, ctx.get("uiWorkspace"));
	try {
		const inputTriggers = ctx.inputTriggers;
		if (inputTriggers !== void 0 && typeof inputTriggers.registerSource === "function") {
			const source = {
				trigger: "/",
				name: SKILL_REFERENCE_SOURCE,
				candidates: async () => [],
				onPick: () => void 0,
				codec: {
					clipboardText: (ref) => `/${ref}`,
					serialize: async (ref) => `/${ref}`
				}
			};
			if (typeof effect === "function") effect(() => inputTriggers.registerSource(source), "dsh-science-skill: slash source");
			else inputTriggers.registerSource(source);
		}
	} catch (error) {
		console.warn("[dsh-science-skill] slash source registration failed:", error);
	}
	const addSkill = (skill) => {
		addSkillToComposer(sessions, conversation, skill);
		try {
			layout.selectPanel("conversation");
		} catch (error) {
			console.warn("[dsh-science-skill] could not return to the conversation panel:", error);
		}
	};
	/**
	* Put one example line from the detail dialog into the composer, behind the
	* skill that example belongs to.
	*
	* **The order is the whole point.** Both writes ride `captureInsertion()`,
	* which reads the caret at the moment it is called, so the reference chip has
	* to be placed first for the prose to land after it. Inserting the prose alone
	* — which is what this used to do — left the user with a sentence and no skill
	* attached, so the model had no way to know which skill was meant.
	*
	* The separating space matters for the same reason the order does: without it
	* the sentence abuts the chip and reads as part of the reference.
	*
	* The panel switch happens last and only when the prose actually landed:
	* switching away from the board on a refused insert would hide the dialog and
	* leave the user looking at a composer with no explanation.
	* @param skill - the skill the clicked example belongs to.
	* @param text - the example line to place after the reference.
	*/
	const insertExample = (skill, text) => {
		if (!addSkillToComposer(sessions, conversation, skill)) return;
		if (!insertTextIntoComposer(sessions, conversation, ` ${text}`)) return;
		try {
			layout.selectPanel("conversation");
		} catch (error) {
			console.warn("[dsh-science-skill] could not return to the conversation panel:", error);
		}
	};
	try {
		slots.inject("settings.section", () => slots.register({
			name: "settings.section",
			id: SECTION_ID,
			order: 21,
			label: SECTION_LABEL,
			inject: () => ({ pickDirectory })
		}, function SkillCenterPanel(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillSettingsSection, {
				...props,
				pickDirectory
			});
		}));
	} catch (error) {
		console.warn("[dsh-science-skill] settings section registration failed:", error);
	}
	try {
		slots.inject("main", () => slots.register({
			name: "main",
			key: SKILLS_PANEL_ID,
			inject: () => ({
				addSkill,
				insertExample
			})
		}, function SkillTreePanel(props) {
			const runtime = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SkillsPanel, {
				addSkill: runtime.addSkill,
				insertExample: runtime.insertExample
			});
		}));
	} catch (error) {
		console.warn("[dsh-science-skill] skill panel registration failed:", error);
	}
	try {
		slots.inject("sidebar.panellist", () => slots.register({
			name: "sidebar.panellist",
			id: SKILLS_PANEL_ID,
			order: 12,
			label: SKILLS_PANEL_LABEL
		}, function SkillTreeIcon(props) {
			const { size } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScienceCategoryIcon, {
				name: "library",
				size: size ?? 16
			});
		}));
	} catch (error) {
		console.warn("[dsh-science-skill] sidebar row registration failed:", error);
	}
}

//#endregion
exports.SKILL_REFERENCE_SOURCE = SKILL_REFERENCE_SOURCE;
exports.apply = apply;
exports.inject = inject;
exports.name = name;
return module.exports; } });